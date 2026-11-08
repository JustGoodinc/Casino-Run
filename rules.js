// Casino Run game rules: pure outcome logic with no DOM (3DS port stage 1, docs/3ds/PORTING_PLAN.md).
// Every outcome-deciding random number goes through CR.rules.rand(). By default that is Math.random
// (read at call time, so tests that stub Math.random still work). CR.rules.seed(n) switches to a
// deterministic mulberry32 stream, so the C port can be checked against the same seed.
window.CR = window.CR || {};
CR.rules = (() => {
  let seeded = null;
  const mulberry32 = (a) => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rand = () => (seeded ? seeded() : Math.random());
  const randInt = (n) => Math.floor(rand() * n);

  // Plinko: the slot is rolled first, the ball is steered into it. Return per $1 = 0.955.
  const plinkoMultipliers = [0, 0.5, 1, 2, 5];
  const plinkoSlotOdds = [0.38, 0.23, 0.18, 0.13, 0.08];
  function rollPlinkoSlot() {
    let roll = rand();
    for (let i = 0; i < plinkoSlotOdds.length; i++) {
      roll -= plinkoSlotOdds[i];
      if (roll < 0) return i;
    }
    return 0;
  }

  // Roulette (European, single zero).
  const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const getRouletteColor = (n) => (n === 0 ? "green" : redNumbers.has(n) ? "red" : "black");
  function getRandomRouletteNumberForColor(color) {
    const options = [];
    for (let i = 0; i <= 36; i++) if (getRouletteColor(i) === color) options.push(i);
    return options[randInt(options.length)];
  }
  // Magnet pulls 55% of spins to the bet colour (never applies to green).
  const rollRoulette = (magnetColor = null) =>
    magnetColor && rand() < 0.55 ? getRandomRouletteNumberForColor(magnetColor) : randInt(37);

  // Crash: P(crash point > m) = 0.96 / m, capped at 100x.
  const generateCrashPoint = () => Math.min(100, Math.max(1, 0.96 / (1 - rand())));

  // Elephant River: multiplier = 0.96 / survival, so any cash-out lane returns 0.96 per $1.
  const getFrogBaseCrashChance = (lane) => Math.min(0.12 + lane * 0.08, 0.55);
  function getFrogMultiplier(lane) {
    let survival = 1;
    for (let i = 1; i <= lane; i++) survival *= 1 - getFrogBaseCrashChance(i);
    return 0.96 / survival;
  }

  // Blackjack.
  function shuffledDeck(suits, ranks) {
    const deck = [];
    suits.forEach((suit) => ranks.forEach((rank) => deck.push({ rank, suit })));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  const getCardValue = (card) => (card.rank === "A" ? 11 : ["J", "Q", "K"].includes(card.rank) ? 10 : Number(card.rank));
  function getHandValue(hand) {
    let total = 0, aces = 0;
    hand.forEach((card) => { total += getCardValue(card); if (card.rank === "A") aces++; });
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }
  const isBlackjack = (hand) => hand.length === 2 && getHandValue(hand) === 21;

  // Fisher-Yates (replaces the biased sort(() => Math.random() - 0.5) shuffle).
  function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const pick = (list) => list[randInt(list.length)];

  // Settlement (stage 1b): the money formulas only; inventory/UI side effects stay in script.js.
  const START = { balance: 100, goal: 300, time: 120 };
  const nextGoal = (balance) => Math.max(50, Math.ceil(balance * 3)); // goal for the next round
  const goalCutterGoal = (goal) => Math.max(50, Math.ceil(goal * 0.9));
  const coinFlipRescue = (goal) => goal * 0.2;
  const streakBonusRate = (streak) => (streak >= 5 ? 0.5 : streak === 4 ? 0.35 : streak === 3 ? 0.2 : streak === 2 ? 0.1 : 0);
  const hulaGirlBonus = (baseProfit, count) => (baseProfit > 0 ? baseProfit * 0.1 * count : 0);
  // Grease Fire triples a real streak bonus (and is used up only then); on a loss it burns 25% of balance.
  function streakBonus(baseProfit, streak, greaseFire) {
    const bonus = Math.max(0, baseProfit) * streakBonusRate(streak);
    return greaseFire && bonus > 0 ? { bonus: bonus * 3, greaseUsed: true } : { bonus, greaseUsed: false };
  }
  const greaseFireBurn = (balance) => balance * 0.25;
  // Full loss: up to 2 Insurance Tickets refund 50% of the bet each; Cashback refunds 5%.
  function lossRefund(bet, insuranceCount, cashbackActive) {
    const tickets = Math.min(insuranceCount, 2);
    const insurance = bet * 0.5 * tickets;
    const cashback = cashbackActive ? bet * 0.05 : 0;
    return { tickets, insurance, cashback, total: insurance + cashback };
  }

  return {
    START, nextGoal, goalCutterGoal, coinFlipRescue,
    streakBonusRate, hulaGirlBonus, streakBonus, greaseFireBurn, lossRefund,
    seed: (n) => { seeded = n == null ? null : mulberry32(n >>> 0); },
    rand, randInt, shuffle, pick,
    plinkoMultipliers, plinkoSlotOdds, rollPlinkoSlot,
    redNumbers, getRouletteColor, getRandomRouletteNumberForColor, rollRoulette,
    generateCrashPoint,
    getFrogBaseCrashChance, getFrogMultiplier,
    shuffledDeck, getCardValue, getHandValue, isBlackjack,
  };
})();
