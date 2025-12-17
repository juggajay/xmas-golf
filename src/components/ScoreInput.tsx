"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface ScoreInputProps {
  teamId: Id<"teams">;
  inputBy: Id<"users">;
  onClose: () => void;
}

export function ScoreInput({ teamId, inputBy, onClose }: ScoreInputProps) {
  const teamMembers = useQuery(api.users.getTeamMembers, { teamId });
  const submitScore = useMutation(api.scores.submitScore);

  const [selectedPlayer, setSelectedPlayer] = useState<Id<"users"> | null>(null);
  const [hole, setHole] = useState(1);
  const [strokes, setStrokes] = useState(4);
  const [putts, setPutts] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get hole info with player's handicap allowance
  const holeInfo = useQuery(
    api.scores.getHoleInfo,
    selectedPlayer ? { playerId: selectedPlayer, hole } : "skip"
  );

  // Get selected player info
  const selectedPlayerInfo = teamMembers?.find((m) => m._id === selectedPlayer);

  const handleSubmit = async () => {
    if (!selectedPlayer) {
      setError("Please select a player");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitScore({
        playerId: selectedPlayer,
        hole,
        strokes,
        putts,
        inputBy,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError("Failed to submit score. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate net score preview
  const netScorePreview = holeInfo
    ? strokes - holeInfo.shotsReceived
    : strokes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card-christmas p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-[var(--font-fredoka)] text-xl font-bold text-white">
            📝 Enter Score
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-white text-xl">Score Submitted!</p>
            <p className="text-white/60 text-sm">Waiting for captain approval</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Player Selection */}
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Select Player
              </label>
              <div className="grid grid-cols-2 gap-2">
                {teamMembers?.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => setSelectedPlayer(member._id)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      selectedPlayer === member._id
                        ? "bg-[#d63384] text-white"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm overflow-hidden">
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
                      <span className="text-sm truncate">{member.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hole Selection */}
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Hole Number
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setHole(Math.max(1, hole - 1))}
                  className="w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20"
                  disabled={hole <= 1}
                >
                  -
                </button>
                <span className="text-3xl font-bold text-white w-16 text-center">
                  {hole}
                </span>
                <button
                  onClick={() => setHole(Math.min(18, hole + 1))}
                  className="w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20"
                  disabled={hole >= 18}
                >
                  +
                </button>
              </div>

              {/* Hole Info & Handicap Allowance */}
              {holeInfo && selectedPlayer && (
                <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/60 text-xs">Par {holeInfo.par}</p>
                      <p className="text-white/40 text-xs">Index {holeInfo.index} (Difficulty)</p>
                    </div>
                    <div className="text-right">
                      {holeInfo.shotsReceived > 0 ? (
                        <div className="px-3 py-1 bg-[#ffd700]/20 rounded-full">
                          <p className="text-[#ffd700] text-sm font-semibold">
                            +{holeInfo.shotsReceived} {holeInfo.shotsReceived === 1 ? "shot" : "shots"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-white/40 text-xs">No shots</p>
                      )}
                    </div>
                  </div>
                  {holeInfo.shotsReceived > 0 && (
                    <p className="text-[#ffd700]/80 text-xs mt-2">
                      {selectedPlayerInfo?.name} gets {holeInfo.shotsReceived} handicap {holeInfo.shotsReceived === 1 ? "stroke" : "strokes"} here!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Strokes */}
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Strokes (Gross)
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStrokes(Math.max(1, strokes - 1))}
                  className="w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20"
                  disabled={strokes <= 1}
                >
                  -
                </button>
                <span className="text-4xl font-bold text-white w-16 text-center">
                  {strokes}
                </span>
                <button
                  onClick={() => setStrokes(Math.min(15, strokes + 1))}
                  className="w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20"
                >
                  +
                </button>
              </div>

              {/* Net Score Preview */}
              {holeInfo && selectedPlayer && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-white/60 text-sm">Gross {strokes}</span>
                  <span className="text-white/40">-</span>
                  <span className="text-[#ffd700] text-sm">{holeInfo.shotsReceived} shots</span>
                  <span className="text-white/40">=</span>
                  <span className="text-white font-bold">Net {netScorePreview}</span>
                  {holeInfo.par && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      netScorePreview < holeInfo.par
                        ? "bg-green-500/20 text-green-400"
                        : netScorePreview === holeInfo.par
                        ? "bg-white/10 text-white/60"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {netScorePreview < holeInfo.par
                        ? `${netScorePreview - holeInfo.par}`
                        : netScorePreview === holeInfo.par
                        ? "E"
                        : `+${netScorePreview - holeInfo.par}`}
                    </span>
                  )}
                </div>
              )}

              {strokes <= 3 && (
                <p className="text-green-400 text-sm mt-1 text-center">
                  🐦 {strokes === 2 ? "Eagle!" : strokes === 3 ? "Birdie!" : "Hole in one?!"}
                </p>
              )}
            </div>

            {/* Putts */}
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Putts
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPutts(Math.max(0, putts - 1))}
                  className="w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20"
                  disabled={putts <= 0}
                >
                  -
                </button>
                <span className="text-4xl font-bold text-white w-16 text-center">
                  {putts}
                </span>
                <button
                  onClick={() => setPutts(Math.min(10, putts + 1))}
                  className="w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20"
                >
                  +
                </button>
              </div>
              {putts >= 3 && (
                <p className="text-red-400 text-sm mt-1">
                  🐍 3-putt! The snake is coming...
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedPlayer}
              className="w-full btn-christmas btn-red py-4 text-lg disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Score"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
