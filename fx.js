/* Casino Run presentation layer: particles, feedback tiers, word popups, HUD, settings panel.
   Pure presentation; it never reads or writes money. Gameplay calls in with numbers it has already
   settled (see docs/design-bible/VISUAL_BIBLE.md section 5). */
window.CR = window.CR || {};
const SPRITE = (id) => `assets/sprites/${id}.png`;
CR.spriteImg = (id, cls = "sprite") => `<img class="${cls}" src="${SPRITE(id)}" alt="" draggable="false">`;

CR.fx = (() => {
  const canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(canvas));
  const ctx = canvas.getContext("2d");
  const sprites = {};
  ["fx/coin", "fx/chip-red", "fx/chip-gold", "fx/chip-cyan", "fx/sparkle", "fx/star", "fx/confetti", "fx/droplet", "fx/minicard", "fx/shoe"].forEach((id) => {
    const im = new Image();
    im.src = SPRITE(id);
    sprites[id] = im;
  });
  const parts = [];
  let running = false, last = 0;
  const SCALE = 2; // particles drawn at 2x native pixels

  const quality = () => (CR.settings.reducedMotion || CR.settings.fx === "off" ? 0 : CR.settings.fx === "low" ? 0.4 : 1);
  const cap = () => (CR.settings.fx === "low" ? 60 : 220);

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    ctx.imageSmoothingEnabled = false;
  }
  addEventListener("resize", resize);
  resize();

  function spawn(p) {
    if (parts.length >= cap()) parts.shift();
    parts.push(p);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      const im = sprites[p.id];
      if (!im.complete || !im.naturalWidth) continue;
      ctx.globalAlpha = Math.min(1, p.life / 0.25);
      const fw = p.frameW || im.naturalWidth;
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      if (p.rot) ctx.rotate(p.rot);
      ctx.drawImage(im, p.frame * fw, 0, fw, im.naturalHeight, (-fw * SCALE) / 2, (-im.naturalHeight * SCALE) / 2, fw * SCALE, im.naturalHeight * SCALE);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(tick);
    else running = false;
  }

  function burst(x, y, { count = 10, kinds = ["fx/coin"], speed = 260, up = 220, gravity = 700, life = 1.1 } = {}) {
    const n = Math.round(count * quality());
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      const id = kinds[k % kinds.length];
      const strip = id === "fx/confetti"; // 5 colour frames of 3px
      spawn({ id, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, g: gravity, life: life * (0.7 + Math.random() * 0.5), rot: 0, spin: (Math.random() - 0.5) * 6, frame: strip ? k % 5 : 0, frameW: strip ? 3 : undefined });
    }
  }

  function confetti(count = 70) {
    const n = Math.round(count * quality());
    for (let k = 0; k < n; k++) {
      spawn({ id: "fx/confetti", frameW: 3, frame: k % 5, x: Math.random() * innerWidth, y: -10 - Math.random() * 120, vx: (Math.random() - 0.5) * 80, vy: 60 + Math.random() * 120, g: 160, life: 2.6, rot: Math.random() * 3, spin: (Math.random() - 0.5) * 10 });
    }
  }

  // Word sprite pop (NICE!, BIG WIN!, BUST! ...). Non-blocking; removes itself.
  function word(id, x, y, scale = 3) {
    const el = document.createElement("img");
    el.src = SPRITE("words/" + id);
    el.className = "fx-word" + (quality() === 0 ? " fx-word-calm" : "");
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty("--s", scale);
    el.onload = () => { el.style.width = `${el.naturalWidth * scale}px`; };
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function shake(px) {
    if (!px || quality() === 0) return;
    const target = document.getElementById("game-wrapper");
    if (!target) return;
    target.style.setProperty("--shake", `${px}px`);
    target.classList.remove("fx-shake");
    void target.offsetWidth;
    target.classList.add("fx-shake");
    setTimeout(() => target.classList.remove("fx-shake"), 320);
  }

  // Where the result physically happened, per game (falls back to the board, then the screen).
  const IMPACT = {
    "plinko-screen": ".slot.slot-hit, #board",
    "roulette-screen": "#roulette-canvas",
    "crash-screen": "#crash-multiplier",
    "blackjack-screen": "#player-hand",
    "frog-screen": "#frog-player",
    "horse-screen": ".horse-runner.winner, #horse-board",
  };
  function anchor() {
    const screen = document.querySelector(".screen.active-screen");
    const el = (screen && (screen.querySelector(IMPACT[screen.id] || "_") || screen.querySelector("#board, #wheel-container, .crash-card, #blackjack-board, #frog-board, #horse-board"))) || screen;
    if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: Math.max(80, r.top + r.height * 0.4) };
  }

  // Tier from profit relative to stake: L2 < 1x, L3 1-3x (or a 2+ streak), L4 3-8x, L5 >= 8x.
  function tierFor(profit, bet, streak = 0) {
    const ratio = bet > 0 ? profit / bet : 0;
    if (ratio >= 8) return 5;
    if (ratio >= 3) return 4;
    if (ratio >= 1 || streak >= 2) return 3;
    return 2;
  }

  const TIERS = {
    2: { word: "nice", sound: "win_small", count: 6, kinds: ["fx/coin"], shake: 0 },
    3: { word: "great", sound: "win_medium", count: 14, kinds: ["fx/coin", "fx/sparkle"], shake: 2 },
    4: { word: "bigwin", sound: "win_large", count: 28, kinds: ["fx/coin", "fx/chip-red", "fx/chip-gold", "fx/star"], shake: 4 },
    5: { word: "jackpot", sound: "jackpot", count: 60, kinds: ["fx/coin", "fx/chip-red", "fx/chip-gold", "fx/chip-cyan", "fx/star", "fx/sparkle"], shake: 6 },
  };

  // Playfield reaction: the active machine's marquee bulbs race and its title flashes, longer for bigger tiers.
  function marqueeHot(ms) {
    const m = document.querySelector(".screen.active-screen .marquee");
    if (!m || quality() === 0) return;
    m.classList.add("hot");
    clearTimeout(m._hot);
    m._hot = setTimeout(() => m.classList.remove("hot"), ms);
  }

  // Each game's own debris; big tiers mix in chips and stars on top.
  const KITS = {
    Plinko: ["fx/coin", "fx/sparkle"],
    Roulette: ["fx/chip-red", "fx/chip-gold"],
    Crash: ["fx/star", "fx/sparkle", "fx/chip-cyan"],
    Blackjack: ["fx/minicard", "fx/chip-gold"],
    "Elephant River": ["fx/droplet", "fx/sparkle"],
    "Horse Race": ["fx/shoe", "fx/confetti"],
  };

  // Big-win (tier 4+) signature flourish per game, built from that game's music instruments.
  const STING = {
    Plinko: "sting_plinko", Roulette: "sting_roulette", Crash: "sting_crash",
    Blackjack: "sting_blackjack", "Elephant River": "sting_river", "Horse Race": "sting_horse",
  };

  // Floating pixel number at the impact point: small = quick bounce, big = expanding wobble.
  function popNumber(text, x, y, tier = 2, color = "#7EDD65") {
    const el = document.createElement("div");
    el.className = `fx-num fx-num-t${tier}` + (quality() === 0 ? " fx-word-calm" : "");
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // Dice the host reacts: "cheer" on wins (longer for bigger tiers), "sweat" on losses, then back to idle.
  function hostMood(mood, ms) {
    const h = document.getElementById("host");
    if (!h) return;
    h.classList.remove("cheer", "sweat");
    if (mood) h.classList.add(mood);
    clearTimeout(h._mood);
    h._mood = setTimeout(() => h.classList.remove("cheer", "sweat"), ms);
  }

  function celebrate({ profit, bet, streak = 0, special, game }) {
    if (!(profit > 0)) return 0;
    const tier = tierFor(profit, bet, streak);
    const t = TIERS[tier];
    const at = anchor();
    hostMood("cheer", 700 + tier * 350);
    const kit = KITS[game] ? (tier >= 4 ? [...KITS[game], ...t.kinds] : KITS[game]) : t.kinds;
    marqueeHot(400 + tier * 400);
    CR.audio.play(t.sound);
    if (tier >= 4 && STING[game]) CR.audio.play(STING[game], { when: 0.18, gain: 0.85 });
    if (streak >= 1) CR.audio.play(`streak_${Math.min(5, streak)}`, { when: 0.08, gain: 0.8 });
    word(special || t.word, at.x, at.y - 46, tier >= 4 ? 4 : 3);
    popNumber(`+$${profit.toFixed(2)}`, at.x, at.y + 6, tier, tier >= 4 ? "#F4C34E" : "#7EDD65");
    burst(at.x, at.y, { count: t.count, kinds: kit, speed: 180 + tier * 60 });
    if (tier >= 5) setTimeout(() => burst(at.x, at.y, { count: 30, kinds: ["fx/star", "fx/coin"], speed: 420, up: 380 }), 180);
    shake(t.shake);
    return tier;
  }

  const LOSS_WORD = { Plinko: "miss", Roulette: "miss", Crash: "crashed", Blackjack: "bust", "Elephant River": "splash", "Horse Race": "miss" };
  function loss(gameName, amount, wordId) {
    const at = anchor();
    word(wordId || LOSS_WORD[gameName] || "miss", at.x, at.y - 30, 3);
    if (amount > 0) popNumber(`-$${amount.toFixed(2)}`, at.x, at.y + 8, 1, "#FF7A72");
    hostMood("sweat", 1100);
    shake(2);
  }

  function goal() {
    const at = anchor();
    marqueeHot(2500);
    hostMood("cheer", 2500);
    CR.audio.play("goal_fanfare");
    word("goal", innerWidth / 2, innerHeight * 0.3, 5);
    confetti(80);
    burst(at.x, at.y, { count: 30, kinds: ["fx/coin", "fx/star"], speed: 380 });
    shake(5);
  }

  return { burst, confetti, word, shake, celebrate, loss, goal, tierFor, anchor, marqueeHot, popNumber, hostMood, count: () => parts.length };
})();

/* ---------- Machine marquees: a named sign with chasing bulbs above every game ---------- */
CR.MACHINES = {
  "plinko-screen": ["THE PEG FOUNDRY", "#FF9E45"],
  "roulette-screen": ["THE RUBY WHEEL", "#FF7A72"],
  "crash-screen": ["ROCKET RUCKUS", "#37D9E8"],
  "blackjack-screen": ["THE TWENTY-ONE CLUB", "#F4C34E"],
  "frog-screen": ["ELEPHANT RIVER", "#FF8CC6"],
  "horse-screen": ["DERBY DASH", "#7EDD65"],
  "shop-screen": ["CASINO SHOP", "#9B7BF0"],
};
document.addEventListener("DOMContentLoaded", () => {
  Object.entries(CR.MACHINES).forEach(([id, [title, accent]]) => {
    const screen = document.getElementById(id);
    if (!screen || screen.querySelector(".marquee")) return;
    const bulbs = '<div class="bulbs" aria-hidden="true">' + '<span class="bulb"></span>'.repeat(16) + "</div>";
    const m = document.createElement("div");
    m.className = "marquee";
    m.style.setProperty("--accent", accent);
    m.innerHTML = `${bulbs}<div class="marquee-title">${title}</div>${bulbs}`;
    screen.prepend(m);
  });
});

/* ---------------- HUD ---------------- */
CR.hud = (() => {
  let shown = null, target = 0, raf = null, lastTick = null;
  const fmt = (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function setBalance(el, value) {
    target = value;
    if (shown === null || CR.settings.reducedMotion) { shown = value; el.textContent = fmt(value); return; }
    if (raf) return;
    const step = () => {
      const diff = target - shown;
      shown = Math.abs(diff) < 0.01 ? target : shown + diff * 0.25;
      el.textContent = fmt(shown);
      raf = shown === target ? null : requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function update({ balance, goal, timeLeft, streak, gameStarted }) {
    const bal = document.getElementById("balance");
    if (bal) setBalance(bal, balance);
    const goalEl = document.getElementById("goal");
    if (goalEl) goalEl.textContent = `GOAL ${fmt(goal).replace(".00", "")}`;
    const fill = document.getElementById("goal-bar-fill");
    if (fill) {
      const pct = Math.max(0, Math.min(1, balance / goal));
      fill.style.width = `${pct * 100}%`;
      fill.classList.toggle("full", pct >= 1);
    }
    const timer = document.getElementById("timer");
    if (timer) {
      timer.textContent = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;
      const urgent = gameStarted && timeLeft <= 15 && timeLeft > 0;
      timer.parentElement.classList.toggle("urgent", urgent);
      if (urgent && lastTick !== timeLeft) CR.audio.play("time_tick", { rate: 1 + (15 - timeLeft) * 0.02 });
      lastTick = timeLeft;
    }
    const pips = document.getElementById("streak-pips");
    if (pips) {
      if (!pips.children.length) pips.innerHTML = Array.from({ length: 5 }, () => `<span class="pip">${CR.spriteImg("ui/flame")}</span>`).join("");
      [...pips.children].forEach((p, i) => p.classList.toggle("lit", i < streak));
      pips.parentElement.classList.toggle("on-fire", streak >= 5);
    }
  }

  return { update, reset: () => { shown = null; lastTick = null; } };
})();

/* ---------------- Settings panel ---------------- */
CR.openSettings = () => {
  let panel = document.getElementById("settings-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "settings-panel";
    panel.className = "goal-popup settings-panel";
    panel.innerHTML = `<div class="goal-popup-card settings-card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <h2 id="settings-title">SETTINGS</h2>
      <label>SOUND FX <input type="range" min="0" max="1" step="0.05" data-set="sfx"></label>
      <label>MUSIC <input type="range" min="0" max="1" step="0.05" data-set="music"></label>
      <label class="check"><input type="checkbox" data-set="mute"> MUTE ALL</label>
      <label>EFFECTS <select data-set="fx"><option value="high">HIGH</option><option value="low">LOW</option><option value="off">OFF</option></select></label>
      <label class="check"><input type="checkbox" data-set="reducedMotion"> REDUCED MOTION (NO SHAKE, NO PARTICLES)</label>
      <button type="button" class="submit-score-btn" id="settings-close">DONE</button></div>`;
    document.body.appendChild(panel);
    panel.querySelectorAll("[data-set]").forEach((input) => {
      const key = input.dataset.set;
      if (input.type === "checkbox") input.checked = !!CR.settings[key];
      else input.value = CR.settings[key];
      input.addEventListener("input", () => {
        CR.settings[key] = input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value;
        CR.settings.save();
        CR.audio.applyVolumes();
        document.documentElement.classList.toggle("reduced-motion", !!CR.settings.reducedMotion);
        if (key === "sfx") CR.audio.play("ui_tab");
      });
    });
    const close = () => { panel.classList.add("hidden"); CR.audio.play("ui_close"); };
    panel.querySelector("#settings-close").addEventListener("click", close);
    panel.addEventListener("click", (e) => { if (e.target === panel) close(); });
  }
  panel.classList.remove("hidden");
  CR.audio.play("ui_open");
};
document.documentElement.classList.toggle("reduced-motion", !!CR.settings.reducedMotion);
