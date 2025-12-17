"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useGhostAuth } from "@/hooks/useGhostAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Leaderboard } from "@/components/Leaderboard";
import { SocialFeed } from "@/components/SocialFeed";
import { ScoreInput } from "@/components/ScoreInput";
import { CaptainApproval } from "@/components/CaptainApproval";
import { PowerUpFAB } from "@/components/PowerUpFAB";

export default function PlayPage() {
  const { user, isLoading, isAuthenticated, isCaptain, logout } = useGhostAuth();
  const router = useRouter();
  const [showScoreInput, setShowScoreInput] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const pendingScores = useQuery(
    api.scores.getPendingScores,
    user?.teamId ? { teamId: user.teamId } : "skip"
  );

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⛳</div>
          <p className="text-xl text-white/80">Loading game...</p>
        </div>
      </div>
    );
  }

  const pendingCount = pendingScores?.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0a1f0a]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-white/20 border-2 flex items-center justify-center text-lg overflow-hidden"
              style={{ borderColor: user.team?.color }}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-white font-semibold">{user.name}</p>
              <p className="text-white/60 text-xs flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user.team?.color }}
                />
                {user.team?.name}
                {isCaptain && " (Captain)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Snake indicator */}
            {user.hasSnake && (
              <div className="px-3 py-1 bg-red-500/20 rounded-full text-sm">
                🐍 Snake!
              </div>
            )}

            {/* Captain badge with pending count */}
            {isCaptain && pendingCount > 0 && (
              <button
                onClick={() => setShowScoreInput(false)}
                className="px-3 py-1 bg-[#ffd700]/20 rounded-full text-sm text-[#ffd700] animate-pulse"
              >
                {pendingCount} pending
              </button>
            )}

            <button
              onClick={logout}
              className="text-white/40 hover:text-white/80 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Leaderboard Section (Top 35%) */}
        <section className="h-[35vh] min-h-[200px] sticky top-[60px] z-10 bg-[#0a1f0a]/80 backdrop-blur-sm">
          <Leaderboard />
        </section>

        {/* Feed Section (Bottom 65%) */}
        <section className="flex-1 overflow-auto">
          <SocialFeed />
        </section>
      </div>

      {/* Captain Approval Modal */}
      {isCaptain && pendingCount > 0 && (
        <CaptainApproval
          pendingScores={pendingScores!}
          userId={user._id}
        />
      )}

      {/* Score Input Modal */}
      {showScoreInput && (
        <ScoreInput
          teamId={user.teamId}
          inputBy={user._id}
          onClose={() => setShowScoreInput(false)}
        />
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
        {/* Score Entry Button */}
        <button
          onClick={() => setShowScoreInput(true)}
          className="w-14 h-14 rounded-full bg-[#d63384] text-white text-2xl shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
          title="Enter Score"
        >
          📝
        </button>

        {/* Power-ups Button */}
        <PowerUpFAB userId={user._id} />
      </div>
    </div>
  );
}
