import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { COURSE_HOLES, getHoleData } from "./course_data";
import { getShotsReceived, calculateNetScore } from "./utils/scoring";

// Submit a score (creates pending entry)
export const submitScore = mutation({
  args: {
    playerId: v.id("users"),
    hole: v.number(),
    strokes: v.number(),
    putts: v.number(),
    inputBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    // Get hole data from course config
    const holeData = getHoleData(args.hole);
    const par = holeData?.par ?? 4;
    const holeIndex = holeData?.index ?? 9;

    // Calculate handicap strokes and net score
    const shotsReceived = getShotsReceived(player.handicap, holeIndex);
    const netScore = calculateNetScore(args.strokes, player.handicap, holeIndex);

    // Check if score already exists for this player/hole
    const existing = await ctx.db
      .query("scores")
      .withIndex("by_player_hole", (q) =>
        q.eq("playerId", args.playerId).eq("hole", args.hole)
      )
      .first();

    if (existing) {
      // Update existing score
      await ctx.db.patch(existing._id, {
        strokes: args.strokes,
        putts: args.putts,
        par,
        holeIndex,
        netScore,
        shotsReceived,
        status: "pending",
        inputBy: args.inputBy,
      });
      return existing._id;
    }

    // Create new score entry
    const scoreId = await ctx.db.insert("scores", {
      playerId: args.playerId,
      teamId: player.teamId,
      hole: args.hole,
      strokes: args.strokes,
      putts: args.putts,
      par,
      holeIndex,
      netScore,
      shotsReceived,
      status: "pending",
      inputBy: args.inputBy,
    });

    return scoreId;
  },
});

// Get hole info with player's handicap allowance
export const getHoleInfo = query({
  args: {
    playerId: v.id("users"),
    hole: v.number(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return null;

    const holeData = getHoleData(args.hole);
    if (!holeData) return null;

    const shotsReceived = getShotsReceived(player.handicap, holeData.index);

    return {
      ...holeData,
      playerHandicap: player.handicap,
      shotsReceived,
    };
  },
});

// Get all course holes with player handicap info
export const getCourseWithHandicap = query({
  args: { playerId: v.id("users") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return [];

    return COURSE_HOLES.map((hole) => ({
      ...hole,
      shotsReceived: getShotsReceived(player.handicap, hole.index),
    }));
  },
});

// Get pending scores for a team (captain view)
export const getPendingScores = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const pendingScores = await ctx.db
      .query("scores")
      .withIndex("by_team_status", (q) =>
        q.eq("teamId", args.teamId).eq("status", "pending")
      )
      .collect();

    // Enrich with player data
    const enriched = await Promise.all(
      pendingScores.map(async (score) => {
        const player = await ctx.db.get(score.playerId);
        const inputByUser = await ctx.db.get(score.inputBy);
        return {
          ...score,
          player,
          inputByUser,
        };
      })
    );

    return enriched;
  },
});

// Approve a score (captain only)
export const approveScore = mutation({
  args: {
    scoreId: v.id("scores"),
    approvedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const score = await ctx.db.get(args.scoreId);
    if (!score) throw new Error("Score not found");

    const captain = await ctx.db.get(args.approvedBy);
    if (!captain || captain.role !== "captain") {
      throw new Error("Only captains can approve scores");
    }

    if (captain.teamId !== score.teamId) {
      throw new Error("Can only approve scores for your own team");
    }

    // Update score status
    await ctx.db.patch(args.scoreId, {
      status: "approved",
      approvedBy: args.approvedBy,
      approvedAt: Date.now(),
    });

    const player = await ctx.db.get(score.playerId);
    const team = await ctx.db.get(score.teamId);

    // Check for special events
    const par = score.par || 4;

    // Birdie (1 under par)
    if (score.strokes === par - 1) {
      await ctx.db.insert("feed_items", {
        type: "birdie",
        message: `🐦 BIRDIE! ${player?.name} crushed hole ${score.hole}!`,
        timestamp: Date.now(),
        playerId: score.playerId,
        teamId: score.teamId,
      });
    }

    // Eagle (2 under par)
    if (score.strokes <= par - 2) {
      await ctx.db.insert("feed_items", {
        type: "eagle",
        message: `🦅 EAGLE!! ${player?.name} is on fire at hole ${score.hole}!`,
        timestamp: Date.now(),
        playerId: score.playerId,
        teamId: score.teamId,
      });
    }

    // 3-putt snake
    if (score.putts >= 3) {
      // Transfer snake to this player
      const currentSnakeHolder = await ctx.db
        .query("users")
        .withIndex("by_has_snake", (q) => q.eq("hasSnake", true))
        .first();

      if (currentSnakeHolder) {
        await ctx.db.patch(currentSnakeHolder._id, { hasSnake: false });
      }

      await ctx.db.patch(score.playerId, { hasSnake: true });

      await ctx.db.insert("feed_items", {
        type: "snake",
        message: `🐍 THE SNAKE! ${player?.name} 3-putted on hole ${score.hole}! Shame!`,
        timestamp: Date.now(),
        playerId: score.playerId,
        teamId: score.teamId,
      });
    }

    // Regular score post
    await ctx.db.insert("feed_items", {
      type: "score",
      message: `${player?.name} (${team?.name}) scored ${score.strokes} on hole ${score.hole}`,
      timestamp: Date.now(),
      playerId: score.playerId,
      teamId: score.teamId,
    });

    return { success: true };
  },
});

// Reject a score
export const rejectScore = mutation({
  args: {
    scoreId: v.id("scores"),
    rejectedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const score = await ctx.db.get(args.scoreId);
    if (!score) throw new Error("Score not found");

    const captain = await ctx.db.get(args.rejectedBy);
    if (!captain || captain.role !== "captain") {
      throw new Error("Only captains can reject scores");
    }

    await ctx.db.patch(args.scoreId, {
      status: "rejected",
    });

    return { success: true };
  },
});

// Get all scores for a player
export const getPlayerScores = query({
  args: { playerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scores")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();
  },
});

// Get all approved scores for a team
export const getTeamScores = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_team_status", (q) =>
        q.eq("teamId", args.teamId).eq("status", "approved")
      )
      .collect();

    // Enrich with player data
    const enriched = await Promise.all(
      scores.map(async (score) => {
        const player = await ctx.db.get(score.playerId);
        return { ...score, player };
      })
    );

    return enriched;
  },
});

// Get scorecard for a team (organized by hole)
export const getTeamScorecard = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("users")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const scorecard = await Promise.all(
      members.map(async (member) => {
        const scores = await ctx.db
          .query("scores")
          .withIndex("by_player", (q) => q.eq("playerId", member._id))
          .filter((q) => q.eq(q.field("status"), "approved"))
          .collect();

        // Create hole map
        const holeScores: Record<number, number> = {};
        scores.forEach((s) => {
          holeScores[s.hole] = s.strokes;
        });

        const totalStrokes = scores.reduce((sum, s) => sum + s.strokes, 0);

        return {
          player: member,
          scores: holeScores,
          totalStrokes,
          holesPlayed: scores.length,
        };
      })
    );

    return scorecard;
  },
});
