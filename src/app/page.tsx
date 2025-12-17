"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGhostAuth } from "@/hooks/useGhostAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useGhostAuth();
  const teams = useQuery(api.teams.getAllTeams);
  const seedTeams = useMutation(api.teams.seedTeams);
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push("/play");
    }
  }, [isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⛳</div>
          <p className="text-xl text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-[var(--font-fredoka)] text-5xl md:text-6xl font-bold text-white mb-2 drop-shadow-lg">
          🎄 Merry Mulligan 🏌️
        </h1>
        <p className="text-xl text-white/80">Christmas Chaos Golf</p>
      </div>

      {/* Team Selection */}
      <div className="max-w-2xl mx-auto">
        <h2 className="font-[var(--font-fredoka)] text-2xl font-semibold text-white text-center mb-6">
          Choose Your Team
        </h2>

        {teams === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="card-christmas p-6 animate-pulse"
              >
                <div className="h-8 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="card-christmas p-8 text-center">
            <div className="text-6xl mb-4">🎅</div>
            <h3 className="text-xl font-bold text-white mb-2">Welcome to Merry Mulligan!</h3>
            <p className="text-white/60 mb-6">
              Ready to start the Christmas golf chaos?
            </p>
            <button
              onClick={async () => {
                setIsSeeding(true);
                try {
                  await seedTeams();
                } finally {
                  setIsSeeding(false);
                }
              }}
              disabled={isSeeding}
              className="btn-christmas btn-red text-lg disabled:opacity-50"
            >
              {isSeeding ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⛳</span> Creating Teams...
                </span>
              ) : (
                "🎄 Start the Game!"
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team, index) => (
              <button
                key={team._id}
                onClick={() => router.push(`/join/${team._id}`)}
                className={`card-christmas p-6 text-left transition-all hover:scale-105 hover:bg-white/20 ${
                  index === 0 && team.holesPlayed > 0 ? "winner-border" : ""
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <h3 className="font-[var(--font-fredoka)] text-xl font-semibold text-white">
                    {team.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">
                    {team.memberCount} player{team.memberCount !== 1 ? "s" : ""}
                  </span>
                  {team.holesPlayed > 0 && (
                    <span className="text-[#ffd700] font-semibold">
                      {team.score} ({team.holesPlayed} holes)
                    </span>
                  )}
                </div>

                {/* Team member avatars */}
                {team.members.length > 0 && (
                  <div className="flex -space-x-2 mt-3">
                    {team.members.slice(0, 4).map((member) => (
                      <div
                        key={member._id}
                        className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-sm overflow-hidden"
                        title={member.name}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    ))}
                    {team.members.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white/40 flex items-center justify-center text-xs text-white">
                        +{team.members.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-12 text-white/40 text-sm">
        <p>🎅 May the best team win! 🎅</p>
      </div>
    </div>
  );
}
