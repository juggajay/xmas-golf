"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Leaderboard() {
  const leaderboard = useQuery(api.teams.getLeaderboard);

  if (leaderboard === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="h-full px-4 py-3">
      <h2 className="font-[var(--font-fredoka)] text-lg font-semibold text-white mb-3 flex items-center gap-2">
        🏆 The Race
      </h2>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {leaderboard.map((team, index) => (
          <div
            key={team._id}
            className={`flex-shrink-0 card-christmas p-4 min-w-[140px] ${
              index === 0 && team.holesPlayed > 0 ? "winner-border" : ""
            }`}
          >
            {/* Rank Badge */}
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-2xl font-bold ${
                  index === 0
                    ? "text-[#ffd700]"
                    : index === 1
                    ? "text-gray-300"
                    : index === 2
                    ? "text-amber-600"
                    : "text-white/60"
                }`}
              >
                #{index + 1}
              </span>
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: team.color }}
              />
            </div>

            {/* Team Name */}
            <h3 className="font-semibold text-white text-sm truncate mb-2">
              {team.name}
            </h3>

            {/* Score */}
            <div className="text-center">
              {team.holesPlayed > 0 ? (
                <>
                  {/* Net Score - Primary (determines winner) */}
                  <p className="text-3xl font-bold text-white">
                    {team.totalNetScore}
                  </p>
                  <p className="text-xs text-[#ffd700] font-medium">
                    NET {team.netRelativeToPar > 0 ? "+" : ""}
                    {team.netRelativeToPar === 0 ? "E" : team.netRelativeToPar}
                  </p>

                  {/* Gross Score - Secondary */}
                  <p className="text-xs text-white/40 mt-1">
                    Gross: {team.totalGrossStrokes} ({team.grossRelativeToPar > 0 ? "+" : ""}
                    {team.grossRelativeToPar === 0 ? "E" : team.grossRelativeToPar})
                  </p>

                  <p className="text-xs text-white/30 mt-1">
                    {team.holesPlayed} holes
                  </p>
                </>
              ) : (
                <p className="text-white/40 text-sm">No scores yet</p>
              )}
            </div>

            {/* Team Avatars */}
            {team.avatars && team.avatars.length > 0 && (
              <div className="flex -space-x-2 mt-3 justify-center">
                {team.avatars.slice(0, 4).map((avatar, i) => {
                  const isWinningTeam = index === 0 && team.holesPlayed > 0;
                  return (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full overflow-hidden ${
                        isWinningTeam
                          ? "border-2 border-[#ffd700] shadow-[0_0_8px_rgba(255,215,0,0.5)]"
                          : "border-2 border-white/30"
                      } ${avatar ? "bg-gradient-to-br from-[#c41e3a] to-[#228b22]" : "bg-white/20"}`}
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
                          ?
                        </div>
                      )}
                    </div>
                  );
                })}
                {team.memberCount > 4 && (
                  <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs text-white/60">
                    +{team.memberCount - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
