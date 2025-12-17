import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get available power-ups for a user
export const getUserPowerups = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("powerups")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "available")
      )
      .collect();
  },
});

// Use a power-up
export const usePowerup = mutation({
  args: {
    powerupId: v.id("powerups"),
    targetTeamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const powerup = await ctx.db.get(args.powerupId);
    if (!powerup) throw new Error("Power-up not found");
    if (powerup.status !== "available") throw new Error("Power-up already used");

    const user = await ctx.db.get(powerup.userId);
    if (!user) throw new Error("User not found");

    const targetTeam = await ctx.db.get(args.targetTeamId);
    if (!targetTeam) throw new Error("Target team not found");

    const userTeam = await ctx.db.get(user.teamId);

    // Can't target your own team
    if (user.teamId === args.targetTeamId) {
      throw new Error("Cannot target your own team!");
    }

    // Mark power-up as used
    await ctx.db.patch(args.powerupId, {
      status: "played",
      usedAt: Date.now(),
      targetTeamId: args.targetTeamId,
    });

    // Generate fun messages based on power-up type
    let message = "";
    switch (powerup.type) {
      case "mulligan":
        message = `🔄 MULLIGAN! ${user.name} (${userTeam?.name}) gave ${targetTeam.name} a do-over nightmare!`;
        break;
      case "grenade":
        message = `💣 GRENADE! ${user.name} (${userTeam?.name}) lobbed chaos at ${targetTeam.name}!`;
        break;
      case "club_theft":
        message = `🏌️ CLUB THEFT! ${user.name} (${userTeam?.name}) swiped a club from ${targetTeam.name}!`;
        break;
    }

    // Post to feed
    await ctx.db.insert("feed_items", {
      type: "sabotage",
      message,
      timestamp: Date.now(),
      playerId: powerup.userId,
      teamId: user.teamId,
      targetTeamId: args.targetTeamId,
    });

    return { success: true, message };
  },
});

// Get all power-ups (for admin view)
export const getAllPowerups = query({
  args: {},
  handler: async (ctx) => {
    const powerups = await ctx.db.query("powerups").collect();

    const enriched = await Promise.all(
      powerups.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        const team = user ? await ctx.db.get(user.teamId) : null;
        return { ...p, user, team };
      })
    );

    return enriched;
  },
});

// Reset all power-ups (admin function)
export const resetAllPowerups = mutation({
  args: {},
  handler: async (ctx) => {
    const allPowerups = await ctx.db.query("powerups").collect();

    for (const powerup of allPowerups) {
      await ctx.db.patch(powerup._id, {
        status: "available",
        usedAt: undefined,
        targetTeamId: undefined,
      });
    }

    await ctx.db.insert("feed_items", {
      type: "info",
      message: "⚡ All power-ups have been reset! Chaos incoming!",
      timestamp: Date.now(),
    });

    return { success: true, count: allPowerups.length };
  },
});
