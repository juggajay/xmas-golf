"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface PendingScore {
  _id: Id<"scores">;
  playerId: Id<"users">;
  hole: number;
  strokes: number;
  putts: number;
  player: { name: string; avatarUrl?: string } | null;
  inputByUser: { name: string } | null;
}

interface CaptainApprovalProps {
  pendingScores: PendingScore[];
  userId: Id<"users">;
}

export function CaptainApproval({ pendingScores, userId }: CaptainApprovalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const approveScore = useMutation(api.scores.approveScore);
  const rejectScore = useMutation(api.scores.rejectScore);

  if (pendingScores.length === 0 || currentIndex >= pendingScores.length) {
    return null;
  }

  const currentScore = pendingScores[currentIndex];

  const handleApprove = async () => {
    setSwipeDirection("right");
    setIsProcessing(true);

    try {
      await approveScore({
        scoreId: currentScore._id,
        approvedBy: userId,
      });

      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSwipeDirection(null);
        setIsProcessing(false);
      }, 300);
    } catch (err) {
      setIsProcessing(false);
      setSwipeDirection(null);
    }
  };

  const handleReject = async () => {
    setSwipeDirection("left");
    setIsProcessing(true);

    try {
      await rejectScore({
        scoreId: currentScore._id,
        rejectedBy: userId,
      });

      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSwipeDirection(null);
        setIsProcessing(false);
      }, 300);
    } catch (err) {
      setIsProcessing(false);
      setSwipeDirection(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="font-[var(--font-fredoka)] text-xl font-bold text-white">
            Captain Approval
          </h2>
          <p className="text-white/60 text-sm">
            {pendingScores.length - currentIndex} scores to review
          </p>
        </div>

        {/* Card Stack */}
        <div className="relative h-[300px]">
          {/* Background cards */}
          {pendingScores.slice(currentIndex + 1, currentIndex + 3).map((_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 top-0 card-christmas h-[280px]"
              style={{
                transform: `translateY(${(i + 1) * 8}px) scale(${1 - (i + 1) * 0.05})`,
                opacity: 1 - (i + 1) * 0.2,
                zIndex: -i - 1,
              }}
            />
          ))}

          {/* Current card */}
          <div
            className={`card-christmas p-6 h-[280px] transition-transform duration-300 ${
              swipeDirection === "left"
                ? "-translate-x-full rotate-[-20deg] opacity-0"
                : swipeDirection === "right"
                ? "translate-x-full rotate-[20deg] opacity-0"
                : ""
            }`}
          >
            {/* Player Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg overflow-hidden">
                {currentScore.player?.avatarUrl ? (
                  <img
                    src={currentScore.player.avatarUrl}
                    alt={currentScore.player.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentScore.player?.name?.charAt(0).toUpperCase() || "?"
                )}
              </div>
              <div>
                <p className="text-white font-semibold">
                  {currentScore.player?.name || "Unknown"}
                </p>
                <p className="text-white/60 text-sm">
                  Hole {currentScore.hole}
                </p>
              </div>
            </div>

            {/* Score Display */}
            <div className="text-center py-4">
              <div className="text-6xl font-bold text-white mb-2">
                {currentScore.strokes}
              </div>
              <p className="text-white/60">strokes</p>

              <div className="flex justify-center gap-8 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {currentScore.putts}
                  </p>
                  <p className="text-white/40 text-xs">putts</p>
                </div>
              </div>

              {/* Warnings */}
              {currentScore.putts >= 3 && (
                <div className="mt-3 px-3 py-1 bg-red-500/20 rounded-full inline-block">
                  <span className="text-red-300 text-sm">🐍 3-putt warning!</span>
                </div>
              )}
              {currentScore.strokes <= 3 && (
                <div className="mt-3 px-3 py-1 bg-green-500/20 rounded-full inline-block">
                  <span className="text-green-300 text-sm">🐦 Nice score!</span>
                </div>
              )}
            </div>

            {/* Input By */}
            <p className="text-white/40 text-xs text-center">
              Entered by: {currentScore.inputByUser?.name || "Unknown"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full bg-red-500/80 text-white text-2xl shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
            title="Reject"
          >
            ✕
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full bg-green-500/80 text-white text-2xl shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
            title="Approve"
          >
            ✓
          </button>
        </div>

        {/* Instructions */}
        <p className="text-white/40 text-xs text-center mt-4">
          Tap ✓ to approve, ✕ to reject
        </p>
      </div>
    </div>
  );
}
