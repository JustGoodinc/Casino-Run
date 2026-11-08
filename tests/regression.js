// Casino Run regression checks. Run against a served copy of the game (not file://):
//   1. Serve the repo root, e.g.  py -m http.server 8765
//   2. Open http://localhost:8765/ and paste this file into the DevTools console.
// Randomness is stubbed so every result is reproducible. Prints a pass/fail table.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const realRandom = Math.random;
  const results = [];
  const check = (name, ok, detail = "") => results.push({ name, ok: ok ? "PASS" : "FAIL", detail });
  const freshRun = () => { resetRunToTitleScreen(); document.getElementById("play-btn").click(); };

  try {
    freshRun();
    check("New run: $100 / $300 / 120s", balance === 100 && goal === 300 && timeLeft === 120, `${balance}/${goal}/${timeLeft}`);

    // Hot Streak table: 0,1 -> 0%, 2 -> 10%, 3 -> 20%, 4 -> 35%, 5+ -> 50%
    const rates = [0, 1, 2, 3, 4, 5, 9].map((s) => { currentWinStreak = s; return getStreakBonusRate(); });
    check("Hot Streak bonus table", JSON.stringify(rates) === JSON.stringify([0, 0, 0.1, 0.2, 0.35, 0.5, 0.5]), JSON.stringify(rates));
    currentWinStreak = 0;

    // Timer keeps running while a (non-blocking) win popup plays.
    changeBalance(1, [{ type: "base", text: "test" }]);
    const t0 = timeLeft;
    await wait(2300);
    check("Timer not frozen by win popup", timeLeft < t0, `${t0} -> ${timeLeft}`);

    // Roulette: color is locked at spin time.
    freshRun();
    selectRouletteBet("red"); rouletteBetSlider.value = 10; updateBetSliders();
    Math.random = () => 2.5 / 37; spinBtn.click(); Math.random = realRandom; // result 2 = black
    await wait(3000); selectRouletteBet("black"); await wait(1400);
    check("Roulette: switching color mid-spin does not win", balance === 90, `balance ${balance}`);

    // Vinyl not consumed when no color is picked.
    selectedRouletteBet = null; activeFreeRouletteMaxSpin = 1; spinBtn.click();
    check("Roulette: Vinyl kept when no color picked", activeFreeRouletteMaxSpin === 1);
    activeFreeRouletteMaxSpin = 0;

    // Elephant River stops at the safe shore (lane 5).
    freshRun();
    Math.random = () => 0.99;
    frogBetSlider.value = 1; updateBetSliders(); frogStartBtn.click();
    for (let i = 0; i < 8; i++) { hopFrogForward(); await wait(560); }
    Math.random = realRandom;
    check("Elephant River caps at lane 5", frogLane === 5 && frogHopBtn.disabled, `lane ${frogLane}`);
    cashOutFrogRoad(); await wait(950);

    // A spin from a reset run does not pay into the next run.
    freshRun();
    selectRouletteBet("red"); rouletteBetSlider.value = 50; updateBetSliders();
    Math.random = () => 1.5 / 37; spinBtn.click(); Math.random = realRandom; // result 1 = red (win)
    freshRun();
    await wait(4500);
    check("No stale settlement after reset", balance === 100 && !rouletteSpinning, `balance ${balance}`);

    // Goal popup does not open if balance dropped back below goal while it was queued.
    freshRun();
    changeBalance(250, [{ type: "base", text: "x" }]); checkGameState(); changeBalance(-200);
    await wait(3500);
    check("Goal popup re-checks balance", !goalPopupOpen, `balance ${balance}, goal ${goal}`);

    // Grease Fire is not wasted on a win that has no streak bonus.
    freshRun();
    greaseFireActive = true; currentWinStreak = 0;
    applyRoundWin(20, 10, [], "Test"); // streak -> 1, bonus 0%
    check("Grease Fire survives a 0% bonus win", greaseFireActive === true);
    applyRoundWin(20, 10, [], "Test"); // streak -> 2, bonus 10% of 10 = 1, tripled = 3
    check("Grease Fire triples next real bonus", !greaseFireActive && Math.abs(totalHotStreakBonusEarned - 3) < 1e-9, `bonus ${totalHotStreakBonusEarned}`);

    // Return per $1 (EV) target ~0.96 for every game with a free cash-out choice.
    const N = 200000;
    const crashPoints = Array.from({ length: N }, generateCrashPoint);
    const crashEv = [1.1, 2, 5, 20].map((m) => (crashPoints.filter((p) => p > m).length / N) * m);
    check("Crash EV ~0.96 at 1.1x/2x/5x/20x", crashEv.every((ev) => ev > 0.93 && ev < 0.99), crashEv.map((e) => e.toFixed(3)).join(" "));

    let survival = 1;
    const riverEv = [1, 2, 3, 4, 5].map((lane) => { survival *= 1 - getFrogBaseCrashChance(lane); return survival * getFrogMultiplier(lane); });
    check("Elephant River EV 0.96 at every lane", riverEv.every((ev) => Math.abs(ev - 0.96) < 1e-9), riverEv.map((e) => e.toFixed(3)).join(" "));

    // Roulette wheel art: every number once, colours alternate around the wheel (0 excepted).
    const order = WHEEL_ORDER;
    const alternates = order.slice(1).every((n, i) => i === 0 || getRouletteColor(n) !== getRouletteColor(order[i]));
    check("Roulette wheel order: 37 unique, red/black alternate", new Set(order).size === 37 && order.every((n) => n >= 0 && n <= 36) && alternates);

    // Rules module (3DS stage 1): the same seed gives the same outcomes; seed(null) goes back to Math.random.
    const sample = () => [CR.rules.rollPlinkoSlot(), CR.rules.generateCrashPoint(), CR.rules.rollRoulette(), CR.rules.shuffledDeck(["s"], ["A", "2", "3", "4"]).map((c) => c.rank).join("")].join("|");
    CR.rules.seed(42); const s1 = sample(); CR.rules.seed(42); const s2 = sample(); CR.rules.seed(7); const s3 = sample(); CR.rules.seed(null);
    check("Seeded rules are deterministic", s1 === s2 && s1 !== s3, `${s1} / ${s3}`);

    // Settlement formulas (stage 1b) pinned to the documented values.
    const Rr = CR.rules, lr = Rr.lossRefund(20, 3, true), sb = Rr.streakBonus(10, 2, true);
    check("Settlement formulas", Rr.nextGoal(100) === 300 && Rr.nextGoal(10) === 50 && Rr.goalCutterGoal(300) === 270
      && Rr.streakBonusRate(1) === 0 && Rr.streakBonusRate(5) === 0.5 && Rr.hulaGirlBonus(10, 2) === 2
      && sb.bonus === 3 && sb.greaseUsed && !Rr.streakBonus(10, 1, true).greaseUsed
      && lr.tickets === 2 && lr.insurance === 20 && lr.cashback === 1 && Rr.coinFlipRescue(300) === 60,
      JSON.stringify({ lr, sb }));

    const slotCounts = [0, 0, 0, 0, 0];
    for (let i = 0; i < N; i++) slotCounts[rollPlinkoSlot()]++;
    const plinkoEv = slotCounts.reduce((sum, c, i) => sum + (c / N) * plinkoMultipliers[i], 0);
    check("Plinko EV ~0.96", plinkoEv > 0.94 && plinkoEv < 0.97, plinkoEv.toFixed(3));

    // Plinko: the visual drop pays the rolled slot (forced to 5x). $100 - $10 + $50 = $140.
    freshRun();
    document.querySelector('[data-screen="plinko-screen"]').click();
    await wait(100); createPegs();
    plinkoBetSlider.value = 10; updateBetSliders();
    // Force the slot roll itself (counting Math.random draws broke once sounds also drew random pitch).
    const realRoll = rollPlinkoSlot;
    rollPlinkoSlot = () => 4;
    // A hidden/minimised window pauses requestAnimationFrame entirely, so drive frames with a timer
    // during the drop (test-only; the physics itself is unchanged).
    const realRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    plinkoBtn.click();
    rollPlinkoSlot = realRoll;
    for (let i = 0; i < 1800 && activePlinkoBalls > 0; i++) await wait(100);
    window.requestAnimationFrame = realRaf;
    check("Plinko pays the rolled slot", balance === 140 && activePlinkoBalls === 0, `balance ${balance}`);

    // Roulette Magnet ignores green and stays active.
    freshRun();
    activeRouletteMagnet = true; selectRouletteBet("green"); rouletteBetSlider.value = 1; updateBetSliders();
    spinBtn.click();
    check("Magnet not used on green", activeRouletteMagnet === true);
    await wait(4300);
    activeRouletteMagnet = false;

    // Lucky Match / Heat Shield
    freshRun();
    currentWinStreak = 4; inventory.push("luckyMatch"); handleHotStreakLoss();
    check("Lucky Match keeps streak", currentWinStreak === 4 && !hasItem("luckyMatch"));
    inventory.push("heatShield"); handleHotStreakLoss();
    check("Heat Shield lowers streak by 1", currentWinStreak === 3 && !hasItem("heatShield"));
    handleHotStreakLoss();
    check("Unprotected loss resets streak", currentWinStreak === 0);

    // Dev stash run is kept off the leaderboard and returns to title.
    freshRun();
    for (let i = 0; i < 3; i++) document.querySelector(".dev-u").click();
    cashOutRun();
    await submitScore();
    check("Dev run not submitted; back to title", !titleScreen.classList.contains("hidden") && namePopup.classList.contains("hidden"));

    // Cash out offers a way back to the title.
    freshRun(); cashOutRun();
    document.getElementById("skip-score-btn").click();
    check("Cash out skip returns to title", !titleScreen.classList.contains("hidden"));
  } catch (error) {
    check("Suite crashed", false, String(error));
  } finally {
    Math.random = realRandom;
    resetRunToTitleScreen();
  }

  console.table(results);
  return results;
})();
