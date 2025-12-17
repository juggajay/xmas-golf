/**
 * Golf Handicap & Net Score Calculation
 *
 * This implements the official golf handicap stroke allocation system:
 * - Players receive strokes based on their handicap
 * - Strokes are allocated to holes based on difficulty index (1 = hardest)
 * - Net score = Gross strokes - Shots received
 */

/**
 * Calculate how many handicap strokes a player receives on a specific hole
 *
 * @param playerHandicap - The player's handicap (0-36+)
 * @param holeIndex - The hole's difficulty index (1-18, where 1 = hardest)
 * @returns Number of strokes received on this hole
 *
 * @example
 * // Handicap 20 player on Index 5 hole
 * getShotsReceived(20, 5) // Returns 2 (base 1 + extra 1 because 5 <= remainder of 2)
 *
 * @example
 * // Handicap 10 player on Index 5 hole
 * getShotsReceived(10, 5) // Returns 1 (base 0 + extra 1 because 5 <= remainder of 10)
 */
export function getShotsReceived(playerHandicap: number, holeIndex: number): number {
  // Every 18 handicap points = 1 shot on every hole
  const baseShots = Math.floor(playerHandicap / 18);

  // Remaining handicap points are distributed to hardest holes first
  const remainder = playerHandicap % 18;

  let shotsReceived = baseShots;

  // If the hole's index is within the remainder, player gets an extra shot
  // Example: remainder=5 means extra shots on Index 1,2,3,4,5 (the 5 hardest holes)
  if (holeIndex <= remainder) {
    shotsReceived += 1;
  }

  return shotsReceived;
}

/**
 * Calculate the net score for a hole
 *
 * @param grossStrokes - Actual strokes taken
 * @param playerHandicap - Player's handicap
 * @param holeIndex - Hole difficulty index (1-18)
 * @returns Net score (gross - shots received)
 */
export function calculateNetScore(
  grossStrokes: number,
  playerHandicap: number,
  holeIndex: number
): number {
  const shotsReceived = getShotsReceived(playerHandicap, holeIndex);
  return grossStrokes - shotsReceived;
}

/**
 * Calculate total net score for multiple holes
 *
 * @param scores - Array of { grossStrokes, holeIndex } objects
 * @param playerHandicap - Player's handicap
 * @returns Total net score
 */
export function calculateTotalNetScore(
  scores: Array<{ grossStrokes: number; holeIndex: number }>,
  playerHandicap: number
): number {
  return scores.reduce((total, score) => {
    return total + calculateNetScore(score.grossStrokes, playerHandicap, score.holeIndex);
  }, 0);
}

/**
 * Get score relative to par (for display)
 *
 * @param netScore - Net score for the hole
 * @param par - Par for the hole
 * @returns Object with relative score and display info
 */
export function getScoreRelativeToPar(netScore: number, par: number) {
  const relative = netScore - par;

  let label = "";
  let emoji = "";

  if (relative <= -3) {
    label = "Albatross";
    emoji = "🦅🦅";
  } else if (relative === -2) {
    label = "Eagle";
    emoji = "🦅";
  } else if (relative === -1) {
    label = "Birdie";
    emoji = "🐦";
  } else if (relative === 0) {
    label = "Par";
    emoji = "✅";
  } else if (relative === 1) {
    label = "Bogey";
    emoji = "😐";
  } else if (relative === 2) {
    label = "Double Bogey";
    emoji = "😬";
  } else {
    label = `+${relative}`;
    emoji = "💀";
  }

  return {
    relative,
    label,
    emoji,
    display: relative === 0 ? "E" : relative > 0 ? `+${relative}` : `${relative}`,
  };
}

/**
 * Format handicap strokes for display
 *
 * @param shotsReceived - Number of shots received
 * @returns Display string
 */
export function formatShotsReceived(shotsReceived: number): string {
  if (shotsReceived === 0) return "No shots";
  if (shotsReceived === 1) return "1 shot";
  return `${shotsReceived} shots`;
}
