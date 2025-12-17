import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all teams with computed scores
export const getAllTeams = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();

    // Compute scores for each team
    const teamsWithScores = await Promise.all(
      teams.map(async (team) => {
        // Get all approved scores for this team
        const scores = await ctx.db
          .query("scores")
          .withIndex("by_team_status", (q) =>
            q.eq("teamId", team._id).eq("status", "approved")
          )
          .collect();

        // Sum total strokes
        const totalStrokes = scores.reduce((sum, s) => sum + s.strokes, 0);
        const holesPlayed = scores.length;

        // Get team members
        const members = await ctx.db
          .query("users")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();

        return {
          ...team,
          score: totalStrokes,
          holesPlayed,
          memberCount: members.length,
          members: members.map((m) => ({
            _id: m._id,
            name: m.name,
            avatarUrl: m.avatarUrl,
            role: m.role,
            hasSnake: m.hasSnake,
          })),
        };
      })
    );

    // Sort by score (lowest is best in golf!)
    return teamsWithScores.sort((a, b) => {
      // Teams with no scores go to the end
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      return a.score - b.score;
    });
  },
});

// Get a single team with full details
export const getTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    // Get members
    const members = await ctx.db
      .query("users")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Get approved scores
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_team_status", (q) =>
        q.eq("teamId", args.teamId).eq("status", "approved")
      )
      .collect();

    const totalStrokes = scores.reduce((sum, s) => sum + s.strokes, 0);

    return {
      ...team,
      score: totalStrokes,
      holesPlayed: scores.length,
      members,
    };
  },
});

// Create a new team (admin function)
export const createTeam = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Team "${args.name}" already exists`);
    }

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      color: args.color,
    });

    // Post to feed
    await ctx.db.insert("feed_items", {
      type: "info",
      message: `Team "${args.name}" has entered the game!`,
      timestamp: Date.now(),
      teamId,
    });

    return teamId;
  },
});

// Seed initial teams (call once to set up the game)
export const seedTeams = mutation({
  args: {},
  handler: async (ctx) => {
    const existingTeams = await ctx.db.query("teams").collect();
    if (existingTeams.length > 0) {
      return { message: "Teams already seeded", teams: existingTeams };
    }

    const teamsToCreate = [
      { name: "Sales Sleigh", color: "#d63384" }, // Santa Red
      { name: "Marketing Elves", color: "#0f5132" }, // Christmas Green
      { name: "Engineering Reindeer", color: "#ffd700" }, // Gold
      { name: "Support Snowmen", color: "#0dcaf0" }, // Ice Blue
      { name: "Leadership Legends", color: "#6f42c1" }, // Purple
      { name: "Product Penguins", color: "#fd7e14" }, // Orange
    ];

    const createdTeams = [];
    for (const team of teamsToCreate) {
      const teamId = await ctx.db.insert("teams", team);
      createdTeams.push({ ...team, _id: teamId });
    }

    // Welcome message
    await ctx.db.insert("feed_items", {
      type: "info",
      message: "Welcome to Merry Mulligan! May the best team win!",
      timestamp: Date.now(),
    });

    return { message: "Teams seeded successfully", teams: createdTeams };
  },
});

// Get leaderboard (teams sorted by NET score - determines winner!)
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();

    const leaderboard = await Promise.all(
      teams.map(async (team) => {
        const scores = await ctx.db
          .query("scores")
          .withIndex("by_team_status", (q) =>
            q.eq("teamId", team._id).eq("status", "approved")
          )
          .collect();

        const members = await ctx.db
          .query("users")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();

        // Gross score = actual strokes taken
        const totalGrossStrokes = scores.reduce((sum, s) => sum + s.strokes, 0);

        // Net score = gross - handicap strokes received (this determines winner!)
        const totalNetScore = scores.reduce((sum, s) => sum + (s.netScore ?? s.strokes), 0);

        // Total par for holes played
        const totalPar = scores.reduce((sum, s) => sum + (s.par ?? 4), 0);

        // Total handicap strokes received
        const totalShotsReceived = scores.reduce((sum, s) => sum + (s.shotsReceived ?? 0), 0);

        return {
          _id: team._id,
          name: team.name,
          color: team.color,
          // Net score is primary (determines winner)
          totalNetScore,
          netRelativeToPar: totalNetScore - totalPar,
          // Gross score is secondary (actual strokes)
          totalGrossStrokes,
          grossRelativeToPar: totalGrossStrokes - totalPar,
          // Stats
          totalPar,
          totalShotsReceived,
          holesPlayed: scores.length,
          memberCount: members.length,
          avatars: members.slice(0, 4).map((m) => m.avatarUrl),
        };
      })
    );

    // Sort by NET score (ascending - lowest net wins!)
    return leaderboard.sort((a, b) => {
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      return a.totalNetScore - b.totalNetScore;
    });
  },
});
