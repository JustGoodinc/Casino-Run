// The six minigames: rules (via rules.c), item hooks (script.js), top-screen playfield and the
// bottom-screen action area. Every outcome is rolled up front by the rules RNG; animation only
// shows the result that was already decided.
#include <math.h>
#include <stdio.h>
#include <string.h>
#include "app.h"

#define TAU 6.2831853f
#define PI 3.1415927f
static cr_rng VIS; // visual-only randomness, so animation never shifts the outcome stream
static int tapA, tapB;
static float vis(void) { return (float)cr_rand(&VIS); }

enum { BTN_A = 1, BTN_B = 2 };

int gameBusy(void) {
  return G.dropping || G.flying || G.crossing || G.spin || G.race || (G.phase >= 1 && G.phase <= 4 && G.phase != 3);
}
// Tabs, bets and the shop stay usable unless a round is in motion.
int gameLocksTabs(void) { return gameBusy(); }

void gamesReset(void) {
  int deckLeft = G.deckLeft, deck[52];
  memcpy(deck, G.deck, sizeof deck);
  memset(&G, 0, sizeof G);
  memcpy(G.deck, deck, sizeof deck);
  G.deckLeft = deckLeft;
  G.lastSlot = -1; G.colour = CR_RED; G.result = -1; G.winner = -1; G.mult = 1;
  tapA = tapB = 0;
  static int seeded;
  if (!seeded) { cr_seed(&VIS, (u32)osGetTime() ^ 0x9E3779B9u); seeded = 1; }
}

static int takeBet(void) {
  if (A.bet < 1 || A.balance < A.bet) { sfx("ui_nofunds"); toast("NOT ENOUGH MONEY"); return 0; }
  stakeTaken(A.bet);
  return 1;
}

// ======================= PLINKO =======================
#define ROWS 7
#define ROW_FRAMES 13
static float pegX(int r, int i) { return 200 + (i - (r + 1) / 2.0f) * 34; }
static float rowY(int r) { return 20 + r * 22; }
static float slotX(int k) { return 40 + (k + 0.5f) * 64; }
static int path[ROWS], pathStep, pegHitR = -1, pegHitI, pegHitT;

static void plinkoStart(void) {
  if (!takeBet()) return;
  G.target = cr_roll_plinko_slot(&RNG);
  if (A.weighted > 0) { G.target = G.target + 1 + cr_rand_int(&RNG, 2); if (G.target > 4) G.target = 4; A.weighted--; }
  // Seven peg bounces of +-17 px; pick a shuffled left/right path that ends nearest the rolled slot.
  float want = (slotX(G.target) - 200) / 17.0f;
  int n = (int)lroundf(want);
  if ((n & 1) == 0) n += want > n ? 1 : -1;
  if (n > 7) n = 7;
  if (n < -7) n = -7;
  int rights = (7 + n) / 2;
  for (int i = 0; i < ROWS; i++) path[i] = i < rights;
  for (int i = ROWS - 1; i > 0; i--) { int j = (int)(vis() * (i + 1)), t = path[i]; path[i] = path[j]; path[j] = t; }
  G.dropping = 1; G.lastRow = 0; pathStep = 0;
  G.ballX = 200; G.ballY = -6; G.ballVX = 0;
}

static void plinkoUpdate(u32 down) {
  if (G.slotFlash > 0) G.slotFlash--;
  if (pegHitT > 0) pegHitT--;
  if (!G.dropping) { if (down & KEY_A) { pressFlash(BTN_A); plinkoStart(); } return; }
  // Entry fall onto the top peg, then one bounce arc per row, then the drop into the slot.
  int f = G.dropping++;
  if (f < 10) { G.ballX = 200; G.ballY = -6 + (rowY(1) - 6 + 6) * (f / 10.0f) * (f / 10.0f); return; }
  int seg = (f - 10) / ROW_FRAMES, t = (f - 10) % ROW_FRAMES;
  if (seg < ROWS) {
    if (t == 0) { // hit the peg at row seg+1
      int r = seg + 1, off = 0;
      for (int k = 0; k < seg; k++) off += path[k] ? 1 : -1;
      pegHitR = r; pegHitI = (int)lroundf((200 + off * 17 - pegX(r, 0)) / 34); pegHitT = 8;
      char name[20];
      snprintf(name, sizeof name, "plinko_peg_%d", 1 + (int)(vis() * 8));
      sfxPitch(name, 0.9f + vis() * 0.25f);
    }
    int off = 0;
    for (int k = 0; k < seg; k++) off += path[k] ? 1 : -1;
    float x0 = 200 + off * 17, x1 = x0 + (path[seg] ? 17 : -17), p = t / (float)ROW_FRAMES;
    float y0 = rowY(seg + 1) - 6, y1 = (seg + 1 < ROWS ? rowY(seg + 2) : 178) - 6;
    G.ballX = x0 + (x1 - x0) * p;
    G.ballY = y0 + (y1 - y0) * p * p - sinf(p * PI) * 7;
    return;
  }
  // Final drop: settle into the slot centre.
  float p = (f - 10 - ROWS * ROW_FRAMES) / 12.0f;
  int off = 0;
  for (int k = 0; k < ROWS; k++) off += path[k] ? 1 : -1;
  float x0 = 200 + off * 17;
  G.ballX = x0 + (slotX(G.target) - x0) * fminf(p, 1);
  G.ballY = 172 + 16 * fminf(p, 1);
  if (p >= 1) {
    G.dropping = 0; G.lastSlot = G.target; G.slotFlash = 40;
    sfx("plinko_land");
    double payout = A.bet * cr_plinko_mult[G.target];
    double profit = payout - A.bet;
    if (profit > 0 && A.roseKat > 0) { payout += profit * 4; A.roseKat--; toast("MAGNUM OPUS: +4X PROFIT!"); }
    fxBurst(slotX(G.target), HUD_H + 196, G.target >= 3 ? 14 : 4, 1, 1.2f);
    settleRound(payout, A.bet, "plinko", 0);
  }
}

static void plinkoDraw(void) {
  tiles(sprites_plate_idx, 0, 0, TOP_W, FIELD_H);
  for (int r = 1; r <= ROWS; r++)
    for (int i = 0; i < r + 2; i++) {
      spr(sprites_peg_idx, pegX(r, i) - 3, rowY(r) - 3, 1);
      if (pegHitT > 0 && r == pegHitR && i == pegHitI) C2D_DrawCircleSolid(pegX(r, i), rowY(r), 0.5f, 3 + pegHitT / 2, ALPHA(C_WHITE, 40 + pegHitT * 20));
    }
  static const u32 SLOT[5] = { RGB(0xC8414A), RGB(0xC4952B), RGB(0xFF9E45), RGB(0xF4C34E), RGB(0x7EDD65) };
  static const char *LBL[5] = { "0X", "0.5X", "1X", "2X", "5X" };
  for (int k = 0; k < 5; k++) {
    int lit = k == G.lastSlot && G.slotFlash > 0 && (G.slotFlash / 4) % 2 == 0;
    float x = slotX(k) - 31;
    rect(x, 186, 62, 24, C_INK);
    rect(x + 1, 187, 60, 22, lit ? C_WHITE : SLOT[k]);
    rect(x + 1, 187, 60, 2, ALPHA(C_WHITE, 70));
    textC(slotX(k), 192, 2, C_INK, LBL[k]);
  }
  if (G.dropping) {
    if (!A.reduced) C2D_DrawCircleSolid(G.ballX, G.ballY - 5, 0.5f, 3, ALPHA(C_WHITE, 70));
    spr(sprites_ball_idx, G.ballX - 4, G.ballY - 4, 1);
  }
}

// ======================= ROULETTE =======================
#define SPIN_FRAMES 200
static const u32 POCKET[3] = { RGB(0x7EDD65), RGB(0xD9434B), RGB(0x1E1B2A) };
static const char *COLOUR_NAME[3] = { "GREEN", "RED", "BLACK" };
static int lastTickIdx, tickGap;

static void rouletteUpdate(u32 down) {
  if (G.resultFlash > 0) G.resultFlash--;
  if (!G.spin) {
    if (down & KEY_RIGHT) { G.colour = G.colour == CR_RED ? CR_BLACK : G.colour == CR_BLACK ? CR_GREEN : CR_RED; sfx("ui_click"); }
    if (down & KEY_LEFT) { G.colour = G.colour == CR_RED ? CR_GREEN : G.colour == CR_GREEN ? CR_BLACK : CR_RED; sfx("ui_click"); }
    if (!(down & KEY_A)) return;
    pressFlash(BTN_A);
    int bet = A.bet;
    G.freeSpin = 0;
    if (A.vinyl > 0) { // EJM's Record Vinyl: a free spin at max bet, spent only when the spin is valid
      bet = A.balance >= 1 ? (int)floor(A.balance) : 1;
      G.freeSpin = 1; A.vinyl--;
      toast("RECORD VINYL: FREE MAX SPIN!");
    } else {
      if (!takeBet()) return;
    }
    G.spinBet = bet;
    int magnet = -1;
    if (A.magnet && G.colour != CR_GREEN) { magnet = G.colour; A.magnet = 0; } // Magnet ignores green and stays active
    G.result = cr_roll_roulette(&RNG, magnet);
    int idx = 0;
    while (cr_wheel_order[idx] != G.result) idx++;
    float step = TAU / 37, target = -idx * step;
    float base = G.angle - fmodf(G.angle, TAU);
    G.angleFrom = G.angle;
    G.angleTo = base + 5 * TAU + fmodf(target + 10 * TAU, TAU);
    G.spin = SPIN_FRAMES;
    sfx("bet_chip");
    return;
  }
  float p = 1 - (--G.spin) / (float)SPIN_FRAMES, e = 1 - powf(1 - p, 3);
  G.angle = G.angleFrom + (G.angleTo - G.angleFrom) * e;
  int idx = ((int)lroundf(-G.angle / (TAU / 37)) % 37 + 37) % 37;
  if (tickGap > 0) tickGap--;
  if (idx != lastTickIdx && tickGap == 0) { sfxPitch("roulette_tick", 0.95f + vis() * 0.1f); tickGap = 3; }
  lastTickIdx = idx;
  if (G.spin == 0) {
    sfx("roulette_stop");
    G.resultFlash = 60;
    int won = cr_roulette_color(G.result) == G.colour;
    if (won) fxBurst(200, HUD_H + 40, 12, 2, 1.0f);
    settleRound(G.spinBet * cr_roulette_payout(G.colour, G.result), G.spinBet, "roulette", G.freeSpin);
  }
}

static void wedge(float cx, float cy, float r0, float r1, float a0, float a1, u32 c) {
  float x00 = cx + cosf(a0) * r0, y00 = cy + sinf(a0) * r0, x01 = cx + cosf(a0) * r1, y01 = cy + sinf(a0) * r1;
  float x10 = cx + cosf(a1) * r0, y10 = cy + sinf(a1) * r0, x11 = cx + cosf(a1) * r1, y11 = cy + sinf(a1) * r1;
  C2D_DrawTriangle(x00, y00, c, x01, y01, c, x11, y11, c, 0.5f);
  C2D_DrawTriangle(x00, y00, c, x11, y11, c, x10, y10, c, 0.5f);
}

static void rouletteDraw(void) {
  tiles(sprites_velvet_idx, 0, 0, TOP_W, FIELD_H);
  const float cx = 200, cy = 108, R = 97, step = TAU / 37;
  C2D_DrawCircleSolid(cx, cy, 0.5f, R + 6, C_INK);
  C2D_DrawCircleSolid(cx, cy, 0.5f, R + 4, C_GOLD_D);
  C2D_DrawCircleSolid(cx, cy, 0.5f, R + 1, RGB(0x5E3A24));
  for (int i = 0; i < 37; i++) {
    int col = cr_roulette_color(cr_wheel_order[i]);
    float a0 = -PI / 2 - step / 2 + i * step + G.angle, a1 = a0 + step;
    wedge(cx, cy, R * 0.60f, R, a0, a1, POCKET[col]);
    wedge(cx, cy, R * 0.60f, R * 0.66f, a0, a1, col == CR_RED ? C_RED_D : col == CR_BLACK ? C_INK : C_GREEN_D);
    C2D_DrawLine(cx + cosf(a0) * R * 0.6f, cy + sinf(a0) * R * 0.6f, C_GOLD_D, cx + cosf(a0) * R, cy + sinf(a0) * R, C_GOLD_D, 1, 0.5f);
    char n[4];
    snprintf(n, sizeof n, "%d", cr_wheel_order[i]);
    float am = a0 + step / 2;
    text(cx + cosf(am) * R * 0.82f - textW(n, 1) / 2.0f, cy + sinf(am) * R * 0.82f - 4, 1, C_CREAM, n);
  }
  C2D_DrawCircleSolid(cx, cy, 0.5f, R * 0.60f, RGB(0x5E3A24));
  C2D_DrawCircleSolid(cx, cy, 0.5f, R * 0.52f, RGB(0x8A5A3B));
  spr(sprites_hub_idx, cx - 21, cy - 21, 1);
  C2D_DrawTriangle(cx - 7, cy - R - 9, C_GOLD, cx + 7, cy - R - 9, C_GOLD, cx, cy - R + 3, C_GOLD, 0.5f);
  // Ball: rides the rim against the spin, then drops into the winning pocket under the pointer.
  if (G.spin || G.result >= 0) {
    float p = G.spin ? 1 - G.spin / (float)SPIN_FRAMES : 1;
    float ba = -PI / 2 + (G.spin ? (1 - powf(p, 0.6f)) * -7 * TAU : 0);
    float br = p < 0.75f ? R * 0.93f : R * (0.93f - (p - 0.75f) / 0.25f * 0.21f);
    float bx = cx + cosf(ba) * br, by = cy + sinf(ba) * br;
    C2D_DrawCircleSolid(bx, by, 0.5f, 4, C_INK);
    C2D_DrawCircleSolid(bx, by, 0.5f, 3, C_WHITE);
  }
  if (G.result >= 0 && !G.spin) {
    char m[24];
    snprintf(m, sizeof m, "%d %s", G.result, COLOUR_NAME[cr_roulette_color(G.result)]);
    int on = G.resultFlash == 0 || (G.resultFlash / 6) % 2 == 0;
    rect(8, 8, textW(m, 2) + 12, 26, C_INK);
    if (on) text(14, 12, 2, cr_roulette_color(G.result) == G.colour ? C_GOLD : C_CREAM, m);
  }
}

// ======================= CRASH =======================
static float starScroll;
static void crashUpdate(u32 down) {
  if (G.boomT > 0) G.boomT--;
  if (!G.flying) {
    if (down & KEY_A) {
      pressFlash(BTN_A);
      if (!takeBet()) return;
      G.crashBet = A.bet;
      G.crashPoint = cr_crash_point(&RNG);
      G.flying = 1; G.frames = 0; G.mult = 1; G.crashed = G.cashed = 0;
      sfx("multiplier_up");
    }
    return;
  }
  double before = G.mult;
  G.mult = cr_crash_multiplier_at(++G.frames / 60.0);
  starScroll += 0.5f + (float)G.mult * 0.4f;
  float t = G.frames / 60.0f, px = 30 + fminf(1, t / 6) * 330, py = 180 - fminf(1, logf((float)G.mult) / logf(10)) * 150;
  if ((G.frames & 1) && !A.reduced) fxBurst(px + 12, HUD_H + py + 34, 1, 6, 0.4f); // exhaust
  if ((int)G.mult > (int)before && G.mult < G.crashPoint) sfxPitch("multiplier_up", 0.9f + (float)fmin(G.mult, 10) * 0.04f);
  if (G.mult >= 2 && !A.reduced && (G.frames % 20) == 0) fxShake(1);
  if (G.mult >= G.crashPoint) {
    G.mult = G.crashPoint; G.flying = 0; G.crashed = 1; G.boomT = 30;
    sfx("crash_boom");
    fxBurst(px + 12, HUD_H + py + 18, 24, 6, 2.2f);
    fxShake(8);
    settleRound(0, G.crashBet, "crash", 0);
  } else if (down & (KEY_A | KEY_B)) {
    pressFlash(down & KEY_A ? BTN_A : BTN_B);
    G.flying = 0; G.cashed = 1;
    settleRound(G.crashBet * G.mult, G.crashBet, "crash", 0);
  }
}

static void crashDraw(void) {
  C2D_Image st = img(sprites_stars_idx);
  float off = fmodf(starScroll, 64);
  for (float y = -64 + off; y < FIELD_H; y += 64)
    for (int x = 0; x < TOP_W; x += 64) {
      if (y >= 0 && y + 64 <= FIELD_H) C2D_DrawImageAt(st, x, floorf(y), 0.5f, NULL, 1, 1);
      else tiles(sprites_stars_idx, x, fmaxf(0, y), 64, fminf(FIELD_H, y + 64) - fmaxf(0, y));
    }
  float t = G.frames / 60.0f, p = fminf(1, t / 6), h = fminf(1, logf((float)G.mult) / logf(10));
  float rx = 30 + p * 330, ry = 180 - h * 150;
  if (G.flying || G.cashed || (G.crashed && G.boomT > 0)) {
    for (int k = 1; k <= 10; k++) { // trail: gold -> orange -> red
      float q = fmaxf(0, t - k * 0.07f);
      float px = 30 + fminf(1, q / 6) * 330, py = 180 - fminf(1, logf((float)cr_crash_multiplier_at(q)) / logf(10)) * 150;
      rect(px + 9, py + 30, 6, 6, k < 4 ? C_GOLD : k < 7 ? C_ORANGE : C_RED_D);
    }
  }
  if (G.flying || G.cashed) sprFrame(sprites_rocket_idx, (G.frames / 4) & 1, 2, rx, ry, 2, 2);
  if (G.crashed && G.boomT > 0) C2D_DrawCircleSolid(rx + 12, ry + 18, 0.5f, 30 - G.boomT, ALPHA(C_ORANGE, G.boomT * 6));
  char m[24];
  snprintf(m, sizeof m, "%.2fX", G.mult);
  u32 col = G.crashed ? C_CORAL : G.cashed ? C_GREEN : C_CREAM;
  textCO(200, 10, 4, col, C_INK, m);
  if (!G.flying && !G.crashed && !G.cashed) textCO(200, 52, 2, col, C_INK, "PRESS A TO LAUNCH"); // results use the word pop
}

// ======================= BLACKJACK =======================
static int pAge[16], dAge[16], flipT, previewMode;
static int drawCardBJ(void) {
  if (G.deckLeft <= 10) { cr_shuffled_deck(&RNG, G.deck); G.deckLeft = 52; } // web reshuffles at 10 left
  return G.deck[--G.deckLeft];
}
static int jester(void) { return A.jesterSecs > 0; }
static int dealerTotal(void) { int t = cr_hand_value(G.dh, G.dn); return jester() && t == 21 ? 20 : t; } // Jester Hat

static void bjFinish(void) {
  G.phase = 3;
  int pt = cr_hand_value(G.ph, G.pn), dt = dealerTotal();
  G.bjMult = cr_blackjack_payout(pt, dt, G.natural);
  if (G.natural) fxWord(sprites_word_blackjack_idx);
  else if (pt > 21) fxWord(sprites_word_bust_idx);
  else if (G.bjMult == 1) fxWord(sprites_word_push_idx);
  settleRound(G.bjBet * G.bjMult, G.bjBet, "blackjack", 0);
}

void dealerPeekNow(void) { G.peeked = 1; flipT = 8; sfx("card_flip"); }

static void blackjackUpdate(u32 down) {
  for (int i = 0; i < 16; i++) { pAge[i]++; dAge[i]++; }
  if (flipT > 0) flipT--;
  if (G.phase == 0 || G.phase == 3) {
    if (!(down & KEY_A)) return;
    pressFlash(BTN_A);
    if (!takeBet()) return;
    G.bjBet = A.bet;
    G.pn = G.dn = 0; G.natural = 0; G.peeked = 0;
    G.ph[G.pn++] = drawCardBJ(); G.dh[G.dn++] = drawCardBJ(); // same deal order as the web
    G.ph[G.pn++] = drawCardBJ(); G.dh[G.dn++] = drawCardBJ();
    pAge[0] = 0; dAge[0] = -6; pAge[1] = -12; dAge[1] = -18;
    G.phase = 4; G.timer = 30;
    return;
  }
  if (G.phase == 4) { // dealing animation
    if (G.timer % 6 == 0 && G.timer > 6) sfxPitch("card_deal", 0.95f + vis() * 0.1f);
    if (--G.timer > 0) return;
    G.phase = 1;
    if (cr_is_blackjack(G.ph, G.pn)) { G.natural = 1; bjFinish(); }
    return;
  }
  if (G.phase == 1) {
    if (down & KEY_A && G.pn < 16) {
      pressFlash(BTN_A);
      pAge[G.pn] = 0;
      G.ph[G.pn++] = drawCardBJ();
      sfx("card_deal");
      if (cr_hand_value(G.ph, G.pn) > 21) { G.phase = 2; G.timer = 14; if (!G.peeked) flipT = 8; } // bust: settle once the card lands
    } else if (down & KEY_B) {
      pressFlash(BTN_B);
      G.phase = 2; G.timer = 24;
      if (!G.peeked) { flipT = 8; sfx("card_flip"); }
    }
    return;
  }
  // phase 2: dealer reveals and draws to 17 (a bust settles without dealer draws, like the web)
  if (--G.timer > 0) return;
  if (cr_hand_value(G.ph, G.pn) > 21) { bjFinish(); return; }
  if (cr_dealer_hits(dealerTotal()) && G.dn < 16) { dAge[G.dn] = 0; G.dh[G.dn++] = drawCardBJ(); sfx("card_deal"); G.timer = 26; }
  else bjFinish();
}

static void cardAt(int card, int hidden, float x, float y, int age, int flip) {
  if (previewMode) { age = 99; flip = 0; }
  float p = fminf(1, fmaxf(0, age / 10.0f));
  if (age < 0) return;
  float sx = 372 + (x - 372) * (1 - (1 - p) * (1 - p)), sy = -60 + (y + 60) * (1 - (1 - p) * (1 - p));
  int idx = hidden ? sprites_back_idx : sprites_A_spade_idx + card;
  float w = 2;
  if (flip > 0) { w = 2 * fabsf(flip - 4) / 4.0f; if (flip > 4) idx = sprites_back_idx; } // squash-flip
  C2D_DrawImageAt(img(idx), floorf(sx + 33 * (2 - w) / 2), floorf(sy), 0.5f, NULL, fmaxf(w, 0.1f), 2);
}

static void hand(const int *h, int n, const int *ages, float y, int hideSecond) {
  float gap = n <= 1 ? 0 : fminf(72, 290.0f / (n - 1)), w = 66 + gap * (n - 1), x0 = 200 - w / 2;
  for (int i = 0; i < n; i++) cardAt(h[i], hideSecond && i == 1, x0 + i * gap, y, ages[i], i == 1 && h == G.dh ? flipT : 0);
}

static void blackjackDraw(void) {
  rect(0, 0, TOP_W, FIELD_H, C_FELT);
  tiles(sprites_felt_idx, 0, 0, TOP_W, FIELD_H);
  oct(36, 2, 328, 103, 4, ALPHA(C_FELT_D, 200));
  oct(36, 107, 328, 103, 4, ALPHA(C_FELT_D, 200));
  char t[32];
  int hidden = (G.phase == 1 || G.phase == 4) && !G.peeked;
  if (G.dn) {
    if (hidden) snprintf(t, sizeof t, "DEALER  %d + ?", cr_card_value(G.dh[0]));
    else snprintf(t, sizeof t, "DEALER  %d", dealerTotal());
  } else snprintf(t, sizeof t, "DEALER");
  textCO(200, 5, 2, C_GOLD, C_INK, t);
  if (G.pn) snprintf(t, sizeof t, "YOU  %d", cr_hand_value(G.ph, G.pn)); else snprintf(t, sizeof t, "YOU");
  textCO(200, 110, 2, C_GOLD, C_INK, t);
  if (G.dn) hand(G.dh, G.dn, dAge, 21, hidden);
  if (G.pn) hand(G.ph, G.pn, pAge, 126, 0);
  if (!G.dn) { textCO(200, 50, 2, C_CREAM, C_INK, "PRESS A TO DEAL"); textCO(200, 156, 1, C_CREAM_D, C_INK, "BEAT THE DEALER. STAY AT 21 OR LESS."); }
}

// ======================= ELEPHANT RIVER =======================
#define HOP_FRAMES 31
static float laneY(int lane) { return 199 - lane * 37; }

static void riverEnd(void) { G.crossing = 0; A.floaties = 0; }

static void riverUpdate(u32 down) {
  if (!G.crossing) {
    if (down & KEY_A) {
      pressFlash(BTN_A);
      if (!takeBet()) return;
      G.riverBet = A.bet;
      G.crossing = 1; G.lane = 0; G.hop = 0; G.splashed = G.banked = 0;
    }
    return;
  }
  if (G.hop > 0) {
    if (--G.hop == 0) {
      double chance = cr_frog_base_crash_chance(G.lane);
      if (A.floaties > 0) chance *= fmax(0.2, 1 - A.floaties * 0.45); // Pool Floaties
      if (cr_rand(&RNG) < chance) {
        G.splashed = 1; riverEnd();
        sfx("river_splash");
        fxBurst(200, HUD_H + laneY(G.lane), 18, 5, 1.6f);
        fxShake(5);
        fxWord(sprites_word_splash_idx);
        settleRound(0, G.riverBet, "river", 0);
      } else if (G.lane >= 5) { A.floaties = 0; toast("SAFE SHORE! CASH OUT NOW"); }
    }
    return;
  }
  if (down & KEY_A && G.lane < 5) { pressFlash(BTN_A); G.lane++; G.hop = HOP_FRAMES; sfx("river_step"); }
  else if (down & KEY_B && G.lane > 0) {
    pressFlash(BTN_B);
    G.banked = 1; riverEnd();
    settleRound(G.riverBet * cr_frog_multiplier(G.lane), G.riverBet, "river", 0);
  }
}

static void riverDraw(void) {
  C2D_Image water = img(sprites_water_idx);
  int flow = (A.tick / 2) % 32;
  for (int y = 24; y < 186; y += 16) {
    float sh = ((y / 16) & 1) ? flow : 32 - flow;
    for (int x = -32; x < TOP_W; x += 32) {
      float xx = x + sh;
      if (xx < 0) tiles(sprites_water_idx, 0, y, 32 + xx, fminf(16, 186 - y));
      else if (xx + 32 > TOP_W) tiles(sprites_water_idx, xx, y, TOP_W - xx, fminf(16, 186 - y));
      else if (y + 16 <= 186) C2D_DrawImageAt(water, xx, y, 0.5f, NULL, 1, 1);
      else tiles(sprites_water_idx, xx, y, 32, 186 - y);
    }
  }
  rect(0, 0, TOP_W, 24, RGB(0x3F8F4A));
  rect(0, 22, TOP_W, 2, RGB(0x2E6B37));
  rect(0, 186, TOP_W, FIELD_H - 186, RGB(0x3F8F4A));
  rect(0, 186, TOP_W, 2, RGB(0x2E6B37));
  textCO(200, 4, 2, C_CREAM, C_INK, "SAFE SHORE");
  static const int HAZ[4] = { sprites_log_idx, sprites_croc_idx, sprites_boat_idx, sprites_log_idx };
  static const float SPEED[4] = { 1.3f, 1.8f, 2.3f, 1.1f };
  for (int k = 0; k < 4; k++) {
    float w = 56, x = fmodf(A.tick * SPEED[k] + k * 131, TOP_W + w + 40) - w - 20;
    int f = (A.tick / 15 + k) & 1;
    if (k & 1) sprFrame(HAZ[k], f, 2, TOP_W - x, laneY(k + 1) - 11, -2, 2);
    else sprFrame(HAZ[k], f, 2, x, laneY(k + 1) - 11, 2, 2);
  }
  float from = laneY(G.lane - (G.hop > 0)), to = laneY(G.lane);
  float p = G.hop > 0 ? 1 - G.hop / (float)HOP_FRAMES : 1;
  float ey = from + (to - from) * p - sinf(p * PI) * (A.reduced ? 0 : 10);
  if (!G.splashed) sprFrame(sprites_elephant_idx, G.hop > 0 ? (A.tick / 6) & 1 : 0, 2, 174, ey - 26, 2, 2);
  char m[40];
  if (G.splashed) snprintf(m, sizeof m, "SPLASH!");
  else if (G.banked) snprintf(m, sizeof m, "CASHED OUT %.2fX", cr_frog_multiplier(G.lane));
  else if (!G.crossing) snprintf(m, sizeof m, "PRESS A TO START");
  else if (G.lane == 0) snprintf(m, sizeof m, "STEP INTO THE RIVER");
  else snprintf(m, sizeof m, "LANE %d   %.2fX", G.lane, cr_frog_multiplier(G.lane));
  textCO(200, 191, 2, G.splashed ? C_CORAL : C_GOLD, C_INK, m);
}

// ======================= HORSE RACE =======================
#define RACE_FRAMES 252
static const char *HORSE_NAME[4] = { "DINGO", "VAS", "HISTERBLUE", "THE HORSE" };
static const int HORSE_IDX[4] = { sprites_horse_0_idx, sprites_horse_1_idx, sprites_horse_2_idx, sprites_horse_3_idx };

static float horseProgress(int i, int winner, int frames) {
  float p = fminf(frames / (float)RACE_FRAMES, 1);
  float base = p * (0.78f + i * 0.025f + (i == winner ? 0.18f : 0)) + sinf(p * PI * 5 + i) * 0.035f;
  if (i == winner) base = p >= 1 ? 1 : fminf(p * 1.08f + 0.03f, 1);
  else if (p >= 1) base = fminf(base, 0.86f - i * 0.01f);
  return fmaxf(0, fminf(base, 1));
}

static void horseUpdate(u32 down) {
  if (!G.race) {
    if (down & KEY_RIGHT) { G.pick = (G.pick + 1) % 4; sfx("ui_click"); }
    if (down & KEY_LEFT) { G.pick = (G.pick + 3) % 4; sfx("ui_click"); }
    if (down & KEY_A) {
      pressFlash(BTN_A);
      if (!takeBet()) return;
      G.raceBet = A.bet; G.raceShoes = A.horseshoes; A.horseshoes = 0; // horseshoes last one race
      G.winner = cr_roll_horse_winner(&RNG);
      G.race = 1;
      sfx("horse_bugle");
    }
    return;
  }
  G.race++;
  if (G.race <= RACE_FRAMES) {
    if (G.race % 14 == 0) sfxPitch("horse_clop", 0.9f + vis() * 0.2f);
    if (!A.reduced && G.race % 6 == 0)
      for (int i = 0; i < 4; i++) fxBurst(8 + horseProgress(i, G.winner, G.race) * 290, HUD_H + 24 + i * 47 + 38, 1, 7, 0.4f);
  }
  if (G.race == RACE_FRAMES) { sfx("horse_finish"); fxBurst(345, HUD_H + 24 + G.winner * 47 + 20, 10, 2, 1.0f); }
  if (G.race > RACE_FRAMES + 40) {
    G.race = 0;
    settleRound(G.winner == G.pick ? G.raceBet * cr_horse_payout(G.raceShoes) : 0, G.raceBet, "horse", 0);
  }
}

static void horseDraw(void) {
  tiles(sprites_turf_idx, 0, 22, TOP_W, FIELD_H - 22);
  int done = G.race > RACE_FRAMES || (!G.race && G.winner >= 0);
  for (int c = 0; c < 21; c++)
    for (int k = 0; k < 2; k++) rect(345 + k * 6, 24 + c * 9, 6, 9, ((c + k) & 1) ? C_INK : C_WHITE);
  if (G.race > RACE_FRAMES && G.race < RACE_FRAMES + 12 && !A.reduced) rect(343, 22, 16, FIELD_H - 22, ALPHA(C_WHITE, 160));
  for (int i = 0; i < 4; i++) {
    float ly = 24 + i * 47;
    if (i) rect(0, ly - 2, TOP_W, 1, ALPHA(C_WHITE, 90));
    float prog = G.race ? horseProgress(i, G.winner, G.race) : (G.winner >= 0 ? horseProgress(i, G.winner, RACE_FRAMES) : 0);
    int f = G.race && G.race <= RACE_FRAMES ? (A.tick / 4 + i) & 3 : 0;
    float bob = G.race && G.race <= RACE_FRAMES && !A.reduced ? ((A.tick / 4 + i) & 1) : 0;
    sprFrame(HORSE_IDX[i], f, 4, 8 + prog * 290, ly + 2 - bob, 2, 2);
    u32 nc = done && i == G.winner ? C_GOLD : C_CREAM;
    textO(6, ly + 2, 1, nc, C_INK, HORSE_NAME[i]);
    if (i == G.pick) {
      float ax = 12 + textW(HORSE_NAME[i], 1);
      C2D_DrawTriangle(ax, ly + 2, C_GOLD, ax, ly + 10, C_GOLD, ax + 5, ly + 6, C_GOLD, 0.5f);
    }
  }
  rect(0, 0, TOP_W, 22, C_INK);
  char m[40];
  if (done) snprintf(m, sizeof m, "%s WINS!", HORSE_NAME[G.winner]);
  else if (G.race) snprintf(m, sizeof m, "AND THEY ARE OFF!");
  else snprintf(m, sizeof m, "PICK YOUR HORSE");
  textC(200, 3, 2, done && G.winner == G.pick ? C_GOLD : C_CREAM, m);
}

// ======================= dispatch =======================
void gameUpdate(u32 down, u32 held) {
  (void)held;
  if (tapA) down |= KEY_A;
  if (tapB) down |= KEY_B;
  tapA = tapB = 0;
  switch (A.game) {
    case G_PLINKO: plinkoUpdate(down); break;
    case G_ROULETTE: rouletteUpdate(down); break;
    case G_CRASH: crashUpdate(down); break;
    case G_BLACKJACK: blackjackUpdate(down); break;
    case G_RIVER: riverUpdate(down); break;
    default: horseUpdate(down); break;
  }
}

void gameDrawTop(int g, int preview) {
  previewMode = preview;
  switch (g) {
    case G_PLINKO: plinkoDraw(); break;
    case G_ROULETTE: rouletteDraw(); break;
    case G_CRASH: crashDraw(); break;
    case G_BLACKJACK: blackjackDraw(); break;
    case G_RIVER: riverDraw(); break;
    default: horseDraw(); break;
  }
}

// ---------- bottom action area (x 66..264, y 44..140) ----------
static void infoPanel(const char *title, const char *value, u32 vc) {
  panel(76, 46, 180, 42, C_PURPLE_L, C_PANEL);
  textC(166, 52, 1, C_CREAM, title);
  textCO(166, 66, 2, vc, C_INK, value);
}

static int big(int id, float x, float w, int enabled, const char *label, int scale) {
  return button(id, x, 94, w, 44, enabled ? B_GOLD : B_DIM, label, scale);
}

// Two-button row with A/B glyphs (Blackjack HIT/STAND, River STEP/CASH OUT).
static void pairRow(const char *a, int aOn, const char *b, int bOn) {
  if (button(BTN_A, 70, 94, 95, 44, aOn ? B_GOLD : B_DIM, "", 1)) tapA = 1;
  if (button(BTN_B, 169, 94, 95, 44, bOn ? B_GOLD : B_DIM, "", 1)) tapB = 1;
  padGlyph(76, 109, 'A');
  padGlyph(175, 109, 'B');
  int sa = strchr(a, '\n') ? 1 : 2, sb = strchr(b, '\n') ? 1 : 2;
  float ya = sa == 1 ? 104 : 108, yb = sb == 1 ? 104 : 108;
  textC(126, ya, sa, aOn ? C_INK : C_GREY, a);
  textC(225, yb, sb, bOn ? C_INK : C_GREY, b);
}

void gameDrawControls(void) {
  char v[40];
  int busy = gameBusy();
  switch (A.game) {
    case G_PLINKO:
      if (button(BTN_A, 70, 48, 194, 88, G.dropping ? B_DIM : B_GOLD, "DROP", 4)) tapA = 1;
      break;
    case G_ROULETTE: {
      static const int ORDER[3] = { CR_RED, CR_BLACK, CR_GREEN };
      static const char *NM[3] = { "RED", "BLACK", "GREEN" }, *MX[3] = { "2X", "2X", "14X" };
      static const int ST[3] = { B_RED, B_BLACK, B_GREEN };
      for (int i = 0; i < 3; i++) {
        int c = ORDER[i], sel = G.colour == c;
        int style = (G.spin && !sel) ? B_DIM : ST[i] | (sel ? 0x100 : 0);
        if (button(10 + i, 70 + i * 66, 46, 62, 42, style, "", 1) && !G.spin) { G.colour = c; sfx("ui_click"); }
        textCO(101 + i * 66, 53, 1, style == B_DIM ? C_GREY : C_CREAM, C_INK, NM[i]);
        textCO(101 + i * 66, 66, 2, style == B_DIM ? C_GREY : C_CREAM, C_INK, MX[i]);
      }
      if (big(BTN_A, 70, 194, !G.spin, A.vinyl ? "FREE SPIN" : "SPIN", A.vinyl ? 3 : 4)) tapA = 1;
      break;
    }
    case G_CRASH:
      if (G.flying) { snprintf(v, sizeof v, "$%.2f", G.crashBet * G.mult); infoPanel("CASH OUT VALUE", v, C_GOLD); }
      else if (G.crashed) { snprintf(v, sizeof v, "%.2fX", G.crashPoint); infoPanel("CRASHED AT", v, C_CORAL); }
      else if (G.cashed) { snprintf(v, sizeof v, "%.2fX", G.mult); infoPanel("CASHED OUT AT", v, C_GREEN); }
      else { snprintf(v, sizeof v, "$%d", A.bet); infoPanel("BET TO LAUNCH", v, C_GOLD); }
      if (big(BTN_A, 70, 194, 1, G.flying ? "CASH OUT" : "LAUNCH", 3)) tapA = 1;
      break;
    case G_BLACKJACK:
      if (G.phase == 1) infoPanel("YOUR TURN", "HIT OR STAND?", C_GOLD);
      else if (G.phase == 2 || G.phase == 4) infoPanel(G.phase == 4 ? "DEALING" : "DEALER PLAYS", "...", C_CREAM);
      else if (G.phase == 3) {
        int pt = cr_hand_value(G.ph, G.pn);
        const char *r = G.natural ? "BLACKJACK!" : pt > 21 ? "BUST" : G.bjMult == 2 ? "YOU WIN" : G.bjMult == 1 ? "PUSH" : "DEALER WINS";
        infoPanel("RESULT", r, G.bjMult > 1 ? C_GREEN : G.bjMult == 1 ? C_CREAM : C_CORAL);
      } else infoPanel("PLACE YOUR BET", "READY TO DEAL", C_GOLD);
      if (G.phase == 1 || G.phase == 2 || G.phase == 4) pairRow("HIT", G.phase == 1, "STAND", G.phase == 1);
      else if (big(BTN_A, 70, 194, 1, "DEAL", 4)) tapA = 1;
      break;
    case G_RIVER:
      if (G.crossing) {
        snprintf(v, sizeof v, "$%.2f", G.lane ? G.riverBet * cr_frog_multiplier(G.lane) : 0.0);
        infoPanel("CASH OUT VALUE", v, C_GOLD);
        pairRow("STEP\nFORWARD", G.hop == 0 && G.lane < 5, "CASH\nOUT", G.hop == 0 && G.lane > 0);
      } else {
        snprintf(v, sizeof v, "$%d", A.bet);
        infoPanel(G.splashed ? "SWEPT AWAY" : G.banked ? "CASHED OUT" : "BET TO CROSS", v, G.splashed ? C_CORAL : C_GOLD);
        if (big(BTN_A, 70, 194, 1, "START", 4)) tapA = 1;
      }
      break;
    default: {
      for (int i = 0; i < 4; i++) {
        float x = 70 + (i & 1) * 99, y = 46 + (i >> 1) * 27;
        int sel = G.pick == i, style = sel ? B_GOLD : (G.race ? B_DIM : B_PURPLE);
        if (button(20 + i, x, y, 95, 25, style, "", 1) && !G.race) { G.pick = i; sfx("ui_click"); }
        sprFrame(HORSE_IDX[i], 0, 4, x + 4, y + 2, 1, 1);
        text(x + 37, y + 8, 1, sel ? C_INK : style == B_DIM ? C_GREY : C_CREAM, HORSE_NAME[i]);
      }
      double mult = cr_horse_payout(G.race ? G.raceShoes : A.horseshoes);
      snprintf(v, sizeof v, "WIN PAYS $%.2f  (%gX)", (G.race ? G.raceBet : A.bet) * mult, mult);
      oct(76, 101, 180, 15, 3, C_INK);
      oct(77, 102, 178, 13, 2, C_GOLD_D);
      oct(78, 103, 176, 11, 2, RGB(0x221D33));
      textC(166, 104, 1, C_GOLD, v);
      if (button(BTN_A, 70, 118, 194, 22, G.race ? B_DIM : B_GOLD, G.race ? "RACING..." : "RACE", 2)) tapA = 1;
    }
  }
  (void)busy;
}

void gameFooter(void) {
  int lock = gameLocksTabs();
  const char *lr = lock ? "~L/R:GAME" : "L/R:GAME";
  char f[96];
  switch (A.game) {
    case G_CRASH:
      snprintf(f, sizeof f, G.flying ? "A:CASH OUT|B:CASH OUT|X:ITEM|%s" : "A:LAUNCH|B:BACK|X:ITEM|%s", lr); break;
    case G_BLACKJACK:
      snprintf(f, sizeof f, G.phase == 1 || G.phase == 2 || G.phase == 4 ? "A:HIT|B:STAND|X:ITEM|%s" : "A:DEAL|B:BACK|X:ITEM|%s", lr); break;
    case G_RIVER:
      snprintf(f, sizeof f, G.crossing ? "A:STEP|B:CASH OUT|X:ITEM|%s" : "A:START|B:BACK|X:ITEM|%s", lr); break;
    case G_HORSE:
      snprintf(f, sizeof f, G.race ? "~<>:PICK|~A:RACE|X:ITEM|%s" : "<>:PICK|A:RACE|X:ITEM|%s", lr); break;
    default:
      snprintf(f, sizeof f, "A:ACT|B:BACK|X:ITEM|%s", lr);
  }
  footer(f);
}
