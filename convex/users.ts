import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get a user by their ID (for session restoration)
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Also fetch the team info
    const team = await ctx.db.get(user.teamId);
    return { ...user, team };
  },
});

// Get user by ID - returns null if not found (safe for initial load)
export const getUserSafe = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const team = await ctx.db.get(user.teamId);
    return { ...user, team };
  },
});

// Create a new "ghost" user - no auth required
export const createUser = mutation({
  args: {
    name: v.string(),
    handicap: v.number(),
    teamId: v.id("teams"),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Check if this is the first user on the team (becomes captain)
    const existingTeamMembers = await ctx.db
      .query("users")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const role = existingTeamMembers.length === 0 ? "captain" : "player";

    // Create the user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      handicap: args.handicap,
      teamId: args.teamId,
      avatarUrl: args.avatarUrl,
      avatarStorageId: args.avatarStorageId,
      role,
      hasSnake: false,
    });

    // Seed power-ups for the new user
    await ctx.db.insert("powerups", {
      userId,
      type: "mulligan",
      status: "available",
    });
    await ctx.db.insert("powerups", {
      userId,
      type: "grenade",
      status: "available",
    });
    await ctx.db.insert("powerups", {
      userId,
      type: "club_theft",
      status: "available",
    });

    // Post a welcome message to the feed
    const team = await ctx.db.get(args.teamId);
    await ctx.db.insert("feed_items", {
      type: "info",
      message: `${args.name} joined ${team?.name || "the game"}! ${role === "captain" ? "They're the team captain!" : ""}`,
      timestamp: Date.now(),
      playerId: userId,
      teamId: args.teamId,
    });

    return userId;
  },
});

// Update user avatar after generation
export const updateAvatar = mutation({
  args: {
    userId: v.id("users"),
    avatarUrl: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      avatarUrl: args.avatarUrl,
      avatarStorageId: args.avatarStorageId,
    });
  },
});

// Get all users for a team
export const getTeamMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// Get the current snake holder
export const getSnakeHolder = query({
  args: {},
  handler: async (ctx) => {
    const snakeHolder = await ctx.db
      .query("users")
      .withIndex("by_has_snake", (q) => q.eq("hasSnake", true))
      .first();

    if (!snakeHolder) return null;

    const team = await ctx.db.get(snakeHolder.teamId);
    return { ...snakeHolder, team };
  },
});

// Transfer the snake to a new player (called when someone 3-putts)
export const transferSnake = mutation({
  args: { newHolderId: v.id("users") },
  handler: async (ctx, args) => {
    // Remove snake from current holder
    const currentHolder = await ctx.db
      .query("users")
      .withIndex("by_has_snake", (q) => q.eq("hasSnake", true))
      .first();

    if (currentHolder) {
      await ctx.db.patch(currentHolder._id, { hasSnake: false });
    }

    // Give snake to new holder
    await ctx.db.patch(args.newHolderId, { hasSnake: true });

    // Get user info for feed
    const newHolder = await ctx.db.get(args.newHolderId);
    const team = newHolder ? await ctx.db.get(newHolder.teamId) : null;

    // Post to feed
    await ctx.db.insert("feed_items", {
      type: "snake",
      message: `${newHolder?.name} got the SNAKE! 3-putt shame incoming...`,
      timestamp: Date.now(),
      playerId: args.newHolderId,
      teamId: newHolder?.teamId,
    });

    return { previousHolder: currentHolder, newHolder };
  },
});

// Promote a user to captain
export const promoteToCaptain = mutation({
  args: {
    userId: v.id("users"),
    promotedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const promoter = await ctx.db.get(args.promotedBy);

    if (!user || !promoter) {
      throw new Error("User not found");
    }

    // Only captains can promote
    if (promoter.role !== "captain") {
      throw new Error("Only captains can promote other players");
    }

    // Must be same team
    if (user.teamId !== promoter.teamId) {
      throw new Error("Can only promote players on your team");
    }

    await ctx.db.patch(args.userId, { role: "captain" });

    return { success: true };
  },
});
