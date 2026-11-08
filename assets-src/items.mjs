// Shop item icons, v2 (24x24). v1 (16x16) was too small and several didn't look like their name
// (a flower for the Hula Girl, a ring buoy for Floaties, an hourglass for Time in a Bottle,
// an oil drum for Grease Fire). Rule for v2: draw the literal object the name describes.
import { Img } from "../tools/sprite-generator/raster.mjs";

const S = 24;
const canvas = (fn) => { const i = new Img(S, S); fn(i); return i; };
const grid = (rows) => {
  const w = rows[0].length;
  rows.forEach((r, n) => { if (r.length !== w) throw new Error(`item grid row ${n} is ${r.length} wide, expected ${w}: "${r}"`); });
  return new Img(w, rows.length).blit(rows);
};
const place = (i, g, x, y) => i.draw(g, x ?? Math.floor((S - g.w) / 2), y ?? Math.floor((S - g.h) / 2));
const ellipse = (i, cx, cy, rx, ry, colorAt) => {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.05) i.set(cx + x, cy + y, typeof colorAt === "function" ? colorAt(x, y) : colorAt);
  }
};
// Flat coin (no shading inside the rim) so the head silhouette reads at 1x.
const coinFace = (i, cx, cy, r, flip) => {
  i.disc(cx, cy, r, "goldDark");
  i.disc(cx, cy, r - 1, "gold");
  i.ring(cx, cy, r - 1, r - 1, (a) => (Math.sin(a + 0.8) < -0.5 ? "cream" : null));
  const head = ["..kkk..", ".kkkkk.", ".kkkkkk", ".kkkkk.", "..kkkk.", "..kkk..", ".kkkkk.", "kkkkkkk"];
  i.blit(flip ? head.map((row) => [...row].reverse().join("")) : head, cx - 3, cy - 4);
};

export const ITEMS = {
  // Two separate coins, BOTH heads (facing each other): "double-headed". v2 overlapped them into a blob.
  doubleHeadedCoin: () => canvas((i) => {
    coinFace(i, 6, 12, 6, false);
    coinFace(i, 18, 12, 6, true);
  }),

  // Dashboard hula doll: hair flower, lei, coconut top, grass skirt, spring base.
  luckyHulaGirl: () => canvas((i) => place(i, grid([
    "......HHHH......", ".....HHHHHHi....", "....HHHHHHiwi...", "....HHEEEEHi....", "....HEkEEkEH....",
    "....HEEEEEEH....", "....HHErrEHH....", ".....HEEEEH.....", "...iniininini...", ".EEEEEEEEEEEEEE.",
    "....EhhEEhhE....", ".....EEEEEE.....", "....gggggggg....", "...nNnNnNnNnN...", "...nNnNnNnNnN...",
    "..nNnNnNnNnNnN..", "..nNnNnNnNnNnN..", "..nNnNnNnNnNnN..", ".....EE..EE.....", ".....EE..EE.....",
    "..gggggggggggg..", "..GGGGGGGGGGGG..",
  ]), 4, 1)),

  // Corked glass bottle with a clock inside.
  timeBottle: () => canvas((i) => {
    place(i, grid([
      ".....hhhh.....", ".....hHhh.....", ".....CccC.....", ".....CwcC.....", "....CCccCC....", "...CwccccCC...",
      "..CwccccccCC..", ".CwcccccccCBC.", ".CwcccccccCBC.", ".CwcccccccCBC.", ".CwcccccccCBC.", ".CwcccccccCBC.",
      ".CwcccccccCBC.", ".CwcccccccCBC.", ".CwcccccccCBC.", ".CwcccccccCBC.", ".CwcccccccCBC.", ".CwcccccccCBC.",
      ".CccccccccCBC.", ".CBBBBBBBBBBC.", "..CCCCCCCCCC..",
    ]), 5, 1);
    i.disc(12, 14, 4, "cream").ring(12, 14, 4, 4, "goldDark");
    [[12, 10], [16, 14], [12, 18], [8, 14]].forEach(([x, y]) => i.set(x, y, "ink"));
    i.line(12, 14, 12, 11, "ink").line(12, 14, 14, 14, "red");
  }),

  // Horseshoe magnet pulling a roulette ball, with field sparks.
  rouletteMagnet: () => canvas((i) => {
    i.ring(10, 10, 4, 9, (a, d) => (Math.sin(a) > 0.05 ? null : d > 8 ? "redDark" : d < 5 ? "redLight" : "red"));
    [[1, "red"], [15, "red"]].forEach(([x]) => {
      i.rect(x, 10, 5, 9, "red").rect(x, 10, 1, 9, "redLight").rect(x + 4, 10, 1, 9, "redDark");
      i.rect(x, 17, 5, 4, "grey").rect(x, 17, 1, 4, "white");
    });
    i.ball(20, 3, 2, "cream", "white", "creamDark");
    i.set(17, 6, "cyan").set(18, 7, "cyan").set(22, 7, "cyan").set(15, 3, "cyan");
  }),

  // Two inflatable arm bands.
  frogSneakers: () => canvas((i) => {
    const band = (x, y) => {
      for (let yy = 0; yy < 15; yy++) for (let xx = 0; xx < 10; xx++) {
        const corner = (xx < 2 || xx > 7) && (yy < 2 || yy > 12) && !((xx === 1 || xx === 8) && (yy === 1 || yy === 13));
        if (corner) continue;
        i.set(x + xx, y + yy, xx < 2 ? "gold" : xx > 7 ? "orangeDark" : "orange");
      }
      i.rect(x, y + 7, 10, 1, "gold");
      ellipse(i, x + 5, y + 7, 2, 4, "cabinet");
      i.rect(x + 7, y - 1, 2, 2, "cream");
    };
    band(12, 2);
    band(2, 7);
  }),

  // Ticket stamped "50%" (refunds half a lost bet).
  insuranceTicket: () => canvas((i) => {
    i.rect(0, 5, 24, 14, "cream").rect(0, 17, 24, 2, "creamDark");
    [[0, 11], [0, 12], [23, 11], [23, 12]].forEach(([x, y]) => i.set(x, y, null));
    i.rect(1, 5, 4, 14, "red").set(1, 11, null).set(1, 12, null);
    for (let y = 6; y < 19; y += 2) i.set(6, y, "creamDark");
    i.text("50%", 7, 8, "redDark");
    i.rect(8, 16, 13, 1, "red");
  }),

  // Teacup of murky tea with green stink lines and a fly.
  filthTea: () => canvas((i) => {
    [[7, 1], [11, 0], [15, 1]].forEach(([x, y]) => {
      for (let k = 0; k < 7; k++) i.set(x + (k % 4 < 2 ? 0 : 1), y + k, "green");
    });
    i.blit(["kk", "wk"], 19, 3);
    ellipse(i, 11, 11, 9, 2, "cream");
    ellipse(i, 11, 11, 7, 1, (x) => (x % 3 === 0 ? "brownDark" : "greenDark"));
    for (let y = 13; y < 19; y++) {
      const inset = Math.max(0, y - 15);
      i.rect(2 + inset, y, 18 - inset * 2, 1, "cream").set(2 + inset, y, "white").set(19 - inset, y, "creamDark");
    }
    i.ring(21, 15, 2, 3, (a) => (Math.cos(a) > -0.2 ? "creamDark" : null));
    i.rect(0, 20, 22, 2, "grey").rect(2, 22, 18, 1, "greyDark");
  }),

  // Lit match (diagonal stick, red head, flame).
  luckyMatch: () => canvas((i) => {
    for (let k = 0; k < 13; k++) { i.set(6 + k, 20 - k, "creamDark"); i.set(7 + k, 20 - k, "brown"); }
    i.ball(18, 8, 2, "red", "redLight", "redDark");
    place(i, grid(["...o...", "..oo...", "..ogo..", ".oggo..", ".ogwgo.", "oggwgo.", ".oggo..", "..oo..."]), 15, 0);
  }),

  // Heater shield with a flame emblem.
  heatShield: () => canvas((i) => place(i, grid([
    "gggggggggggggggggg", "gwbbbbbbbbbbbbbbBg", "gbbbbbbbobbbbbbbBg", "gbbbbbbbobbbbbbbBg", "gbbbbbbooobbbbbbBg",
    "gbbbbbboggobbbbbBg", "gbbbbbogggoobbbbBg", "gbbbbooggwgobbbbBg", "gbbbboggwwgoobbbBg", "gbbbbogwwwwgobbbBg",
    "gbbbboogwwgoobbbBg", "gbbbbbooggoobbbbBg", ".gbbbbbooooobbbBg.", ".gbbbbbbbbbbbbbBg.", "..gbbbbbbbbbbbBg..",
    "...gbbbbbbbbbBg...", "....gbbbbbbbBg....", ".....gbbbbbBg.....", "......gbbbBg......", ".......gbBg.......",
    "........gg........",
  ]))),

  // Frying pan with grease flames.
  greaseFire: () => canvas((i) => {
    place(i, grid([
      "......o.......o...", ".....oo...o..oo...", "....ogo..oo..ogo..", "...oggo.ogo.oggo..", "..oggwgoggooggwgo.",
      "..ogwwgogwwgogwwgo", ".oogwwgggwwgggwgoo", ".oggwwwggwwwgwwggo",
    ]), 4, 0);
    ellipse(i, 13, 13, 9, 3, (x, y) => (y < 0 ? "greyDark" : "grey"));
    ellipse(i, 13, 13, 7, 2, (x) => (Math.abs(x) % 4 === 1 ? "gold" : "orangeDark"));
    for (let y = 14; y < 18; y++) i.rect(5 + (y - 14), y, 17 - (y - 14) * 2, 1, y === 17 ? "cabinet" : "greyDark");
    i.line(4, 14, 0, 16, "brownDark").line(4, 15, 0, 17, "brown");
  }),

  // Scissors snipping the corner off a gold goal flag.
  goalCutter: () => canvas((i) => {
    i.rect(2, 1, 1, 22, "greyDark");
    i.blit(["ggggggggggg", "gcccgggggGG", "ggggggggggG", "gggggggggG.", "ggggggggG..", "gGGGGGG...."], 3, 1);
    i.text("$", 6, 1, "goldDark");
    i.line(10, 8, 21, 19, "grey").line(11, 8, 21, 18, "white");
    i.line(21, 8, 10, 19, "grey").line(20, 8, 10, 18, "white");
    i.ring(9, 20, 2, 3, "red").ring(21, 20, 2, 3, "red");
    i.set(15, 13, "ink").set(16, 14, "ink");
  }),

  // Face-down card with an eye peeking over its top edge.
  dealerPeek: () => canvas((i) => {
    i.rect(4, 6, 16, 18, "purple");
    for (let y = 8; y < 22; y++) for (let x = 6; x < 18; x++) if ((x + y) % 4 === 0) i.set(x, y, "purpleLight");
    i.rect(4, 6, 16, 1, "gold").rect(4, 23, 16, 1, "goldDark").rect(4, 6, 1, 18, "gold").rect(19, 6, 1, 18, "goldDark");
    i.blit(["....wwwww....", "..wwwcccww...", ".wwwccckcwww.", "wwwwcccccwwww", ".wwwwcccwwww.", "...wwwwwww..."], 6, 1);
  }),

  goldenHorseshoe: () => canvas((i) => {
    i.ring(12, 10, 4, 10, (a, d) => (Math.sin(a) < -0.05 ? null : d > 9 ? "goldDark" : d < 5 ? "cream" : "gold"));
    [2, 17].forEach((x) => i.rect(x, 0, 6, 10, "gold").rect(x, 0, 1, 10, "cream").rect(x + 5, 0, 1, 10, "goldDark"));
    [[4, 3], [4, 8], [19, 3], [19, 8], [6, 16], [18, 16], [12, 19]].forEach(([x, y]) => i.set(x, y, "brownDark"));
    i.set(3, 1, "white").set(9, 17, "white");
  }),

  // Kettlebell: a heavy ball with a handle, "10" stamped on it.
  weightedBall: () => canvas((i) => {
    i.ring(12, 6, 3, 6, (a) => (Math.sin(a) > 0.35 ? null : "greyDark"));
    i.ball(12, 15, 8, "greyDark", "grey", "cabinet");
    i.text("10", 7, 12, "gold");
    i.set(7, 10, "white").set(8, 9, "white");
  }),

  // Coupon with a dashed cut line, "5%" and a return arrow.
  cashbackCoupon: () => canvas((i) => {
    i.rect(0, 4, 24, 16, "green").rect(1, 5, 22, 14, "cream");
    for (let x = 1; x < 23; x += 2) { i.set(x, 5, "greenDark"); i.set(x, 18, "greenDark"); }
    for (let y = 5; y < 19; y += 2) { i.set(1, y, "greenDark"); i.set(22, y, "greenDark"); }
    i.text("5%", 3, 8, "greenDark");
    // Return arrow kept clear of the "%" (it touched it in v2 and read as "5/0").
    i.ring(18, 12, 2, 3, (a) => (a > -2.4 && a < 1.4 ? "green" : null));
    i.blit(["n..", "nn.", "nnn"], 15, 13);
  }),

  thottiesJesterHat: () => canvas((i) => place(i, grid([
    "g..........g..........g.", "gg........ggg........gg.", ".pp.......rrr.......pp..", ".ppp......rrr......ppp..",
    "..ppp.....rlr.....ppp...", "..pPpp....rlr....ppPp...", "...pPpp..rrlrr..ppPp....", "...ppPpp.rrrrr.ppPpp....",
    "....ppPpprrrrrrpPpp.....", "....pppPprrrrrrPppp.....", ".....ppppprrrrrppp......", "...ggggggggggggggggg....",
    "...gGgGgGgGgGgGgGgGg....", "...GGGGGGGGGGGGGGGGG....",
  ]), 1, 5)),

  // Framed rose painting on an easel.
  roseKatMagnumOpus: () => canvas((i) => {
    i.line(5, 23, 8, 15, "brown").line(18, 23, 15, 15, "brown").line(12, 23, 12, 17, "brownDark");
    i.rect(2, 0, 20, 17, "gold").rect(3, 1, 18, 15, "goldDark").rect(4, 2, 16, 13, "blueDark");
    for (let x = 4; x < 20; x++) i.set(x, 12 + (x % 3 === 0 ? 0 : 1), "felt");
    i.line(12, 8, 12, 14, "greenDark").set(13, 11, "green").set(14, 10, "green").set(11, 12, "green");
    i.ball(12, 6, 3, "red", "redLight", "redDark").set(12, 6, "redDark").set(11, 5, "redDark").set(13, 7, "redDark");
    [[2, 0], [21, 0], [2, 16], [21, 16]].forEach(([x, y]) => i.set(x, y, "cream"));
  }),

  ejmRecordVinyl: () => canvas((i) => {
    i.disc(12, 12, 11, "cabinet");
    [9, 7, 5].forEach((r) => i.ring(12, 12, r, r, "panel"));
    i.ring(12, 12, 10, 10, (a) => (a < -1.7 && a > -2.9 ? "panelHi" : null));
    i.ring(12, 12, 8, 8, (a) => (a < -1.9 && a > -2.6 ? "panelHi" : null));
    i.disc(12, 12, 3, "red").set(12, 12, "ink").set(11, 11, "redLight");
    i.text("EJM", 7, 0, "gold");
  }),
};
