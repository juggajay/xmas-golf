// Course configuration with hole data
// Index = difficulty ranking (1 = hardest, 18 = easiest)

export interface HoleData {
  number: number;
  par: number;
  index: number; // Stroke index / difficulty (1-18, 1 = hardest)
  name?: string;
}

// Default course holes - update par values as needed for your course
export const COURSE_HOLES: HoleData[] = [
  { number: 1, par: 4, index: 18 },
  { number: 2, par: 4, index: 8 },
  { number: 3, par: 4, index: 12 },
  { number: 4, par: 5, index: 3 },
  { number: 5, par: 3, index: 14 },
  { number: 6, par: 4, index: 5 },
  { number: 7, par: 4, index: 11 },
  { number: 8, par: 5, index: 1 },  // Hardest hole
  { number: 9, par: 3, index: 15 },
  { number: 10, par: 4, index: 10 },
  { number: 11, par: 3, index: 17 },
  { number: 12, par: 5, index: 4 },
  { number: 13, par: 4, index: 9 },
  { number: 14, par: 3, index: 16 },
  { number: 15, par: 5, index: 2 },  // 2nd hardest
  { number: 16, par: 4, index: 7 },
  { number: 17, par: 4, index: 13 },
  { number: 18, par: 4, index: 6 },
];

// Get total par for the course
export const COURSE_PAR = COURSE_HOLES.reduce((sum, hole) => sum + hole.par, 0);

// Front 9 par
export const FRONT_9_PAR = COURSE_HOLES.slice(0, 9).reduce((sum, hole) => sum + hole.par, 0);

// Back 9 par
export const BACK_9_PAR = COURSE_HOLES.slice(9, 18).reduce((sum, hole) => sum + hole.par, 0);

// Helper to get hole data by number
export function getHoleData(holeNumber: number): HoleData | undefined {
  return COURSE_HOLES.find((h) => h.number === holeNumber);
}

// Helper to get par for a specific hole
export function getHolePar(holeNumber: number): number {
  return getHoleData(holeNumber)?.par ?? 4;
}

// Helper to get index for a specific hole
export function getHoleIndex(holeNumber: number): number {
  return getHoleData(holeNumber)?.index ?? 9;
}
