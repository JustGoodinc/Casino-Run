// Casino Run sound recipes: every sound in the game, as synthesis source code.
// category -> loudness trim applied after peak normalisation (see docs/audio/AUDIO_BIBLE.md).
import { tone, bell, noise, mix, seq, echo, lowpass, midi, buf } from "../../tools/audio-generator/dsp.mjs";

export const TRIM = { ui: 0.55, bet: 0.7, game: 0.75, score: 0.9, big: 1, loss: 0.7, music: 0.6 };

const click = (f = 2400, d = 0.02) => mix([[tone({ f, f1: f * 0.6, dur: d, type: "square", env: { a: 0.001, d: d * 0.6, s: 0, r: 0.001 }, lp: 5000 })], [noise({ dur: d, decay: 300, hp: 2000, vol: 0.5 })]]);
const coinBell = (f, dur = 0.5, vol = 1) => bell({ f, ratio: 1.41, index: 2.5, dur, decay: 7, vol });
const pling = (n, dur = 0.25, vol = 1) => mix([[bell({ f: midi(n), ratio: 2, index: 1.2, dur, decay: 9, vol })], [tone({ f: midi(n), dur, type: "tri", env: { a: 0.002, d: dur * 0.8, s: 0, r: 0.01 }, vol: vol * 0.4 })]]);
const thump = (f = 120, dur = 0.18, vol = 1) => tone({ f, f1: f * 0.4, dur, env: { a: 0.002, d: dur * 0.9, s: 0, r: 0.01 }, vol });
const swish = (dur = 0.08, lo = 1500, hi = 4500, vol = 1) => noise({ dur, env: { a: dur * 0.3, d: dur * 0.6, s: 0, r: 0.005 }, hp: lo, lp: hi, vol });
const chord = (notes, dur, type = "pulse25", vol = 0.35) => mix(notes.map((n) => [tone({ f: midi(n), dur, type, env: { a: 0.01, d: 0.2, s: 0.5, r: dur * 0.4 }, vol, vib: [5.5, 0.08], lp: 3200 })]));
const STREAK = [72, 76, 79, 81, 84]; // C5 E5 G5 A5 C6: a major-pentatonic ladder

export const SFX = {
  // ---- UI ----
  ui_click: ["ui", () => click(2200, 0.025)],
  ui_hover: ["ui", () => tone({ f: 1500, dur: 0.02, env: { a: 0.002, d: 0.015, s: 0, r: 0.002 }, vol: 0.4 })],
  ui_confirm: ["ui", () => seq([79, 86], 0.05, (n) => pling(n, 0.12))],
  ui_cancel: ["ui", () => seq([79, 72], 0.05, (n) => pling(n, 0.12))],
  ui_error: ["ui", () => tone({ f: 180, dur: 0.16, type: "square", env: { a: 0.002, d: 0.05, s: 0.7, r: 0.04 }, vib: [30, 1.5], lp: 1600 })],
  ui_open: ["ui", () => mix([[tone({ f: 300, f1: 900, dur: 0.1, type: "tri", env: { a: 0.005, d: 0.08, s: 0.2, r: 0.01 } })], [click(3000, 0.015), 0.09, 0.5]])],
  ui_close: ["ui", () => tone({ f: 900, f1: 300, dur: 0.1, type: "tri", env: { a: 0.005, d: 0.08, s: 0.2, r: 0.01 } })],
  ui_tab: ["ui", () => seq([84, 88], 0.03, (n) => tone({ f: midi(n), dur: 0.04, type: "tri", env: { a: 0.001, d: 0.03, s: 0, r: 0.005 } }))],
  ui_buy: ["ui", () => mix([[noise({ dur: 0.06, decay: 60, hp: 2500 }), 0, 0.5], [coinBell(1760, 0.5)], [coinBell(2350, 0.45, 0.7), 0.07]])],
  ui_nofunds: ["ui", () => seq([57, 53], 0.09, (n) => tone({ f: midi(n), dur: 0.11, type: "square", env: { a: 0.003, d: 0.05, s: 0.5, r: 0.03 }, lp: 1200 }))],

  // ---- Betting ----
  bet_chip: ["bet", () => mix([[click(2800, 0.03)], [click(2300, 0.03), 0.045, 0.8], [thump(260, 0.06, 0.5)]])],
  all_in: ["bet", () => mix([[tone({ f: 110, f1: 880, dur: 0.38, type: "saw", env: { a: 0.01, d: 0.3, s: 0.6, r: 0.06 }, lp: (t) => 600 + t * 9000 })], [thump(90, 0.3)], [coinBell(1760, 0.6), 0.36], [chord([69, 73, 76], 0.4, "square", 0.25), 0.36]])],

  // ---- Scoring (tiered) ----
  win_small: ["score", () => mix([[pling(84)], [pling(88), 0.07]])],
  win_medium: ["score", () => mix([[seq([84, 88, 91], 0.06, (n) => pling(n, 0.3))], [coinBell(2600, 0.4, 0.4), 0.15]])],
  win_large: ["score", () => mix([[seq([79, 84, 88, 91, 96], 0.055, (n) => pling(n, 0.35))], [chord([72, 76, 79, 84], 0.6), 0.27], ...[0, 1, 2, 3].map((k) => [coinBell(2200 + k * 300, 0.4, 0.4), 0.3 + k * 0.06])])],
  jackpot: ["big", () => echo(mix([
    [seq([72, 76, 79, 84, 79, 84], 0.09, (n) => tone({ f: midi(n), dur: 0.12, type: "square", env: { a: 0.003, d: 0.05, s: 0.7, r: 0.02 }, lp: 3500, vol: 0.6 }))],
    [chord([72, 76, 79, 84, 88], 1.1, "square", 0.22), 0.54],
    [thump(70, 0.5), 0.54],
    ...Array.from({ length: 10 }, (_, k) => [coinBell(1800 + ((k * 389) % 1400), 0.5, 0.35), 0.6 + k * 0.07]),
  ]), 0.15, 0.25, 0.4)],
  cascade_tick: ["score", () => tone({ f: 1200, dur: 0.05, type: "tri", env: { a: 0.001, d: 0.04, s: 0, r: 0.005 } })],
  payout_total: ["score", () => mix([[thump(140, 0.15)], [coinBell(1568, 0.6)], [pling(91, 0.4, 0.6), 0.03]])],
  multiplier_up: ["score", () => mix([[tone({ f: 400, f1: 1600, dur: 0.18, type: "tri", env: { a: 0.005, d: 0.15, s: 0.3, r: 0.02 } })], [bell({ f: 3200, ratio: 2, index: 1, dur: 0.25, decay: 14, vol: 0.4 }), 0.15]])],
  ...Object.fromEntries(STREAK.map((n, k) => [`streak_${k + 1}`, ["score", () => mix([
    [pling(n, 0.3)],
    ...(k >= 2 ? [[pling(n + 12, 0.25, 0.35), 0.01]] : []),
    ...(k >= 3 ? [[tone({ f: midi(n + 7), dur: 0.25, type: "pulse25", env: { a: 0.005, d: 0.2, s: 0, r: 0.02 }, vol: 0.2, lp: 3000 }), 0.02]] : []),
    ...(k >= 4 ? [[seq([n + 4, n + 7, n + 12], 0.05, (m) => pling(m, 0.25, 0.5)), 0.12]] : []),
  ])]])),

  // ---- Loss ----
  lose: ["loss", () => mix([[tone({ f: 330, f1: 150, dur: 0.32, type: "saw", env: { a: 0.005, d: 0.25, s: 0.3, r: 0.05 }, lp: 900 })], [thump(80, 0.2, 0.7)]])],
  bust: ["loss", () => mix([[noise({ dur: 0.35, decay: 9, lp: 2500 })], [tone({ f: 220, f1: 90, dur: 0.4, type: "square", env: { a: 0.005, d: 0.35, s: 0, r: 0.05 }, lp: 700, vol: 0.6 })]])],

  // ---- Plinko: The Peg Foundry ----
  // 8 different pegs (timbre + pitch). The game never plays the same one twice in a row and
  // raises the pitch as the ball drops, so a run of hits plays a little rising tune.
  // Notes are C-major pentatonic, so any combination sounds consonant.
  ...Object.fromEntries([
    [84, { ratio: 2.76, index: 1.6, decay: 30 }],               // glass ping
    [86, { ratio: 1.41, index: 2.2, decay: 26 }],               // brass tink
    [88, { ratio: 3.5, index: 1.2, decay: 34 }],                // bright metal
    [91, { ratio: 2.0, index: 0.9, decay: 22 }],                // round bell
    [93, { ratio: 1.0, index: 0.6, decay: 40, wood: true }],    // wood block
    [96, { ratio: 2.76, index: 2.4, decay: 28 }],               // sparkly glass
    [81, { ratio: 4.2, index: 1.0, decay: 30 }],                // hollow tine
    [79, { ratio: 1.5, index: 1.8, decay: 24, wood: true }],    // marimba-ish
  ].map(([n, p], k) => [`plinko_peg_${k + 1}`, ["game", () => mix([
    [bell({ f: midi(n), ratio: p.ratio, index: p.index, dur: 0.14, decay: p.decay })],
    ...(p.wood ? [[noise({ dur: 0.02, decay: 250, lp: 2500, vol: 0.5 })]] : [[click(midi(n) * 2, 0.008), 0, 0.25]]),
  ])]])),
  plinko_land: ["game", () => mix([[thump(180, 0.15)], [noise({ dur: 0.08, decay: 40, lp: 1200, vol: 0.6 })]])],

  // ---- Roulette: The Ruby Wheel ----
  roulette_tick: ["game", () => mix([[noise({ dur: 0.015, decay: 400, hp: 3000 })], [tone({ f: 3000, dur: 0.012, env: { a: 0.001, d: 0.01, s: 0, r: 0.001 }, vol: 0.5 })]])],
  roulette_stop: ["game", () => mix([[click(1800, 0.04)], [click(1500, 0.04), 0.05, 0.7], [coinBell(1320, 0.5, 0.6), 0.08]])],

  // ---- Crash: Rocket Ruckus ----
  crash_boom: ["loss", () => mix([[noise({ dur: 0.9, decay: 4, lp: (t) => 2200 * Math.exp(-t * 4) + 150 })], [thump(60, 0.6)]])],

  // ---- Blackjack: The Twenty-One Club ----
  card_deal: ["game", () => mix([[swish(0.07, 1500, 4500)], [click(3500, 0.012), 0.06, 0.5]])],
  card_flip: ["game", () => mix([[swish(0.05, 2000, 6000)], [swish(0.05, 1200, 3000, 0.8), 0.05]])],

  // ---- Elephant River ----
  river_step: ["game", () => mix([[tone({ f: 380, f1: 950, dur: 0.08, env: { a: 0.002, d: 0.07, s: 0, r: 0.005 } })], [noise({ dur: 0.08, decay: 50, lp: 900, vol: 0.4 })]])],
  river_splash: ["loss", () => mix([[noise({ dur: 0.7, decay: 5, lp: 1400 })], ...[0, 1, 2, 3, 4].map((k) => [tone({ f: 300 + k * 90, f1: 900 + k * 150, dur: 0.06, env: { a: 0.002, d: 0.05, s: 0, r: 0.005 }, vol: 0.5 }), 0.15 + k * 0.08])])],

  // ---- Horse Race: Derby Dash ----
  horse_clop: ["game", () => mix([[tone({ f: 950, f1: 700, dur: 0.03, env: { a: 0.001, d: 0.025, s: 0, r: 0.003 } })], [noise({ dur: 0.03, decay: 120, lp: 3000, vol: 0.4 })], [tone({ f: 820, f1: 600, dur: 0.03, env: { a: 0.001, d: 0.025, s: 0, r: 0.003 } }), 0.09, 0.8]])],
  horse_bugle: ["game", () => seq([67, 72, 76, 79, 79], 0.11, (n, k) => tone({ f: midi(n), dur: k === 4 ? 0.4 : 0.1, type: "saw", env: { a: 0.01, d: 0.05, s: 0.8, r: 0.03 }, lp: 2400, vib: k === 4 ? [6, 0.15] : undefined }))],
  horse_finish: ["score", () => mix([[noise({ dur: 0.9, env: { a: 0.25, d: 0.3, s: 0.4, r: 0.3 }, lp: 1800, hp: 300, vol: 0.5 })], [coinBell(1760, 0.6)], [coinBell(2200, 0.5, 0.7), 0.12]])],

  // ---- Items ----
  item_use: ["game", () => seq([60, 64, 67, 72, 76], 0.035, (n) => tone({ f: midi(n), dur: 0.06, type: "tri", env: { a: 0.002, d: 0.05, s: 0, r: 0.005 } }))],
  item_break: ["game", () => mix([[noise({ dur: 0.25, decay: 18, hp: 3000 })], ...[3100, 4200, 5300].map((f, k) => [bell({ f, ratio: 1.73, index: 2, dur: 0.2, decay: 20, vol: 0.5 }), k * 0.025])])],
  grease_fire: ["game", () => mix([[noise({ dur: 0.6, env: { a: 0.15, d: 0.3, s: 0.3, r: 0.15 }, lp: (t) => 400 + t * 5000 })], ...[0, 1, 2, 3, 4, 5].map((k) => [noise({ dur: 0.02, decay: 200, hp: 2500, vol: 0.6 }), 0.1 + k * 0.07])])],

  // ---- Progression ----
  goal_fanfare: ["big", () => echo(mix([
    [seq([67, 72, 76, 79], 0.1, (n) => tone({ f: midi(n), dur: 0.12, type: "square", env: { a: 0.004, d: 0.05, s: 0.7, r: 0.02 }, lp: 3500, vol: 0.6 }))],
    [chord([72, 76, 79, 84], 0.8, "square", 0.25), 0.4], [thump(80, 0.4), 0.4],
  ]), 0.14, 0.25, 0.35)],
  game_over: ["loss", () => seq([67, 64, 60, 55], 0.18, (n, k) => tone({ f: midi(n), dur: k === 3 ? 0.6 : 0.17, type: "square", env: { a: 0.005, d: 0.08, s: 0.6, r: 0.06 }, lp: 1800, vib: k === 3 ? [5, 0.4] : undefined }))],
  // Ringing coin with a 12 Hz tremolo, which reads as "spinning in the air".
  coin_flip: ["game", () => bell({ f: 2200, ratio: 1.41, index: 3, dur: 0.9, decay: 3 }).map((v, i) => v * (0.6 + 0.4 * Math.sin((i / 22050) * 2 * Math.PI * 12)))],
  time_tick: ["ui", () => mix([[tone({ f: 1000, dur: 0.035, type: "tri", env: { a: 0.001, d: 0.03, s: 0, r: 0.004 } })], [click(4000, 0.01), 0, 0.4]])],
  new_round: ["score", () => mix([[seq([72, 79, 84], 0.08, (n) => pling(n, 0.3))], [chord([72, 76, 79], 0.5, "tri", 0.4), 0.24]])],
};

// ---- Music: original 8-bar lobby loop (A minor, 132 bpm, eighth-note grid) ----
export const MUSIC = {
  music_lobby: ["music", () => {
    const e = 60 / 132 / 2, bars = 8, total = bars * 8 * e;
    const lead = [
      [76, 0, 81, -1, 79, 76, 0, 74], [72, -1, 74, 72, 69, -1, 0, 72], [76, 0, 79, -1, 76, 72, 0, 74], [74, -1, 71, -1, 67, 0, 71, 74],
      [76, 0, 81, -1, 83, 81, 79, 76], [77, -1, 76, 74, 72, 0, 69, 72], [74, 0, 77, -1, 74, 72, 69, -1], [71, -1, 68, -1, 64, 0, 0, 0],
    ];
    const roots = [45, 41, 48, 43, 45, 41, 50, 40];
    const chords = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62], [57, 60, 64], [53, 57, 60], [57, 62, 65], [56, 59, 64]];
    const parts = [];
    lead.forEach((bar, b) => bar.forEach((n, s) => {
      if (n <= 0) return;
      let len = 1; while (bar[s + len] === -1) len++;
      parts.push([tone({ f: midi(n), dur: len * e * 0.95, type: "pulse25", env: { a: 0.005, d: 0.06, s: 0.6, r: 0.04 }, lp: 2600, vib: len > 1 ? [5.5, 0.12] : undefined, vol: 0.32 }), (b * 8 + s) * e]);
    }));
    roots.forEach((r, b) => { for (let s = 0; s < 8; s++) parts.push([tone({ f: midi(r + (s % 2 ? 12 : 0)), dur: e * 0.9, type: "tri", env: { a: 0.003, d: 0.05, s: 0.7, r: 0.03 }, vol: 0.5 }), (b * 8 + s) * e]); });
    chords.forEach((c, b) => { for (let s = 0; s < 16; s++) parts.push([tone({ f: midi(c[s % 3] + 12), dur: e / 2 * 0.8, type: "square", env: { a: 0.002, d: 0.04, s: 0.2, r: 0.01 }, lp: 1800, vol: 0.08 }), (b * 16 + s) * (e / 2)]); });
    for (let s = 0; s < bars * 8; s++) {
      if (s % 2) parts.push([noise({ dur: 0.04, decay: 90, hp: 6000, vol: 0.25 }), s * e]);
      if (s % 4 === 0) parts.push([tone({ f: 120, f1: 45, dur: 0.15, env: { a: 0.001, d: 0.14, s: 0, r: 0.005 }, vol: 0.7 }), s * e]);
      if (s % 4 === 2) parts.push([noise({ dur: 0.12, decay: 25, lp: 3500, hp: 900, vol: 0.4 }), s * e]);
    }
    const full = mix(parts, total);
    // Wrap the tail past the loop point back onto the start so the loop is seamless.
    const loop = full.slice(0, Math.round(total * 22050));
    for (let i = loop.length; i < full.length; i++) loop[i - loop.length] += full[i];
    return lowpass(loop, 7000);
  }],
};

// ---------- Per-game music (all original compositions) ----------
// song(): melody grid per bar (MIDI note, -1 = hold, 0 = rest), bass pattern [step, semitones, lenSteps]
// per bar root, chord comping, drum pattern strings ("x" = hit) per bar. swing delays odd steps.
// The tail past the loop point is wrapped onto the start so every loop is seamless.
const K = {
  kick: () => tone({ f: 120, f1: 45, dur: 0.15, env: { a: 0.001, d: 0.14, s: 0, r: 0.005 }, vol: 0.75 }),
  snare: () => noise({ dur: 0.12, decay: 25, lp: 3500, hp: 900, vol: 0.4 }),
  hat: () => noise({ dur: 0.04, decay: 90, hp: 6000, vol: 0.22 }),
  clap: () => mix([0, 0.012, 0.024].map((t) => [noise({ dur: 0.05, decay: 60, lp: 2500, hp: 1000, vol: 0.3 }), t])),
  clank: () => bell({ f: 1900, ratio: 3.1, index: 2, dur: 0.12, decay: 30, vol: 0.25 }),
  castanet: () => mix([[noise({ dur: 0.02, decay: 300, hp: 2500, vol: 0.4 })], [tone({ f: 2600, dur: 0.015, env: { a: 0.001, d: 0.012, s: 0, r: 0.002 }, vol: 0.2 })]]),
  ride: () => bell({ f: 5200, ratio: 1.41, index: 3, dur: 0.3, decay: 10, vol: 0.12 }),
  brush: () => noise({ dur: 0.15, env: { a: 0.04, d: 0.1, s: 0, r: 0.01 }, lp: 4000, hp: 1500, vol: 0.18 }),
  shaker: () => noise({ dur: 0.05, env: { a: 0.015, d: 0.03, s: 0, r: 0.005 }, hp: 5000, vol: 0.15 }),
  conga: () => tone({ f: 220, f1: 170, dur: 0.14, env: { a: 0.002, d: 0.13, s: 0, r: 0.005 }, vol: 0.45 }),
  block: () => tone({ f: 950, f1: 750, dur: 0.035, env: { a: 0.001, d: 0.03, s: 0, r: 0.003 }, vol: 0.35 }),
};
const V = {
  pluck: (n, d) => mix([[bell({ f: midi(n), ratio: 2, index: 1.2, dur: Math.max(d, 0.25), decay: 8, vol: 0.5 })], [tone({ f: midi(n), dur: d, type: "tri", env: { a: 0.003, d: d * 0.7, s: 0.2, r: 0.02 }, vol: 0.25 })]]),
  accordion: (n, d) => mix([0, 0.06].map((det) => [tone({ f: midi(n) * (1 + det / 100), dur: d, type: "square", env: { a: 0.03, d: 0.1, s: 0.7, r: 0.05 }, vib: [6, 0.1], lp: 1700, vol: 0.18 })])),
  synth: (n, d) => tone({ f: midi(n), dur: d, type: "saw", env: { a: 0.01, d: 0.1, s: 0.7, r: 0.04 }, vib: d > 0.3 ? [6, 0.15] : undefined, lp: 2400, vol: 0.28 }),
  mute: (n, d) => tone({ f: midi(n), dur: d, type: "square", env: { a: 0.02, d: 0.15, s: 0.5, r: 0.06 }, vib: [5, 0.12], lp: 1300, vol: 0.3 }),
  marimba: (n, d) => mix([[bell({ f: midi(n), ratio: 4, index: 1.4, dur: 0.35, decay: 9, vol: 0.55 })], [tone({ f: midi(n), dur: 0.3, env: { a: 0.002, d: 0.28, s: 0, r: 0.01 }, vol: 0.3 })]]),
  brass: (n, d) => tone({ f: midi(n), dur: d, type: "saw", env: { a: 0.02, d: 0.08, s: 0.8, r: 0.04 }, vib: d > 0.3 ? [5.5, 0.2] : undefined, lp: 2800, vol: 0.3 }),
  bassTri: (n, d) => tone({ f: midi(n), dur: d * 0.9, type: "tri", env: { a: 0.003, d: 0.05, s: 0.7, r: 0.03 }, vol: 0.55 }),
  bassSaw: (n, d) => tone({ f: midi(n), dur: d * 0.85, type: "saw", env: { a: 0.003, d: 0.05, s: 0.7, r: 0.03 }, lp: 650, vol: 0.5 }),
  keys: (n, d) => tone({ f: midi(n), dur: d, type: "tri", env: { a: 0.01, d: 0.1, s: 0.5, r: 0.05 }, vol: 0.12 }),
  arp: (n, d) => tone({ f: midi(n), dur: d * 0.8, type: "square", env: { a: 0.002, d: 0.04, s: 0.2, r: 0.01 }, lp: 1800, vol: 0.07 }),
};

// walk: per-bar list of 4 bass notes on the beats (a jazz walking line).
function song({ step, steps = 8, lead, leadVoice, roots, bass, walk, bassVoice = V.bassTri, chords, comp = [], compVoice = V.keys, arp, drums = {}, swing = 0, repeat = 1, lp = 7000 }) {
  const bars = lead.length * repeat, total = bars * steps * step, parts = [];
  const at = (bar, s) => (bar * steps + s) * step + (s % 2 ? swing * step : 0);
  for (let b = 0; b < bars; b++) {
    const bi = b % lead.length, bar = lead[bi];
    bar.forEach((n, s) => {
      if (n <= 0) return;
      let len = 1; while (bar[s + len] === -1) len++;
      parts.push([leadVoice(n, len * step * 0.95), at(b, s)]);
    });
    (bass || []).forEach(([s, semi, len]) => parts.push([bassVoice(roots[bi] + semi, len * step), at(b, s)]));
    if (walk) walk[bi].forEach((n, k) => parts.push([bassVoice(n, 2 * step), at(b, k * 2)]));
    if (chords) comp.forEach((s) => chords[bi].forEach((n) => parts.push([compVoice(n, step * 1.5), at(b, s)])));
    if (chords && arp) for (let s = 0; s < steps * 2; s++) parts.push([V.arp(chords[bi][s % chords[bi].length] + 12, step / 2), (b * steps * 2 + s) * (step / 2)]);
    Object.entries(drums).forEach(([kit, pattern]) => [...pattern].forEach((c, s) => c === "x" && parts.push([K[kit](), at(b, s)])));
  }
  const full = mix(parts, total), loop = full.slice(0, Math.round(total * 22050));
  for (let i = loop.length; i < full.length; i++) loop[i - loop.length] += full[i];
  return lowpass(loop, lp);
}

Object.assign(MUSIC, {
  // Plinko, "The Peg Foundry": C major, 140 bpm, bouncing staccato plucks falling like balls, metal clanks.
  music_plinko: ["music", () => song({
    step: 60 / 140 / 2, leadVoice: V.pluck,
    lead: [[84, 0, 79, 0, 76, 79, 84, 0], [83, 0, 79, 0, 74, 79, 83, 0], [81, 0, 76, 0, 72, 76, 81, 84], [77, 0, 81, 0, 84, -1, 81, 0],
      [84, 86, 88, 0, 86, 84, 79, 0], [83, 84, 86, 0, 83, 79, 74, 0], [77, 79, 81, 0, 84, 81, 77, 76], [74, 0, 79, 0, 74, -1, 0, 0]],
    roots: [48, 43, 45, 41, 48, 43, 41, 43], bass: [[0, 0, 1], [2, 7, 1], [4, 12, 1], [6, 7, 1]],
    chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62], [53, 57, 60], [55, 59, 62]], comp: [1, 5],
    drums: { kick: "x...x...", clap: "..x...x.", hat: ".x.x.x.x", clank: "......x." },
  })],
  // Roulette, "The Ruby Wheel": D minor tango, 112 bpm, accordion lead, habanera bass, castanets.
  music_roulette: ["music", () => song({
    step: 60 / 112 / 2, leadVoice: V.accordion,
    lead: [[74, -1, -1, 73, 74, 77, 81, -1], [79, -1, 77, -1, 74, -1, 70, -1], [73, -1, 76, -1, 79, -1, 76, 73], [74, -1, -1, -1, 0, 0, 69, 70],
      [74, -1, 72, -1, 70, -1, 77, -1], [79, -1, -1, 77, 76, 74, 72, 70], [69, -1, 73, -1, 76, 79, 82, -1], [81, -1, -1, -1, 74, -1, 0, 0]],
    roots: [38, 43, 45, 38, 46, 43, 45, 38], bass: [[0, 0, 3], [3, 0, 1], [4, 7, 2], [6, 12, 2]],
    chords: [[62, 65, 69], [58, 62, 67], [61, 64, 69], [62, 65, 69], [58, 62, 65], [58, 62, 67], [61, 64, 67], [62, 65, 69]], comp: [0, 4],
    compVoice: (n, d) => V.accordion(n - 12, d * 0.6),
    drums: { kick: "x...x...", castanet: "x..xx.x." },
  })],
  // Crash, "Rocket Ruckus": E minor, 150 bpm, driving octave bass, 16th arps, rising saw lead.
  music_crash: ["music", () => song({
    step: 60 / 150 / 2, leadVoice: V.synth, bassVoice: V.bassSaw, arp: true,
    lead: [[76, -1, 79, -1, 83, -1, 88, -1], [84, -1, 83, -1, 79, -1, 76, -1], [78, -1, 81, -1, 86, -1, 81, -1], [83, -1, -1, -1, 75, -1, 78, -1],
      [88, -1, 86, 83, -1, 79, 83, -1], [84, -1, 88, -1, 91, -1, 88, -1], [81, -1, 84, -1, 88, -1, 84, 81], [83, -1, -1, -1, -1, -1, 0, 0]],
    roots: [40, 36, 38, 35, 40, 36, 33, 35], bass: [0, 1, 2, 3, 4, 5, 6, 7].map((s) => [s, s % 2 ? 12 : 0, 1]),
    chords: [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 63, 66], [64, 67, 71], [60, 64, 67], [57, 60, 64], [59, 63, 66]],
    drums: { kick: "x.x.x.x.", snare: "..x...x.", hat: "xxxxxxxx" },
  })],
  // Blackjack, "The Twenty-One Club": F major cool jazz, 96 bpm swing, walking bass, muted lead, ride + brushes.
  music_blackjack: ["music", () => song({
    step: 60 / 96 / 2, leadVoice: V.mute, swing: 0.33,
    lead: [[74, -1, 72, 70, 69, -1, 67, 0], [67, -1, 70, -1, 72, -1, 76, -1], [77, -1, -1, -1, 76, -1, 72, -1], [74, -1, -1, 0, 0, 69, 72, 74],
      [77, -1, 74, -1, 70, -1, 67, 69], [70, 72, -1, 76, -1, 79, -1, 76], [77, -1, -1, -1, -1, 0, 81, -1], [79, -1, 76, -1, 72, -1, 0, 0]],
    roots: [43, 48, 41, 38, 43, 48, 41, 48],
    // ii-V-I walking line; the last note of each bar leads chromatically into the next root.
    walk: [[43, 46, 50, 47], [48, 52, 55, 42], [41, 45, 48, 39], [38, 41, 45, 42], [43, 46, 50, 47], [48, 52, 55, 42], [41, 45, 48, 47], [48, 52, 46, 42]],
    chords: [[55, 58, 62, 65], [55, 58, 60, 64], [57, 60, 64, 65], [57, 60, 62, 65], [55, 58, 62, 65], [55, 58, 60, 64], [57, 60, 64, 65], [55, 58, 60, 64]], comp: [3, 6],
    drums: { ride: "x.xxx.xx", brush: "..x...x.", kick: "x......." },
  })],
  // Elephant River: G major calypso, 120 bpm, marimba lead, steel-pan style offbeats, shaker + congas.
  music_river: ["music", () => song({
    step: 60 / 120 / 2, leadVoice: V.marimba,
    lead: [[79, 0, 83, 0, 86, 83, 0, 79], [76, 0, 79, 0, 84, 79, 0, 76], [78, 0, 81, 0, 86, 81, 78, 81], [79, -1, 0, 74, 79, 0, 83, 0],
      [83, 0, 79, 0, 76, 79, 83, 86], [84, 0, 81, 79, 76, 0, 72, 76], [74, 78, 81, 0, 86, 0, 84, 81], [79, -1, -1, 0, 0, 0, 0, 0]],
    roots: [43, 48, 50, 43, 40, 48, 50, 43], bass: [[0, 0, 3], [3, 0, 1], [4, 7, 2], [6, 7, 1]],
    chords: [[67, 71, 74], [64, 67, 72], [66, 69, 74], [67, 71, 74], [64, 67, 71], [64, 67, 72], [66, 69, 74], [67, 71, 74]], comp: [1, 3, 5, 7],
    compVoice: (n, d) => mix([[V.marimba(n, d)]]).map((v) => v * 0.35),
    drums: { kick: "x...x...", shaker: "xxxxxxxx", conga: "...x..x." },
  })],
  // Horse Race, "Derby Dash": A major gallop in 6/8, brassy saw lead, wood-block hoofbeats.
  music_horse: ["music", () => song({
    step: 0.16, steps: 6, leadVoice: V.brass, repeat: 2,
    lead: [[69, 73, 76, 81, -1, -1], [78, -1, 81, 78, -1, 74], [76, -1, 80, 83, -1, 80], [81, -1, -1, 76, -1, -1],
      [78, 81, 85, -1, 83, 81], [78, -1, 74, -1, 78, 81], [83, -1, 80, 76, -1, 80], [81, -1, -1, -1, 0, 0]],
    roots: [45, 50, 52, 45, 42, 50, 52, 45], bass: [[0, 0, 2], [3, 7, 2]],
    chords: [[69, 73, 76], [66, 69, 74], [68, 71, 76], [69, 73, 76], [66, 69, 73], [66, 69, 74], [68, 71, 74], [69, 73, 76]], comp: [2, 5],
    drums: { kick: "x..x..", block: "xx.xx.", snare: "....x." },
  })],
});
