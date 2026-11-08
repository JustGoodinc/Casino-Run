// Every Casino Run sprite, as reproducible source. Each entry returns one or more frames (Img).
// Grids use palette keys from palette.mjs; '.' = transparent. The build adds the 1px ink outline
// unless `outline: false`. Authored at native 1x pixels (= 3DS size); the web scales by integers.
import { Img, textWidth } from "../tools/sprite-generator/raster.mjs";
import { ITEMS } from "./items.mjs";

const grid = (rows, swaps) => {
  const w = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== w) throw new Error(`grid row ${i} is ${r.length} wide, expected ${w}: "${r}"`); });
  return new Img(w, rows.length).blit(rows, 0, 0, swaps);
};
const canvas = (w, h, fn) => { const img = new Img(w, h); fn(img); return img; };
const ellipse = (img, cx, cy, rx, ry, colorAt) => {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.05) img.set(cx + x, cy + y, typeof colorAt === "function" ? colorAt(x, y) : colorAt);
  }
};
const vshade = (base, hi, lo, ry) => (x, y) => (y < -ry * 0.45 ? hi : y > ry * 0.4 ? lo : base);

// ---------- Shared pieces ----------
const coin = () => canvas(12, 12, (i) => {
  i.ball(6, 6, 5, "gold", "cream", "goldDark");
  i.ring(6, 6, 4, 4, (a) => (Math.sin(a) > 0.2 ? "goldDark" : null));
  i.text("$", 4, 3, "goldDark");
});

// Emergency coin flip faces (30x30): heads = Dice's face, tails = a star, struck at 2x into the gold
// so the side reads at a glance mid-spin.
const dbl = (rows) => rows.flatMap((r) => { const w = [...r].map((c) => c + c).join(""); return [w, w]; });
const flipCoin = (face) => canvas(30, 30, (i) => {
  const f = dbl(face);
  i.ball(15, 15, 14, "gold", "cream", "goldDark");
  i.ring(15, 15, 12, 12, () => "goldDark");
  i.blit(f, 15 - Math.floor(f[0].length / 2), 15 - Math.floor(f.length / 2));
});
const COIN_HEADS = [
  "..GGGGG..",
  "..GrrrG..",
  ".GGGGGGG.",
  ".GeeeeeG.",
  ".GekeekG.",
  ".GekeekG.",
  ".GeeeeeG.",
  ".GekkkeG.",
  "..GeeeG..",
  "...GGG...",
];
const COIN_TAILS = [
  "....G....",
  "...GeG...",
  "...GeG...",
  "GGGGeGGGG",
  ".GeeeeeG.",
  "..GeeeG..",
  "..GeGeG..",
  ".GeG.GeG.",
  ".GG...GG.",
];

const SUITS = {
  heart: { small: ["rr.rr", "rrrrr", "rrrrr", ".rrr.", "..r.."], color: "red" },
  diamond: { small: ["..r..", ".rrr.", "rrrrr", ".rrr.", "..r.."], color: "red" },
  spade: { small: ["..k..", ".kkk.", "kkkkk", "..k..", ".kkk."], color: "ink" },
  club: { small: [".kkk.", ".kkk.", "kkkkk", "kkkkk", "..k.."], color: "ink" },
};
const suitBig = (name) => {
  const s = SUITS[name];
  return new Img(5, 5).blit(s.small).scaled(2);
};

// ---------- Items (shop): see items.mjs (v2, 24x24) ----------

// ---------- Characters ----------
function elephant(frame) {
  return canvas(24, 17, (i) => {
    ellipse(i, 8, 9, 7, 4, vshade("pink", "cream", "pinkDark", 4));
    ellipse(i, 17, 6, 4, 4, vshade("pink", "cream", "pinkDark", 4));
    ellipse(i, 13, 6, 2, 3, (x, y) => (y > 1 ? "pinkDark" : "pinkDark"));
    i.set(18, 5, "ink").set(18, 4, "white");
    i.line(21, 7, 22, 12, "pink").line(20, 8, 21, 12, "pinkDark").set(22, 13, "pink").set(21, 13, "pink");
    i.set(19, 9, "cream").set(20, 9, "cream");
    i.line(1, 7, 0, 10, "pinkDark");
    const legs = frame === 0 ? [[3, 0], [6, 1], [11, 1], [14, 0]] : [[3, 1], [6, 0], [11, 0], [14, 1]];
    legs.forEach(([x, lift]) => {
      i.rect(x, 12, 3, 4 - lift, x === 6 || x === 14 ? "pinkDark" : "pink");
      i.rect(x, 15 - lift, 3, 1, "cream");
    });
  });
}

// Review v1 had 1px "insect" legs; v2 uses a deeper body, thick neck and 2px legs with hooves.
function horse(frame, silk) {
  const S = { j: silk, J: SILK_DARK[silk] };
  return canvas(28, 19, (i) => {
    const leg = (x0, y0, x1, y1, far) => {
      const c = far ? "brownDark" : "brown";
      i.line(x0, y0, x1, y1, c).line(x0 + 1, y0, x1 + 1, y1, c);
      i.rect(x1, y1, 2, 1, "greyDark");
    };
    // Gallop cycle (iteration 7: 4 frames): 0 front lands, 1 back pushes, 2 gathered, 3 stretched in the air.
    const legs = [
      [[7, 12, 4, 17, true], [9, 12, 11, 17, false], [17, 12, 21, 16, true], [18, 12, 16, 17, false]],
      [[7, 12, 8, 17, true], [9, 12, 6, 17, false], [17, 12, 18, 17, true], [18, 12, 20, 16, false]],
      [[7, 12, 9, 17, true], [9, 12, 10, 17, false], [17, 12, 15, 17, true], [18, 12, 17, 17, false]],
      [[7, 12, 3, 16, true], [9, 12, 5, 16, false], [17, 12, 22, 15, true], [18, 12, 23, 16, false]],
    ][frame];
    legs.filter((l) => l[4]).forEach((l) => leg(...l));
    // Tail
    i.line(4, 7, 1, 10, "brownDark").line(4, 8, 1, 12, "brownDark").line(5, 8, 2, 12, "brownDark");
    ellipse(i, 12, 9, 8, 4, vshade("brown", "orange", "brownDark", 4));
    // Neck (thick) + head + muzzle
    for (let k = 0; k < 4; k++) i.line(16 + k, 9, 20 + k, 3, "brown");
    i.line(16, 8, 20, 2, "brownDark");
    ellipse(i, 23, 3, 3, 2, vshade("brown", "orange", "brownDark", 2));
    ellipse(i, 25, 5, 2, 1, "brownDark");
    i.set(21, 0, "brown").set(22, 0, "brownDark").set(24, 2, "ink").set(26, 5, "ink");
    legs.filter((l) => !l[4]).forEach((l) => leg(...l));
    // Jockey crouched over the withers (silks palette-swapped per horse).
    i.blit([".jj..", "jjjj.", ".jee.", "jjjJ.", "jJjjj", ".JJ.."], 12, 0, S);
    i.set(15, 2, "ink");
  });
}
const SILK_DARK = { red: "redDark", cyan: "cyanDark", gold: "goldDark", green: "greenDark" };

// Hazards: 2 frames each (iteration 7). A wake splashes at the tail; the croc snaps, the paddle strokes.
const wake = (i, frame, y) => {
  if (frame) i.set(0, y, "white").set(2, y - 1, "cyan").set(1, y - 2, "white");
  else i.set(1, y, "cyan").set(0, y - 1, "white").set(3, y, "white");
};
const croc = (frame) => canvas(26, 9, (i) => {
  i.rect(0, 3, 20, 4, "green").rect(0, 6, 20, 1, "greenDark");
  for (let x = 1; x < 18; x += 3) i.set(x, 2, "greenDark");
  if (frame) {
    // Jaw open: upper jaw lifts, red mouth, one row of teeth (two rows read as a checkerboard).
    i.rect(20, 2, 6, 2, "green").rect(20, 4, 6, 2, "redDark").rect(20, 6, 6, 1, "greenDark");
    for (let x = 22; x < 26; x += 2) i.set(x, 4, "white");
    i.blit(["gk"], 19, 1).set(19, 0, "green").set(20, 0, "green");
  } else {
    i.rect(20, 4, 6, 3, "green").rect(20, 6, 6, 1, "greenDark");
    for (let x = 21; x < 26; x += 2) i.set(x, 6, "white");
    i.blit(["gk"], 19, 2).set(19, 1, "green").set(20, 1, "green");
  }
  // Legs paddle: alternate which pair is down.
  if (frame) i.rect(5, 7, 2, 2, "greenDark").rect(12, 7, 2, 2, "greenDark");
  else i.rect(3, 7, 2, 2, "greenDark").rect(14, 7, 2, 2, "greenDark");
});
const log = (frame) => canvas(26, 8, (i) => {
  i.rect(0, 1, 24, 6, "brown").rect(0, 1, 24, 1, "orange").rect(0, 6, 24, 1, "brownDark");
  ellipse(i, 24, 4, 2, 3, (x, y) => (Math.abs(x) + Math.abs(y) < 2 ? "brown" : "creamDark"));
  [[4, 3], [9, 4], [15, 3], [19, 5]].forEach(([x, y]) => i.rect(x, y, 3, 1, "brownDark"));
  i.rect(11, 0, 2, 1, "brownDark");
  wake(i, frame, 7);
});
const boat = (frame) => canvas(24, 10, (i) => {
  i.blit(["....cccc", "...cwccc", "..cccccc"], 9, 0);
  if (frame) i.set(13, 1, "cyan"); // porthole glints
  i.rect(1, 3, 22, 3, "white").rect(0, 6, 24, 2, "red").rect(2, 8, 20, 1, "redDark");
  i.rect(1, 3, 22, 1, "cream").set(23, 6, null).set(0, 7, null);
  wake(i, frame, 9);
});
const canoe = (frame) => canvas(26, 8, (i) => {
  for (let x = 0; x < 26; x++) {
    const t = Math.abs(x - 12.5) / 12.5;
    const top = 2 + Math.round(t * t * 2);
    for (let y = top; y < 7; y++) i.set(x, y, y === top ? "orange" : y > 5 ? "orangeDark" : "brown");
  }
  // Paddle: forward reach, then pulled back with a splash.
  if (frame) i.line(14, 0, 12, 7, "brownDark").rect(11, 6, 3, 2, "brownDark").set(10, 7, "white").set(14, 7, "cyan");
  else i.line(16, 0, 20, 7, "brownDark").rect(19, 6, 3, 2, "brownDark");
  wake(i, frame, 7);
});
const rocket = (frame) => grid([
  "....rr....", "...rlrR...", "..reeeeR..", "..eweeeE..", "..eccceE..", "..ecwceE..", "..eccceE..",
  "..eweeeE..", "..eweeeE..", ".reweeeER.", "rrreeeeERR", "rR.EEEE.RR",
  frame ? "R..ogoo..R" : "R..oggo..R", frame ? "...ogg...." : "...oggo...", frame ? "....oo...." : "....oo....",
  frame ? "...o......" : "....o.....",
]);

// ---------- Cards (procedural; original designs) ----------
// v2: 31x40 with three non-overlapping pip columns (L=10, C=15, R=20); pip rows stay in 11..28
// so they never touch the corner indices (v1 crowded the 9/10 and overlapped the "10" index).
const CARD_W = 31, CARD_H = 40;
const [L, C, R] = [10, 15, 20];
const PIPS = {
  2: [[C, 11], [C, 28]], 3: [[C, 11], [C, 20], [C, 28]], 4: [[L, 11], [R, 11], [L, 28], [R, 28]],
  5: [[L, 11], [R, 11], [C, 20], [L, 28], [R, 28]], 6: [[L, 11], [R, 11], [L, 20], [R, 20], [L, 28], [R, 28]],
  7: [[L, 11], [R, 11], [C, 15], [L, 20], [R, 20], [L, 28], [R, 28]],
  8: [[L, 11], [R, 11], [C, 15], [L, 20], [R, 20], [C, 24], [L, 28], [R, 28]],
  9: [[L, 11], [R, 11], [L, 17], [R, 17], [C, 20], [L, 22], [R, 22], [L, 28], [R, 28]],
  10: [[L, 11], [R, 11], [C, 14], [L, 17], [R, 17], [L, 22], [R, 22], [C, 25], [L, 28], [R, 28]],
};
const FACES = {
  K: ["...g.g.g.g...", "...ggggggg...", "...gGgGgGg...", "...eeeeeee...", "...ekeeeke...", "...eeeEeee...",
    "...wwwwwww...", "....wwrww....", ".....www.....", "..jjjjjjjjj..", ".jjjjgjgjjjj.", ".jjjjjgjjjjj.",
    ".jjjjgjgjjjj.", ".jjjjjjjjjjj.", ".JjjjjjjjjjJ.", ".JjjjjjjjjjJ."],
  Q: ["....hhhhh....", "...hhhhhhh...", "..hhhhhhhhh..", "..hheeeeehh..", "..hekeeekeh..", "..geeeEeeeg..",
    "..heeerreeh..", "..hheeeeehh..", "...hhjjjhh...", "..jjjjjjjjj..", ".jjjjjgjjjjj.", ".jjjjgggjjjj.",
    ".jjjjjgjjjjj.", ".jjjjjjjjjjj.", ".JjjjjjjjjjJ.", ".JjjjjjjjjjJ."],
  J: [".............", "...jjjjjjj...", "..jjjjjjjjjj.", "...eeeeeee...", "...ekeeeke...", "...eeeEeee...",
    "...eehhhee...", "....eeeee....", ".....eee.....", "..jjjjjjjjj..", ".jjjwjjjwjjj.", ".jjjjjjjjjjj.",
    ".jjjwjjjwjjj.", ".jjjjjjjjjjj.", ".JjjjjjjjjjJ.", ".JjjjjjjjjjJ."],
};
function card(rank, suit) {
  const s = SUITS[suit];
  const outfit = s.color === "red" ? { j: "red", J: "redDark" } : { j: "blue", J: "blueDark" };
  return canvas(CARD_W, CARD_H, (i) => {
    i.rect(0, 0, CARD_W, CARD_H, "cream").rect(1, CARD_H - 2, CARD_W - 2, 1, "creamDark");
    [[0, 0], [CARD_W - 1, 0], [0, CARD_H - 1], [CARD_W - 1, CARD_H - 1]].forEach(([x, y]) => i.set(x, y, null));
    const label = String(rank);
    const ink = s.color === "red" ? "red" : "ink";
    i.text(label === "10" ? "10" : label, 2, 2, ink);
    i.blit(s.small, 2, 10);
    // Bottom-right index, rotated 180 degrees.
    const idx = new Img(textWidth(label), 7).text(label, 0, 0, ink);
    for (let y = 0; y < idx.h; y++) for (let x = 0; x < idx.w; x++) { const v = idx.get(x, y); if (v) i.set(CARD_W - 3 - x, CARD_H - 3 - y, v); }
    s.small.forEach((row, y) => [...row].forEach((p, x) => p !== "." && i.set(CARD_W - 3 - x, CARD_H - 11 - y, p)));
    if (PIPS[rank]) PIPS[rank].forEach(([x, y]) => i.blit(s.small, x - 2, y - 2));
    else if (rank === "A") i.draw(suitBig(suit), 11, 15);
    else {
      i.rect(8, 9, 15, 21, outfit.J);
      i.blit(FACES[rank], 9, 12, outfit);
      i.rect(8, 9, 15, 1, "gold").rect(8, 29, 15, 1, "gold");
    }
  });
}
const cardBack = () => canvas(CARD_W, CARD_H, (i) => {
  i.rect(0, 0, CARD_W, CARD_H, "gold");
  for (let y = 2; y < CARD_H - 2; y++) for (let x = 2; x < CARD_W - 2; x++) i.set(x, y, (x + y) % 4 === 0 || (x - y + 40) % 4 === 0 ? "purpleLight" : "purple");
  [[0, 0], [CARD_W - 1, 0], [0, CARD_H - 1], [CARD_W - 1, CARD_H - 1]].forEach(([x, y]) => i.set(x, y, null));
  i.disc(15, 19, 7, "ink").draw(coin(), 9, 13);
});

// ---------- Icons, UI, FX ----------
const ICONS = {
  plinko: () => canvas(16, 16, (i) => {
    [[8, 5], [5, 9], [11, 9], [2, 13], [8, 13], [14, 13]].forEach(([x, y]) => i.ball(x, y, 1, "gold", "cream", "goldDark"));
    i.ball(8, 1, 1, "cream", "white", "creamDark");
  }),
  roulette: () => canvas(16, 16, (i) => {
    i.ring(8, 8, 4, 7, (a) => (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % 2 ? "red" : "cabinet"));
    i.ring(8, 8, 7, 7, (a) => (Math.abs(a + Math.PI / 2) < 0.3 ? "felt" : null));
    i.disc(8, 8, 3, "gold").set(7, 7, "cream").set(8, 8, "goldDark");
    i.set(13, 3, "white");
  }),
  crash: () => canvas(16, 16, (i) => i.draw(rocket(0), 3, 0)),
  blackjack: () => canvas(16, 16, (i) => {
    i.rect(0, 2, 9, 13, "cream").blit(SUITS.heart.small, 2, 6);
    i.rect(6, 0, 10, 13, "white").rect(6, 0, 1, 13, "creamDark").blit(SUITS.spade.small, 9, 4);
  }),
  river: () => canvas(16, 16, (i) => {
    i.rect(0, 10, 16, 6, "blue");
    for (let x = 0; x < 16; x += 4) i.rect(x, 10, 2, 1, "cyan");
    i.ball(8, 7, 5, "pink", "cream", "pinkDark");
    ellipse(i, 4, 7, 2, 3, "pinkDark");
    i.set(10, 6, "ink").line(13, 8, 14, 12, "pink");
  }),
  horse: () => canvas(16, 16, (i) => {
    i.blit([
      "......hh.h......", ".....hhhhh......", "....hhhkhhh.....", "...hhhhhhhhh....", "..hhhhhhhhhhh...",
      ".hhhhhh..hhhhh..", "hhhhH.....hhhh..", ".hH.......hhhh..", "..........hhhH..", "..........hhhH..",
      ".........hhhhH..", "........hhhhhH..",
    ], 0, 2);
    i.recolor((k, x, y) => (k === "h" && x < 5 && y > 6 ? "brownDark" : k));
    i.line(9, 3, 12, 11, "brownDark");
  }),
  // Review v1 (stacked chips) read as a hamburger; v2 is a price tag.
  shop: () => canvas(16, 16, (i) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = x + y; // diagonal tag, point at top-left
      if (d >= 6 && d <= 24 && Math.abs(x - y) <= 6) i.set(x, y, Math.abs(x - y) === 6 || d === 24 ? "goldDark" : "gold");
    }
    i.disc(5, 5, 1, "cabinet").line(5, 4, 1, 0, "cream");
    i.text("$", 8, 6, "orangeDark");
  }),
};

const UI = {
  bag: () => grid([
    ".....HHHH.....", "....H....H....", "...H......H...", "..hhhhhhhhhh..", ".hhhhhhhhhhhh.", ".hHHHHHHHHHHh.",
    ".hhhhhggghhhh.", ".hehhhgkghhhh.", ".hehhhggghhHh.", ".hehhhhhhhhHh.", ".hhhhhhhhhhHh.", ".HHHHHHHHHHHH.",
  ]),
  flame: (f) => {
    const tips = [["....o....", "...oo....", "...ooo...", "..oogo..."], [".....o...", "....oo...", "...ooo...", "..ogoo..."], ["...o.....", "...oo....", "...ooo...", "...ogoo.."]][f];
    return grid([...tips, "..ogggo..", ".oogwgoo.", ".ogwwwgo.", "oogwwwgoo", "ogwwwwwgo", ".ogwwwgo.", "..rooor..", "...rrr..."]);
  },
  // Sized to Plinko physics at 2x: peg 7px outlined -> 14px (physics r 6.5); ball 9px -> 18px (physics r 9).
  peg: () => canvas(5, 5, (i) => i.ball(2, 2, 2, "gold", "cream", "goldDark")),
  ball: () => canvas(7, 7, (i) => i.ball(3, 3, 3, "cream", "white", "creamDark")),
  pointer: () => grid(["ggggggg", "gccccCg", ".gcccg.", ".gccCg.", "..gcg..", "..gCg..", "...g..."]),
  timer: () => canvas(12, 12, (i) => {
    i.disc(6, 6, 5, "cream").ring(6, 6, 5, 5, "cyanDark").line(6, 6, 6, 2, "ink").line(6, 6, 9, 6, "ink");
    i.rect(5, 0, 3, 1, "cyanDark");
  }),
  goalFlag: () => grid(["kggggg", "kgGggg", "kggggG", "kgggg.", "k.....", "k.....", "k.....", "kk...."]),
};

const FX = {
  coin: () => coin(),
  chip: (c = "red") => canvas(10, 10, (i) => {
    i.disc(5, 5, 4, c);
    i.ring(5, 5, 4, 4, (a) => (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2 ? "white" : null));
    i.disc(5, 5, 2, c === "red" ? "redDark" : c === "cyan" ? "cyanDark" : "goldDark").set(4, 4, "white");
  }),
  sparkle: () => grid(["...w...", "...c...", "..ccc..", "wcwwwcw", "..ccc..", "...c...", "...w..."]),
  star: () => grid(["....g....", "....g....", "...ggg...", "..gwwwg..", "gggwwwggg", "..gwwwg..", "...ggg...", "....g....", "....g...."]),
  confetti: () => canvas(15, 3, (i) => ["red", "cyan", "gold", "green", "pink"].forEach((c, n) => i.rect(n * 3, 0, 2, 3, c))),
  // Per-game particle kits (gauntlet iteration 2): each game celebrates with its own debris.
  droplet: () => grid(["..c..", ".cc..", ".cwc.", "cccbc", "cbbbc", ".bbb."]),
  minicard: () => grid(["eeeeee", "errree", "errrre", "eerrre", "eeeree", "eeeeee", "EEEEEE"]),
  shoe: () => grid(["gg..gg", "gG..gG", "gg..gg", "gg..gg", ".gggg.", "..GG.."]),
};

// ---------- Words (popups) + logo, drawn with the pixel font ----------
const WORDS = {
  nice: ["NICE!", "green"], great: ["GREAT!", "cyan"], bigwin: ["BIG WIN!", "gold"], jackpot: ["JACKPOT!", "gold"],
  goal: ["GOAL!", "gold"], allin: ["ALL IN!", "orange"], onfire: ["ON FIRE!", "orange"], lucky: ["LUCKY!", "green"],
  bust: ["BUST!", "red"], crashed: ["CRASHED!", "red"], splash: ["SPLASH!", "red"], miss: ["MISS", "red"],
  push: ["PUSH", "cream"], soldout: ["SOLD OUT", "red"], blackjack: ["BLACKJACK!", "gold"], bonus: ["BONUS!", "purpleLight"],
  // End-of-run headings (gauntlet iteration 5)
  goalhit: ["GOAL HIT!", "gold"], gameover: ["GAME OVER", "red"], lastchance: ["LAST CHANCE", "orange"], cashedout: ["CASHED OUT!", "green"],
};
const RAMP = {
  green: ["white", "green", "green", "greenDark"], cyan: ["white", "cyan", "cyan", "cyanDark"],
  gold: ["cream", "gold", "gold", "orange"], orange: ["gold", "orange", "orange", "orangeDark"],
  red: ["redLight", "red", "red", "redDark"], cream: ["white", "cream", "cream", "creamDark"],
  purpleLight: ["white", "purpleLight", "purpleLight", "purple"],
};
function word(text, color, scale = 2) {
  const ramp = RAMP[color];
  const img = new Img(textWidth(text, scale) + 2, 7 * scale + 2);
  img.text(text, 1, 1, "white", scale);
  img.recolor((k, x, y) => ramp[Math.min(3, Math.floor(((y - 1) / (7 * scale)) * 4))]);
  return img.padded(2).outline("ink", true).outline("ink").shadow(1, 2);
}
function logo() {
  const top = word("CASINO", "gold", 3), bottom = word("RUN", "red", 4);
  const img = new Img(Math.max(top.w, bottom.w) + 12, top.h + bottom.h - 2);
  img.draw(top, Math.floor((img.w - top.w) / 2), 0).draw(bottom, Math.floor((img.w - bottom.w) / 2), top.h - 2);
  img.draw(FX.star(), 0, top.h - 6).draw(FX.sparkle(), img.w - 8, 2);
  return img;
}

// ---------- Environment: playfield tiles, cabinet frames, marquee bulbs (gauntlet iteration 1) ----------
// Tiles repeat seamlessly (patterns use x/y modulo the tile size); frames are 24x24 9-slice images
// (8px slices) for CSS border-image. Deterministic LCG keeps scattered details reproducible.
const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const TILES = {
  cabinet: () => canvas(32, 32, (i) => {
    i.rect(0, 0, 32, 32, "cabinet");
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x + y) % 16 === 0 || (x - y + 32) % 16 === 0) i.set(x, y, "panel");
    [[8, 0], [24, 16], [8, 16], [24, 0]].forEach(([x, y]) => i.set(x, y + 8, "panelHi"));
  }),
  plate: () => canvas(32, 32, (i) => {
    i.rect(0, 0, 32, 32, "panel").rect(0, 0, 32, 1, "panelHi").rect(0, 0, 1, 32, "panelHi").rect(0, 31, 32, 1, "ink").rect(31, 0, 1, 32, "ink");
    for (let y = 4; y < 28; y += 3) for (let x = 3 + (y % 2); x < 29; x += 6) i.set(x, y, "cabinet");
    [[3, 3], [28, 3], [3, 28], [28, 28]].forEach(([x, y]) => i.set(x, y, "grey").set(x + 1, y, "greyDark").set(x, y + 1, "greyDark").set(x - 1, y - 1, "panelHi"));
  }),
  water: () => canvas(32, 16, (i) => {
    i.rect(0, 0, 32, 16, "blue");
    for (let x = 0; x < 32; x++) {
      const c1 = 3 + Math.round(Math.sin((x / 32) * Math.PI * 2) * 1.2), c2 = 11 + Math.round(Math.sin((x / 32) * Math.PI * 2 + 2) * 1.2);
      i.set(x, c1, "cyan").set(x, c1 + 1, "blueDark").set(x, c2, "cyanDark").set(x, c2 + 1, "blueDark");
    }
    [[5, 2], [21, 10], [13, 7]].forEach(([x, y]) => i.set(x, y, "white"));
  }),
  turf: () => canvas(32, 32, (i) => {
    const r = lcg(7);
    for (let x = 0; x < 32; x++) i.rect(x, 0, 1, 32, Math.floor(x / 8) % 2 ? "felt" : "greenDark");
    for (let k = 0; k < 40; k++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 31); i.set(x, y, "green").set(x, y + 1, Math.floor(x / 8) % 2 ? "greenDark" : "felt"); }
  }),
  velvet: () => canvas(32, 32, (i) => {
    i.rect(0, 0, 32, 32, "redDark");
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x + y) % 16 === 0 || (x - y + 32) % 16 === 0) i.set(x, y, "red");
    [[0, 0], [16, 16], [16, 0], [0, 16]].forEach(([x, y]) => i.set(x, y, "gold").set((x + 1) % 32, y, "goldDark"));
  }),
  felt: () => canvas(16, 16, (i) => {
    i.rect(0, 0, 16, 16, "felt");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x * 3 + y * 5) % 11 === 0) i.set(x, y, "greenDark");
  }),
  stars: () => canvas(64, 64, (i) => {
    const r = lcg(42);
    i.rect(0, 0, 64, 64, "cabinet");
    for (let k = 0; k < 26; k++) i.set(Math.floor(r() * 64), Math.floor(r() * 64), ["panelHi", "purpleLight", "cyan", "white"][k % 4]);
    [[12, 40], [48, 14]].forEach(([x, y]) => i.set(x, y, "white").set(x - 1, y, "cyan").set(x + 1, y, "cyan").set(x, y - 1, "cyan").set(x, y + 1, "cyan"));
  }),
};
const FRAME_ACCENTS = { plinko: "orange", roulette: "red", crash: "cyan", blackjack: "gold", river: "pink", horse: "green", shop: "purpleLight" };
const frame = (accent) => canvas(24, 24, (i) => {
  const ring = (d, c) => { i.rect(d, d, 24 - 2 * d, 1, c).rect(d, 23 - d, 24 - 2 * d, 1, c).rect(d, d, 1, 24 - 2 * d, c).rect(23 - d, d, 1, 24 - 2 * d, c); };
  ring(0, "ink"); ring(1, "grey"); ring(2, "greyDark"); ring(3, accent); ring(4, accent); ring(5, "ink");
  i.rect(1, 1, 22, 1, "white").rect(1, 1, 1, 22, "grey"); // top-left light on the metal
  [[2, 2], [19, 2], [2, 19], [19, 19]].forEach(([x, y]) => i.rect(x, y, 3, 3, "gold").set(x, y, "cream").set(x + 2, y + 2, "goldDark"));
});
const bulb = () => [canvas(7, 7, (i) => { i.ball(3, 3, 2, "gold", "white", "orange"); }), canvas(7, 7, (i) => { i.ball(3, 3, 2, "brownDark", "brown", "ink"); })];

// ---------- Iteration 3: roulette bowl + hub, "Dice" the host ----------
// Bowl: static wooden ring with gold diamond deflectors that sits around the spinning canvas wheel.
// 164x164 at 1x, shown at 2x around the 300px wheel (inner radius 75 -> 150px at 2x).
const rouletteBowl = () => canvas(164, 164, (i) => {
  const c = 82;
  i.ring(c, c, 75, 81, (a, d) => (d > 80 ? "brownDark" : d < 76.5 ? "goldDark" : Math.sin(a * 37) > 0.6 ? "orange" : "brown"));
  i.ring(c, c, 78, 78, (a) => (Math.sin(a + 0.8) < -0.6 ? "creamDark" : null));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8, x = Math.round(c + Math.cos(a) * 78), y = Math.round(c + Math.sin(a) * 78);
    i.blit(["..g..", ".gwg.", "gwggG", ".gGG.", "..G.."], x - 2, y - 2);
  }
});
// Hub turret drawn at the wheel centre (rotates with it): gold dome + 4 spokes.
const rouletteHub = () => canvas(40, 40, (i) => {
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    i.line(20, 20, Math.round(20 + Math.cos(a) * 18), Math.round(20 + Math.sin(a) * 18), "goldDark");
    i.ball(Math.round(20 + Math.cos(a) * 18), Math.round(20 + Math.sin(a) * 18), 2, "gold", "cream", "goldDark");
  }
  i.ball(20, 20, 9, "gold", "cream", "goldDark").ring(20, 20, 6, 6, "goldDark").ball(20, 20, 3, "red", "redLight", "redDark");
});

// "Dice", the host: a die-headed showman (original). Frames: 0 idle, 1 cheer, 2 sweat.
function host(mood) {
  return canvas(22, 26, (i) => {
    i.rect(7, 0, 8, 4, "gold").rect(7, 3, 8, 1, "red").rect(5, 4, 12, 1, "goldDark").set(8, 1, "cream");
    i.rect(5, 5, 12, 9, "cream").rect(16, 5, 1, 9, "creamDark").rect(5, 13, 12, 1, "creamDark").rect(5, 5, 11, 1, "white");
    i.rect(8, 8, 2, 2, "ink").rect(13, 8, 2, 2, "ink");
    if (mood === 0) i.rect(9, 11, 4, 1, "ink").set(8, 10, "ink").set(13, 10, "ink");
    if (mood === 1) i.rect(9, 10, 4, 3, "ink").rect(10, 11, 2, 1, "red");
    if (mood === 2) { i.rect(9, 11, 4, 1, "ink").set(8, 12, "ink").set(13, 12, "ink").set(7, 7, "ink").set(15, 7, "ink"); i.set(18, 6, "cyan").set(18, 7, "cyan").set(17, 7, "white"); }
    i.rect(8, 14, 2, 2, "red").rect(10, 14, 2, 2, "redDark").rect(12, 14, 2, 2, "red");
    i.rect(6, 16, 10, 7, "purple").rect(9, 16, 1, 3, "purpleLight").rect(12, 16, 1, 3, "purpleLight").set(10, 19, "gold").set(10, 21, "gold");
    if (mood === 1) {
      i.rect(3, 10, 2, 7, "purple").rect(17, 10, 2, 7, "purple").rect(3, 8, 2, 2, "cream").rect(17, 8, 2, 2, "cream");
      i.set(1, 5, "gold").set(20, 4, "gold").set(0, 6, "white");
    } else {
      i.rect(4, 16, 2, 6, "purple").rect(16, 16, 2, 6, "purple").rect(4, 22, 2, 1, "cream").rect(16, 22, 2, 1, "cream");
    }
    i.rect(7, 23, 3, 2, "greyDark").rect(12, 23, 3, 2, "greyDark");
  });
}

// ---------- Registry ----------
const one = (fn) => () => [fn()];
const HORSE_SILKS = ["red", "cyan", "gold", "green"];
export const SPRITES = [
  ...Object.entries(ITEMS).map(([id, fn]) => ({ id: `items/${id}`, group: "items", game: "shop", frames: one(fn) })),
  { id: "river/elephant", group: "characters", game: "river", frames: () => [elephant(0), elephant(1)], fps: 6 },
  { id: "river/croc", group: "hazards", game: "river", frames: () => [croc(0), croc(1)], fps: 4 },
  { id: "river/log", group: "hazards", game: "river", frames: () => [log(0), log(1)], fps: 4 },
  { id: "river/boat", group: "hazards", game: "river", frames: () => [boat(0), boat(1)], fps: 4 },
  { id: "river/canoe", group: "hazards", game: "river", frames: () => [canoe(0), canoe(1)], fps: 4 },
  ...HORSE_SILKS.map((silk, n) => ({ id: `horse/horse-${n}`, group: "characters", game: "horse", frames: () => [3, 0, 2, 1].map((f) => horse(f, silk)), fps: 10 })),
  { id: "crash/rocket", group: "characters", game: "crash", frames: () => [rocket(0), rocket(1)], fps: 12 },
  ...["heart", "diamond", "spade", "club"].flatMap((suit) =>
    ["A", 2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K"].map((rank) => ({ id: `cards/${rank}-${suit}`, group: "cards", game: "blackjack", frames: one(() => card(rank, suit)), outline: true }))),
  { id: "cards/back", group: "cards", game: "blackjack", frames: one(cardBack) },
  ...Object.entries(ICONS).map(([id, fn]) => ({ id: `icons/${id}`, group: "icons", game: id, frames: one(fn) })),
  ...Object.entries(UI).filter(([id]) => id !== "flame").map(([id, fn]) => ({ id: `ui/${id}`, group: "ui", game: "shared", frames: one(fn) })),
  { id: "ui/flame", group: "ui", game: "shared", frames: () => [UI.flame(0), UI.flame(1), UI.flame(2)], fps: 8 },
  { id: "fx/coin", group: "fx", game: "shared", frames: one(FX.coin) },
  { id: "fx/coin-heads", group: "fx", game: "shared", frames: one(() => flipCoin(COIN_HEADS)) },
  { id: "fx/coin-tails", group: "fx", game: "shared", frames: one(() => flipCoin(COIN_TAILS)) },
  ...["red", "gold", "cyan"].map((c) => ({ id: `fx/chip-${c}`, group: "fx", game: "shared", frames: one(() => FX.chip(c)) })),
  { id: "fx/sparkle", group: "fx", game: "shared", frames: one(FX.sparkle), outline: false },
  { id: "fx/star", group: "fx", game: "shared", frames: one(FX.star) },
  { id: "fx/confetti", group: "fx", game: "shared", frames: one(FX.confetti), outline: false },
  { id: "fx/droplet", group: "fx", game: "river", frames: one(FX.droplet) },
  { id: "fx/minicard", group: "fx", game: "blackjack", frames: one(FX.minicard) },
  { id: "fx/shoe", group: "fx", game: "horse", frames: one(FX.shoe) },
  ...Object.entries(WORDS).map(([id, [text, color]]) => ({ id: `words/${id}`, group: "words", game: "shared", frames: one(() => word(text, color)), outline: false, label: text })),
  { id: "ui/logo", group: "ui", game: "shared", frames: one(logo), outline: false },
  ...Object.entries(TILES).map(([id, fn]) => ({ id: `tiles/${id}`, group: "tiles", game: "shared", frames: one(fn), outline: false })),
  ...Object.entries(FRAME_ACCENTS).map(([game, accent]) => ({ id: `frames/${game}`, group: "frames", game, frames: one(() => frame(accent)), outline: false })),
  { id: "ui/bulb", group: "ui", game: "shared", frames: bulb, outline: false, fps: 4 },
  { id: "roulette/bowl", group: "environment", game: "roulette", frames: one(rouletteBowl), outline: false },
  { id: "roulette/hub", group: "environment", game: "roulette", frames: one(rouletteHub) },
  { id: "characters/host", group: "characters", game: "shared", frames: () => [host(0), host(1), host(2)], fps: 0 },
];
