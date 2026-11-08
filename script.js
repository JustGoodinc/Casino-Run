let balance = 100;
let goal = 300;
let timeLeft = 120;
let currentRound = 1;
let moneyPopupActive = false;
let devUEasterEggClicks = 0;
let devUEasterEggUnlocked = false;
let allInAnimationActive = false;
let popupQueueActive = false;
let popupQueue = Promise.resolve();
let goalPopupQueued = false;
// Bumped on every reset; async callbacks from an older run compare against it and bail.
let runId = 0;

let currentWinStreak = 0;
let highestWinStreak = 0;
let totalHotStreakBonusEarned = 0;
let greaseFireActive = false;
let consumedItemIds = [];
let runRoundHistory = [];
let gameLossStats = {};
let inventoryCollapsed = true;

let goalPopupOpen = false;
let runEnded = false;
let gameStarted = false;

let leaderboard = [];

let highestBalance = 100;
let balanceHistory = [100];

let runStartTime = null;
let runEndTime = null;
let gamePlayCounts = {
  Plinko: 0,
  Roulette: 0,
  Crash: 0,
  Blackjack: 0,
  "Elephant River": 0,
  "Horse Race": 0
};

let coinFlipUses = 0;
let coinFlipOpen = false;
let coinFlipAnimating = false;
const maxCoinFlips = 3;

const SUPABASE_PROJECT_URL = "https://deprjdkxyrrbfgfjukay.supabase.co";
const SUPABASE_ANON_PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcHJqZGt4eXJyYmZnZmp1a2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzA0NjEsImV4cCI6MjA5MzkwNjQ2MX0.ljw_0B1tiekRCyhbMF6E37XbP5bdy0XSKgk_-6A7QHc";
const SUPABASE_LEADERBOARD_TABLE = "leaderboard";
let leaderboardIsLoading = false;
let leaderboardSubmitBusy = false;

const toastMessage = document.getElementById("toast-message");
let moneyPopupLayer = document.getElementById("money-popup-layer");
let toastTimeout = null;

if (!moneyPopupLayer) {
  moneyPopupLayer = document.createElement("div");
  moneyPopupLayer.id = "money-popup-layer";
  moneyPopupLayer.className = "money-popup-layer hidden";
  document.body.appendChild(moneyPopupLayer);
}

function showToast(message) {
  if (!toastMessage) return;

  toastMessage.textContent = message;
  toastMessage.classList.remove("hidden");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toastMessage.classList.add("hidden");
  }, 2200);
}

/* ========================= */
/* SOUND SYSTEM */
/* ========================= */

let audioContext = null;

let rouletteTickInterval = null;
let rouletteSpinOscillator = null;
let rouletteSpinGain = null;

let crashRocketOscillator = null;
let crashRocketGain = null;

let lowMoneySirenInterval = null;
let lowMoneySirenOn = false;

let horseGallopInterval = null;

// Shares the CR.audio context so every sound goes through the same bus, volume, mute and limiter.
function getAudioContext() {
  audioContext = CR.audio.init();
  return audioContext;
}

// Synth fallback voice. Only used when a generated sample isn't loaded yet, or for live-pitched sounds.
function playTone(frequency, duration, type = "sine", volume = 0.12) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(CR.audio.sfxInput);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

// Plays a generated sample (assets/audio); runs the synth fallback if the sample isn't available.
function sfx(name, options, fallback) {
  if (!CR.audio.play(name, options) && fallback) fallback();
}

function playButtonClickSound() {
  sfx("ui_click", { rate: 0.95 + Math.random() * 0.1 }, () => {
    playTone(520, 0.04, "square", 0.06);
    setTimeout(() => playTone(720, 0.035, "square", 0.045), 35);
  });
}

// 8 peg voices (assets-src/audio/sfx.mjs): never the same one twice in a row, and the pitch climbs
// about a semitone per peg row, so each drop plays its own little rising run.
const PLINKO_PEG_VARIANTS = 8;
let lastPegVariant = 0;

function playPegHitSound(peg) {
  let variant = 1 + Math.floor(Math.random() * PLINKO_PEG_VARIANTS);
  if (variant === lastPegVariant) variant = (variant % PLINKO_PEG_VARIANTS) + 1;
  lastPegVariant = variant;
  const row = peg ? Math.max(0, Math.round((peg.y - 70) / 40)) : 0;
  const rate = 2 ** ((row - 3) / 12) * (0.98 + Math.random() * 0.04);
  sfx(`plinko_peg_${variant}`, { rate, gain: 0.55 }, () => playTone(650 + Math.random() * 350, 0.055, "triangle", 0.08));
}

// Each game has its own loop; the shop keeps whatever is playing; the title uses the lobby loop.
const SCREEN_MUSIC = {
  "plinko-screen": "music_plinko",
  "roulette-screen": "music_roulette",
  "crash-screen": "music_crash",
  "blackjack-screen": "music_blackjack",
  "frog-screen": "music_river",
  "horse-screen": "music_horse",
};

function playScreenMusic() {
  if (!gameStarted) {
    CR.audio.music("music_lobby");
    return;
  }
  const screen = document.querySelector(".screen.active-screen");
  const track = screen && SCREEN_MUSIC[screen.id];
  if (track) CR.audio.music(track);
}

function playCardDealSound() {
  sfx("card_deal", { rate: 0.9 + Math.random() * 0.2 }, () => playTone(420 + Math.random() * 120, 0.05, "triangle", 0.06));
}

function playHopSound() {
  sfx("river_step", { rate: 0.95 + Math.random() * 0.1 }, () => {
    playTone(520, 0.07, "triangle", 0.08);
    setTimeout(() => playTone(760, 0.06, "triangle", 0.06), 65);
  });
}

function playCarWhooshSound() {
  if (CR.audio.play("river_step", { rate: 0.6, gain: 0.35 })) return;
  playTone(160, 0.08, "sawtooth", 0.035);

  setTimeout(() => {
    playTone(110, 0.1, "sawtooth", 0.025);
  }, 55);
}

function playFrogHitSound() {
  if (CR.audio.play("river_splash")) return;
  playTone(120, 0.18, "sawtooth", 0.1);

  setTimeout(() => {
    playTone(70, 0.24, "sawtooth", 0.08);
  }, 120);
}

function playHorseStartSound() {
  if (CR.audio.play("horse_bugle")) return;
  playTone(480, 0.08, "square", 0.08);

  setTimeout(() => {
    playTone(720, 0.08, "square", 0.07);
  }, 90);

  setTimeout(() => {
    playTone(960, 0.12, "square", 0.07);
  }, 190);
}

function startHorseGallopSound() {
  stopHorseGallopSound();

  horseGallopInterval = setInterval(() => {
    if (CR.audio.play("horse_clop", { rate: 0.9 + Math.random() * 0.25, gain: 0.6 })) return;
    playTone(150 + Math.random() * 40, 0.035, "square", 0.035);

    setTimeout(() => {
      playTone(120 + Math.random() * 30, 0.035, "square", 0.03);
    }, 70);
  }, 200);
}

function stopHorseGallopSound() {
  if (horseGallopInterval) {
    clearInterval(horseGallopInterval);
    horseGallopInterval = null;
  }
}

function playFinishSound() {
  if (CR.audio.play("horse_finish")) return;
  playTone(880, 0.08, "triangle", 0.08);

  setTimeout(() => {
    playTone(1180, 0.11, "triangle", 0.08);
  }, 100);
}

function playCashSound() {
  if (CR.audio.play("payout_total")) return;
  playTone(700, 0.08, "sine", 0.08);

  setTimeout(() => {
    playTone(950, 0.09, "sine", 0.09);
  }, 80);

  setTimeout(() => {
    playTone(1250, 0.12, "sine", 0.08);
  }, 170);
}

function playLoseSound() {
  if (CR.audio.play("lose")) return;
  playTone(260, 0.12, "sawtooth", 0.08);

  setTimeout(() => {
    playTone(180, 0.18, "sawtooth", 0.07);
  }, 110);
}

function playGameOverSound() {
  CR.audio.music(null);
  if (CR.audio.play("game_over")) return;
  playTone(220, 0.14, "sawtooth", 0.1);

  setTimeout(() => {
    playTone(150, 0.18, "sawtooth", 0.09);
  }, 140);

  setTimeout(() => {
    playTone(90, 0.35, "sawtooth", 0.08);
  }, 300);
}

function startLowMoneySiren() {
  if (lowMoneySirenOn) return;

  lowMoneySirenOn = true;

  let highTone = false;

  // Audio bible rule 4: a soft pulse every 2 s instead of a continuous 520 ms siren (fatiguing).
  lowMoneySirenInterval = setInterval(() => {
    if (!lowMoneySirenOn) return;

    highTone = !highTone;
    sfx("time_tick", { rate: highTone ? 0.8 : 0.7, gain: 0.7 }, () => playTone(highTone ? 620 : 430, 0.22, "sine", 0.025));
  }, 2000);
}

function stopLowMoneySiren() {
  lowMoneySirenOn = false;

  if (lowMoneySirenInterval) {
    clearInterval(lowMoneySirenInterval);
    lowMoneySirenInterval = null;
  }
}

function startRouletteSpinSound() {
  const ctx = getAudioContext();

  stopRouletteSpinSound();

  // Sample path: ball-rattle ticks that slow down over the 4 s spin (the old interval never slowed).
  if (CR.audio.play("roulette_tick", { gain: 0.7 })) {
    let delay = 55;
    const tick = () => {
      CR.audio.play("roulette_tick", { rate: 0.9 + Math.random() * 0.2, gain: 0.7 });
      delay *= 1.09;
      if (delay < 450) rouletteTickInterval = setTimeout(tick, delay);
    };
    rouletteTickInterval = setTimeout(tick, delay);
    return;
  }
  if (!ctx) return;

  rouletteSpinOscillator = ctx.createOscillator();
  rouletteSpinGain = ctx.createGain();

  rouletteSpinOscillator.type = "sawtooth";
  rouletteSpinOscillator.frequency.setValueAtTime(140, ctx.currentTime);
  rouletteSpinOscillator.frequency.exponentialRampToValueAtTime(
    70,
    ctx.currentTime + 4
  );

  rouletteSpinGain.gain.setValueAtTime(0.055, ctx.currentTime);
  rouletteSpinGain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + 4
  );

  rouletteSpinOscillator.connect(rouletteSpinGain);
  rouletteSpinGain.connect(CR.audio.sfxInput);

  rouletteSpinOscillator.start();

  let tickSpeed = 55;

  rouletteTickInterval = setInterval(() => {
    playTone(900 + Math.random() * 200, 0.025, "square", 0.035);

    tickSpeed += 7;

    clearInterval(rouletteTickInterval);

    rouletteTickInterval = setInterval(() => {
      playTone(900 + Math.random() * 200, 0.025, "square", 0.035);
    }, tickSpeed);
  }, tickSpeed);
}

function stopRouletteSpinSound() {
  if (rouletteTickInterval) {
    clearInterval(rouletteTickInterval);
    clearTimeout(rouletteTickInterval);
    rouletteTickInterval = null;
  }

  if (rouletteSpinOscillator) {
    try {
      rouletteSpinOscillator.stop();
    } catch (error) {
      // Already stopped
    }

    rouletteSpinOscillator = null;
  }

  rouletteSpinGain = null;
}

// Kept as live synthesis on purpose: its pitch tracks the multiplier every frame.
function startCrashRocketSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  stopCrashRocketSound();

  crashRocketOscillator = ctx.createOscillator();
  crashRocketGain = ctx.createGain();

  crashRocketOscillator.type = "sawtooth";
  crashRocketOscillator.frequency.setValueAtTime(90, ctx.currentTime);

  crashRocketGain.gain.setValueAtTime(0.035, ctx.currentTime);

  crashRocketOscillator.connect(crashRocketGain);
  crashRocketGain.connect(CR.audio.sfxInput);

  crashRocketOscillator.start();
}

function updateCrashRocketSound(multiplier) {
  if (!crashRocketOscillator || !crashRocketGain || !audioContext) return;

  const pitch = Math.min(90 + multiplier * 55, 520);
  const volume = Math.min(0.035 + multiplier * 0.008, 0.12);

  crashRocketOscillator.frequency.setTargetAtTime(
    pitch,
    audioContext.currentTime,
    0.08
  );

  crashRocketGain.gain.setTargetAtTime(
    volume,
    audioContext.currentTime,
    0.08
  );
}

function stopCrashRocketSound() {
  if (crashRocketGain && audioContext) {
    crashRocketGain.gain.setTargetAtTime(0.001, audioContext.currentTime, 0.05);
  }

  if (crashRocketOscillator) {
    setTimeout(() => {
      try {
        crashRocketOscillator.stop();
      } catch (error) {
        // Already stopped
      }

      crashRocketOscillator = null;
      crashRocketGain = null;
    }, 120);
  }
}

document.addEventListener("pointerdown", (event) => {
  if (event.target.tagName === "BUTTON") {
    playButtonClickSound();
  }
});

/* ========================= */
/* BASIC UI */
/* ========================= */

const titleScreen = document.getElementById("title-screen");
const gameWrapper = document.getElementById("game-wrapper");
const playBtn = document.getElementById("play-btn");
const dangerFlash = document.getElementById("danger-flash");

const balanceText = document.getElementById("balance");
const goalText = document.getElementById("goal");
const timerText = document.getElementById("timer");

function updateUI() {
  // Balance ticks up/down, goal bar fills, timer goes red under 15 s (fx.js CR.hud).
  CR.hud.update({ balance, goal, timeLeft, streak: currentWinStreak, gameStarted: gameStarted && !runEnded });
  updateStreakUI();

  updateBetSliders();
  updateDangerFlash();
}

function updateDangerFlash() {
  if (balance <= 10 && balance > 0 && !runEnded && gameStarted && !coinFlipOpen) {
    dangerFlash.classList.remove("hidden");
    startLowMoneySiren();
  } else {
    dangerFlash.classList.add("hidden");
    stopLowMoneySiren();
  }
}

function recordBalancePoint() {
  highestBalance = Math.max(highestBalance, balance);
  balanceHistory.push(Math.max(0, balance));
}

function resetRunTracking() {
  runStartTime = Date.now();
  runEndTime = null;

  gamePlayCounts = {
    Plinko: 0,
    Roulette: 0,
    Crash: 0,
    Blackjack: 0,
    "Elephant River": 0,
    "Horse Race": 0
  };

  gameLossStats = {
    Plinko: { losses: 0, moneyLost: 0 },
    Roulette: { losses: 0, moneyLost: 0 },
    Crash: { losses: 0, moneyLost: 0 },
    Blackjack: { losses: 0, moneyLost: 0 },
    "Elephant River": { losses: 0, moneyLost: 0 },
    "Horse Race": { losses: 0, moneyLost: 0 }
  };

  runRoundHistory = [];
  currentWinStreak = 0;
  highestWinStreak = 0;
  totalHotStreakBonusEarned = 0;
  greaseFireActive = false;
  consumedItemIds = [];
}

function trackGamePlayed(gameName) {
  if (!gamePlayCounts[gameName]) {
    gamePlayCounts[gameName] = 0;
  }

  gamePlayCounts[gameName]++;
}

function getFavoriteGame() {
  let favoriteGame = "None Yet";
  let highestCount = 0;

  Object.entries(gamePlayCounts).forEach(([gameName, count]) => {
    if (count > highestCount) {
      favoriteGame = gameName;
      highestCount = count;
    }
  });

  if (highestCount === 0) {
    return "None Yet";
  }

  return `${favoriteGame} (${highestCount} play${highestCount === 1 ? "" : "s"})`;
}

function getRunSeconds() {
  if (!runStartTime) {
    return 0;
  }

  const endTime = runEndTime || Date.now();
  return Math.max(0, Math.floor((endTime - runStartTime) / 1000));
}

function formatRunTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getRunSummary() {
  return {
    favoriteGame: getFavoriteGame(),
    mostLostGame: getMostLostGame(),
    timePlayed: formatRunTime(getRunSeconds()),
    highestStreak: highestWinStreak,
    totalHotStreakBonus: totalHotStreakBonusEarned
  };
}

function getMostLostGame() {
  let mostLostGame = "None Yet";
  let mostLosses = 0;
  let mostMoneyLost = 0;

  Object.entries(gameLossStats).forEach(([gameName, stats]) => {
    if (
      stats.losses > mostLosses ||
      (stats.losses === mostLosses && stats.moneyLost > mostMoneyLost)
    ) {
      mostLostGame = gameName;
      mostLosses = stats.losses;
      mostMoneyLost = stats.moneyLost;
    }
  });

  if (mostLosses === 0) {
    return "None Yet";
  }

  return `${mostLostGame} (${mostLosses} loss${mostLosses === 1 ? "" : "es"}, $${mostMoneyLost.toFixed(2)} lost)`;
}

function recordRoundResult(gameName, result, amount = 0) {
  const safeGameName = gameName || "Unknown";
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  runRoundHistory.push({
    gameName: safeGameName,
    result,
    amount: safeAmount,
    streakAfter: currentWinStreak,
    time: formatRunTime(getRunSeconds())
  });

  if (result === "Loss") {
    if (!gameLossStats[safeGameName]) {
      gameLossStats[safeGameName] = { losses: 0, moneyLost: 0 };
    }

    gameLossStats[safeGameName].losses++;
    gameLossStats[safeGameName].moneyLost += Math.abs(safeAmount);
  }
}

function renderRunHistory(containerId) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = "";

  if (runRoundHistory.length === 0) {
    const empty = document.createElement("div");
    empty.classList.add("run-history-empty");
    empty.textContent = "No completed rounds yet.";
    container.appendChild(empty);
    return;
  }

  [...runRoundHistory].reverse().forEach((entry) => {
    const row = document.createElement("div");
    row.classList.add("run-history-row");

    const isPositive = entry.amount > 0;
    const isNegative = entry.amount < 0;

    if (isPositive) row.classList.add("run-history-win");
    if (isNegative) row.classList.add("run-history-loss");

    const amountText = entry.amount === 0
      ? "$0.00"
      : `${entry.amount > 0 ? "+" : "-"}$${Math.abs(entry.amount).toFixed(2)}`;

    row.innerHTML = `
      <span>${entry.time}</span>
      <strong>${entry.gameName}</strong>
      <span>${entry.result}</span>
      <b>${amountText}</b>
    `;

    container.appendChild(row);
  });
}

function getStreakBonusRate() {
  if (currentWinStreak >= 5) return 0.5;
  if (currentWinStreak === 4) return 0.35;
  if (currentWinStreak === 3) return 0.2;
  if (currentWinStreak === 2) return 0.1;
  return 0;
}

function getStreakLabel() {
  if (currentWinStreak >= 5) {
    return "ON FIRE! +50%";
  }

  return `STREAK ${currentWinStreak}  +${Math.round(getStreakBonusRate() * 100)}%`;
}

function updateStreakUI() {
  const streakText = document.getElementById("streak-text");

  if (!streakText) return;

  streakText.textContent = getStreakLabel();

  if (currentWinStreak >= 5) {
    streakText.classList.add("streak-on-fire");
  } else {
    streakText.classList.remove("streak-on-fire");
  }
}

function showStreakMessage(message) {
  queuePopupStep(() => {
    showToast(message);
  }, 1300);
}

function consumeAutoItem(itemId) {
  if (!hasItem(itemId)) return false;

  removeItemFromInventory(itemId, true);
  return true;
}

function handleHotStreakWin(baseProfit, bonusLines = []) {
  currentWinStreak++;
  highestWinStreak = Math.max(highestWinStreak, currentWinStreak);

  const bonusRate = getStreakBonusRate();
  let streakBonus = Math.max(0, baseProfit) * bonusRate;

  // Grease Fire stays lit until a win actually has a streak bonus to triple (per its description).
  if (greaseFireActive && streakBonus > 0) {
    streakBonus *= 3;
    bonusLines.push({
      type: "bonus",
      text: "Grease Fire! Triple Hot Streak Bonus!"
    });

    greaseFireActive = false;
    showStreakMessage("Grease Fire burned out.");
  }

  if (streakBonus > 0) {
    totalHotStreakBonusEarned += streakBonus;
    bonusLines.push({
      type: "bonus",
      text: `+$${streakBonus.toFixed(2)} Hot Streak Bonus (${getStreakLabel()})`
    });
  }

  updateStreakUI();
  return streakBonus;
}

function handleHotStreakLoss() {
  if (greaseFireActive) {
    const burnAmount = balance * 0.25;
    greaseFireActive = false;

    if (burnAmount > 0) {
      changeBalance(-burnAmount);
      CR.audio.play("grease_fire");
    }

    showStreakMessage(`Grease Fire Backfired! Burned $${burnAmount.toFixed(2)}.`);
  }

  if (currentWinStreak <= 0) {
    currentWinStreak = 0;
    updateStreakUI();
    return;
  }

  if (hasItem("luckyMatch")) {
    consumeAutoItem("luckyMatch");
    showStreakMessage("Lucky Match Saved Your Streak!");
    updateStreakUI();
    return;
  }

  if (hasItem("heatShield")) {
    consumeAutoItem("heatShield");
    currentWinStreak = Math.max(0, currentWinStreak - 1);
    showStreakMessage("Heat Shield Activated! Streak reduced by 1.");
    updateStreakUI();
    return;
  }

  currentWinStreak = 0;
  showStreakMessage("Streak Broken!");
  updateStreakUI();
}

function applyRoundWin(payout, bet, bonusLines = [], gameName = "Game") {
  const baseProfit = Math.max(0, payout - bet);
  let finalPayout = payout;

  const hulaGirlCount = countItem("luckyHulaGirl");

  if (hulaGirlCount > 0 && baseProfit > 0) {
    const bonusRate = 0.1 * hulaGirlCount;
    const bonus = baseProfit * bonusRate;

    if (bonus > 0) {
      finalPayout += bonus;
      bonusLines.push({
        type: "bonus",
        text: `+$${bonus.toFixed(2)} Lucky Hula Girl Bonus`
      });
    }
  }

  if (baseProfit > 0) {
    finalPayout += handleHotStreakWin(baseProfit, bonusLines);
  }

  recordRoundResult(gameName, baseProfit > 0 ? "Win" : "Push", finalPayout - bet);

  // Presentation only: tier from settled profit vs stake (fx.js). Doesn't change any amount.
  lastSettlement = { bet, profit: finalPayout - bet, streak: currentWinStreak };
  const naturalBlackjack = gameName === "Blackjack" && payout === bet * 2.5;
  CR.fx.celebrate({ profit: finalPayout - bet, bet, streak: currentWinStreak, special: naturalBlackjack ? "blackjack" : undefined });

  return {
    payout: finalPayout,
    bonusLines
  };
}


function animateBalanceChange(type) {
  balanceText.classList.remove("balance-gain");
  balanceText.classList.remove("balance-loss");

  void balanceText.offsetWidth;

  if (type === "gain") {
    balanceText.classList.add("balance-gain");
  }

  if (type === "loss") {
    balanceText.classList.add("balance-loss");
  }

  setTimeout(() => {
    balanceText.classList.remove("balance-gain");
    balanceText.classList.remove("balance-loss");
  }, 750);
}


function queuePopupStep(stepFunction, duration = 1000) {
  popupQueueActive = true;
  const stepRunId = runId;

  popupQueue = popupQueue.then(() => {
    // Popups queued in a previous run are dropped instead of leaking into the new one.
    if (stepRunId !== runId) return;

    return new Promise((resolve) => {
      stepFunction();

      setTimeout(() => {
        resolve();
      }, duration);
    });
  });

  popupQueue.finally(() => {
    popupQueueActive = false;
  });

  return popupQueue;
}

function clearPopupQueue() {
  popupQueue = Promise.resolve();
  popupQueueActive = false;
  goalPopupQueued = false;
}

// Cascading payout (visual bible section 5): base payout, then each bonus line lands with a rising
// tick, then the total pops. About 0.5 s + 0.26 s per line; any tap skips to the total.
// Money was already settled before this runs, so the animation never blocks or changes amounts.
// Set by applyRoundWin right before the winning changeBalance(); lets the cascade show Bet x Mult.
// Refunds and rescues have no settlement, so their popup shows only the amount.
let lastSettlement = null;

function showMoneyGainPopup(amount, bonusLines = []) {
  if (!moneyPopupLayer || amount <= 0) return;

  const settle = lastSettlement;
  lastSettlement = null;
  moneyPopupActive = true;
  const lineDelay = 260;
  // Must outlast finish() + its 760 ms exit, so the next queued popup never shares the layer with this one.
  const duration = 300 + bonusLines.length * lineDelay + 120 + 800;

  queuePopupStep(() => {
    moneyPopupLayer.classList.remove("hidden");
    moneyPopupLayer.innerHTML = "";

    const card = document.createElement("div");
    card.classList.add("money-popup-card");

    const mainNumber = document.createElement("div");
    mainNumber.classList.add("money-popup-main");

    const linesWrapper = document.createElement("div");
    linesWrapper.classList.add("money-popup-lines");

    const lineElements = bonusLines.map((line) => {
      const lineElement = document.createElement("div");
      lineElement.classList.add("money-popup-line", line.type === "base" ? "base-win" : "item-bonus");
      lineElement.textContent = line.text;
      linesWrapper.appendChild(lineElement);
      return lineElement;
    });

    // Running total: the base line's amount first, the full amount at the end.
    const parsed = bonusLines.map((line) => Number((line.text.match(/\$([\d,.]+)/) || [])[1]?.replace(/,/g, "")) || 0);
    let running = 0;
    mainNumber.textContent = "+$0.00";

    // Bet x Mult = Win: the multiplier box climbs as each bonus line lands.
    let multBox = null;
    const setMult = (value) => {
      if (!multBox) return;
      multBox.firstChild.textContent = `${value.toFixed(2)}X`;
      multBox.classList.remove("bump");
      void multBox.offsetWidth;
      multBox.classList.add("bump");
    };
    if (settle && settle.bet > 0) {
      card.classList.add(`tier-${CR.fx.tierFor(settle.profit, settle.bet, settle.streak)}`);
      const row = document.createElement("div");
      row.className = "calc-row";
      row.innerHTML = `<div class="calc-box calc-bet"><span>$${settle.bet}</span><small>BET</small></div><span class="calc-x">X</span><div class="calc-box calc-mult"><span>0.00X</span><small>MULT</small></div>`;
      multBox = row.querySelector(".calc-mult");
      card.appendChild(row);
    }

    card.appendChild(mainNumber);
    if (lineElements.length) card.appendChild(linesWrapper);
    const skip = document.createElement("div");
    skip.className = "money-popup-skip";
    skip.textContent = "TAP TO SKIP";
    card.appendChild(skip);
    moneyPopupLayer.appendChild(card);

    card.animate([{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1.08)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "forwards" });

    const timers = [];
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      lineElements.forEach((el) => el.classList.add("show"));
      mainNumber.textContent = `+$${amount.toFixed(2)}`;
      if (settle) setMult(amount / settle.bet);
      mainNumber.animate([{ transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 240, easing: "cubic-bezier(.34,1.56,.64,1)" });
      CR.audio.play("payout_total");
      timers.push(setTimeout(() => {
        const balanceBox = balanceText.getBoundingClientRect();
        const cardBox = card.getBoundingClientRect();
        const moveX = balanceBox.left + balanceBox.width / 2 - (cardBox.left + cardBox.width / 2);
        const moveY = balanceBox.top + balanceBox.height / 2 - (cardBox.top + cardBox.height / 2);
        card.animate([{ transform: "scale(1)", opacity: 1 }, { transform: `translate(${moveX}px, ${moveY}px) scale(0.16)`, opacity: 0 }], { duration: 380, easing: "cubic-bezier(.2,0,0,1)", fill: "forwards" });
      }, 360));
      timers.push(setTimeout(() => {
        moneyPopupLayer.classList.add("hidden");
        moneyPopupLayer.innerHTML = "";
        animateBalanceChange("gain");
        moneyPopupActive = false;
        document.removeEventListener("pointerdown", finish, true);
      }, 760));
    };
    document.addEventListener("pointerdown", finish, true);

    lineElements.forEach((el, k) => {
      timers.push(setTimeout(() => {
        el.classList.add("show");
        running = Math.min(amount, running + parsed[k]);
        mainNumber.textContent = `+$${running.toFixed(2)}`;
        if (settle) setMult(running / settle.bet);
        CR.audio.play("cascade_tick", { rate: 1 + k * 0.15 });
      }, 300 + k * lineDelay));
    });
    timers.push(setTimeout(finish, 300 + lineElements.length * lineDelay + 120));
  }, duration);
}

function isAllInBet(bet) {
  const maxWholeBalance = Math.max(1, Math.floor(balance));
  return balance >= 1 && Number(bet) >= maxWholeBalance;
}

function showAllInAnimation(gameName, bet) {
  allInAnimationActive = true;

  queuePopupStep(() => {
    let allInLayer = document.getElementById("all-in-layer");

    if (!allInLayer) {
      allInLayer = document.createElement("div");
      allInLayer.id = "all-in-layer";
      allInLayer.className = "all-in-layer hidden";
      document.body.appendChild(allInLayer);
    }

    allInLayer.classList.remove("hidden");
    allInLayer.innerHTML = "";

    const card = document.createElement("div");
    card.classList.add("all-in-card");

    const title = document.createElement("div");
    title.classList.add("all-in-title");
    title.innerHTML = CR.spriteImg("words/allin");

    const subtitle = document.createElement("div");
    subtitle.classList.add("all-in-subtitle");
    subtitle.textContent = `${gameName} • $${Number(bet).toFixed(2)}`;

    const sparkles = document.createElement("div");
    sparkles.classList.add("all-in-sparkles");
    sparkles.textContent = "✦ ✦ ✦ ✦ ✦";

    card.appendChild(sparkles);
    card.appendChild(title);
    card.appendChild(subtitle);
    allInLayer.appendChild(card);

    document.body.classList.remove("all-in-screen-shake");
    void document.body.offsetWidth;
    if (!CR.settings.reducedMotion) document.body.classList.add("all-in-screen-shake");

    sfx("all_in", undefined, () => {
      playTone(220, 0.08, "square", 0.09);
      setTimeout(() => playTone(440, 0.08, "square", 0.09), 110);
      setTimeout(() => playTone(880, 0.16, "triangle", 0.1), 240);
    });

    setTimeout(() => {
      allInLayer.classList.add("hidden");
      allInLayer.innerHTML = "";
      document.body.classList.remove("all-in-screen-shake");
      allInAnimationActive = false;
    }, 1700);
  }, 1850);
}


function maybeShowAllInAnimation(gameName, bet) {
  if (isAllInBet(bet)) {
    showAllInAnimation(gameName, bet);
    return true;
  }

  return false;
}

function changeBalance(amount, bonusLines = []) {
  balance += amount;

  if (balance < 0) {
    balance = 0;
  }

  recordBalancePoint();

  // Win sounds come from CR.fx.celebrate and the payout cascade, so a gain plays nothing here.
  if (amount > 0) {
    showMoneyGainPopup(amount, bonusLines);
  }

  // Negative changes are bets, purchases or burns: a chip clack, not a "you lost" sting.
  // Lost bets get their sound from processFullLoss -> CR.fx.loss.
  if (amount < 0) {
    animateBalanceChange("loss");
    sfx("bet_chip", { rate: 0.95 + Math.random() * 0.1 }, playLoseSound);
  }

  updateUI();
}

function shakeWinBoard() {
  const activeScreen = document.querySelector(".active-screen");

  if (!activeScreen) return;

  const target =
    activeScreen.querySelector("#board") ||
    activeScreen.querySelector("#wheel-container") ||
    activeScreen.querySelector(".crash-card") ||
    activeScreen.querySelector("#blackjack-board") ||
    activeScreen.querySelector("#frog-board") ||
    activeScreen.querySelector("#horse-board") ||
    activeScreen.querySelector(".shop-card") ||
    activeScreen;

  target.classList.remove("win-shake");
  void target.offsetWidth;
  target.classList.add("win-shake");

  setTimeout(() => {
    target.classList.remove("win-shake");
  }, 500);
}

playBtn.addEventListener("click", () => {
  const openScreen = document.querySelector(".screen.active-screen");
  CR.audio.music(SCREEN_MUSIC[openScreen && openScreen.id] || "music_plinko");
  CR.audio.play("new_round");
  resetRunTracking();
  goal = Math.max(50, Math.ceil(balance * 3));

  gameStarted = true;
  runEnded = false;

  titleScreen.classList.add("hidden");
  gameWrapper.classList.remove("hidden");

  generateShopRotation();
  renderShop();
  renderInventory();

  updateUI();

  updateBlackjackButtonState();
  updateFrogButtons();
  updateHorseButtons();

  requestAnimationFrame(() => {
    createPegs();

    requestAnimationFrame(() => {
      createPegs();
    });
  });
});

/* ========================= */
/* SHOP SYSTEM */
/* ========================= */

const shopItemsContainer = document.getElementById("shop-items");
const inventoryIcons = document.getElementById("inventory-icons");
const activeItemTimers = document.getElementById("active-item-timers");

const itemPopup = document.getElementById("item-popup");
const itemPopupIcon = document.getElementById("item-popup-icon");
const itemPopupName = document.getElementById("item-popup-name");
const itemPopupType = document.getElementById("item-popup-type");
const itemPopupDescription = document.getElementById("item-popup-description");
const useItemBtn = document.getElementById("use-item-btn");
const closeItemPopupBtn = document.getElementById("close-item-popup-btn");

let currentShopSlots = [];
let inventory = [];
let selectedInventoryItemId = null;

let activeRouletteMagnet = false;
let activeFrogSneakers = 0;
let activeGoldenHorseshoe = 0;
let activeWeightedBall = 0;
let cashbackActiveUntil = 0;

let activeJesterHatUntil = 0;
let roseKatPlinkoBoosts = 0;
let activeFreeRouletteMaxSpin = 0;

const horseNames = ["Dingo", "Vas", "HisterBlue", "The Horse"];

const shopItemData = [
  {
    id: "doubleHeadedCoin",
    name: "Double-Headed Coin",
    type: "Trigger",
    price: 75,
    description: "Guarantees your next emergency coin flip will be a win."
  },
  {
    id: "luckyHulaGirl",
    name: "Lucky Hula Girl",
    type: "Passive",
    price: 100,
    description: "Adds +10% extra profit to every winning bet. This stacks."
  },
  {
    id: "timeBottle",
    name: "Time in a Bottle",
    type: "Consumable",
    price: 45,
    description: "Use it to add 30 seconds to the current timer."
  },
  {
    id: "rouletteMagnet",
    name: "Roulette Magnet",
    type: "Consumable",
    price: 60,
    description: "Use it before Roulette to improve your next Red or Black spin odds. No effect on Green."
  },
  {
    id: "frogSneakers",
    name: "Pool Floaties",
    type: "Consumable",
    price: 55,
    description: "Use it to lower the danger chance for your next Elephant River crossing. This stacks."
  },
  {
    id: "insuranceTicket",
    name: "Insurance Ticket",
    type: "Trigger",
    price: 70,
    description: "Refunds 50% of a fully lost bet. Up to 2 can trigger at once."
  },
  {
    id: "filthTea",
    name: "Filth-Tea",
    type: "Consumable",
    price: 85,
    description: "Use it to refund a random consumed item from this run. It will not refund itself."
  },
  {
    id: "luckyMatch",
    name: "Lucky Match",
    type: "Trigger",
    price: 90,
    description: "Protects your Hot Streak from breaking one time after a loss."
  },
  {
    id: "heatShield",
    name: "Heat Shield",
    type: "Trigger",
    price: 95,
    description: "On a loss, lowers your Hot Streak by 1 instead of resetting it to 0."
  },
  {
    id: "greaseFire",
    name: "Grease Fire",
    type: "Consumable",
    price: 105,
    description: "Use it to triple your next Hot Streak bonus. If you lose first, it burns 25% of your balance."
  },
  {
    id: "goalCutter",
    name: "Goal Cutter",
    type: "Consumable",
    price: 90,
    description: "Use it to lower your current money goal by 10%."
  },
  {
    id: "dealerPeek",
    name: "Dealer’s Peek Card",
    type: "Consumable",
    price: 40,
    description: "Use it during Blackjack to reveal the dealer’s hidden card."
  },
  {
    id: "goldenHorseshoe",
    name: "Golden Horseshoe",
    type: "Consumable",
    price: 50,
    description: "Use it before Horse Race. Each one adds +0.5x payout."
  },
  {
    id: "weightedBall",
    name: "Weighted Ball",
    type: "Consumable",
    price: 55,
    description: "Use it before Plinko to improve your next ball result. This stacks."
  },
  {
    id: "cashbackCoupon",
    name: "Cashback Coupon",
    type: "Timed Consumable",
    price: 80,
    description: "Use it to get 5% cashback on fully lost bets for 60 seconds. Extra coupons add more time."
  },
  {
    id: "thottiesJesterHat",
    name: "Thottie’s Jester Hat",
    type: "Timed Consumable",
    price: 95,
    description: "Use it to block the dealer from getting 21 for 60 seconds. Extra hats add more time."
  },
  {
    id: "roseKatMagnumOpus",
    name: "RoseKat’s Magnum Opus",
    type: "Consumable",
    price: 110,
    description: "Your next 2 winning Plinko drops add 4x the profit as bonus money."
  },
  {
    id: "ejmRecordVinyl",
    name: "EJM’s Record Vinyl",
    type: "Consumable",
    price: 125,
    description: "Use it to get one free Roulette spin at max bet. Extra vinyls add more free spins."
  }
];

function spinDevU(element) {
  if (!element) return;

  element.classList.remove("dev-u-spin");
  void element.offsetWidth;
  element.classList.add("dev-u-spin");

  setTimeout(() => {
    element.classList.remove("dev-u-spin");
  }, 620);
}

function unlockDevItemEasterEgg() {
  if (devUEasterEggUnlocked) {
    showToast("Dev stash already unlocked.");
    return;
  }

  // Also marks this run as a dev run: submitScore() keeps it off the live leaderboard.
  devUEasterEggUnlocked = true;

  shopItemData.forEach((item) => {
    inventory.push(item.id);
  });

  renderInventory();
  playCashSound();
  showToast("DEV MODE UNLOCKED — ALL ITEMS ADDED!");
}

function setupDevUEasterEgg() {
  const devULetters = document.querySelectorAll(".dev-u");

  devULetters.forEach((letter) => {
    letter.addEventListener("click", (event) => {
      event.stopPropagation();

      spinDevU(letter);
      playTone(740 + devUEasterEggClicks * 90, 0.08, "triangle", 0.06);

      if (devUEasterEggUnlocked) {
        showToast("Dev stash already unlocked.");
        return;
      }

      devUEasterEggClicks++;

      if (devUEasterEggClicks >= 3) {
        unlockDevItemEasterEgg();
      }
    });
  });
}

function getItemData(itemId) {
  return shopItemData.find((item) => item.id === itemId);
}

function getRoundPrice(basePrice) {
  const roundMultiplier = 1 + (currentRound - 1) * 0.18;
  const rawPrice = basePrice * roundMultiplier;

  return Math.ceil(rawPrice / 5) * 5;
}

function getRoundPriceText(basePrice) {
  return `$${getRoundPrice(basePrice)}`;
}

function generateShopRotation() {
  const easterEggItemIds = [
    "thottiesJesterHat",
    "roseKatMagnumOpus",
    "ejmRecordVinyl"
  ];

  const easterEggItems = shopItemData.filter((item) => {
    return easterEggItemIds.includes(item.id);
  });

  const normalItems = shopItemData.filter((item) => {
    return !easterEggItemIds.includes(item.id);
  });

  const pickedItems = [];

  const guaranteedEasterEgg =
    easterEggItems[Math.floor(Math.random() * easterEggItems.length)];

  pickedItems.push(guaranteedEasterEgg);

  const shuffledNormalItems = [...normalItems].sort(() => Math.random() - 0.5);

  pickedItems.push(...shuffledNormalItems.slice(0, 3));

  currentShopSlots = pickedItems
    .sort(() => Math.random() - 0.5)
    .map((item) => {
      return {
        itemId: item.id,
        sold: false
      };
    });
}

function renderShop() {
  shopItemsContainer.innerHTML = "";

  currentShopSlots.forEach((slot, index) => {
    const item = getItemData(slot.itemId);

    const card = document.createElement("div");
    card.classList.add("shop-item");

    if (slot.sold) {
      card.classList.add("sold");
    }

    card.innerHTML = `
      <div class="shop-item-top">
        <div class="shop-item-icon">${CR.spriteImg("items/" + item.id)}</div>
        <div>
          <h3>${item.name}</h3>
          <p class="shop-item-type">${item.type} • ${getRoundPriceText(item.price)}</p>
        </div>
      </div>

      <p class="shop-item-desc">${item.description}</p>

      <button class="shop-buy-btn" ${slot.sold ? "disabled" : ""}>
        ${slot.sold ? "SOLD OUT" : `BUY FOR ${getRoundPriceText(item.price)}`}
      </button>
    `;

    const buyButton = card.querySelector(".shop-buy-btn");

    buyButton.addEventListener("click", () => {
      buyShopItem(index);
    });

    shopItemsContainer.appendChild(card);
  });
}

function buyShopItem(slotIndex) {
  const slot = currentShopSlots[slotIndex];

  if (!slot || slot.sold) return;

  const item = getItemData(slot.itemId);
  const itemPrice = getRoundPrice(item.price);

  if (balance < itemPrice) {
    CR.audio.play("ui_nofunds");
    showToast("Not enough money.");
    return;
  }

  changeBalance(-itemPrice);
  CR.audio.play("ui_buy");

  slot.sold = true;

  addItemToInventory(item.id);

  renderShop();
  renderInventory();

  checkGameState();
}

function addItemToInventory(itemId) {
  inventory.push(itemId);
}

function showItemBreakAnimation(itemId) {
  const item = getItemData(itemId);

  if (!item) return;

  queuePopupStep(() => {
    let breakLayer = document.getElementById("item-break-layer");

    if (!breakLayer) {
      breakLayer = document.createElement("div");
      breakLayer.id = "item-break-layer";
      breakLayer.className = "item-break-layer";
      document.body.appendChild(breakLayer);
    }

    breakLayer.classList.remove("hidden");

    const card = document.createElement("div");
    card.classList.add("item-break-card");

    const icon = document.createElement("div");
    icon.classList.add("item-break-icon");
    icon.innerHTML = CR.spriteImg("items/" + item.id);

    const crack = document.createElement("div");
    crack.classList.add("item-break-crack");
    crack.innerHTML = CR.spriteImg("fx/sparkle");

    const label = document.createElement("div");
    label.classList.add("item-break-label");
    label.textContent = `${item.name} broke!`;

    const shardA = document.createElement("span");
    shardA.classList.add("item-shard", "shard-a");

    const shardB = document.createElement("span");
    shardB.classList.add("item-shard", "shard-b");

    const shardC = document.createElement("span");
    shardC.classList.add("item-shard", "shard-c");

    card.appendChild(shardA);
    card.appendChild(shardB);
    card.appendChild(shardC);
    card.appendChild(icon);
    card.appendChild(crack);
    card.appendChild(label);

    breakLayer.appendChild(card);

    sfx("item_break", undefined, () => {
      playTone(190, 0.09, "square", 0.08);
      setTimeout(() => playTone(95, 0.14, "sawtooth", 0.07), 110);
    });

    setTimeout(() => {
      card.remove();

      if (breakLayer.children.length === 0) {
        breakLayer.classList.add("hidden");
      }
    }, 1150);
  }, 1300);
}


function removeItemFromInventory(itemId, showBreakAnimation = false) {
  const index = inventory.indexOf(itemId);

  if (index >= 0) {
    if (showBreakAnimation) {
      showItemBreakAnimation(itemId);

      if (itemId !== "filthTea") {
        consumedItemIds.push(itemId);
      }
    }

    inventory.splice(index, 1);
  }

  renderInventory();
}

function hasItem(itemId) {
  return inventory.includes(itemId);
}

function countItem(itemId) {
  return inventory.filter((id) => id === itemId).length;
}

function getCurrentGameName() {
  const activeScreen = document.querySelector(".screen.active-screen");

  if (!activeScreen) return "General";

  const screenMap = {
    "plinko-screen": "Plinko",
    "roulette-screen": "Roulette",
    "crash-screen": "Crash",
    "blackjack-screen": "Blackjack",
    "frog-screen": "Elephant River",
    "horse-screen": "Horse Race",
    "shop-screen": "Shop"
  };

  return screenMap[activeScreen.id] || "General";
}

function isItemRelevantToGame(itemId, gameName = getCurrentGameName()) {
  const generalItems = [
    "timeBottle",
    "filthTea",
    "goalCutter",
    "cashbackCoupon",
    "luckyMatch",
    "heatShield",
    "greaseFire",
    "luckyHulaGirl",
    "insuranceTicket",
    "doubleHeadedCoin"
  ];

  const gameItems = {
    Plinko: ["weightedBall", "roseKatMagnumOpus"],
    Roulette: ["rouletteMagnet", "ejmRecordVinyl"],
    Crash: [],
    Blackjack: ["dealerPeek", "thottiesJesterHat"],
    "Elephant River": ["frogSneakers"],
    "Horse Race": ["goldenHorseshoe"]
  };

  if (generalItems.includes(itemId)) return true;
  if (gameName === "Shop") return true;

  return (gameItems[gameName] || []).includes(itemId);
}

function updateInventoryHeader() {
  const bagLabel = document.getElementById("inventory-bag-label");
  const bagCount = document.getElementById("inventory-bag-count");
  const sidebar = document.getElementById("inventory-sidebar");

  if (bagLabel) {
    bagLabel.innerHTML = `${CR.spriteImg("ui/bag")} ${inventoryCollapsed ? "ITEMS" : getCurrentGameName().toUpperCase()}`;
  }

  if (bagCount) {
    bagCount.textContent = inventory.length;
  }

  if (sidebar) {
    sidebar.classList.toggle("inventory-collapsed", inventoryCollapsed);
  }
}

function renderInventory() {
  inventoryIcons.innerHTML = "";
  updateInventoryHeader();

  if (inventoryCollapsed) {
    return;
  }

  const currentGameName = getCurrentGameName();
  const uniqueItems = [...new Set(inventory)].filter((itemId) => {
    return isItemRelevantToGame(itemId, currentGameName);
  });

  if (uniqueItems.length === 0) {
    const empty = document.createElement("div");
    empty.classList.add("inventory-empty-message");
    empty.textContent = "No usable items for this game.";
    inventoryIcons.appendChild(empty);
    return;
  }

  uniqueItems.forEach((itemId) => {
    const item = getItemData(itemId);
    if (!item) return;

    const count = countItem(itemId);

    const wrapper = document.createElement("div");
    wrapper.classList.add("inventory-item-wrapper");

    const button = document.createElement("button");
    button.classList.add("inventory-item-icon");
    button.innerHTML = CR.spriteImg("items/" + item.id);
    button.title = item.name;
    button.setAttribute("aria-label", item.name);

    button.addEventListener("click", () => {
      openItemPopup(itemId);
    });

    wrapper.appendChild(button);

    if (count > 1) {
      const badge = document.createElement("span");
      badge.classList.add("inventory-count");
      badge.textContent = count;
      wrapper.appendChild(badge);
    }

    inventoryIcons.appendChild(wrapper);
  });
}

function canUseItem(itemId) {
  return [
    "timeBottle",
    "filthTea",
    "greaseFire",
    "rouletteMagnet",
    "frogSneakers",
    "goalCutter",
    "dealerPeek",
    "goldenHorseshoe",
    "weightedBall",
    "cashbackCoupon",
    "thottiesJesterHat",
    "roseKatMagnumOpus",
    "ejmRecordVinyl"
  ].includes(itemId);
}

function openItemPopup(itemId) {
  const item = getItemData(itemId);

  selectedInventoryItemId = itemId;

  itemPopupIcon.innerHTML = CR.spriteImg("items/" + item.id);
  itemPopupName.textContent = item.name;
  itemPopupType.textContent = `Type: ${item.type}`;
  itemPopupDescription.textContent = item.description;

  if (canUseItem(itemId)) {
    useItemBtn.classList.remove("hidden");
  } else {
    useItemBtn.classList.add("hidden");
  }

  itemPopup.classList.remove("hidden");
}

function closeItemPopup() {
  selectedInventoryItemId = null;
  itemPopup.classList.add("hidden");
}

function useSelectedItem() {
  if (!selectedInventoryItemId) return;

  const before = inventory.length;
  useInventoryItem(selectedInventoryItemId);
  // Activation feedback only when the item was actually consumed (e.g. Peek used outside Blackjack is refused).
  CR.audio.play(inventory.length < before ? "item_use" : "ui_error");
}

function useInventoryItem(itemId) {
  if (!hasItem(itemId)) return;

  if (itemId === "filthTea") {
    const refundableItems = consumedItemIds.filter((id) => id !== "filthTea" && getItemData(id));

    if (refundableItems.length === 0) {
      closeItemPopup();
      showToast("Filth-Tea had nothing to refund.");
      return;
    }

    const refundedItemId = refundableItems[Math.floor(Math.random() * refundableItems.length)];
    const removeIndex = consumedItemIds.indexOf(refundedItemId);

    if (removeIndex >= 0) {
      consumedItemIds.splice(removeIndex, 1);
    }

    addItemToInventory(refundedItemId);
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast(`Filth-Tea refunded ${getItemData(refundedItemId).name}!`);
    return;
  }

  if (itemId === "greaseFire") {
    greaseFireActive = true;
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast("Grease Fire is lit! Next win triples Hot Streak bonus. Next loss burns 25%.");
    return;
  }

  if (itemId === "timeBottle") {
    timeLeft += 30;
    removeItemFromInventory(itemId, true);
    updateUI();
    closeItemPopup();
    showToast("Time in a Bottle used! +30 seconds.");
    return;
  }

  if (itemId === "rouletteMagnet") {
    activeRouletteMagnet = true;
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast("Roulette Magnet activated for your next Roulette spin.");
    return;
  }

  if (itemId === "frogSneakers") {
    activeFrogSneakers++;
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast(`Pool Floaties activated! Floaties stacked: ${activeFrogSneakers}.`);
    return;
  }

  if (itemId === "goalCutter") {
    goal = Math.max(50, Math.ceil(goal * 0.9));
    removeItemFromInventory(itemId, true);
    updateUI();
    closeItemPopup();
    showToast("Goal Cutter used! Current goal lowered by 10%.");
    return;
  }

  if (itemId === "dealerPeek") {
    if (!blackjackRoundActive || !blackjackDealerHidden) {
      showToast("Use this during Blackjack while the dealer has a hidden card.");
      return;
    }

    blackjackDealerHidden = false;
    renderBlackjackHands();
    blackjackMessage.textContent = "Dealer’s Peek Card used. Hidden card revealed!";
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    return;
  }

  if (itemId === "goldenHorseshoe") {
    activeGoldenHorseshoe++;
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast(`Golden Horseshoe activated! Horseshoes stacked: ${activeGoldenHorseshoe}.`);
    return;
  }

  if (itemId === "weightedBall") {
    activeWeightedBall++;
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast(`Weighted Ball activated! Weighted Balls stacked: ${activeWeightedBall}.`);
    return;
  }

  if (itemId === "cashbackCoupon") {
    const now = Date.now();

    if (cashbackActiveUntil > now) {
      cashbackActiveUntil += 60000;
    } else {
      cashbackActiveUntil = now + 60000;
    }

    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast("Cashback Coupon activated! +60 seconds added.");
    renderActiveItemTimers();
    return;
  }

  if (itemId === "thottiesJesterHat") {
    const now = Date.now();

    if (activeJesterHatUntil > now) {
      activeJesterHatUntil += 60000;
    } else {
      activeJesterHatUntil = now + 60000;
    }

    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast("Thottie’s Jester Hat activated! +60 seconds added.");
    renderActiveItemTimers();
    return;
  }

  if (itemId === "roseKatMagnumOpus") {
    roseKatPlinkoBoosts += 2;
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast(`RoseKat’s Magnum Opus activated! Plinko boosts stacked: ${roseKatPlinkoBoosts}.`);
    return;
  }

  if (itemId === "ejmRecordVinyl") {
    activeFreeRouletteMaxSpin++;
    removeItemFromInventory(itemId, true);
    closeItemPopup();
    showToast(`EJM’s Record Vinyl activated! Free max spins stacked: ${activeFreeRouletteMaxSpin}.`);
    return;
  }
}

function getSecondsLeft(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

function renderActiveItemTimers() {
  if (!activeItemTimers) return;

  activeItemTimers.innerHTML = "";

  const jesterSeconds = getSecondsLeft(activeJesterHatUntil);
  const cashbackSeconds = getSecondsLeft(cashbackActiveUntil);

  if (jesterSeconds > 0) {
    const timer = document.createElement("div");
    timer.classList.add("active-item-timer");
    timer.innerHTML = `${CR.spriteImg("items/thottiesJesterHat")} ${jesterSeconds}S`;
    activeItemTimers.appendChild(timer);
  }

  if (cashbackSeconds > 0) {
    const timer = document.createElement("div");
    timer.classList.add("active-item-timer");
    timer.innerHTML = `${CR.spriteImg("items/cashbackCoupon")} ${cashbackSeconds}S`;
    activeItemTimers.appendChild(timer);
  }
}

setInterval(renderActiveItemTimers, 250);

function applyWinBonus(payout, bet, bonusLines = [], gameName = "Game") {
  return applyRoundWin(payout, bet, bonusLines, gameName);
}

function processFullLoss(bet, gameName = "Game") {
  let refund = 0;
  let messageParts = [];

  const insuranceCount = countItem("insuranceTicket");

  if (insuranceCount > 0) {
    const ticketsToUse = Math.min(insuranceCount, 2);
    const insuranceRefund = bet * 0.5 * ticketsToUse;

    refund += insuranceRefund;

    for (let i = 0; i < ticketsToUse; i++) {
      removeItemFromInventory("insuranceTicket", true);
    }

    messageParts.push(
      `${ticketsToUse} Insurance Ticket${ticketsToUse > 1 ? "s" : ""} refunded $${insuranceRefund.toFixed(2)}.`
    );
  }

  if (Date.now() < cashbackActiveUntil) {
    const cashbackRefund = bet * 0.05;
    refund += cashbackRefund;
    messageParts.push(`Cashback returned $${cashbackRefund.toFixed(2)}.`);
  }

  handleHotStreakLoss();
  recordRoundResult(gameName, "Loss", -Math.abs(bet));

  // Loss feedback: game-specific word (MISS / CRASHED / BUST / SPLASH) and a short shake.
  // Crash and River already play their own impact sounds.
  CR.fx.loss(gameName);
  if (gameName !== "Crash" && gameName !== "Elephant River") CR.audio.play(gameName === "Blackjack" ? "bust" : "lose");

  if (refund > 0) {
    changeBalance(refund, [
      {
        type: "bonus",
        text: `+$${refund.toFixed(2)} Refund Bonus`
      }
    ]);
  } else {
    updateUI();
  }

  return messageParts.join(" ");
}

function tryUseAutoRescueItem() {
  return false;
}


const inventoryBagToggle = document.getElementById("inventory-bag-toggle");

if (inventoryBagToggle) {
  inventoryBagToggle.addEventListener("click", () => {
    inventoryCollapsed = !inventoryCollapsed;
    renderInventory();
  });
}

closeItemPopupBtn.addEventListener("click", closeItemPopup);
useItemBtn.addEventListener("click", useSelectedItem);

/* ========================= */
/* GAME OVER SCREEN */
/* ========================= */

const gameOverPopup = document.getElementById("game-over-popup");
const gameOverSummary = document.getElementById("game-over-summary");
const finalBalanceText = document.getElementById("final-balance-text");
const highestBalanceText = document.getElementById("highest-balance-text");
const favoriteGameText = document.getElementById("favorite-game-text");
const timePlayedText = document.getElementById("time-played-text");
const mostLostGameText = document.getElementById("most-lost-game-text");
const highestStreakText = document.getElementById("highest-streak-text");
const hotStreakBonusText = document.getElementById("hot-streak-bonus-text");
const gameOverGraph = document.getElementById("game-over-graph");
const gameOverCtx = gameOverGraph.getContext("2d");
const tryAgainBtn = document.getElementById("try-again-btn");

function showGameOverScreen() {
  if (!runEndTime) {
    runEndTime = Date.now();
  }

  runEnded = true;
  gameStarted = false;

  stopCrashRocketSound();
  stopRouletteSpinSound();
  stopLowMoneySiren();
  stopHorseGallopSound();
  playGameOverSound();

  document.querySelectorAll(".game-action-btn").forEach((button) => {
    button.disabled = true;
  });

  cashoutBtn.disabled = true;
  startCrashBtn.disabled = true;

  updateDangerFlash();

  const runSummary = getRunSummary();

  gameOverSummary.textContent = "You lost it all. Here is how your run went.";
  finalBalanceText.textContent = `Final Balance: $${balance.toFixed(2)}`;
  highestBalanceText.textContent = `Highest Balance: $${highestBalance.toFixed(2)}`;
  favoriteGameText.textContent = `Favorite Game: ${runSummary.favoriteGame}`;
  timePlayedText.textContent = `Time Played: ${runSummary.timePlayed}`;
  if (mostLostGameText) mostLostGameText.textContent = `Most Lost Game: ${runSummary.mostLostGame}`;
  if (highestStreakText) highestStreakText.textContent = `Highest Streak: ${runSummary.highestStreak}`;
  if (hotStreakBonusText) hotStreakBonusText.textContent = `Hot Streak Bonus Earned: $${runSummary.totalHotStreakBonus.toFixed(2)}`;
  renderRunHistory("game-over-history-list");

  gameOverPopup.classList.remove("hidden");

  animateGameOverGraph();
}

function drawGameOverGraph(progress = 1) {
  const width = gameOverGraph.width;
  const height = gameOverGraph.height;

  gameOverCtx.clearRect(0, 0, width, height);

  gameOverCtx.fillStyle = "#191727";
  gameOverCtx.fillRect(0, 0, width, height);

  gameOverCtx.strokeStyle = "rgba(244, 195, 78, 0.22)";
  gameOverCtx.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    const y = 20 + i * ((height - 40) / 4);

    gameOverCtx.beginPath();
    gameOverCtx.moveTo(20, y);
    gameOverCtx.lineTo(width - 20, y);
    gameOverCtx.stroke();
  }

  if (balanceHistory.length < 2) return;

  const maxValue = Math.max(...balanceHistory, 100);
  const minValue = 0;

  const points = balanceHistory.map((value, index) => {
    const x = 20 + (index / (balanceHistory.length - 1)) * (width - 40);
    const y =
      height - 20 -
      ((value - minValue) / (maxValue - minValue || 1)) * (height - 40);

    return { x, y, value };
  });

  const visibleCount = Math.max(2, Math.floor(points.length * progress));
  const visiblePoints = points.slice(0, visibleCount);

  for (let i = 1; i < visiblePoints.length; i++) {
    const previous = visiblePoints[i - 1];
    const current = visiblePoints[i];

    gameOverCtx.beginPath();
    gameOverCtx.moveTo(previous.x, previous.y);
    gameOverCtx.lineTo(current.x, current.y);

    gameOverCtx.strokeStyle =
      current.value >= previous.value ? "#7EDD65" : "#F45B58";

    gameOverCtx.lineWidth = 4;
    gameOverCtx.lineCap = "round";
    gameOverCtx.stroke();
  }

  const lastPoint = visiblePoints[visiblePoints.length - 1];

  gameOverCtx.beginPath();
  gameOverCtx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
  gameOverCtx.fillStyle = "#F4C34E";
  gameOverCtx.shadowColor = "#F4C34E";
  gameOverCtx.shadowBlur = 14;
  gameOverCtx.fill();
  gameOverCtx.shadowBlur = 0;

  gameOverCtx.fillStyle = "white";
  gameOverCtx.font = "20px 'Casino Run Pixel', monospace";
  gameOverCtx.fillText(`High $${highestBalance.toFixed(0)}`, 20, 18);
}

function animateGameOverGraph() {
  let startTime = null;

  function animate(timestamp) {
    if (!startTime) {
      startTime = timestamp;
    }

    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / 3600, 1);

    drawGameOverGraph(progress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

function resetRunToTitleScreen() {
  runId++;
  clearPopupQueue();
  CR.hud.reset();
  CR.audio.stopAll();
  CR.audio.music(null);
  clearInterval(typewriterInterval);
  devUEasterEggUnlocked = false;
  devUEasterEggClicks = 0;

  balance = 100;
  goal = 300;
  timeLeft = 120;
  currentRound = 1;
  moneyPopupActive = false;
  currentWinStreak = 0;
  highestWinStreak = 0;
  totalHotStreakBonusEarned = 0;
  greaseFireActive = false;
  consumedItemIds = [];
  runRoundHistory = [];
  gameLossStats = {};
  allInAnimationActive = false;

  goalPopupOpen = false;
  runEnded = false;
  gameStarted = false;

  highestBalance = 100;
  balanceHistory = [100];

  runStartTime = null;
  runEndTime = null;
  gamePlayCounts = {
    Plinko: 0,
    Roulette: 0,
    Crash: 0,
    Blackjack: 0,
    "Elephant River": 0,
    "Horse Race": 0
  };

  coinFlipUses = 0;
  coinFlipOpen = false;
  coinFlipAnimating = false;

  activePlinkoBalls = 0;
  rouletteSpinning = false;
  stopRouletteSpinSound();

  inventory = [];
  currentShopSlots = [];

  activeRouletteMagnet = false;
  activeFrogSneakers = 0;
  activeGoldenHorseshoe = 0;
  activeWeightedBall = 0;
  cashbackActiveUntil = 0;

  activeJesterHatUntil = 0;
  roseKatPlinkoBoosts = 0;
  activeFreeRouletteMaxSpin = 0;

  renderActiveItemTimers();

  crashRunning = false;
  crashCashedOut = false;
  crashBet = 0;
  crashMultiplier = 1;
  crashPoint = 0;

  resetBlackjack();
  resetFrogRoad();
  resetHorseRace();

  cancelAnimationFrame(crashAnimationFrame);
  stopCrashRocketSound();
  stopRouletteSpinSound();
  stopLowMoneySiren();
  stopHorseGallopSound();

  document.querySelectorAll(".game-action-btn").forEach((button) => {
    button.disabled = false;
  });

  cashoutBtn.disabled = true;
  startCrashBtn.disabled = false;
  updateBlackjackButtonState();
  updateFrogButtons();
  updateHorseButtons();

  goalPopup.classList.add("hidden");
  namePopup.classList.add("hidden");
  gameOverPopup.classList.add("hidden");
  coinFlipPopup.classList.add("hidden");
  itemPopup.classList.add("hidden");
  dangerFlash.classList.add("hidden");

  if (moneyPopupLayer) {
    moneyPopupLayer.classList.add("hidden");
    moneyPopupLayer.innerHTML = "";
  }

  const allInLayer = document.getElementById("all-in-layer");

  if (allInLayer) {
    allInLayer.classList.add("hidden");
    allInLayer.innerHTML = "";
  }

  document.body.classList.remove("all-in-screen-shake");

  coin.classList.remove("flipping", "win", "lose");
  flipCoinBtn.disabled = false;

  gameWrapper.classList.add("hidden");
  titleScreen.classList.remove("hidden");

  rouletteResultText.textContent = "Result: -";
  crashStatusText.textContent = "Place your bet and start.";
  crashMultiplierText.textContent = "1.00x";
  updateCrashGlow(1);
  drawCrashGraph(1);

  document.querySelectorAll(".ball").forEach((ball) => {
    ball.remove();
  });

  renderInventory();
  renderShop();
  updateUI();
}

tryAgainBtn.addEventListener("click", resetRunToTitleScreen);

/* ========================= */
/* GOAL POPUP */
/* ========================= */

const goalPopup = document.getElementById("goal-popup");
const goalPopupMessage = document.getElementById("goal-popup-message");
const keepGoingBtn = document.getElementById("keep-going-btn");
const cashOutRunBtn = document.getElementById("cash-out-run-btn");

const namePopup = document.getElementById("name-popup");
const playerNameInput = document.getElementById("player-name-input");
const submitScoreBtn = document.getElementById("submit-score-btn");
const leaderboardList = document.getElementById("leaderboard-list");
const cashoutFinalBalanceText = document.getElementById("cashout-final-balance-text");
const cashoutHighestBalanceText = document.getElementById("cashout-highest-balance-text");
const cashoutFavoriteGameText = document.getElementById("cashout-favorite-game-text");
const cashoutTimePlayedText = document.getElementById("cashout-time-played-text");
const cashoutMostLostGameText = document.getElementById("cashout-most-lost-game-text");
const cashoutHighestStreakText = document.getElementById("cashout-highest-streak-text");
const cashoutHotStreakBonusText = document.getElementById("cashout-hot-streak-bonus-text");

let typewriterInterval = null;

function typeMessage(text) {
  goalPopupMessage.textContent = "";

  let index = 0;

  clearInterval(typewriterInterval);

  typewriterInterval = setInterval(() => {
    if (index < text.length) {
      goalPopupMessage.textContent += text[index];

      if (text[index] !== " ") {
        playTone(520 + Math.random() * 120, 0.025, "triangle", 0.025);
      }

      index++;
    } else {
      clearInterval(typewriterInterval);
    }
  }, 45);
}

function showGoalPopup() {
  if (goalPopupOpen || goalPopupQueued || runEnded) return;

  goalPopupQueued = true;

  queuePopupStep(() => {
    // Balance may have dropped back under the goal while this popup waited in the queue.
    if (runEnded || balance < goal) {
      goalPopupQueued = false;
      checkGameState();
      return;
    }

    goalPopupQueued = false;
    goalPopupOpen = true;
    goalPopup.classList.remove("hidden");

    CR.fx.goal(); // L6: confetti, GOAL! word, fanfare

    typeMessage(
      "AWESOME! You made it! But do you have the guts to keep going?"
    );
  }, 900);
}


function continueRun() {
  goalPopupOpen = false;
  goalPopup.classList.add("hidden");

  currentRound++;
  goal = Math.max(50, Math.ceil(balance * 3));
  timeLeft = 120;

  goalPopupMessage.textContent = "";
  CR.audio.play("new_round");

  generateShopRotation();
  renderShop();

  updateUI();

  setTimeout(() => {
    showToast(`Round ${currentRound}! New goal: $${goal}. Timer reset to 120 seconds! Shop refreshed!`);
  }, 150);
}

function cashOutRun() {
  if (!runEndTime) {
    runEndTime = Date.now();
  }

  goalPopupOpen = false;
  runEnded = true;

  goalPopup.classList.add("hidden");
  namePopup.classList.remove("hidden");

  const runSummary = getRunSummary();

  cashoutFinalBalanceText.textContent = `Final Balance: $${balance.toFixed(2)}`;
  cashoutHighestBalanceText.textContent = `Highest Balance: $${highestBalance.toFixed(2)}`;
  cashoutFavoriteGameText.textContent = `Favorite Game: ${runSummary.favoriteGame}`;
  cashoutTimePlayedText.textContent = `Time Played: ${runSummary.timePlayed}`;
  if (cashoutMostLostGameText) cashoutMostLostGameText.textContent = `Most Lost Game: ${runSummary.mostLostGame}`;
  if (cashoutHighestStreakText) cashoutHighestStreakText.textContent = `Highest Streak: ${runSummary.highestStreak}`;
  if (cashoutHotStreakBonusText) cashoutHotStreakBonusText.textContent = `Hot Streak Bonus Earned: $${runSummary.totalHotStreakBonus.toFixed(2)}`;
  renderRunHistory("cashout-history-list");

  playerNameInput.value = "";
  playerNameInput.focus();

  document.querySelectorAll(".game-action-btn").forEach((button) => {
    button.disabled = true;
  });

  cashoutBtn.disabled = true;
  startCrashBtn.disabled = true;
  updateBlackjackButtonState();
  updateFrogButtons();
  updateHorseButtons();

  updateDangerFlash();
}

async function submitScore() {
  if (leaderboardSubmitBusy) return;

  let name = playerNameInput.value.trim();

  if (name === "") {
    name = "Player";
  }

  if (devUEasterEggUnlocked) {
    showToast("Dev stash runs are not submitted to the leaderboard.");
    resetRunToTitleScreen();
    return;
  }

  leaderboardSubmitBusy = true;
  submitScoreBtn.disabled = true;
  submitScoreBtn.textContent = "SAVING...";

  const savedOnline = await submitLiveLeaderboardScore(name, balance);

  if (!savedOnline) {
    leaderboard.push({
      name,
      score: balance
    });

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    renderLeaderboard("Saved locally. Live leaderboard could not be reached.");
  }

  await loadLiveLeaderboard();

  submitScoreBtn.textContent = savedOnline ? "SAVED!" : "SAVED LOCALLY";

  setTimeout(() => {
    submitScoreBtn.disabled = false;
    submitScoreBtn.textContent = "SUBMIT SCORE";
    leaderboardSubmitBusy = false;
    // Previously only hid the popup, leaving the player on a dead, disabled game screen.
    resetRunToTitleScreen();
  }, 900);
}

function renderLeaderboard(statusMessage = "") {
  leaderboardList.innerHTML = "";

  if (statusMessage) {
    const statusItem = document.createElement("li");
    statusItem.textContent = statusMessage;
    statusItem.classList.add("leaderboard-status");
    leaderboardList.appendChild(statusItem);
  }

  if (leaderboardIsLoading) {
    const loadingItem = document.createElement("li");
    loadingItem.textContent = "Loading live scores...";
    loadingItem.classList.add("leaderboard-status");
    leaderboardList.appendChild(loadingItem);
    return;
  }

  if (leaderboard.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "No live scores yet.";
    leaderboardList.appendChild(emptyItem);
    return;
  }

  leaderboard.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = `${entry.name} - $${Number(entry.score).toFixed(2)}`;
    leaderboardList.appendChild(item);
  });
}

async function loadLiveLeaderboard() {
  if (!leaderboardList) return;

  leaderboardIsLoading = true;
  renderLeaderboard();

  try {
    const url = `${SUPABASE_PROJECT_URL}/rest/v1/${SUPABASE_LEADERBOARD_TABLE}?select=player_name,final_balance&order=final_balance.desc&limit=10`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_PUBLIC_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_PUBLIC_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Leaderboard load failed: ${response.status}`);
    }

    const rows = await response.json();

    leaderboard = rows.map((row) => {
      return {
        name: row.player_name,
        score: Number(row.final_balance) || 0
      };
    });

    leaderboardIsLoading = false;
    renderLeaderboard();
  } catch (error) {
    console.error(error);
    leaderboardIsLoading = false;
    renderLeaderboard("Live leaderboard unavailable.");
  }
}

async function submitLiveLeaderboardScore(name, finalBalance) {
  try {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${SUPABASE_LEADERBOARD_TABLE}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_PUBLIC_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_PUBLIC_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        player_name: name.slice(0, 12),
        final_balance: Number(finalBalance.toFixed(2))
      })
    });

    if (!response.ok) {
      throw new Error(`Leaderboard save failed: ${response.status}`);
    }

    showToast("Score saved to live leaderboard!");
    return true;
  } catch (error) {
    console.error(error);
    showToast("Could not save live score. Saved locally instead.");
    return false;
  }
}

keepGoingBtn.addEventListener("click", continueRun);
cashOutRunBtn.addEventListener("click", cashOutRun);
submitScoreBtn.addEventListener("click", submitScore);
document.getElementById("skip-score-btn").addEventListener("click", () => {
  if (!leaderboardSubmitBusy) resetRunToTitleScreen();
});

playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    submitScore();
  }
});

/* ========================= */
/* COIN FLIP SYSTEM */
/* ========================= */

const coinFlipPopup = document.getElementById("coin-flip-popup");
const coinFlipMessage = document.getElementById("coin-flip-message");
const coinFlipsLeftText = document.getElementById("coin-flips-left");
const coin = document.getElementById("coin");
const flipCoinBtn = document.getElementById("flip-coin-btn");

function disableGameButtons() {
  document.querySelectorAll(".game-action-btn").forEach((button) => {
    button.disabled = true;
  });

  cashoutBtn.disabled = true;
}

function enableGameButtonsAfterCoinFlip() {
  document.querySelectorAll(".game-action-btn").forEach((button) => {
    button.disabled = false;
  });

  if (!crashRunning) {
    cashoutBtn.disabled = true;
    startCrashBtn.disabled = false;
  }

  updateBlackjackButtonState();
  updateFrogButtons();
  updateHorseButtons();
}

function showCoinFlipPopup() {
  if (coinFlipOpen || coinFlipAnimating || runEnded) return;

  if (activePlinkoBalls > 0) {
    return;
  }

  if (coinFlipUses >= maxCoinFlips) {
    showGameOverScreen();
    return;
  }

  coinFlipOpen = true;
  coinFlipAnimating = false;

  stopLowMoneySiren();

  coinFlipPopup.classList.remove("hidden");

  coin.classList.remove("flipping", "win", "lose");

  coinFlipsLeftText.textContent =
    `Coin flips left: ${maxCoinFlips - coinFlipUses}`;

  coinFlipMessage.textContent =
    `You dropped under $1. Flip the coin. Win and get $${(goal * 0.2).toFixed(2)}. Lose and the run ends.`;

  flipCoinBtn.disabled = false;

  disableGameButtons();

  playTone(320, 0.12, "triangle", 0.08);

  setTimeout(() => {
    playTone(520, 0.12, "triangle", 0.07);
  }, 130);
}

function flipRescueCoin() {
  if (!coinFlipOpen || coinFlipAnimating) return;

  coinFlipAnimating = true;
  flipCoinBtn.disabled = true;

  coinFlipUses++;

  let playerWins = Math.random() < 0.5;

  if (hasItem("doubleHeadedCoin")) {
    playerWins = true;
    removeItemFromInventory("doubleHeadedCoin", true);
  }

  coin.classList.remove("flipping", "win", "lose");

  void coin.offsetWidth;

  coin.classList.add("flipping");

  sfx("coin_flip", undefined, () => {
    playTone(680, 0.08, "square", 0.06);
    setTimeout(() => playTone(820, 0.08, "square", 0.06), 250);
    setTimeout(() => playTone(980, 0.08, "square", 0.06), 500);
  });

  setTimeout(() => {
    coin.classList.remove("flipping");

    if (playerWins) {
      coin.classList.add("win");

      const rescueAmount = goal * 0.2;

      balance = rescueAmount;
      recordBalancePoint();

      coinFlipMessage.textContent =
        `HEADS! You survived. Your balance has been restored to $${rescueAmount.toFixed(2)}.`;

      playCashSound();

      updateUI();

      setTimeout(() => {
        coinFlipPopup.classList.add("hidden");

        coinFlipOpen = false;
        coinFlipAnimating = false;

        enableGameButtonsAfterCoinFlip();

        updateUI();
      }, 1400);
    } else {
      coin.classList.add("lose");

      coinFlipMessage.textContent =
        "TAILS! The casino takes everything.";

      playGameOverSound();

      setTimeout(() => {
        coinFlipPopup.classList.add("hidden");

        coinFlipOpen = false;
        coinFlipAnimating = false;

        showGameOverScreen();
      }, 1500);
    }
  }, 1450);
}

flipCoinBtn.addEventListener("click", flipRescueCoin);

/* ========================= */
/* BET SLIDERS */
/* ========================= */

const plinkoBetSlider = document.getElementById("plinko-bet-slider");
const plinkoBetDisplay = document.getElementById("plinko-bet-display");
const plinkoMaxDisplay = document.getElementById("plinko-max-display");

const rouletteBetSlider = document.getElementById("roulette-bet-slider");
const rouletteBetDisplay = document.getElementById("roulette-bet-display");
const rouletteMaxDisplay = document.getElementById("roulette-max-display");

const crashBetSlider = document.getElementById("crash-bet-slider");
const crashBetDisplay = document.getElementById("crash-bet-display");
const crashMaxDisplay = document.getElementById("crash-max-display");

const blackjackBetSlider = document.getElementById("blackjack-bet-slider");
const blackjackBetDisplay = document.getElementById("blackjack-bet-display");
const blackjackMaxDisplay = document.getElementById("blackjack-max-display");

const frogBetSlider = document.getElementById("frog-bet-slider");
const frogBetDisplay = document.getElementById("frog-bet-display");
const frogMaxDisplay = document.getElementById("frog-max-display");

const horseBetSlider = document.getElementById("horse-bet-slider");
const horseBetDisplay = document.getElementById("horse-bet-display");
const horseMaxDisplay = document.getElementById("horse-max-display");

const betSliders = [
  {
    slider: plinkoBetSlider,
    display: plinkoBetDisplay,
    maxDisplay: plinkoMaxDisplay
  },
  {
    slider: rouletteBetSlider,
    display: rouletteBetDisplay,
    maxDisplay: rouletteMaxDisplay
  },
  {
    slider: crashBetSlider,
    display: crashBetDisplay,
    maxDisplay: crashMaxDisplay
  },
  {
    slider: blackjackBetSlider,
    display: blackjackBetDisplay,
    maxDisplay: blackjackMaxDisplay
  },
  {
    slider: frogBetSlider,
    display: frogBetDisplay,
    maxDisplay: frogMaxDisplay
  },
  {
    slider: horseBetSlider,
    display: horseBetDisplay,
    maxDisplay: horseMaxDisplay
  }
];

function updateSingleBetSlider(item) {
  const maxBet = Math.max(1, Math.floor(balance));

  item.slider.max = maxBet;

  if (Number(item.slider.value) > maxBet) {
    item.slider.value = maxBet;
  }

  item.display.textContent = `$${Number(item.slider.value).toFixed(0)}`;
  item.maxDisplay.textContent = `Max: $${maxBet}`;
}

function updateBetSliders() {
  betSliders.forEach(updateSingleBetSlider);
}

function resetBetSliderToOne(slider) {
  slider.value = 1;
  updateBetSliders();
}

betSliders.forEach((item) => {
  item.slider.addEventListener("input", () => {
    updateSingleBetSlider(item);
    playTone(350 + Number(item.slider.value) * 3, 0.025, "triangle", 0.025);
  });
});

/* ========================= */
/* NAVIGATION */
/* ========================= */

const navButtons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    navButtons.forEach((btn) => btn.classList.remove("active"));
    screens.forEach((screen) => screen.classList.remove("active-screen"));

    button.classList.add("active");

    const screenId = button.dataset.screen;
    document.getElementById(screenId).classList.add("active-screen");

    renderInventory();
    playScreenMusic();

    if (screenId === "plinko-screen") {
      requestAnimationFrame(() => {
        createPegs();
      });
    }
  });
});

/* ========================= */
/* PLINKO */
/* ========================= */

const board = document.getElementById("board");
const pegsContainer = document.querySelector(".pegs");
const plinkoBtn = document.getElementById("plinko-btn");

let pegs = [];
let activePlinkoBalls = 0;

const plinkoMultipliers = [0, 0.5, 1, 2, 5];
// Slot odds, paired with plinkoMultipliers. Return per $1 = 0.23*0.5 + 0.18*1 + 0.13*2 + 0.08*5 = 0.955.
// (The old pure-physics drop returned ~1.83-1.89 and varied with screen width.)
const plinkoSlotOdds = [0.38, 0.23, 0.18, 0.13, 0.08];

function rollPlinkoSlot() {
  let roll = Math.random();

  for (let i = 0; i < plinkoSlotOdds.length; i++) {
    roll -= plinkoSlotOdds[i];
    if (roll < 0) return i;
  }

  return 0;
}

function createPegs() {
  if (!board || !pegsContainer) return;
  if (board.clientWidth < 100 || board.clientHeight < 100) return;

  pegsContainer.innerHTML = "";
  pegs = [];

  const rows = 8;
  const cols = 6;

  const boardWidth = board.clientWidth;

  const leftPadding = 45;
  const rightPadding = 45;
  const topPadding = 70;

  const usableWidth = boardWidth - leftPadding - rightPadding;
  const spacingX = usableWidth / (cols - 1);
  const spacingY = 40;

  for (let row = 0; row < rows; row++) {
    const rowOffset = row % 2 === 0 ? 0 : spacingX / 2;

    for (let col = 0; col < cols; col++) {
      const x = leftPadding + col * spacingX + rowOffset;
      const y = topPadding + row * spacingY;

      if (x > boardWidth - rightPadding + 8) {
        continue;
      }

      const pegElement = document.createElement("div");
      pegElement.classList.add("peg");
      pegElement.style.left = `${x}px`;
      pegElement.style.top = `${y}px`;

      pegsContainer.appendChild(pegElement);

      pegs.push({
        x,
        y,
        radius: 6.5,
        element: pegElement
      });
    }
  }
}

window.addEventListener("resize", () => {
  createPegs();
});

plinkoBtn.addEventListener("click", () => {
  if (runEnded || goalPopupOpen || coinFlipOpen || !gameStarted) return;

  if (pegs.length === 0) {
    createPegs();
  }

  if (pegs.length === 0) {
    showToast("Plinko board is still loading. Try again.");
    return;
  }

  const bet = Number(plinkoBetSlider.value);

  if (!Number.isFinite(bet) || bet <= 0) {
    showToast("Enter a valid bet.");
    return;
  }

  if (bet > balance) {
    showToast("Not enough money.");
    return;
  }

  maybeShowAllInAnimation("Plinko", bet);
  changeBalance(-bet);
  trackGamePlayed("Plinko");

  activePlinkoBalls++;

  dropPlinkoBall(bet);
});

function dropPlinkoBall(bet) {
  const ball = document.createElement("div");
  ball.classList.add("ball");
  board.appendChild(ball);

  const ballRadius = 9;

  let x = board.clientWidth / 2 + (Math.random() - 0.5) * 10;
  let y = 26;

  let vx = (Math.random() - 0.5) * 1.8;
  let vy = 0;

  const gravity = 0.22;
  const bounce = 0.72;
  const friction = 0.995;

  const boardWidth = board.clientWidth;
  const boardHeight = board.clientHeight;
  const slotHeight = 42;
  const floorY = boardHeight - slotHeight - ballRadius;
  const ballRunId = runId;

  // The slot is rolled up front (fixed odds, same on every screen size) and the ball is
  // steered into it. Weighted Ball now shifts the target, so the visual slot always matches the payout.
  let targetSlot = rollPlinkoSlot();

  if (activeWeightedBall > 0) {
    targetSlot = Math.min(targetSlot + 1 + Math.floor(Math.random() * 2), plinkoMultipliers.length - 1);
    activeWeightedBall--;
  }

  const slotWidth = boardWidth / plinkoMultipliers.length;
  const targetX = (targetSlot + 0.5) * slotWidth;

  function physicsStep() {
    // A ball from a reset run must not pay out into the next one.
    if (ballRunId !== runId) return;

    vy += gravity;

    x += vx;
    y += vy;

    if (x - ballRadius < 0) {
      x = ballRadius;
      vx = Math.abs(vx) * 0.8;
    }

    if (x + ballRadius > boardWidth) {
      x = boardWidth - ballRadius;
      vx = -Math.abs(vx) * 0.8;
    }

    for (const peg of pegs) {
      const dx = x - peg.x;
      const dy = y - peg.y;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = ballRadius + peg.radius;

      if (distance < minDistance && distance > 0.001) {
        const nx = dx / distance;
        const ny = dy / distance;

        const overlap = minDistance - distance;

        x += nx * overlap;
        y += ny * overlap;

        const velocityDotNormal = vx * nx + vy * ny;

        if (velocityDotNormal < 0) {
          vx -= (1 + bounce) * velocityDotNormal * nx;
          vy -= (1 + bounce) * velocityDotNormal * ny;
        }

        vx += nx * 0.45;
        vy += ny * 0.25;
        vx += (Math.random() - 0.5) * 0.45;

        playPegHitSound(peg);

        peg.element.classList.add("hit");

        setTimeout(() => {
          peg.element.classList.remove("hit");
        }, 90);
      }
    }

    vx *= friction;

    // Steering pull grows with depth. 0.02/0.1 lands ~99% of balls in the target unaided
    // (tuned by simulation); stronger values trap balls on pegs.
    const depth = Math.max(0, (y - 26) / (floorY - 26));
    vx += (targetX - x) * 0.02 * depth;
    vx *= 1 - 0.1 * depth;

    if (y >= floorY) {
      x = Math.min(Math.max(x, targetSlot * slotWidth + ballRadius), (targetSlot + 1) * slotWidth - ballRadius);
    }

    ball.style.left = `${x - ballRadius}px`;
    ball.style.top = `${y - ballRadius}px`;

    if (y >= floorY) {
      finishPlinkoBall(ball, targetSlot, bet);
      return;
    }

    requestAnimationFrame(physicsStep);
  }

  requestAnimationFrame(physicsStep);
}

function finishPlinkoBall(ball, slotIndex, bet) {
  const slotElement = board.querySelectorAll(".slot")[slotIndex];
  if (slotElement) {
    slotElement.classList.remove("slot-hit");
    void slotElement.offsetWidth;
    slotElement.classList.add("slot-hit");
  }
  CR.audio.play("plinko_land", { rate: 0.9 + slotIndex * 0.08 });

  const multiplier = plinkoMultipliers[slotIndex];
  let normalPayout = bet * multiplier;
  let winnings = normalPayout;

  const bonusLines = [];

  if (normalPayout > 0) {
    bonusLines.push({
      type: "base",
      text: `+$${normalPayout.toFixed(2)} Plinko ${multiplier}x Payout`
    });
  }

  const profit = Math.max(0, normalPayout - bet);

  if (profit > 0 && roseKatPlinkoBoosts > 0) {
    const roseKatBonus = profit * 4;

    winnings += roseKatBonus;
    roseKatPlinkoBoosts--;

    bonusLines.push({
      type: "bonus",
      text: `+$${roseKatBonus.toFixed(2)} RoseKat’s Magnum Opus Bonus`
    });

    showToast(`RoseKat’s Magnum Opus added 4x profit! Boosts left: ${roseKatPlinkoBoosts}`);
  }

  if (winnings > bet) {
    const bonusResult = applyWinBonus(winnings, bet, bonusLines, "Plinko");
    winnings = bonusResult.payout;
  } else if (winnings === bet && winnings > 0) {
    recordRoundResult("Plinko", "Push", 0);
  } else if (winnings > 0 && winnings < bet) {
    handleHotStreakLoss();
    recordRoundResult("Plinko", "Loss", winnings - bet);
    resetBetSliderToOne(plinkoBetSlider);
  }

  if (winnings > 0) {
    changeBalance(winnings, bonusLines);
  } else {
    const lossText = processFullLoss(bet, "Plinko");

    resetBetSliderToOne(plinkoBetSlider);

    if (lossText) {
      showToast(lossText);
    }
  }

  if (winnings > bet) {
    shakeWinBoard();
  }

  ball.remove();

  activePlinkoBalls--;

  if (activePlinkoBalls < 0) {
    activePlinkoBalls = 0;
  }

  if (activePlinkoBalls === 0) {
    checkGameState();
  }
}

/* ========================= */
/* ROULETTE */
/* ========================= */

const rouletteCanvas = document.getElementById("roulette-canvas");
const rouletteCtx = rouletteCanvas.getContext("2d");

const spinBtn = document.getElementById("spin-btn");
const rouletteResultText = document.getElementById("roulette-result");

const betRedBtn = document.getElementById("bet-red");
const betBlackBtn = document.getElementById("bet-black");
const betGreenBtn = document.getElementById("bet-green");

let selectedRouletteBet = null;
let rouletteSpinning = false;
let rouletteSpinCount = 0;

const redNumbers = new Set([
  1, 3, 5, 7, 9,
  12, 14, 16, 18,
  19, 21, 23, 25, 27,
  30, 32, 34, 36
]);

function getRouletteColor(number) {
  if (number === 0) return "green";
  return redNumbers.has(number) ? "red" : "black";
}

function getRandomRouletteNumberForColor(color) {
  const options = [];

  for (let i = 0; i <= 36; i++) {
    if (getRouletteColor(i) === color) {
      options.push(i);
    }
  }

  return options[Math.floor(Math.random() * options.length)];
}

function drawRouletteWheel() {
  const canvas = rouletteCanvas;
  const ctx = rouletteCtx;

  const size = canvas.width;
  const center = size / 2;
  const radius = size / 2 - 4;

  const totalNumbers = 37;
  const angleStep = (Math.PI * 2) / totalNumbers;

  ctx.clearRect(0, 0, size, size);

  for (let number = 0; number < totalNumbers; number++) {
    const color = getRouletteColor(number);

    const startAngle = -Math.PI / 2 - angleStep / 2 + number * angleStep;
    const endAngle = startAngle + angleStep;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();

    if (color === "green") {
      ctx.fillStyle = "#7EDD65";
    } else if (color === "red") {
      ctx.fillStyle = "#F45B58";
    } else {
      ctx.fillStyle = "#191727";
    }

    ctx.fill();

    ctx.strokeStyle = "#F4C34E";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const textAngle = startAngle + angleStep / 2;
    const textRadius = radius * 0.75;

    const textX = center + Math.cos(textAngle) * textRadius;
    const textY = center + Math.sin(textAngle) * textRadius;

    ctx.save();
    ctx.translate(textX, textY);
    ctx.rotate(textAngle + Math.PI / 2);
    ctx.fillStyle = "white";
    ctx.font = "10px 'Casino Run Pixel', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(number.toString(), 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(center, center, 38, 0, Math.PI * 2);
  ctx.fillStyle = "#191727";
  ctx.fill();
  ctx.strokeStyle = "#F4C34E";
  ctx.lineWidth = 3;
  ctx.stroke();
}

drawRouletteWheel();

function selectRouletteBet(color) {
  selectedRouletteBet = color;

  betRedBtn.classList.remove("selected");
  betBlackBtn.classList.remove("selected");
  betGreenBtn.classList.remove("selected");

  if (color === "red") betRedBtn.classList.add("selected");
  if (color === "black") betBlackBtn.classList.add("selected");
  if (color === "green") betGreenBtn.classList.add("selected");
}

betRedBtn.addEventListener("click", () => selectRouletteBet("red"));
betBlackBtn.addEventListener("click", () => selectRouletteBet("black"));
betGreenBtn.addEventListener("click", () => selectRouletteBet("green"));

spinBtn.addEventListener("click", () => {
  if (runEnded || goalPopupOpen || coinFlipOpen || !gameStarted) return;
  if (rouletteSpinning) return;

  if (!selectedRouletteBet) {
    showToast("Pick Red, Black, or Green first.");
    return;
  }

  let bet = Number(rouletteBetSlider.value);
  let isFreeVinylSpin = false;

  // Vinyl is only spent once the spin is known to be valid (it was lost when no color was picked).
  if (activeFreeRouletteMaxSpin > 0) {
    bet = Math.max(1, Math.floor(balance));
    isFreeVinylSpin = true;
    activeFreeRouletteMaxSpin--;
  }

  if (!Number.isFinite(bet) || bet <= 0) {
    showToast("Enter a valid bet.");
    return;
  }

  if (!isFreeVinylSpin && bet > balance) {
    showToast("Not enough money.");
    return;
  }

  if (!isFreeVinylSpin) {
    maybeShowAllInAnimation("Roulette", bet);
    changeBalance(-bet);
  } else {
    showToast(`EJM’s Record Vinyl used! Free max bet spin: $${bet}`);
  }

  trackGamePlayed("Roulette");
  spinRoulette(bet, isFreeVinylSpin);
});

function spinRoulette(bet, isFreeVinylSpin = false) {
  rouletteSpinning = true;
  // Lock the color at spin time: settlement used to read the live selection, so switching
  // color while watching the wheel land always won.
  const betColor = selectedRouletteBet;
  const spinRunId = runId;

  startRouletteSpinSound();

  let result;

  // Magnet only pulls toward red/black: on green (14x) it made a spin return ~7.9 per $1.
  // A green spin leaves the Magnet active for the next red/black spin instead of wasting it.
  const magnetApplies = activeRouletteMagnet && betColor !== "green";

  if (magnetApplies) {
    activeRouletteMagnet = false;
  }

  if (magnetApplies && Math.random() < 0.55) {
    result = getRandomRouletteNumberForColor(betColor);
  } else {
    result = Math.floor(Math.random() * 37);
  }

  const segmentAngle = 360 / 37;

  rouletteSpinCount++;

  const finalRotation =
    rouletteSpinCount * 360 * 6 +
    (360 - result * segmentAngle);

  rouletteCanvas.style.transform = `rotate(${finalRotation}deg)`;

  setTimeout(() => {
    if (spinRunId !== runId) return;

    stopRouletteSpinSound();

    sfx("roulette_stop", undefined, () => playTone(420, 0.14, "square", 0.08));

    finishRouletteSpin(result, bet, isFreeVinylSpin, betColor);
    rouletteSpinning = false;
  }, 4100);
}

function finishRouletteSpin(result, bet, isFreeVinylSpin, betColor) {
  const resultColor = getRouletteColor(result);

  let winnings = 0;
  let bonusLines = [];

  if (betColor === resultColor) {
    if (resultColor === "green") {
      winnings = bet * 14;
    } else {
      winnings = bet * 2;
    }

    bonusLines.push({
      type: "base",
      text: `+$${winnings.toFixed(2)} Roulette Payout`
    });

    const bonusResult = applyWinBonus(winnings, bet, bonusLines, "Roulette");
    winnings = bonusResult.payout;
  }

  if (winnings > 0) {
    changeBalance(winnings, bonusLines);
    shakeWinBoard();
    rouletteResultText.textContent = `Result: ${result} (${resultColor})`;
  } else {
    if (isFreeVinylSpin) {
      rouletteResultText.textContent =
        `Result: ${result} (${resultColor}) — EJM’s free spin lost, but you paid $0.`;
    } else {
      const lossText = processFullLoss(bet, "Roulette");

      resetBetSliderToOne(rouletteBetSlider);

      rouletteResultText.textContent = `Result: ${result} (${resultColor})`;

      if (lossText) {
        rouletteResultText.textContent += ` — ${lossText}`;
      }
    }
  }

  checkGameState();
}

/* ========================= */
/* CRASH */
/* ========================= */

const startCrashBtn = document.getElementById("start-crash-btn");
const cashoutBtn = document.getElementById("cashout-btn");
const crashMultiplierText = document.getElementById("crash-multiplier");
const crashStatusText = document.getElementById("crash-status");
const crashCanvas = document.getElementById("crash-canvas");
const crashCtx = crashCanvas.getContext("2d");

let crashRunning = false;
let crashCashedOut = false;
let crashBet = 0;
let crashMultiplier = 1;
let crashPoint = 0;
let crashStartTime = 0;
let crashAnimationFrame = null;

// P(crash point > m) = 0.96 / m, so cashing out at ANY target returns 0.96 per $1.
// ~4% of rounds crash instantly at 1.00x; capped at 100x. (Old curve returned up to 1.34.)
function generateCrashPoint() {
  return Math.min(100, Math.max(1, 0.96 / (1 - Math.random())));
}

function updateCrashGlow(multiplier, crashed = false) {
  if (crashed) {
    crashMultiplierText.style.color = "#F45B58";
    crashMultiplierText.style.textShadow =
      "0 0 8px rgba(244, 91, 88, 0.85), 0 0 18px rgba(244, 91, 88, 0.55)";
    return;
  }

  const glowA = Math.min(8 + multiplier * 3, 22);
  const glowB = Math.min(18 + multiplier * 5, 42);

  crashMultiplierText.style.color = "#7EDD65";
  crashMultiplierText.style.textShadow =
    `0 0 ${glowA}px rgba(126, 221, 101, 0.9), 0 0 ${glowB}px rgba(126, 221, 101, 0.55)`;
}

const crashRocketSprite = new Image();
crashRocketSprite.src = "assets/sprites/crash/rocket.png";

function drawCrashGraph(multiplier, crashed = false) {
  const width = crashCanvas.width;
  const height = crashCanvas.height;

  crashCtx.clearRect(0, 0, width, height);
  crashCtx.imageSmoothingEnabled = false;

  // Transparent: the crash card's scrolling starfield tile shows through behind the curve.

  crashCtx.strokeStyle = "#3B3752";
  crashCtx.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    const y = 20 + i * ((height - 40) / 4);

    crashCtx.beginPath();
    crashCtx.moveTo(20, y);
    crashCtx.lineTo(width - 20, y);
    crashCtx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const x = 20 + i * ((width - 40) / 5);

    crashCtx.beginPath();
    crashCtx.moveTo(x, 20);
    crashCtx.lineTo(x, height - 20);
    crashCtx.stroke();
  }

  const maxVisualMultiplier = 10;
  const progress = Math.min((multiplier - 1) / (maxVisualMultiplier - 1), 1);

  const startX = 20;
  const endX = 20 + progress * (width - 40);

  const startY = height - 20;
  const riseHeight = progress * (height - 50);

  const points = [];
  const steps = 80;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    const x = startX + t * (endX - startX);
    const curve = Math.pow(t, 1.9);
    const y = startY - curve * riseHeight;

    points.push({ x, y });
  }

  crashCtx.beginPath();
  crashCtx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    crashCtx.lineTo(points[i].x, points[i].y);
  }

  crashCtx.strokeStyle = crashed ? "#F45B58" : "#7EDD65";
  crashCtx.lineWidth = 4;
  crashCtx.lineCap = "square";
  crashCtx.lineJoin = "miter";
  crashCtx.stroke();

  // Pixel rocket rides the tip of the curve, nose along the curve's direction (2 flame frames).
  const tip = points[points.length - 1], prev = points[points.length - 4] || points[0];
  if (crashRocketSprite.complete && crashRocketSprite.naturalWidth && !crashed) {
    const fw = crashRocketSprite.naturalWidth / 2, fh = crashRocketSprite.naturalHeight;
    const frame = Math.floor(performance.now() / 80) % 2;
    crashCtx.save();
    crashCtx.translate(Math.round(tip.x), Math.round(tip.y));
    crashCtx.rotate(Math.atan2(tip.y - prev.y, tip.x - prev.x) + Math.PI / 2);
    crashCtx.drawImage(crashRocketSprite, frame * fw, 0, fw, fh, -fw, -fh, fw * 2, fh * 2);
    crashCtx.restore();
  }

  crashCtx.fillStyle = crashed ? "#FF7A72" : "#7EDD65";
  crashCtx.font = "20px 'Casino Run Pixel', monospace";
  crashCtx.fillText(`${multiplier.toFixed(2)}X`, 14, 24);
}

drawCrashGraph(1);
updateCrashGlow(1);

startCrashBtn.addEventListener("click", () => {
  if (runEnded || goalPopupOpen || coinFlipOpen || !gameStarted) return;
  if (crashRunning) return;

  const bet = Number(crashBetSlider.value);

  if (!Number.isFinite(bet) || bet <= 0) {
    showToast("Enter a valid bet.");
    return;
  }

  if (bet > balance) {
    showToast("Not enough money.");
    return;
  }

  maybeShowAllInAnimation("Crash", bet);
  changeBalance(-bet);
  trackGamePlayed("Crash");

  crashBet = bet;
  crashMultiplier = 1;
  crashPoint = generateCrashPoint();
  crashRunning = true;
  crashCashedOut = false;
  crashStartTime = performance.now();

  crashMultiplierText.textContent = "1.00x";
  updateCrashGlow(1);
  crashStatusText.textContent = "Multiplier rising...";
  cashoutBtn.disabled = false;
  startCrashBtn.disabled = true;

  drawCrashGraph(1);

  startCrashRocketSound();

  runCrash();
});

function runCrash() {
  const now = performance.now();
  const elapsed = (now - crashStartTime) / 1000;

  crashMultiplier = 1 + elapsed * elapsed * 0.55;

  crashMultiplierText.textContent = `${crashMultiplier.toFixed(2)}x`;
  updateCrashGlow(crashMultiplier);
  updateCrashRocketSound(crashMultiplier);
  drawCrashGraph(crashMultiplier);

  if (crashMultiplier >= crashPoint) {
    crashGameOver();
    return;
  }

  crashAnimationFrame = requestAnimationFrame(runCrash);
}

cashoutBtn.addEventListener("click", () => {
  if (!crashRunning || crashCashedOut) return;

  crashCashedOut = true;
  crashRunning = false;

  cancelAnimationFrame(crashAnimationFrame);

  stopCrashRocketSound();

  let winnings = crashBet * crashMultiplier;

  const bonusLines = [
    {
      type: "base",
      text: `+$${winnings.toFixed(2)} Crash Cash Out`
    }
  ];

  const bonusResult = applyWinBonus(winnings, crashBet, bonusLines, "Crash");
  winnings = bonusResult.payout;

  changeBalance(winnings, bonusLines);

  crashStatusText.textContent =
    `Cashed out at ${crashMultiplier.toFixed(2)}x. Won $${winnings.toFixed(2)}.`;

  crashMultiplierText.style.color = "#F4C34E";
  crashMultiplierText.style.textShadow =
    "0 0 8px rgba(244, 195, 78, 0.85), 0 0 18px rgba(244, 195, 78, 0.5)";

  cashoutBtn.disabled = true;
  startCrashBtn.disabled = false;

  if (winnings > crashBet) {
    shakeWinBoard();
  }

  checkGameState();
});

function crashGameOver() {
  crashRunning = false;

  cancelAnimationFrame(crashAnimationFrame);

  stopCrashRocketSound();

  sfx("crash_boom", undefined, () => {
    playTone(180, 0.12, "sawtooth", 0.09);
    setTimeout(() => playTone(95, 0.28, "sawtooth", 0.09), 100);
  });
  const crashBox = crashCanvas.getBoundingClientRect();
  CR.fx.burst(crashBox.right - 30, crashBox.top + 30, { count: 18, kinds: ["fx/star", "fx/sparkle", "fx/chip-red"], speed: 320, up: 80 });

  crashMultiplierText.textContent = "CRASHED";
  updateCrashGlow(crashPoint, true);

  const lossText = processFullLoss(crashBet, "Crash");

  resetBetSliderToOne(crashBetSlider);

  crashStatusText.textContent =
    `Crashed at ${crashPoint.toFixed(2)}x. You lost $${crashBet.toFixed(2)}. ${lossText}`;

  drawCrashGraph(crashPoint, true);

  cashoutBtn.disabled = true;
  startCrashBtn.disabled = false;

  checkGameState();
  updateUI();
}

/* ========================= */
/* BLACKJACK */
/* ========================= */

const blackjackBoard = document.getElementById("blackjack-board");
const dealerHandElement = document.getElementById("dealer-hand");
const playerHandElement = document.getElementById("player-hand");
const dealerTotalText = document.getElementById("dealer-total");
const playerTotalText = document.getElementById("player-total");
const blackjackMessage = document.getElementById("blackjack-message");
const blackjackDealBtn = document.getElementById("blackjack-deal-btn");
const blackjackHitBtn = document.getElementById("blackjack-hit-btn");
const blackjackStandBtn = document.getElementById("blackjack-stand-btn");

let blackjackDeck = [];
let blackjackPlayerHand = [];
let blackjackDealerHand = [];
let blackjackBet = 0;
let blackjackRoundActive = false;
let blackjackDealerHidden = true;
let blackjackBusy = false;

function createBlackjackDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  const deck = [];

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({ rank, suit });
    });
  });

  for (let i = deck.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const temp = deck[i];

    deck[i] = deck[randomIndex];
    deck[randomIndex] = temp;
  }

  return deck;
}

function getCardValue(card) {
  if (card.rank === "A") return 11;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return Number(card.rank);
}

function getHandValue(hand) {
  let total = 0;
  let aces = 0;

  hand.forEach((card) => {
    total += getCardValue(card);

    if (card.rank === "A") {
      aces++;
    }
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && getHandValue(hand) === 21;
}

function isJesterHatActive() {
  return Date.now() < activeJesterHatUntil;
}

function getProtectedDealerTotal() {
  const total = getHandValue(blackjackDealerHand);

  if (isJesterHatActive() && total === 21) {
    return 20;
  }

  return total;
}

function drawBlackjackCard() {
  if (blackjackDeck.length <= 10) {
    blackjackDeck = createBlackjackDeck();
  }

  return blackjackDeck.pop();
}

const CARD_SUIT_SPRITE = { "♠": "spade", "♥": "heart", "♦": "diamond", "♣": "club" };

// Original pixel cards (assets/sprites/cards/<rank>-<suit>.png); the deck logic still uses rank/suit.
function createCardElement(card, hidden = false) {
  const cardElement = document.createElement("div");
  cardElement.classList.add("playing-card");

  const img = document.createElement("img");
  img.draggable = false;

  if (hidden) {
    cardElement.classList.add("hidden-card");
    img.src = "assets/sprites/cards/back.png";
    img.alt = "Face-down card";
  } else {
    img.src = `assets/sprites/cards/${card.rank}-${CARD_SUIT_SPRITE[card.suit]}.png`;
    img.alt = `${card.rank} of ${CARD_SUIT_SPRITE[card.suit]}s`;
  }

  cardElement.appendChild(img);
  return cardElement;
}

function renderBlackjackHands() {
  dealerHandElement.innerHTML = "";
  playerHandElement.innerHTML = "";

  blackjackDealerHand.forEach((card, index) => {
    const hidden = blackjackDealerHidden && index === 1;
    dealerHandElement.appendChild(createCardElement(card, hidden));
  });

  blackjackPlayerHand.forEach((card) => {
    playerHandElement.appendChild(createCardElement(card));
  });

  const playerTotal = getHandValue(blackjackPlayerHand);
  playerTotalText.textContent = `Total: ${playerTotal}`;

  if (blackjackDealerHidden) {
    dealerTotalText.textContent = "Total: ?";
  } else {
    dealerTotalText.textContent = `Total: ${getProtectedDealerTotal()}`;
  }
}

function updateBlackjackButtonState() {
  if (runEnded || coinFlipOpen || goalPopupOpen || !gameStarted) {
    blackjackDealBtn.disabled = true;
    blackjackHitBtn.disabled = true;
    blackjackStandBtn.disabled = true;
    return;
  }

  blackjackDealBtn.disabled = blackjackRoundActive || blackjackBusy;
  blackjackHitBtn.disabled = !blackjackRoundActive || blackjackBusy;
  blackjackStandBtn.disabled = !blackjackRoundActive || blackjackBusy;
}

function resetBlackjack() {
  blackjackDeck = createBlackjackDeck();
  blackjackPlayerHand = [];
  blackjackDealerHand = [];
  blackjackBet = 0;
  blackjackRoundActive = false;
  blackjackDealerHidden = true;
  blackjackBusy = false;

  if (dealerHandElement && playerHandElement) {
    dealerHandElement.innerHTML = "";
    playerHandElement.innerHTML = "";
  }

  if (dealerTotalText && playerTotalText && blackjackMessage) {
    dealerTotalText.textContent = "Total: ?";
    playerTotalText.textContent = "Total: 0";
    blackjackMessage.textContent = "Press DEAL to start.";
  }
}

function dealCardWithDelay(targetHand, callback, delay = 300) {
  const dealRunId = runId;

  setTimeout(() => {
    if (dealRunId !== runId) return;

    targetHand.push(drawBlackjackCard());
    renderBlackjackHands();
    playCardDealSound();

    if (callback) {
      callback();
    }
  }, delay);
}

function startBlackjackRound() {
  if (runEnded || goalPopupOpen || coinFlipOpen || !gameStarted) return;
  if (blackjackRoundActive || blackjackBusy) return;

  const bet = Number(blackjackBetSlider.value);

  if (!Number.isFinite(bet) || bet <= 0) {
    showToast("Enter a valid bet.");
    return;
  }

  if (bet > balance) {
    showToast("Not enough money.");
    return;
  }

  blackjackBet = bet;
  blackjackRoundActive = true;
  blackjackDealerHidden = true;
  blackjackBusy = true;
  blackjackPlayerHand = [];
  blackjackDealerHand = [];

  blackjackMessage.textContent = "Dealing cards...";

  maybeShowAllInAnimation("Blackjack", bet);
  changeBalance(-bet);
  trackGamePlayed("Blackjack");
  updateBlackjackButtonState();

  dealCardWithDelay(blackjackPlayerHand, () => {
    dealCardWithDelay(blackjackDealerHand, () => {
      dealCardWithDelay(blackjackPlayerHand, () => {
        dealCardWithDelay(blackjackDealerHand, () => {
          blackjackBusy = false;
          renderBlackjackHands();

          if (isBlackjack(blackjackPlayerHand)) {
            finishBlackjackRound("blackjack");
            return;
          }

          blackjackMessage.textContent = "Hit or Stand?";
          updateBlackjackButtonState();
        });
      });
    });
  });
}

function blackjackHit() {
  if (!blackjackRoundActive || blackjackBusy) return;

  blackjackBusy = true;
  updateBlackjackButtonState();

  dealCardWithDelay(blackjackPlayerHand, () => {
    blackjackBusy = false;

    const playerTotal = getHandValue(blackjackPlayerHand);

    if (playerTotal > 21) {
      finishBlackjackRound("playerBust");
      return;
    }

    blackjackMessage.textContent = "Hit or Stand?";
    updateBlackjackButtonState();
  });
}

function blackjackStand() {
  if (!blackjackRoundActive || blackjackBusy) return;

  blackjackBusy = true;
  blackjackDealerHidden = false;
  blackjackMessage.textContent = "Dealer is playing...";
  renderBlackjackHands();
  updateBlackjackButtonState();

  playCardDealSound();

  const standRunId = runId;
  setTimeout(() => dealerPlayBlackjack(standRunId), 500);
}

function dealerPlayBlackjack(standRunId = runId) {
  if (standRunId !== runId) return;

  const dealerTotal = getProtectedDealerTotal();

  if (dealerTotal < 17) {
    dealCardWithDelay(blackjackDealerHand, () => {
      setTimeout(dealerPlayBlackjack, 350);
    }, 350);

    return;
  }

  finishBlackjackRound("compare");
}

function finishBlackjackRound(reason) {
  blackjackRoundActive = false;
  blackjackBusy = false;
  blackjackDealerHidden = false;

  renderBlackjackHands();

  const playerTotal = getHandValue(blackjackPlayerHand);
  const dealerTotal = getProtectedDealerTotal();

  let payout = 0;
  let message = "";
  const bonusLines = [];

  if (reason === "blackjack") {
    payout = blackjackBet * 2.5;

    bonusLines.push({
      type: "base",
      text: `+$${payout.toFixed(2)} Blackjack Payout`
    });

    const bonusResult = applyWinBonus(payout, blackjackBet, bonusLines, "Blackjack");
    payout = bonusResult.payout;

    message = `BLACKJACK! You won $${(payout - blackjackBet).toFixed(2)} profit.`;
  } else if (reason === "playerBust") {
    payout = 0;
    const lossText = processFullLoss(blackjackBet, "Blackjack");

    resetBetSliderToOne(blackjackBetSlider);

    message = `BUST! You had ${playerTotal}. You lost $${blackjackBet.toFixed(2)}. ${lossText}`;
  } else if (dealerTotal > 21) {
    payout = blackjackBet * 2;

    bonusLines.push({
      type: "base",
      text: `+$${payout.toFixed(2)} Blackjack Payout`
    });

    const bonusResult = applyWinBonus(payout, blackjackBet, bonusLines, "Blackjack");
    payout = bonusResult.payout;

    message = `Dealer busts! You win $${(payout - blackjackBet).toFixed(2)} profit.`;
  } else if (playerTotal > dealerTotal) {
    payout = blackjackBet * 2;

    bonusLines.push({
      type: "base",
      text: `+$${payout.toFixed(2)} Blackjack Payout`
    });

    const bonusResult = applyWinBonus(payout, blackjackBet, bonusLines, "Blackjack");
    payout = bonusResult.payout;

    message = `You win! ${playerTotal} beats ${dealerTotal}.`;
  } else if (playerTotal === dealerTotal) {
    payout = blackjackBet;

    bonusLines.push({
      type: "base",
      text: `+$${payout.toFixed(2)} Blackjack Push Return`
    });

    message = `Push! You tied at ${playerTotal}. Your bet is returned.`;
    recordRoundResult("Blackjack", "Push", 0);
    const pushAt = CR.fx.anchor();
    CR.fx.word("push", pushAt.x, pushAt.y - 20, 3);
  } else {
    payout = 0;
    const lossText = processFullLoss(blackjackBet, "Blackjack");

    resetBetSliderToOne(blackjackBetSlider);

    message = `Dealer wins. ${dealerTotal} beats ${playerTotal}. ${lossText}`;
  }

  if (isJesterHatActive() && getHandValue(blackjackDealerHand) === 21) {
    message += " Thottie’s Jester Hat blocked the dealer’s 21!";
  }

  blackjackMessage.textContent = message;

  if (payout > 0) {
    changeBalance(payout, bonusLines);
  } else {
    updateUI();
  }

  if (payout > blackjackBet) {
    shakeWinBoard();
  }

  blackjackBet = 0;

  updateBlackjackButtonState();
  checkGameState();
}

blackjackDealBtn.addEventListener("click", startBlackjackRound);
blackjackHitBtn.addEventListener("click", blackjackHit);
blackjackStandBtn.addEventListener("click", blackjackStand);

/* ========================= */
/* ELEPHANT RIVER */
/* ========================= */

const frogBoard = document.getElementById("frog-board");
const frogPlayer = document.getElementById("frog-player");
const frogMessage = document.getElementById("frog-message");
const frogMultiplierText = document.getElementById("frog-multiplier");
const frogStartBtn = document.getElementById("frog-start-btn");
const frogHopBtn = document.getElementById("frog-hop-btn");
const frogCashoutBtn = document.getElementById("frog-cashout-btn");

let frogRoundActive = false;
let frogBusy = false;
let frogBet = 0;
let frogLane = 0;
let frogMultiplier = 1;

const frogLaneBottoms = [8, 78, 148, 218, 288, 358];

function resetFrogRoad() {
  frogRoundActive = false;
  frogBusy = false;
  frogBet = 0;
  frogLane = 0;
  frogMultiplier = 1;

  if (frogPlayer) {
    frogPlayer.classList.remove("hopping", "hit");
    frogPlayer.style.bottom = `${frogLaneBottoms[0]}px`;
  }

  if (frogMessage && frogMultiplierText) {
    frogMessage.textContent = "Press START CROSSING to help the pink elephant cross the river.";
    frogMultiplierText.textContent = "Multiplier: 1.00x";
  }

  updateFrogButtons();
}

function updateFrogButtons() {
  if (!gameStarted || runEnded || goalPopupOpen || coinFlipOpen) {
    frogStartBtn.disabled = true;
    frogHopBtn.disabled = true;
    frogCashoutBtn.disabled = true;
    return;
  }

  frogStartBtn.disabled = frogRoundActive || frogBusy;
  frogHopBtn.disabled = !frogRoundActive || frogBusy || frogLane >= 5;
  frogCashoutBtn.disabled = !frogRoundActive || frogBusy || frogLane <= 0;
}

function startFrogRoadRound() {
  if (runEnded || goalPopupOpen || coinFlipOpen || !gameStarted) return;
  if (frogRoundActive || frogBusy) return;

  const bet = Number(frogBetSlider.value);

  if (!Number.isFinite(bet) || bet <= 0) {
    showToast("Enter a valid bet.");
    return;
  }

  if (bet > balance) {
    showToast("Not enough money.");
    return;
  }

  frogBet = bet;
  frogLane = 0;
  frogMultiplier = 1;
  frogRoundActive = true;
  frogBusy = false;

  frogPlayer.classList.remove("hopping", "hit");
  frogPlayer.style.bottom = `${frogLaneBottoms[0]}px`;

  frogMessage.textContent = "Step forward. Cash out before the elephant gets swept away!";
  frogMultiplierText.textContent = "Multiplier: 1.00x";

  maybeShowAllInAnimation("Elephant River", bet);
  changeBalance(-bet);
  trackGamePlayed("Elephant River");

  updateFrogButtons();
}

function getFrogBaseCrashChance(lane) {
  return Math.min(0.12 + lane * 0.08, 0.55);
}

// Multiplier = 0.96 / chance of surviving to this lane, so cashing out at any lane returns
// 0.96 per $1 without Floaties (lane 1 1.20x ... lane 5 9.69x). Old curve returned up to 1.23.
function getFrogMultiplier(lane) {
  let survival = 1;

  for (let i = 1; i <= lane; i++) {
    survival *= 1 - getFrogBaseCrashChance(i);
  }

  return 0.96 / survival;
}

function getFrogCrashChance(lane) {
  let chance = getFrogBaseCrashChance(lane);

  if (activeFrogSneakers > 0) {
    const protectionMultiplier = Math.max(0.2, 1 - activeFrogSneakers * 0.45);
    chance *= protectionMultiplier;
  }

  return chance;
}

function hopFrogForward() {
  // Lane 5 is the safe shore; stepping past it used to keep raising the multiplier forever.
  if (!frogRoundActive || frogBusy || frogLane >= 5) return;

  frogBusy = true;
  updateFrogButtons();

  frogLane++;

  playHopSound();
  playCarWhooshSound();

  frogPlayer.classList.add("hopping");
  frogPlayer.style.bottom = `${frogLaneBottoms[Math.min(frogLane, 5)]}px`;

  frogMultiplier = getFrogMultiplier(frogLane);
  frogMultiplierText.textContent = `Multiplier: ${frogMultiplier.toFixed(2)}x`;
  frogMessage.textContent = `River lane ${frogLane}. Potential cash out: $${(frogBet * frogMultiplier).toFixed(2)}`;

  const hopRunId = runId;

  setTimeout(() => {
    if (hopRunId !== runId) return;

    frogPlayer.classList.remove("hopping");

    const crashChance = getFrogCrashChance(frogLane);
    const frogHit = Math.random() < crashChance;

    if (frogHit) {
      loseFrogRoadRound();
      return;
    }

    if (frogLane >= 5) {
      activeFrogSneakers = 0;
      frogMessage.textContent = "The pink elephant reached the safe shore! Cash out now!";
      frogBusy = false;
      updateFrogButtons();
      return;
    }

    frogBusy = false;
    updateFrogButtons();
  }, 520);
}

function loseFrogRoadRound() {
  frogRoundActive = false;
  frogBusy = true;
  activeFrogSneakers = 0;

  frogPlayer.classList.add("hit");

  playFrogHitSound();

  const lossText = processFullLoss(frogBet, "Elephant River");

  resetBetSliderToOne(frogBetSlider);

  frogMessage.textContent = `SPLASH! The pink elephant got swept away. You lost $${frogBet.toFixed(2)}. ${lossText}`;

  setTimeout(() => {
    frogBusy = false;
    frogBet = 0;
    frogLane = 0;
    frogMultiplier = 1;

    frogPlayer.classList.remove("hit");
    frogPlayer.style.bottom = `${frogLaneBottoms[0]}px`;

    frogMultiplierText.textContent = "Multiplier: 1.00x";

    updateFrogButtons();
    updateUI();
    checkGameState();
  }, 1100);
}

function cashOutFrogRoad() {
  if (!frogRoundActive || frogBusy || frogLane <= 0) return;

  frogRoundActive = false;
  frogBusy = true;
  activeFrogSneakers = 0;

  let payout = frogBet * frogMultiplier;

  const bonusLines = [
    {
      type: "base",
      text: `+$${payout.toFixed(2)} Elephant River Payout`
    }
  ];

  const bonusResult = applyWinBonus(payout, frogBet, bonusLines, "Elephant River");
  payout = bonusResult.payout;

  changeBalance(payout, bonusLines);
  shakeWinBoard();

  frogMessage.textContent =
    `Cashed out at ${frogMultiplier.toFixed(2)}x. Won $${payout.toFixed(2)}.`;

  playCashSound();

  setTimeout(() => {
    frogBusy = false;
    frogBet = 0;
    frogLane = 0;
    frogMultiplier = 1;

    frogPlayer.style.bottom = `${frogLaneBottoms[0]}px`;
    frogMultiplierText.textContent = "Multiplier: 1.00x";

    updateFrogButtons();
    checkGameState();
  }, 900);
}

frogStartBtn.addEventListener("click", startFrogRoadRound);
frogHopBtn.addEventListener("click", hopFrogForward);
frogCashoutBtn.addEventListener("click", cashOutFrogRoad);

/* ========================= */
/* HORSE RACE */
/* ========================= */

const horseBoard = document.getElementById("horse-board");
const horseMessage = document.getElementById("horse-message");
const horseStartBtn = document.getElementById("horse-start-btn");
const horseChoiceButtons = document.querySelectorAll(".horse-choice");
const horseRunners = [
  document.getElementById("horse-0"),
  document.getElementById("horse-1"),
  document.getElementById("horse-2"),
  document.getElementById("horse-3")
];

let selectedHorse = 0;
let horseRaceActive = false;
let horseRaceBusy = false;
let horseBet = 0;
let horseWinner = 0;
let horseRaceAnimationFrame = null;
let horseRaceStartTime = 0;
let horsePositions = [0, 0, 0, 0];

function updateHorseButtons() {
  if (!gameStarted || runEnded || goalPopupOpen || coinFlipOpen) {
    horseStartBtn.disabled = true;

    horseChoiceButtons.forEach((button) => {
      button.disabled = true;
    });

    return;
  }

  horseStartBtn.disabled = horseRaceActive || horseRaceBusy;

  horseChoiceButtons.forEach((button) => {
    button.disabled = horseRaceActive || horseRaceBusy;
  });
}

function selectHorse(horseIndex) {
  if (horseRaceActive || horseRaceBusy) return;

  selectedHorse = horseIndex;

  horseChoiceButtons.forEach((button) => {
    button.classList.remove("selected");
  });

  horseChoiceButtons[horseIndex].classList.add("selected");

  horseMessage.textContent = `${horseNames[horseIndex]} selected. Start the race!`;
}

horseChoiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectHorse(Number(button.dataset.horse));
  });
});

function resetHorseRace() {
  horseRaceActive = false;
  horseRaceBusy = false;
  horseBet = 0;
  horseWinner = 0;
  horseRaceStartTime = 0;
  horsePositions = [0, 0, 0, 0];

  cancelAnimationFrame(horseRaceAnimationFrame);
  stopHorseGallopSound();

  horseRunners.forEach((horse) => {
    if (!horse) return;

    horse.style.left = "88px";
    horse.classList.remove("racing", "winner");
  });

  if (horseMessage) {
    horseMessage.textContent = "Pick a horse and start the race.";
  }

  updateHorseButtons();
}

function startHorseRace() {
  if (runEnded || goalPopupOpen || coinFlipOpen || !gameStarted) return;
  if (horseRaceActive || horseRaceBusy) return;

  const bet = Number(horseBetSlider.value);

  if (!Number.isFinite(bet) || bet <= 0) {
    showToast("Enter a valid bet.");
    return;
  }

  if (bet > balance) {
    showToast("Not enough money.");
    return;
  }

  horseBet = bet;
  horseRaceActive = true;
  horseRaceBusy = true;
  horseWinner = Math.floor(Math.random() * 4);
  horsePositions = [0, 0, 0, 0];

  horseRunners.forEach((horse) => {
    horse.style.left = "88px";
    horse.classList.remove("winner");
    horse.classList.add("racing");
  });

  horseMessage.textContent = "And they are off!";

  maybeShowAllInAnimation("Horse Race", bet);
  changeBalance(-bet);
  trackGamePlayed("Horse Race");

  playHorseStartSound();
  startHorseGallopSound();

  updateHorseButtons();

  horseRaceStartTime = performance.now();

  horseRaceAnimationFrame = requestAnimationFrame(runHorseRaceAnimation);
}

function runHorseRaceAnimation(timestamp) {
  const elapsed = timestamp - horseRaceStartTime;
  const duration = 4200;
  const progress = Math.min(elapsed / duration, 1);

  const boardWidth = horseBoard.clientWidth;
  const startX = 88;
  const finishX = boardWidth - 88;

  for (let i = 0; i < 4; i++) {
    let laneBoost = i === horseWinner ? 0.18 : 0;
    let wobble = Math.sin(progress * Math.PI * 5 + i) * 0.035;
    let baseProgress = progress * (0.78 + i * 0.025 + laneBoost) + wobble;

    if (i === horseWinner) {
      baseProgress = Math.min(progress * 1.08 + 0.03, 1);
    }

    if (progress >= 1 && i === horseWinner) {
      baseProgress = 1;
    }

    if (progress >= 1 && i !== horseWinner) {
      baseProgress = Math.min(baseProgress, 0.84 + Math.random() * 0.08);
    }

    horsePositions[i] = Math.max(0, Math.min(baseProgress, 1));

    const x = startX + horsePositions[i] * (finishX - startX);
    horseRunners[i].style.left = `${x}px`;
  }

  if (progress < 1) {
    horseRaceAnimationFrame = requestAnimationFrame(runHorseRaceAnimation);
    return;
  }

  finishHorseRace();
}

function finishHorseRace() {
  horseRaceActive = false;
  horseRaceBusy = false;

  stopHorseGallopSound();
  playFinishSound();

  horseRunners.forEach((horse) => {
    horse.classList.remove("racing");
  });

  horseRunners[horseWinner].classList.add("winner");

  if (horseWinner === selectedHorse) {
    let multiplier = 4 + activeGoldenHorseshoe * 0.5;
    let payout = horseBet * multiplier;

    activeGoldenHorseshoe = 0;

    const bonusLines = [
      {
        type: "base",
        text: `+$${payout.toFixed(2)} Horse Race Payout`
      }
    ];

    const bonusResult = applyWinBonus(payout, horseBet, bonusLines, "Horse Race");
    payout = bonusResult.payout;

    horseMessage.textContent =
      `${horseNames[horseWinner]} wins! You picked right and won $${payout.toFixed(2)}.`;

    changeBalance(payout, bonusLines);
    shakeWinBoard();
  } else {
    activeGoldenHorseshoe = 0;

    const lossText = processFullLoss(horseBet, "Horse Race");

    resetBetSliderToOne(horseBetSlider);

    horseMessage.textContent =
      `${horseNames[horseWinner]} wins! Your horse lost. ${lossText}`;
  }

  horseBet = 0;

  updateHorseButtons();
  checkGameState();
}

horseStartBtn.addEventListener("click", startHorseRace);

/* ========================= */
/* GAME STATE */
/* ========================= */

function checkGameState() {
  if (runEnded || goalPopupOpen || goalPopupQueued || coinFlipOpen) return;

  if (activePlinkoBalls > 0) {
    return;
  }

  if (timeLeft <= 0) {
    showGameOverScreen();
    return;
  }

  if (balance >= goal) {
    showGoalPopup();
    return;
  }

  if (balance < 1) {
    showCoinFlipPopup();
    return;
  }

  updateDangerFlash();
}

/* ========================= */
/* TIMER */
/* ========================= */

setInterval(() => {
  // Only blocking modals pause the clock. Win popups are non-blocking overlays, so pausing for
  // them let players keep betting on a frozen timer.
  if (!gameStarted || runEnded || goalPopupOpen || coinFlipOpen) return;

  if (timeLeft > 0) {
    timeLeft--;
    updateUI();
  }

  if (timeLeft <= 0) {
    timeLeft = 0;
    updateUI();

    if (activePlinkoBalls > 0) {
      return;
    }

    showGameOverScreen();
  }
}, 1000);


/* ========================= */
/* HOW TO PLAY MODAL */
/* ========================= */

const howToPlayBtn = document.getElementById("how-to-play-btn");
const howToPlayModal = document.getElementById("how-to-play-modal");
const closeHowToPlayBtn = document.getElementById("close-how-to-play-btn");
const helpTabButtons = document.querySelectorAll(".help-tab");
const helpPages = document.querySelectorAll(".help-page");
const helpPrevBtn = document.getElementById("help-prev-btn");
const helpNextBtn = document.getElementById("help-next-btn");
const helpPageIndicator = document.getElementById("help-page-indicator");

const helpPageOrder = ["basics", "games", "streak", "items", "inventory"];
let currentHelpPageIndex = 0;

function updateHelpPageIndicator() {
  if (!helpPageIndicator) return;

  helpPageIndicator.textContent = `${currentHelpPageIndex + 1} / ${helpPageOrder.length}`;
}

function showHelpPage(pageId) {
  const pageIndex = helpPageOrder.indexOf(pageId);

  if (pageIndex >= 0) {
    currentHelpPageIndex = pageIndex;
  }

  helpTabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.helpTab === pageId);
  });

  helpPages.forEach((page) => {
    page.classList.toggle("active", page.dataset.helpPage === pageId);
  });

  updateHelpPageIndicator();
}

function openHowToPlay() {
  if (!howToPlayModal) return;

  howToPlayModal.classList.remove("hidden");
  howToPlayModal.setAttribute("aria-hidden", "false");
  showHelpPage(helpPageOrder[currentHelpPageIndex] || "basics");

  if (closeHowToPlayBtn) {
    closeHowToPlayBtn.focus();
  }
}

function closeHowToPlay() {
  if (!howToPlayModal) return;

  howToPlayModal.classList.add("hidden");
  howToPlayModal.setAttribute("aria-hidden", "true");
}

function goToNextHelpPage() {
  currentHelpPageIndex = (currentHelpPageIndex + 1) % helpPageOrder.length;
  showHelpPage(helpPageOrder[currentHelpPageIndex]);
}

function goToPreviousHelpPage() {
  currentHelpPageIndex =
    (currentHelpPageIndex - 1 + helpPageOrder.length) % helpPageOrder.length;
  showHelpPage(helpPageOrder[currentHelpPageIndex]);
}

function setupHowToPlayModal() {
  if (!howToPlayModal) return;

  if (howToPlayBtn) {
    howToPlayBtn.addEventListener("click", openHowToPlay);
  }

  if (closeHowToPlayBtn) {
    closeHowToPlayBtn.addEventListener("click", closeHowToPlay);
  }

  helpTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showHelpPage(button.dataset.helpTab);
    });
  });

  if (helpNextBtn) {
    helpNextBtn.addEventListener("click", goToNextHelpPage);
  }

  if (helpPrevBtn) {
    helpPrevBtn.addEventListener("click", goToPreviousHelpPage);
  }

  howToPlayModal.addEventListener("click", (event) => {
    if (event.target === howToPlayModal) {
      closeHowToPlay();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !howToPlayModal.classList.contains("hidden")) {
      closeHowToPlay();
    }
  });

  showHelpPage("basics");
}

// How to Play item gallery, generated from shopItemData so it can never drift from the real catalog.
function renderHelpItemGallery() {
  const gallery = document.getElementById("help-item-gallery");
  if (!gallery) return;

  const games = ["Plinko", "Roulette", "Crash", "Blackjack", "Elephant River", "Horse Race"];
  gallery.innerHTML = "";

  shopItemData.forEach((item) => {
    const usedIn = games.filter((game) => isItemRelevantToGame(item.id, game));
    const card = document.createElement("div");
    card.className = "help-item-card";
    card.innerHTML = `${CR.spriteImg("items/" + item.id)}<b></b><p></p><small></small>`;
    card.querySelector("b").textContent = item.name;
    card.querySelector("p").textContent = item.description;
    card.querySelector("small").textContent =
      `${item.type} - $${item.price} base - ${usedIn.length === games.length ? "All games" : usedIn.join(", ")}`;
    gallery.appendChild(card);
  });
}

document.querySelectorAll(".open-settings-btn").forEach((button) => {
  button.addEventListener("click", CR.openSettings);
});

// Browsers only allow audio after a gesture: the first tap anywhere starts the lobby music.
document.addEventListener("pointerdown", playScreenMusic, { once: true });

resetBlackjack();
resetFrogRoad();
resetHorseRace();
loadLiveLeaderboard();
renderInventory();
renderShop();
renderActiveItemTimers();
setupDevUEasterEgg();
setupHowToPlayModal();
renderHelpItemGallery();
updateUI();
