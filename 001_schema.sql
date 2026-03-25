/**
 * Draw Engine Service
 * Handles random and algorithmic draw logic,
 * prize pool calculation, and winner determination.
 */

const PRIZE_POOL_DISTRIBUTION = {
  match5: 0.40,
  match4: 0.35,
  match3: 0.25
};

/**
 * Generate 5 draw numbers using random logic
 * @returns {number[]} 5 unique numbers between 1-45
 */
function generateRandomNumbers() {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const drawn = [];

  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    drawn.push(pool.splice(idx, 1)[0]);
  }

  return drawn.sort((a, b) => a - b);
}

/**
 * Generate 5 draw numbers using algorithmic logic
 * Weighted by frequency of user scores:
 * - More frequent scores get higher weight (more likely to be drawn)
 * - Ensures more users can match more numbers
 *
 * @param {Array} allParticipantScores - array of score arrays
 * @param {string} mode - 'most_frequent' | 'least_frequent'
 * @returns {number[]} 5 unique weighted numbers
 */
function generateAlgorithmicNumbers(allParticipantScores, mode = 'most_frequent') {
  // Build frequency map
  const freq = {};
  for (let n = 1; n <= 45; n++) freq[n] = 0;

  for (const scores of allParticipantScores) {
    for (const s of scores) {
      if (s >= 1 && s <= 45) freq[s]++;
    }
  }

  // Build weighted pool
  const entries = Object.entries(freq).map(([num, count]) => ({
    num: parseInt(num),
    weight: mode === 'most_frequent' ? (count + 1) : (1 / (count + 1))
  }));

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

  const drawn = new Set();
  const attempts = entries.slice(); // copy

  while (drawn.size < 5) {
    let rand = Math.random() * totalWeight;
    for (const entry of attempts) {
      rand -= entry.weight;
      if (rand <= 0 && !drawn.has(entry.num)) {
        drawn.add(entry.num);
        break;
      }
    }
    // fallback: pick a random unselected number
    if (drawn.size < 5) {
      const remaining = entries.filter(e => !drawn.has(e.num));
      if (remaining.length > 0) {
        drawn.add(remaining[Math.floor(Math.random() * remaining.length)].num);
      }
    }
  }

  return Array.from(drawn).sort((a, b) => a - b);
}

/**
 * Determine how many of a user's scores match the drawn numbers
 * @param {number[]} userScores
 * @param {number[]} drawnNumbers
 * @returns {{ matched: number, tier: string|null }}
 */
function evaluateMatch(userScores, drawnNumbers) {
  const drawnSet = new Set(drawnNumbers);
  const matched = userScores.filter(s => drawnSet.has(s)).length;

  let tier = null;
  if (matched === 5) tier = 'match_5';
  else if (matched === 4) tier = 'match_4';
  else if (matched === 3) tier = 'match_3';

  return { matched, tier };
}

/**
 * Calculate prize pools from total subscription revenue
 * @param {number} totalPool
 * @param {number} rolloverAmount - existing jackpot rollover
 * @returns {{ match5: number, match4: number, match3: number }}
 */
function calculatePrizePools(totalPool, rolloverAmount = 0) {
  const base = totalPool;

  return {
    match5: parseFloat((base * PRIZE_POOL_DISTRIBUTION.match5 + rolloverAmount).toFixed(2)),
    match4: parseFloat((base * PRIZE_POOL_DISTRIBUTION.match4).toFixed(2)),
    match3: parseFloat((base * PRIZE_POOL_DISTRIBUTION.match3).toFixed(2))
  };
}

/**
 * Run a full draw simulation or official draw
 * @param {object} params
 * @returns {object} draw results
 */
function runDraw({ logic, participants, totalPool, rolloverAmount = 0 }) {
  // Generate drawn numbers
  let drawnNumbers;
  if (logic === 'algorithmic') {
    const allScores = participants.map(p => p.scores);
    drawnNumbers = generateAlgorithmicNumbers(allScores);
  } else {
    drawnNumbers = generateRandomNumbers();
  }

  // Evaluate each participant
  const results = participants.map(p => {
    const { matched, tier } = evaluateMatch(p.scores, drawnNumbers);
    return { ...p, matched, tier };
  });

  // Group winners by tier
  const winners = {
    match5: results.filter(r => r.tier === 'match_5'),
    match4: results.filter(r => r.tier === 'match_4'),
    match3: results.filter(r => r.tier === 'match_3')
  };

  // Calculate pools
  const pools = calculatePrizePools(totalPool, rolloverAmount);

  // Calculate individual prizes (split equally per tier)
  const prizes = {
    match5: winners.match5.length > 0
      ? parseFloat((pools.match5 / winners.match5.length).toFixed(2))
      : 0,
    match4: winners.match4.length > 0
      ? parseFloat((pools.match4 / winners.match4.length).toFixed(2))
      : 0,
    match3: winners.match3.length > 0
      ? parseFloat((pools.match3 / winners.match3.length).toFixed(2))
      : 0
  };

  const jackpotRolledOver = winners.match5.length === 0;

  return {
    drawnNumbers,
    pools,
    prizes,
    winners,
    participants: results,
    jackpotRolledOver,
    rolloverAmount: jackpotRolledOver ? pools.match5 : 0
  };
}

module.exports = {
  generateRandomNumbers,
  generateAlgorithmicNumbers,
  evaluateMatch,
  calculatePrizePools,
  runDraw
};
