import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get the latest feed items (realtime social feed)
export const getLatestFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const items = await ctx.db
      .query("feed_items")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    // Enrich with user and team data
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const player = item.playerId ? await ctx.db.get(item.playerId) : null;
        const team = item.teamId ? await ctx.db.get(item.teamId) : null;
        const targetTeam = item.targetTeamId
          ? await ctx.db.get(item.targetTeamId)
          : null;

        return {
          ...item,
          player,
          team,
          targetTeam,
        };
      })
    );

    return enrichedItems;
  },
});

// Post a new feed item
export const postFeedItem = mutation({
  args: {
    type: v.union(
      v.literal("birdie"),
      v.literal("eagle"),
      v.literal("snake"),
      v.literal("sabotage"),
      v.literal("info"),
      v.literal("powerup"),
      v.literal("score")
    ),
    message: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    playerId: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    targetTeamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("feed_items", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Get feed items by type
export const getFeedByType = query({
  args: {
    type: v.union(
      v.literal("birdie"),
      v.literal("eagle"),
      v.literal("snake"),
      v.literal("sabotage"),
      v.literal("info"),
      v.literal("powerup"),
      v.literal("score")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const items = await ctx.db
      .query("feed_items")
      .withIndex("by_timestamp")
      .order("desc")
      .filter((q) => q.eq(q.field("type"), args.type))
      .take(limit);

    return items;
  },
});
