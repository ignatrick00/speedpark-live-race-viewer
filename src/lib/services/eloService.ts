/**
 * ELO Service
 *
 * Calculates ELO rating changes for squadrons after races
 * Based on the standard ELO system adapted for multi-competitor races
 */

// K-factor determines how much ELO changes per race
// Higher K = more volatile ratings
const K_FACTOR = 32;

/**
 * Calculate expected score for a squadron against the average ELO of opponents
 *
 * Formula: E = 1 / (1 + 10^((avgOpponentElo - myElo) / 400))
 *
 * @param myElo - Squadron's current ELO rating
 * @param opponentAvgElo - Average ELO of all opponents
 * @returns Expected score between 0 and 1
 */
export function calculateExpectedScore(myElo: number, opponentAvgElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentAvgElo - myElo) / 400));
}

/**
 * Calculate actual score based on final position
 *
 * Formula: S = (totalSquadrons - position) / (totalSquadrons - 1)
 *
 * Examples:
 * - 1st place out of 5: (5-1)/(5-1) = 1.0
 * - 2nd place out of 5: (5-2)/(5-1) = 0.75
 * - 3rd place out of 5: (5-3)/(5-1) = 0.5
 * - 5th place out of 5: (5-5)/(5-1) = 0.0
 *
 * @param position - Final position in race (1 = first)
 * @param totalSquadrons - Total number of squadrons in race
 * @returns Actual score between 0 and 1
 */
export function calculateActualScore(position: number, totalSquadrons: number): number {
  if (totalSquadrons <= 1) {
    return 0.5; // No competition = neutral score
  }
  return (totalSquadrons - position) / (totalSquadrons - 1);
}

/**
 * Calculate ELO change for a squadron after a race
 *
 * Formula: ΔElo = K * (actualScore - expectedScore)
 *
 * @param myElo - Squadron's current ELO
 * @param position - Final position (1 = first)
 * @param allSquadronsElo - Array of all squadrons' ELO ratings (including this one)
 * @returns ELO change (can be positive or negative)
 */
export function calculateEloChange(
  myElo: number,
  position: number,
  allSquadronsElo: number[]
): number {
  const totalSquadrons = allSquadronsElo.length;

  if (totalSquadrons < 2) {
    return 0; // No change if racing alone
  }

  // Calculate average ELO of opponents (excluding this squadron)
  const opponentsElo = allSquadronsElo.filter(elo => elo !== myElo);
  const opponentAvgElo = opponentsElo.length > 0
    ? opponentsElo.reduce((sum, elo) => sum + elo, 0) / opponentsElo.length
    : myElo;

  // Calculate expected and actual scores
  const expectedScore = calculateExpectedScore(myElo, opponentAvgElo);
  const actualScore = calculateActualScore(position, totalSquadrons);

  // Calculate ELO change
  const eloChange = K_FACTOR * (actualScore - expectedScore);

  // Round to nearest integer
  return Math.round(eloChange);
}

/**
 * Calculate ELO changes for all squadrons in a race
 *
 * @param squadronResults - Array of {squadronId, currentElo, position}
 * @returns Array of {squadronId, currentElo, newElo, eloChange, position}
 */
export function calculateRaceEloChanges(
  squadronResults: Array<{
    squadronId: string;
    currentElo: number;
    position: number;
  }>
): Array<{
  squadronId: string;
  currentElo: number;
  newElo: number;
  eloChange: number;
  position: number;
  opponentAvgElo: number;
}> {
  // Extract all ELO ratings
  const allElos = squadronResults.map(s => s.currentElo);

  // Calculate changes for each squadron
  return squadronResults.map(squadron => {
    // Calculate opponent average (excluding this squadron)
    const opponentElos = allElos.filter(elo => elo !== squadron.currentElo);
    const opponentAvgElo = opponentElos.length > 0
      ? opponentElos.reduce((sum, elo) => sum + elo, 0) / opponentElos.length
      : squadron.currentElo;

    const eloChange = calculateEloChange(
      squadron.currentElo,
      squadron.position,
      allElos
    );

    const newElo = squadron.currentElo + eloChange;

    return {
      squadronId: squadron.squadronId,
      currentElo: squadron.currentElo,
      newElo: Math.max(800, Math.min(2500, newElo)), // Clamp between 800-2500
      eloChange,
      position: squadron.position,
      opponentAvgElo
    };
  });
}

/**
 * Determine division based on ELO rating
 *
 * Elite: >1800
 * Masters: 1650-1800
 * Pro: 1500-1650
 * Open: <1500
 *
 * @param elo - Current ELO rating
 * @returns Division name
 */
export function getDivisionFromElo(elo: number): 'Elite' | 'Masters' | 'Pro' | 'Open' {
  if (elo > 1800) return 'Elite';
  if (elo >= 1650) return 'Masters';
  if (elo >= 1500) return 'Pro';
  return 'Open';
}

/**
 * Check if a squadron qualifies for a division based on their ELO
 *
 * @param currentElo - Squadron's current ELO
 * @param targetDivision - Division to check
 * @param allowLowerDivisions - If true, lower divisions are also acceptable
 * @returns true if qualified
 */
export function isQualifiedForDivision(
  currentElo: number,
  targetDivision: 'Elite' | 'Masters' | 'Pro' | 'Open',
  allowLowerDivisions: boolean = true
): boolean {
  const currentDivision = getDivisionFromElo(currentElo);

  const divisionRanks = {
    'Elite': 4,
    'Masters': 3,
    'Pro': 2,
    'Open': 1
  };

  const currentRank = divisionRanks[currentDivision];
  const targetRank = divisionRanks[targetDivision];

  if (allowLowerDivisions) {
    // Can register in same or lower divisions
    return currentRank >= targetRank;
  } else {
    // Must be exact division
    return currentRank === targetRank;
  }
}

/**
 * Example usage and expected ELO changes:
 *
 * Scenario 1: Balanced field
 * - 4 squadrons, all 1500 ELO
 * - 1st place: +16 ELO
 * - 2nd place: +5 ELO
 * - 3rd place: -5 ELO
 * - 4th place: -16 ELO
 *
 * Scenario 2: Underdog wins
 * - Squadron A: 1400 ELO (wins)
 * - Squadron B: 1600 ELO (2nd)
 * - Squadron C: 1650 ELO (3rd)
 * - Squadron A gains ~28 ELO (big upset!)
 *
 * Scenario 3: Favorite wins
 * - Squadron A: 1750 ELO (wins)
 * - Squadron B: 1500 ELO (2nd)
 * - Squadron C: 1450 ELO (3rd)
 * - Squadron A gains ~10 ELO (expected result)
 *
 * Scenario 4: Favorite loses
 * - Squadron A: 1750 ELO (3rd)
 * - Squadron B: 1500 ELO (1st)
 * - Squadron C: 1450 ELO (2nd)
 * - Squadron A loses ~22 ELO (big disappointment!)
 */

export default {
  calculateEloChange,
  calculateRaceEloChanges,
  calculateExpectedScore,
  calculateActualScore,
  getDivisionFromElo,
  isQualifiedForDivision,
  K_FACTOR
};
