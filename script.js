let balance = 100;
let goal = 300;
let timeLeft = 120;
let currentRound = 1;
let moneyPopupActive = false;
let allInAnimationActive = false;
let popupQueueActive = false;
let popupQueue = Promise.resolve();
let goalPopupQueued = false;

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

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  return audioContext;
}

function playTone(frequency, duration, type = "sine", volume = 0.12) {
  const ctx = getAudioContext();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

function playButtonClickSound() {
  playTone(520, 0.04, "square", 0.06);

  setTimeout(() => {
    playTone(720, 0.035, "square", 0.045);
  }, 35);
}

function playPegHitSound() {
  const pitch = 650 + Math.random() * 350;
  playTone(pitch, 0.055, "triangle", 0.08);
}

function playCardDealSound() {
  playTone(420 + Math.random() * 120, 0.05, "triangle", 0.06);
}

function playHopSound() {
  playTone(520, 0.07, "triangle", 0.08);

  setTimeout(() => {
    playTone(760, 0.06, "triangle", 0.06);
  }, 65);
}

function playCarWhooshSound() {
  playTone(160, 0.08, "sawtooth", 0.035);

  setTimeout(() => {
    playTone(110, 0.1, "sawtooth", 0.025);
  }, 55);
}

function playFrogHitSound() {
  playTone(120, 0.18, "sawtooth", 0.1);

  setTimeout(() => {
    playTone(70, 0.24, "sawtooth", 0.08);
  }, 120);
}

function playHorseStartSound() {
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
    playTone(150 + Math.random() * 40, 0.035, "square", 0.035);

    setTimeout(() => {
      playTone(120 + Math.random() * 30, 0.035, "square", 0.03);
    }, 70);
  }, 170);
}

function stopHorseGallopSound() {
  if (horseGallopInterval) {
    clearInterval(horseGallopInterval);
    horseGallopInterval = null;
  }
}

function playFinishSound() {
  playTone(880, 0.08, "triangle", 0.08);

  setTimeout(() => {
    playTone(1180, 0.11, "triangle", 0.08);
  }, 100);
}

function playCashSound() {
  playTone(700, 0.08, "sine", 0.08);

  setTimeout(() => {
    playTone(950, 0.09, "sine", 0.09);
  }, 80);

  setTimeout(() => {
    playTone(1250, 0.12, "sine", 0.08);
  }, 170);
}

function playLoseSound() {
  playTone(260, 0.12, "sawtooth", 0.08);

  setTimeout(() => {
    playTone(180, 0.18, "sawtooth", 0.07);
  }, 110);
}

function playGameOverSound() {
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

  lowMoneySirenInterval = setInterval(() => {
    if (!lowMoneySirenOn) return;

    const frequency = highTone ? 620 : 430;

    playTone(frequency, 0.22, "sine", 0.025);

    highTone = !highTone;
  }, 520);
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
  rouletteSpinGain.connect(ctx.destination);

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

function startCrashRocketSound() {
  const ctx = getAudioContext();

  stopCrashRocketSound();

  crashRocketOscillator = ctx.createOscillator();
  crashRocketGain = ctx.createGain();

  crashRocketOscillator.type = "sawtooth";
  crashRocketOscillator.frequency.setValueAtTime(90, ctx.currentTime);

  crashRocketGain.gain.setValueAtTime(0.035, ctx.currentTime);

  crashRocketOscillator.connect(crashRocketGain);
  crashRocketGain.connect(ctx.destination);

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
  balanceText.textContent = `Balance: $${balance.toFixed(2)}`;
  goalText.textContent = `Goal: $${goal}`;
  timerText.textContent = `Time: ${timeLeft}`;

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
    timePlayed: formatRunTime(getRunSeconds())
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

  popupQueue = popupQueue.then(() => {
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

function showMoneyGainPopup(amount, bonusLines = []) {
  if (!moneyPopupLayer || amount <= 0) return;

  moneyPopupActive = true;

  queuePopupStep(() => {
    moneyPopupLayer.classList.remove("hidden");
    moneyPopupLayer.innerHTML = "";

    const card = document.createElement("div");
    card.classList.add("money-popup-card");

    const mainNumber = document.createElement("div");
    mainNumber.classList.add("money-popup-main");
    mainNumber.textContent = "+$0.00";

    const linesWrapper = document.createElement("div");
    linesWrapper.classList.add("money-popup-lines");

    bonusLines.forEach((line) => {
      const lineElement = document.createElement("div");
      lineElement.classList.add("money-popup-line");

      if (line.type === "base") {
        lineElement.classList.add("base-win");
      }

      if (line.type === "bonus") {
        lineElement.classList.add("item-bonus");
      }

      lineElement.textContent = line.text;
      linesWrapper.appendChild(lineElement);
    });

    card.appendChild(mainNumber);

    if (bonusLines.length > 0) {
      card.appendChild(linesWrapper);
    }

    moneyPopupLayer.appendChild(card);

    card.animate(
      [
        {
          transform: "scale(0.65)",
          opacity: 0
        },
        {
          transform: "scale(1.12)",
          opacity: 1
        },
        {
          transform: "scale(1)",
          opacity: 1
        }
      ],
      {
        duration: 650,
        easing: "cubic-bezier(0.16, 0.9, 0.22, 1)",
        fill: "forwards"
      }
    );

    let countStartTime = null;
    const countDuration = 2500;

    function countUpMoney(timestamp) {
      if (!countStartTime) {
        countStartTime = timestamp;
      }

      const elapsed = timestamp - countStartTime;
      const progress = Math.min(elapsed / countDuration, 1);

      const easedProgress = 1 - Math.pow(1 - progress, 4);
      const currentAmount = amount * easedProgress;

      mainNumber.textContent = `+$${currentAmount.toFixed(2)}`;

      if (progress < 1) {
        requestAnimationFrame(countUpMoney);
      } else {
        mainNumber.textContent = `+$${amount.toFixed(2)}`;
      }
    }

    requestAnimationFrame(countUpMoney);

    setTimeout(() => {
      card.classList.add("money-popup-readable-pulse");
    }, 2600);

    setTimeout(() => {
      card.classList.remove("money-popup-readable-pulse");

      const balanceBox = balanceText.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();

      const cardCenterX = cardBox.left + cardBox.width / 2;
      const cardCenterY = cardBox.top + cardBox.height / 2;

      const targetX = balanceBox.left + balanceBox.width / 2;
      const targetY = balanceBox.top + balanceBox.height / 2;

      const moveX = targetX - cardCenterX;
      const moveY = targetY - cardCenterY;

      card.animate(
        [
          {
            transform: "scale(1)",
            opacity: 1
          },
          {
            transform: "scale(1.08)",
            opacity: 1,
            offset: 0.25
          },
          {
            transform: `translate(${moveX}px, ${moveY}px) scale(0.16)`,
            opacity: 0
          }
        ],
        {
          duration: 1500,
          easing: "cubic-bezier(0.16, 0.9, 0.22, 1)",
          fill: "forwards"
        }
      );
    }, 4500);

    setTimeout(() => {
      moneyPopupLayer.classList.add("hidden");
      moneyPopupLayer.innerHTML = "";

      balanceText.classList.remove("balance-gain");
      void balanceText.offsetWidth;
      balanceText.classList.add("balance-gain");

      setTimeout(() => {
        balanceText.classList.remove("balance-gain");
      }, 750);

      moneyPopupActive = false;
    }, 6100);
  }, 6250);
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
    title.textContent = "ALL IN!";

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
    document.body.classList.add("all-in-screen-shake");

    playTone(220, 0.08, "square", 0.09);

    setTimeout(() => {
      playTone(440, 0.08, "square", 0.09);
    }, 110);

    setTimeout(() => {
      playTone(880, 0.16, "triangle", 0.1);
    }, 240);

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

  if (amount > 0) {
    showMoneyGainPopup(amount, bonusLines);
    playCashSound();
  }

  if (amount < 0) {
    animateBalanceChange("loss");
    playLoseSound();
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
    icon: "🪙",
    name: "Double-Headed Coin",
    type: "Trigger",
    price: 75,
    description: "Guarantees your next emergency coin flip will be a win."
  },
  {
    id: "luckyHulaGirl",
    icon: "🌺",
    name: "Lucky Hula Girl",
    type: "Passive",
    price: 100,
    description: "Adds +10% extra profit to every winning bet. This stacks."
  },
  {
    id: "timeBottle",
    icon: "⏳",
    name: "Time in a Bottle",
    type: "Consumable",
    price: 45,
    description: "Use it to add 30 seconds to the current timer."
  },
  {
    id: "rouletteMagnet",
    icon: "🧲",
    name: "Roulette Magnet",
    type: "Consumable",
    price: 60,
    description: "Use it before Roulette to improve your next spin odds."
  },
  {
    id: "frogSneakers",
    icon: "🛟",
    name: "Pool Floaties",
    type: "Consumable",
    price: 55,
    description: "Use it to lower the danger chance for your next Elephant River crossing. This stacks."
  },
  {
    id: "insuranceTicket",
    icon: "🎟️",
    name: "Insurance Ticket",
    type: "Trigger",
    price: 70,
    description: "Refunds 50% of a fully lost bet. Up to 2 can trigger at once."
  },
  {
    id: "secondWindSoda",
    icon: "🥤",
    name: "Second Wind Soda",
    type: "Trigger",
    price: 85,
    description: "If your balance hits $0, automatically restores you to $25 once."
  },
  {
    id: "goalCutter",
    icon: "🎯",
    name: "Goal Cutter",
    type: "Consumable",
    price: 90,
    description: "Use it to lower your current money goal by 10%."
  },
  {
    id: "dealerPeek",
    icon: "👀",
    name: "Dealer’s Peek Card",
    type: "Consumable",
    price: 40,
    description: "Use it during Blackjack to reveal the dealer’s hidden card."
  },
  {
    id: "goldenHorseshoe",
    icon: "🐎",
    name: "Golden Horseshoe",
    type: "Consumable",
    price: 50,
    description: "Use it before Horse Race. Each one adds +0.5x payout."
  },
  {
    id: "weightedBall",
    icon: "⚪",
    name: "Weighted Ball",
    type: "Consumable",
    price: 55,
    description: "Use it before Plinko to improve your next ball result. This stacks."
  },
  {
    id: "cashbackCoupon",
    icon: "💸",
    name: "Cashback Coupon",
    type: "Timed Consumable",
    price: 80,
    description: "Use it to get 5% cashback on fully lost bets for 60 seconds. Extra coupons add more time."
  },
  {
    id: "thottiesJesterHat",
    icon: "🎭",
    name: "Thottie’s Jester Hat",
    type: "Timed Consumable",
    price: 95,
    description: "Use it to block the dealer from getting 21 for 60 seconds. Extra hats add more time."
  },
  {
    id: "roseKatMagnumOpus",
    icon: "🖼️",
    name: "RoseKat’s Magnum Opus",
    type: "Consumable",
    price: 110,
    description: "Your next 2 winning Plinko drops add 4x the profit as bonus money."
  },
  {
    id: "ejmRecordVinyl",
    icon: "💿",
    name: "EJM’s Record Vinyl",
    type: "Consumable",
    price: 125,
    description: "Use it to get one free Roulette spin at max bet. Extra vinyls add more free spins."
  }
];

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
        <div class="shop-item-icon">${item.icon}</div>
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
    showToast("Not enough money.");
    return;
  }

  changeBalance(-itemPrice);

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
    icon.textContent = item.icon;

    const crack = document.createElement("div");
    crack.classList.add("item-break-crack");
    crack.textContent = "⚡";

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

    playTone(190, 0.09, "square", 0.08);

    setTimeout(() => {
      playTone(95, 0.14, "sawtooth", 0.07);
    }, 110);

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

function renderInventory() {
  inventoryIcons.innerHTML = "";

  const uniqueItems = [...new Set(inventory)];

  uniqueItems.forEach((itemId) => {
    const item = getItemData(itemId);
    const count = countItem(itemId);

    const wrapper = document.createElement("div");

    const button = document.createElement("button");
    button.classList.add("inventory-item-icon");
    button.textContent = item.icon;
    button.title = item.name;

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

  itemPopupIcon.textContent = item.icon;
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

  useInventoryItem(selectedInventoryItemId);
}

function useInventoryItem(itemId) {
  if (!hasItem(itemId)) return;

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
    timer.textContent = `🎭 ${jesterSeconds}s`;
    activeItemTimers.appendChild(timer);
  }

  if (cashbackSeconds > 0) {
    const timer = document.createElement("div");
    timer.classList.add("active-item-timer");
    timer.textContent = `💸 ${cashbackSeconds}s`;
    activeItemTimers.appendChild(timer);
  }
}

setInterval(renderActiveItemTimers, 250);

function applyWinBonus(payout, bet, bonusLines = []) {
  const hulaGirlCount = countItem("luckyHulaGirl");

  if (hulaGirlCount <= 0) {
    return {
      payout,
      bonusLines
    };
  }

  const profit = Math.max(0, payout - bet);
  const bonusRate = 0.1 * hulaGirlCount;
  const bonus = profit * bonusRate;

  if (bonus > 0) {
    bonusLines.push({
      type: "bonus",
      text: `+$${bonus.toFixed(2)} Lucky Hula Girl Bonus`
    });
  }

  return {
    payout: payout + bonus,
    bonusLines
  };
}

function processFullLoss(bet) {
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

function tryUseSecondWindSoda() {
  if (balance <= 0 && hasItem("secondWindSoda")) {
    removeItemFromInventory("secondWindSoda", true);

    balance = 25;
    recordBalancePoint();

    playCashSound();
    animateBalanceChange("gain");
    updateUI();

    showToast("Second Wind Soda saved you! Balance restored to $25.");

    return true;
  }

  return false;
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

  gameOverPopup.classList.remove("hidden");

  animateGameOverGraph();
}

function drawGameOverGraph(progress = 1) {
  const width = gameOverGraph.width;
  const height = gameOverGraph.height;

  gameOverCtx.clearRect(0, 0, width, height);

  gameOverCtx.fillStyle = "#021920";
  gameOverCtx.fillRect(0, 0, width, height);

  gameOverCtx.strokeStyle = "rgba(255, 209, 102, 0.22)";
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
      current.value >= previous.value ? "#06d6a0" : "#ef476f";

    gameOverCtx.lineWidth = 4;
    gameOverCtx.lineCap = "round";
    gameOverCtx.stroke();
  }

  const lastPoint = visiblePoints[visiblePoints.length - 1];

  gameOverCtx.beginPath();
  gameOverCtx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
  gameOverCtx.fillStyle = "#ffd166";
  gameOverCtx.shadowColor = "#ffd166";
  gameOverCtx.shadowBlur = 14;
  gameOverCtx.fill();
  gameOverCtx.shadowBlur = 0;

  gameOverCtx.fillStyle = "white";
  gameOverCtx.font = "bold 13px Arial";
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
  balance = 100;
  goal = 300;
  timeLeft = 120;
  currentRound = 1;
  moneyPopupActive = false;
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
    if (runEnded) {
      goalPopupQueued = false;
      return;
    }

    goalPopupQueued = false;
    goalPopupOpen = true;
    goalPopup.classList.remove("hidden");

    playCashSound();

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

function submitScore() {
  let name = playerNameInput.value.trim();

  if (name === "") {
    name = "Player";
  }

  leaderboard.push({
    name,
    score: balance
  });

  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);

  renderLeaderboard();

  namePopup.classList.add("hidden");
}

function renderLeaderboard() {
  leaderboardList.innerHTML = "";

  if (leaderboard.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "No scores yet.";
    leaderboardList.appendChild(emptyItem);
    return;
  }

  leaderboard.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = `${entry.name} - $${entry.score.toFixed(2)}`;
    leaderboardList.appendChild(item);
  });
}

keepGoingBtn.addEventListener("click", continueRun);
cashOutRunBtn.addEventListener("click", cashOutRun);
submitScoreBtn.addEventListener("click", submitScore);

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

  playTone(680, 0.08, "square", 0.06);

  setTimeout(() => {
    playTone(820, 0.08, "square", 0.06);
  }, 250);

  setTimeout(() => {
    playTone(980, 0.08, "square", 0.06);
  }, 500);

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

  function physicsStep() {
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

        playPegHitSound();

        peg.element.classList.add("hit");

        setTimeout(() => {
          peg.element.classList.remove("hit");
        }, 90);
      }
    }

    vx *= friction;

    ball.style.left = `${x - ballRadius}px`;
    ball.style.top = `${y - ballRadius}px`;

    if (y >= floorY) {
      finishPlinkoBall(ball, x, bet);
      return;
    }

    requestAnimationFrame(physicsStep);
  }

  requestAnimationFrame(physicsStep);
}

function finishPlinkoBall(ball, x, bet) {
  const slotWidth = board.clientWidth / plinkoMultipliers.length;

  let slotIndex = Math.floor(x / slotWidth);

  if (slotIndex < 0) slotIndex = 0;
  if (slotIndex >= plinkoMultipliers.length) {
    slotIndex = plinkoMultipliers.length - 1;
  }

  if (activeWeightedBall > 0) {
    const weightedBoost = activeWeightedBall;

    slotIndex = Math.min(
      slotIndex + weightedBoost + Math.floor(Math.random() * 2),
      plinkoMultipliers.length - 1
    );

    activeWeightedBall = 0;
  }

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
    const bonusResult = applyWinBonus(winnings, bet, bonusLines);
    winnings = bonusResult.payout;
  }

  if (winnings > 0) {
    changeBalance(winnings, bonusLines);
  } else {
    const lossText = processFullLoss(bet);

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
      ctx.fillStyle = "#06d6a0";
    } else if (color === "red") {
      ctx.fillStyle = "#ef476f";
    } else {
      ctx.fillStyle = "#073b4c";
    }

    ctx.fill();

    ctx.strokeStyle = "#ffd166";
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
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(number.toString(), 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(center, center, 38, 0, Math.PI * 2);
  ctx.fillStyle = "#073b4c";
  ctx.fill();
  ctx.strokeStyle = "#ffd166";
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

  let bet = Number(rouletteBetSlider.value);
  let isFreeVinylSpin = false;

  if (activeFreeRouletteMaxSpin > 0) {
    bet = Math.max(1, Math.floor(balance));
    isFreeVinylSpin = true;
    activeFreeRouletteMaxSpin--;
  }

  if (!selectedRouletteBet) {
    showToast("Pick Red, Black, or Green first.");
    return;
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

  startRouletteSpinSound();

  let result;

  if (activeRouletteMagnet && Math.random() < 0.55) {
    result = getRandomRouletteNumberForColor(selectedRouletteBet);
    activeRouletteMagnet = false;
  } else {
    result = Math.floor(Math.random() * 37);
    activeRouletteMagnet = false;
  }

  const segmentAngle = 360 / 37;

  rouletteSpinCount++;

  const finalRotation =
    rouletteSpinCount * 360 * 6 +
    (360 - result * segmentAngle);

  rouletteCanvas.style.transform = `rotate(${finalRotation}deg)`;

  setTimeout(() => {
    stopRouletteSpinSound();

    playTone(420, 0.14, "square", 0.08);

    finishRouletteSpin(result, bet, isFreeVinylSpin);
    rouletteSpinning = false;
  }, 4100);
}

function finishRouletteSpin(result, bet, isFreeVinylSpin = false) {
  const resultColor = getRouletteColor(result);

  let winnings = 0;
  let bonusLines = [];

  if (selectedRouletteBet === resultColor) {
    if (resultColor === "green") {
      winnings = bet * 14;
    } else {
      winnings = bet * 2;
    }

    bonusLines.push({
      type: "base",
      text: `+$${winnings.toFixed(2)} Roulette Payout`
    });

    const bonusResult = applyWinBonus(winnings, bet, bonusLines);
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
      const lossText = processFullLoss(bet);

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

function generateCrashPoint() {
  const random = Math.random();

  if (random < 0.5) {
    return 1 + Math.random() * 1.5;
  }

  if (random < 0.85) {
    return 2.5 + Math.random() * 3;
  }

  return 5.5 + Math.random() * 8;
}

function updateCrashGlow(multiplier, crashed = false) {
  if (crashed) {
    crashMultiplierText.style.color = "#ef476f";
    crashMultiplierText.style.textShadow =
      "0 0 8px rgba(239, 71, 111, 0.85), 0 0 18px rgba(239, 71, 111, 0.55)";
    return;
  }

  const glowA = Math.min(8 + multiplier * 3, 22);
  const glowB = Math.min(18 + multiplier * 5, 42);

  crashMultiplierText.style.color = "#06d6a0";
  crashMultiplierText.style.textShadow =
    `0 0 ${glowA}px rgba(6, 214, 160, 0.9), 0 0 ${glowB}px rgba(6, 214, 160, 0.55)`;
}

function drawCrashGraph(multiplier, crashed = false) {
  const width = crashCanvas.width;
  const height = crashCanvas.height;

  crashCtx.clearRect(0, 0, width, height);

  crashCtx.fillStyle = "#021920";
  crashCtx.fillRect(0, 0, width, height);

  crashCtx.strokeStyle = "rgba(255, 209, 102, 0.22)";
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

  crashCtx.strokeStyle = crashed ? "#ef476f" : "#06d6a0";
  crashCtx.lineWidth = 5;
  crashCtx.lineCap = "round";
  crashCtx.lineJoin = "round";
  crashCtx.stroke();

  const ballPoint = points[points.length - 1];

  const glowStrength = Math.min(10 + multiplier * 4, 42);
  const ballRadius = Math.min(5 + multiplier * 0.35, 10);

  crashCtx.save();
  crashCtx.shadowColor = "rgba(255, 255, 255, 0.95)";
  crashCtx.shadowBlur = glowStrength;
  crashCtx.fillStyle = "#ffffff";

  crashCtx.beginPath();
  crashCtx.arc(ballPoint.x, ballPoint.y, ballRadius, 0, Math.PI * 2);
  crashCtx.fill();
  crashCtx.restore();

  crashCtx.fillStyle = crashed ? "#ef476f" : "#06d6a0";
  crashCtx.font = "bold 16px Arial";
  crashCtx.fillText(`${multiplier.toFixed(2)}x`, 15, 18);
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

  const bonusResult = applyWinBonus(winnings, crashBet, bonusLines);
  winnings = bonusResult.payout;

  changeBalance(winnings, bonusLines);

  crashStatusText.textContent =
    `Cashed out at ${crashMultiplier.toFixed(2)}x. Won $${winnings.toFixed(2)}.`;

  crashMultiplierText.style.color = "#ffd166";
  crashMultiplierText.style.textShadow =
    "0 0 8px rgba(255, 209, 102, 0.85), 0 0 18px rgba(255, 209, 102, 0.5)";

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

  playTone(180, 0.12, "sawtooth", 0.09);

  setTimeout(() => {
    playTone(95, 0.28, "sawtooth", 0.09);
  }, 100);

  crashMultiplierText.textContent = "CRASHED";
  updateCrashGlow(crashPoint, true);

  const lossText = processFullLoss(crashBet);

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

function createCardElement(card, hidden = false) {
  const cardElement = document.createElement("div");
  cardElement.classList.add("playing-card");

  if (hidden) {
    cardElement.classList.add("hidden-card");
    cardElement.textContent = "?";
    return cardElement;
  }

  if (card.suit === "♥" || card.suit === "♦") {
    cardElement.classList.add("red-card");
  }

  const rankElement = document.createElement("div");
  rankElement.classList.add("card-rank");
  rankElement.textContent = card.rank;

  const suitElement = document.createElement("div");
  suitElement.classList.add("card-suit");
  suitElement.textContent = card.suit;

  cardElement.appendChild(rankElement);
  cardElement.appendChild(suitElement);

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
  setTimeout(() => {
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

  setTimeout(dealerPlayBlackjack, 500);
}

function dealerPlayBlackjack() {
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

    const bonusResult = applyWinBonus(payout, blackjackBet, bonusLines);
    payout = bonusResult.payout;

    message = `BLACKJACK! You won $${(payout - blackjackBet).toFixed(2)} profit.`;
  } else if (reason === "playerBust") {
    payout = 0;
    const lossText = processFullLoss(blackjackBet);

    resetBetSliderToOne(blackjackBetSlider);

    message = `BUST! You had ${playerTotal}. You lost $${blackjackBet.toFixed(2)}. ${lossText}`;
  } else if (dealerTotal > 21) {
    payout = blackjackBet * 2;

    bonusLines.push({
      type: "base",
      text: `+$${payout.toFixed(2)} Blackjack Payout`
    });

    const bonusResult = applyWinBonus(payout, blackjackBet, bonusLines);
    payout = bonusResult.payout;

    message = `Dealer busts! You win $${(payout - blackjackBet).toFixed(2)} profit.`;
  } else if (playerTotal > dealerTotal) {
    payout = blackjackBet * 2;

    bonusLines.push({
      type: "base",
      text: `+$${payout.toFixed(2)} Blackjack Payout`
    });

    const bonusResult = applyWinBonus(payout, blackjackBet, bonusLines);
    payout = bonusResult.payout;

    message = `You win! ${playerTotal} beats ${dealerTotal}.`;
  } else if (playerTotal === dealerTotal) {
    payout = blackjackBet;

    bonusLines.push({
      type: "base",
      text: `+$${payout.toFixed(2)} Blackjack Push Return`
    });

    message = `Push! You tied at ${playerTotal}. Your bet is returned.`;
  } else {
    payout = 0;
    const lossText = processFullLoss(blackjackBet);

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
  frogHopBtn.disabled = !frogRoundActive || frogBusy;
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

function getFrogCrashChance(lane) {
  let chance = Math.min(0.12 + lane * 0.08, 0.55);

  if (activeFrogSneakers > 0) {
    const protectionMultiplier = Math.max(0.2, 1 - activeFrogSneakers * 0.45);
    chance *= protectionMultiplier;
  }

  return chance;
}

function hopFrogForward() {
  if (!frogRoundActive || frogBusy) return;

  frogBusy = true;
  updateFrogButtons();

  frogLane++;

  playHopSound();
  playCarWhooshSound();

  frogPlayer.classList.add("hopping");
  frogPlayer.style.bottom = `${frogLaneBottoms[Math.min(frogLane, 5)]}px`;

  frogMultiplier = 1 + frogLane * 0.45 + frogLane * frogLane * 0.06;
  frogMultiplierText.textContent = `Multiplier: ${frogMultiplier.toFixed(2)}x`;
  frogMessage.textContent = `River lane ${frogLane}. Potential cash out: $${(frogBet * frogMultiplier).toFixed(2)}`;

  setTimeout(() => {
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

  const lossText = processFullLoss(frogBet);

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

  const bonusResult = applyWinBonus(payout, frogBet, bonusLines);
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

    const bonusResult = applyWinBonus(payout, horseBet, bonusLines);
    payout = bonusResult.payout;

    horseMessage.textContent =
      `${horseNames[horseWinner]} wins! You picked right and won $${payout.toFixed(2)}.`;

    changeBalance(payout, bonusLines);
    shakeWinBoard();
  } else {
    activeGoldenHorseshoe = 0;

    const lossText = processFullLoss(horseBet);

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
    if (tryUseSecondWindSoda()) {
      return;
    }

    showCoinFlipPopup();
    return;
  }

  updateDangerFlash();
}

/* ========================= */
/* TIMER */
/* ========================= */

setInterval(() => {
  if (!gameStarted || runEnded || goalPopupOpen || coinFlipOpen || moneyPopupActive || allInAnimationActive || popupQueueActive) return;

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

resetBlackjack();
resetFrogRoad();
resetHorseRace();
renderLeaderboard();
renderInventory();
renderShop();
renderActiveItemTimers();
updateUI();
