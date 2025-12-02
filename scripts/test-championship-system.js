/**
 * Test script for Championship and ELO System
 *
 * Run with: node scripts/test-championship-system.js
 *
 * This script tests:
 * 1. ELO calculations
 * 2. Championship creation
 * 3. Squadron ranking updates
 */

const eloService = require('../src/lib/services/eloService');

console.log('🏁 KARTEANDO - CHAMPIONSHIP & ELO SYSTEM TEST\n');
console.log('='.repeat(60));

// Test 1: ELO Calculation - Balanced Field
console.log('\n📊 TEST 1: ELO Calculation - Balanced Field');
console.log('-'.repeat(60));

const balancedSquadrons = [
  { squadronId: 'A', currentElo: 1500, position: 1 },
  { squadronId: 'B', currentElo: 1500, position: 2 },
  { squadronId: 'C', currentElo: 1500, position: 3 },
  { squadronId: 'D', currentElo: 1500, position: 4 }
];

console.log('\nScenario: 4 squadrons, all starting at 1500 ELO');
console.log('Expected: Winners gain ~16 ELO, losers lose ~16 ELO\n');

const balancedResults = eloService.default.calculateRaceEloChanges(balancedSquadrons);

balancedResults.forEach(result => {
  const arrow = result.eloChange > 0 ? '↑' : result.eloChange < 0 ? '↓' : '→';
  const color = result.eloChange > 0 ? '\x1b[32m' : result.eloChange < 0 ? '\x1b[31m' : '\x1b[33m';
  console.log(
    `${color}Squadron ${result.squadronId}: Position ${result.position} | ` +
    `${result.currentElo} → ${result.newElo} (${arrow}${result.eloChange >= 0 ? '+' : ''}${result.eloChange})\x1b[0m`
  );
});

// Test 2: ELO Calculation - Underdog Wins
console.log('\n\n📊 TEST 2: ELO Calculation - Underdog Wins 🎉');
console.log('-'.repeat(60));

const underdogSquadrons = [
  { squadronId: 'Underdog', currentElo: 1400, position: 1 },
  { squadronId: 'Favorite', currentElo: 1700, position: 2 },
  { squadronId: 'Strong', currentElo: 1650, position: 3 },
  { squadronId: 'Average', currentElo: 1550, position: 4 }
];

console.log('\nScenario: Underdog (1400) beats Favorite (1700)');
console.log('Expected: Underdog gains big ELO (~28), Favorite loses more\n');

const underdogResults = eloService.default.calculateRaceEloChanges(underdogSquadrons);

underdogResults.forEach(result => {
  const arrow = result.eloChange > 0 ? '↑' : result.eloChange < 0 ? '↓' : '→';
  const color = result.eloChange > 0 ? '\x1b[32m' : result.eloChange < 0 ? '\x1b[31m' : '\x1b[33m';
  const emoji = result.squadronId === 'Underdog' && result.position === 1 ? ' 🏆' : '';
  console.log(
    `${color}${result.squadronId.padEnd(12)}: Position ${result.position} | ` +
    `${result.currentElo} → ${result.newElo} (${arrow}${result.eloChange >= 0 ? '+' : ''}${result.eloChange})${emoji}\x1b[0m`
  );
});

// Test 3: ELO Calculation - Favorite Wins
console.log('\n\n📊 TEST 3: ELO Calculation - Favorite Wins (Expected Result)');
console.log('-'.repeat(60));

const favoriteSquadrons = [
  { squadronId: 'Favorite', currentElo: 1750, position: 1 },
  { squadronId: 'Average', currentElo: 1500, position: 2 },
  { squadronId: 'Weak', currentElo: 1450, position: 3 }
];

console.log('\nScenario: Favorite (1750) wins against weaker opponents');
console.log('Expected: Favorite gains small ELO (~10), as expected\n');

const favoriteResults = eloService.default.calculateRaceEloChanges(favoriteSquadrons);

favoriteResults.forEach(result => {
  const arrow = result.eloChange > 0 ? '↑' : result.eloChange < 0 ? '↓' : '→';
  const color = result.eloChange > 0 ? '\x1b[32m' : result.eloChange < 0 ? '\x1b[31m' : '\x1b[33m';
  console.log(
    `${color}${result.squadronId.padEnd(12)}: Position ${result.position} | ` +
    `${result.currentElo} → ${result.newElo} (${arrow}${result.eloChange >= 0 ? '+' : ''}${result.eloChange})\x1b[0m`
  );
});

// Test 4: Division Assignment
console.log('\n\n📊 TEST 4: Division Assignment Based on ELO');
console.log('-'.repeat(60));

const testElos = [
  { elo: 1900, expected: 'Elite' },
  { elo: 1800, expected: 'Elite' },
  { elo: 1750, expected: 'Masters' },
  { elo: 1650, expected: 'Masters' },
  { elo: 1550, expected: 'Pro' },
  { elo: 1500, expected: 'Pro' },
  { elo: 1450, expected: 'Open' },
  { elo: 1400, expected: 'Open' }
];

console.log('\nDivision Ranges:');
console.log('  Elite:   >1800 ELO');
console.log('  Masters: 1650-1800 ELO');
console.log('  Pro:     1500-1650 ELO');
console.log('  Open:    <1500 ELO\n');

testElos.forEach(test => {
  const division = eloService.default.getDivisionFromElo(test.elo);
  const match = division === test.expected ? '✅' : '❌';
  const color = match === '✅' ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${match} ELO ${test.elo}: ${division} (expected: ${test.expected})\x1b[0m`);
});

// Test 5: Expected vs Actual Score
console.log('\n\n📊 TEST 5: Expected Score Calculation');
console.log('-'.repeat(60));

console.log('\nExpected Score Formula: E = 1 / (1 + 10^((OpponentAvg - MyElo) / 400))');
console.log('This represents probability of winning against average opponent\n');

const scoreTests = [
  { myElo: 1500, opponentAvg: 1500, description: 'Equal strength' },
  { myElo: 1600, opponentAvg: 1500, description: 'Stronger than average' },
  { myElo: 1400, opponentAvg: 1500, description: 'Weaker than average' },
  { myElo: 1700, opponentAvg: 1500, description: 'Much stronger' },
  { myElo: 1300, opponentAvg: 1500, description: 'Much weaker' }
];

scoreTests.forEach(test => {
  const expectedScore = eloService.default.calculateExpectedScore(test.myElo, test.opponentAvg);
  const percentage = (expectedScore * 100).toFixed(1);
  console.log(
    `My ELO: ${test.myElo} vs Avg: ${test.opponentAvg} | ` +
    `Expected: ${expectedScore.toFixed(3)} (${percentage}% win probability) | ${test.description}`
  );
});

// Test 6: Actual Score by Position
console.log('\n\n📊 TEST 6: Actual Score by Position');
console.log('-'.repeat(60));

const totalSquadrons = 6;
console.log(`\nIn a race with ${totalSquadrons} squadrons:`);
console.log('Formula: S = (totalSquadrons - position) / (totalSquadrons - 1)\n');

for (let position = 1; position <= totalSquadrons; position++) {
  const actualScore = eloService.default.calculateActualScore(position, totalSquadrons);
  const percentage = (actualScore * 100).toFixed(1);
  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '  ';
  console.log(
    `${medal} Position ${position}: Score ${actualScore.toFixed(3)} (${percentage}%)`
  );
}

// Test 7: Full Season Simulation
console.log('\n\n📊 TEST 7: Full Season Simulation (6 races)');
console.log('-'.repeat(60));

const season = {
  squadrons: [
    { id: 'Velocity', elo: 1500, totalPoints: 0, wins: 0, races: [] },
    { id: 'Thunder', elo: 1500, totalPoints: 0, wins: 0, races: [] },
    { id: 'Speed', elo: 1500, totalPoints: 0, wins: 0, races: [] },
    { id: 'Nitro', elo: 1500, totalPoints: 0, wins: 0, races: [] }
  ]
};

// F1 Points system
const f1Points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Simulate 6 races with varying results
const races = [
  ['Velocity', 'Thunder', 'Speed', 'Nitro'],    // Race 1: Velocity wins
  ['Thunder', 'Velocity', 'Speed', 'Nitro'],    // Race 2: Thunder wins
  ['Velocity', 'Speed', 'Thunder', 'Nitro'],    // Race 3: Velocity wins
  ['Speed', 'Velocity', 'Thunder', 'Nitro'],    // Race 4: Speed wins
  ['Velocity', 'Thunder', 'Speed', 'Nitro'],    // Race 5: Velocity wins
  ['Velocity', 'Thunder', 'Nitro', 'Speed']     // Race 6: Velocity wins (champion!)
];

console.log('\nSimulating 6-race championship...\n');

races.forEach((raceOrder, raceIndex) => {
  console.log(`\x1b[36m━━━ Race ${raceIndex + 1} ━━━\x1b[0m`);

  // Prepare race data
  const raceData = raceOrder.map((id, index) => {
    const squadron = season.squadrons.find(s => s.id === id);
    return {
      squadronId: id,
      currentElo: squadron.elo,
      position: index + 1
    };
  });

  // Calculate ELO changes
  const results = eloService.default.calculateRaceEloChanges(raceData);

  // Update squadrons
  results.forEach((result, index) => {
    const squadron = season.squadrons.find(s => s.id === result.squadronId);
    const points = f1Points[result.position - 1] || 0;

    squadron.elo = result.newElo;
    squadron.totalPoints += points;
    if (result.position === 1) squadron.wins++;

    squadron.races.push({
      race: raceIndex + 1,
      position: result.position,
      points,
      elo: result.newElo,
      eloChange: result.eloChange
    });

    const medal = result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : '  ';
    const eloArrow = result.eloChange > 0 ? '↑' : '↓';
    console.log(
      `${medal} ${result.squadronId.padEnd(10)} P${result.position} | ` +
      `+${points} pts | ELO: ${result.currentElo} → ${result.newElo} (${eloArrow}${result.eloChange >= 0 ? '+' : ''}${result.eloChange})`
    );
  });
  console.log('');
});

// Final standings
console.log('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[33m🏆 FINAL CHAMPIONSHIP STANDINGS\x1b[0m');
console.log('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

season.squadrons.sort((a, b) => b.totalPoints - a.totalPoints);

season.squadrons.forEach((squadron, index) => {
  const position = index + 1;
  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}. `;
  const division = eloService.default.getDivisionFromElo(squadron.elo);
  const eloChange = squadron.elo - 1500;
  const eloArrow = eloChange > 0 ? '↑' : '↓';

  console.log(
    `${medal} ${squadron.id.padEnd(10)} | ` +
    `${squadron.totalPoints} pts | ${squadron.wins} wins | ` +
    `ELO: ${squadron.elo} (${eloArrow}${eloChange >= 0 ? '+' : ''}${eloChange}) | ${division}`
  );
});

console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS COMPLETED!');
console.log('='.repeat(60) + '\n');

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    eloService,
    testResults: {
      balancedResults,
      underdogResults,
      favoriteResults,
      seasonResults: season
    }
  };
}
