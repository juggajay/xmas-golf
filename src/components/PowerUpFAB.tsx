"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface PowerUpFABProps {
  userId: Id<"users">;
}

const powerupConfig: Record<
  string,
  { icon: string; name: string; description: string }
> = {
  mulligan: {
    icon: "🔄",
    name: "Mulligan",
    description: "Force a team to re-do their worst hole!",
  },
  grenade: {
    icon: "💣",
    name: "Grenade",
    description: "Add chaos to a competing team!",
  },
  club_theft: {
    icon: "🏌️",
    name: "Club Theft",
    description: "Steal a club from another team!",
  },
};

export function PowerUpFAB({ userId }: PowerUpFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPowerup, setSelectedPowerup] = useState<Id<"powerups"> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const powerups = useQuery(api.powerups.getUserPowerups, { userId });
  const teams = useQuery(api.teams.getAllTeams);
  const user = useQuery(api.users.getUser, { userId });
  const usePowerup = useMutation(api.powerups.usePowerup);

  const availableCount = powerups?.length ?? 0;

  const handleUsePowerup = async (targetTeamId: Id<"teams">) => {
    if (!selectedPowerup) return;

    setIsProcessing(true);
    setError(null);
    try {
      await usePowerup({
        powerupId: selectedPowerup,
        targetTeamId,
      });
      setSelectedPowerup(null);
      setIsOpen(false);
    } catch (err) {
      setError("Failed to use power-up. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter out user's own team
  const targetableTeams = teams?.filter((t) => t._id !== user?.teamId) ?? [];

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={availableCount === 0}
        className={`w-14 h-14 rounded-full text-white text-2xl shadow-lg transition-transform flex items-center justify-center relative ${
          availableCount > 0
            ? "bg-[#ffd700] hover:scale-110"
            : "bg-gray-500/50 cursor-not-allowed"
        }`}
        title="Power-ups"
      >
        ⚡
        {availableCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
            {availableCount}
          </span>
        )}
      </button>

      {/* Power-up Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card-christmas p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-fredoka)] text-xl font-bold text-white">
                ⚡ Power-ups
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSelectedPowerup(null);
                }}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {!selectedPowerup ? (
              // Power-up selection
              <div className="space-y-3">
                {availableCount === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    <p className="text-4xl mb-2">😢</p>
                    <p>No power-ups available!</p>
                    <p className="text-sm">You&apos;ve used them all.</p>
                  </div>
                ) : (
                  powerups?.map((powerup) => {
                    const config = powerupConfig[powerup.type];
                    return (
                      <button
                        key={powerup._id}
                        onClick={() => setSelectedPowerup(powerup._id)}
                        className="w-full p-4 card-christmas bg-white/5 hover:bg-white/15 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{config.icon}</span>
                          <div>
                            <p className="text-white font-semibold">
                              {config.name}
                            </p>
                            <p className="text-white/60 text-sm">
                              {config.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              // Target selection
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedPowerup(null)}
                  className="text-white/60 hover:text-white text-sm flex items-center gap-1"
                >
                  ← Back
                </button>

                <h3 className="text-white font-semibold text-center">
                  Choose a target team:
                </h3>

                <div className="space-y-2">
                  {targetableTeams.map((team) => (
                    <button
                      key={team._id}
                      onClick={() => handleUsePowerup(team._id)}
                      disabled={isProcessing}
                      className="w-full p-4 card-christmas bg-white/5 hover:bg-red-500/20 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="text-white">{team.name}</span>
                      <span className="text-white/40 text-sm ml-auto">
                        {team.memberCount} players
                      </span>
                    </button>
                  ))}
                </div>

                {isProcessing && (
                  <p className="text-center text-white/60 animate-pulse">
                    Launching attack...
                  </p>
                )}

                {error && (
                  <p className="text-center text-red-400 text-sm">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
