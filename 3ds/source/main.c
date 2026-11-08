// Casino Run for Nintendo 3DS.
// Screens follow docs/3ds/design (Design-Bible.md + 25 approved mockups). Rules: rules.c (verified
// seed-for-seed against rules.js). Run, item and timer behaviour: script.js.
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "app.h"

app_t A;
games_t G;
cr_rng RNG;
C2D_SpriteSheet SHEET;

static const char *TAB_NAME[G_COUNT] = { "PLINKO", "ROULETTE", "CRASH", "BLACKJACK", "RIVER", "HORSES" };
static const int TAB_ICON[G_COUNT] = { sprites_icon_plinko_idx, sprites_icon_roulette_idx, sprites_icon_crash_idx,
  sprites_icon_blackjack_idx, sprites_icon_river_idx, sprites_icon_horse_idx };
static const char *MUSIC[G_COUNT] = { "music_plinko", "music_roulette", "music_crash", "music_blackjack", "music_river", "music_horse" };

// ======================= effects =======================
#define MAXP 160
typedef struct { float x, y, vx, vy; int life, max, kind; u32 col; } particle;
static particle P[MAXP];
static struct { char s[24]; u32 c; int t, big; } pop;
static struct { int idx, t; } word;
static int shakeT;
static float shx, shy;

// kinds: 0 coin, 1 sparkle, 2 star, 3 chips, 4 confetti, 5 droplet, 6 debris/exhaust, 7 hoof dust
void fxBurst(float x, float y, int count, int kind, float speed) {
  if (A.reduced) count = count > 3 ? count / 4 : (kind == 6 || kind == 7 ? 0 : count); // Reduced Motion: far fewer
  for (int n = 0; n < count; n++) {
    particle *p = NULL;
    for (int i = 0; i < MAXP; i++) if (P[i].life <= 0) { p = &P[i]; break; }
    if (!p) return;
    float a = (rand() % 628) / 100.0f, s = speed * (0.5f + (rand() % 100) / 100.0f);
    p->x = x; p->y = y; p->vx = cosf(a) * s * 2; p->vy = sinf(a) * s * 2 - (kind >= 6 ? 0 : 1.5f * speed);
    p->kind = kind; p->max = p->life = 30 + rand() % 30;
    static const u32 DEB[4] = { C_GOLD, C_ORANGE, C_CORAL, C_CREAM };
    p->col = kind == 6 ? DEB[rand() % 4] : kind == 7 ? RGB(0xC9A36B) : C_WHITE;
    if (kind == 6 && speed < 1) { p->vx = -0.6f - (rand() % 10) / 20.0f; p->vy = 0.8f; p->life = p->max = 14; } // exhaust puff
    if (kind == 7) { p->vx = -0.5f; p->vy = -0.3f; p->life = p->max = 16; }                                  // hoof dust
  }
}
void fxPop(const char *s, u32 c, int big) { snprintf(pop.s, sizeof pop.s, "%s", s); pop.c = c; pop.t = 70; pop.big = big; }
void fxWord(int idx) { word.idx = idx; word.t = 60; }
void fxShake(int n) { if (!A.reduced && n > shakeT) shakeT = n; }
void toast(const char *msg) { snprintf(A.toast, sizeof A.toast, "%s", msg); A.toastT = 150; }

static void fxUpdate(void) {
  for (int i = 0; i < MAXP; i++) {
    particle *p = &P[i];
    if (p->life <= 0) continue;
    p->life--;
    p->x += p->vx; p->y += p->vy;
    if (p->kind < 6) p->vy += 0.12f;
    if (p->kind == 4) p->vx *= 0.97f;
  }
  if (pop.t > 0) pop.t--;
  if (word.t > 0) word.t--;
  if (A.toastT > 0) A.toastT--;
  shx = shy = 0;
  if (shakeT > 0) { shakeT--; shx = (rand() % 5) - 2; shy = (rand() % 5) - 2; }
}

static void fxDraw(void) {
  static const int SPR[] = { sprites_coin_idx, sprites_sparkle_idx, sprites_star_idx, sprites_chip_gold_idx, sprites_confetti_idx, sprites_droplet_idx };
  static const u32 CF[4] = { RGB(0xF4C34E), RGB(0x37D9E8), RGB(0xF45B58), RGB(0x7EDD65) };
  for (int i = 0; i < MAXP; i++) {
    particle *p = &P[i];
    if (p->life <= 0) continue;
    if (p->kind >= 6) {
      float s = p->kind == 7 ? 3 : 2 + 4.0f * p->life / p->max;
      rect(p->x - s / 2, p->y - s / 2, s, s, ALPHA(p->col, 255 * p->life / p->max));
      continue;
    }
    int idx = SPR[p->kind];
    if (p->kind == 3) idx = (i % 3 == 0) ? sprites_chip_red_idx : (i % 3 == 1) ? sprites_chip_gold_idx : sprites_chip_cyan_idx;
    if (p->kind == 4) sprT(idx, p->x, p->y, 1, CF[i % 4], 1.0f);
    else spr(idx, p->x - 6, p->y - 6, 1);
  }
  if (word.t > 0 && word.idx) { // result word pops in big, then settles at 2x
    float t = (60 - word.t) / 8.0f, s = (!A.reduced && t < 1) ? 3 : 2;
    C2D_Image im = img(word.idx);
    C2D_DrawImageAt(im, floorf(200 - im.subtex->width * s / 2), floorf(HUD_H + 64 - im.subtex->height * s / 2), 0.5f, NULL, s, s);
  }
  if (pop.t > 0) {
    float y = HUD_H + 104 - (70 - pop.t) * (A.reduced ? 0 : 0.6f);
    int a = pop.t > 20 ? 255 : pop.t * 12;
    textCO(200, y, pop.big ? 3 : 2, ALPHA(pop.c, a), ALPHA(C_INK, a), pop.s);
  }
  if (A.toastT > 0 && A.scene == SC_GAME) {
    int w = textW(A.toast, 1) + 16;
    float y = HUD_H + FIELD_H - 22 + (A.toastT < 10 && !A.reduced ? (10 - A.toastT) * 2 : 0);
    oct(200 - w / 2.0f, y, w, 16, 3, ALPHA(C_INK, 230));
    oct(201 - w / 2.0f, y + 1, w - 2, 14, 2, ALPHA(C_PURPLE_D, 230));
    textC(200, y + 4, 1, C_CREAM, A.toast);
  }
}

// ======================= run and settlement =======================
static void go(int scene) {
  if (A.scene != scene) { A.prevScene = A.scene; A.fade = A.reduced ? 0 : 10; A.overlayT = 0; A.sel = 0; A.menuLock = 8; }
  A.scene = scene;
}

static void consume(int it) {
  if (A.inv[it] <= 0) return;
  A.inv[it]--;
  if (it != IT_FILTH_TEA && A.consumedN < 64) A.consumed[A.consumedN++] = it;
}

static void mood(int m, int frames) { A.mood = m; A.moodT = frames; }

static void newRun(void) {
  memset(A.inv, 0, sizeof A.inv);
  A.running = 1; A.round = 1; A.balance = A.shownBalance = CR_START_BALANCE; A.goal = CR_START_GOAL;
  A.timeLeft = CR_START_TIME; A.timeFrames = 0; A.streak = A.bestStreak = 0; A.coinFlips = 0; A.runId++;
  A.consumedN = 0;
  A.magnet = A.floaties = A.horseshoes = A.weighted = A.roseKat = A.vinyl = A.grease = A.cashbackSecs = A.jesterSecs = 0;
  A.bet = 10; A.panel = PANEL_NONE;
  shopRoll();
  gamesReset();
  go(SC_GAME);
  musicPlay(MUSIC[A.game]);
  sfx("new_round");
}

static void endRun(int scene, int reason) {
  A.running = 0; A.endReason = reason; A.endBalance = A.balance;
  gamesReset();
  go(scene);
  musicPlay("music_lobby");
}

static void recordScore(void) {
  score_t s = { A.balance, A.round, A.bestStreak };
  int pos = A.scoreCount;
  while (pos > 0 && A.scores[pos - 1].amount < s.amount) pos--;
  A.lastScoreRank = pos < MAX_SCORES ? pos : -1;
  if (pos < MAX_SCORES) {
    int n = A.scoreCount < MAX_SCORES ? A.scoreCount : MAX_SCORES - 1;
    memmove(&A.scores[pos + 1], &A.scores[pos], (n - pos) * sizeof s);
    A.scores[pos] = s;
    if (A.scoreCount < MAX_SCORES) A.scoreCount++;
  }
  A.resultSaved = saveWrite();
}

void checkRun(void) {
  if (!A.running || A.scene != SC_GAME) return;
  int st = cr_run_state(A.timeLeft, A.balance, A.goal);
  if (st == CR_TIMEOUT) { endRun(SC_RUNOVER, 0); sfx("game_over"); }
  else if (st == CR_GOAL) { A.panel = PANEL_NONE; go(SC_GOAL); sfx("goal_fanfare"); mood(1, 200); fxBurst(200, 60, 40, 4, 1.5f); }
  else if (st == CR_BROKE) {
    if (A.coinFlips >= 3) { endRun(SC_RUNOVER, 1); sfx("game_over"); }
    else { A.panel = PANEL_NONE; go(SC_COINFLIP); A.flipT = 0; mood(2, 600); }
  }
}

void stakeTaken(double bet) {
  if (bet >= floor(A.balance) && bet >= 5) fxWord(sprites_word_allin_idx);
  A.balance -= bet;
  sfx("bet_chip");
}

static double streakWin(double base) {
  A.streak++;
  if (A.streak > A.bestStreak) A.bestStreak = A.streak;
  int used = 0;
  double bonus = cr_streak_bonus(base, A.streak, A.grease, &used);
  if (used) { A.grease = 0; toast("GREASE FIRE! TRIPLE STREAK BONUS!"); }
  char s[16];
  snprintf(s, sizeof s, "streak_%d", A.streak < 5 ? A.streak : 5);
  if (A.streak >= 2) sfx(s);
  return bonus;
}

static void streakLoss(void) {
  if (A.grease) { // Grease Fire backfires on a loss
    double burn = cr_grease_fire_burn(A.balance);
    A.grease = 0;
    if (burn > 0) { A.balance -= burn; sfx("grease_fire"); }
    char t[48];
    snprintf(t, sizeof t, "GREASE FIRE BURNED $%.2f", burn);
    toast(t);
  }
  if (A.streak <= 0) { A.streak = 0; return; }
  if (A.inv[IT_MATCH]) { consume(IT_MATCH); toast("LUCKY MATCH SAVED YOUR STREAK!"); sfx("item_break"); return; }
  if (A.inv[IT_SHIELD]) { consume(IT_SHIELD); A.streak--; toast("HEAT SHIELD: STREAK -1"); sfx("item_break"); return; }
  A.streak = 0;
}

// payout includes the stake. Mirrors applyRoundWin / processFullLoss / Plinko's partial loss.
void settleRound(double payout, double bet, const char *game, int freeSpin) {
  char s[32];
  if (payout > bet) {
    double base = payout - bet, total = payout;
    total += cr_hula_girl_bonus(base, A.inv[IT_HULA]);
    total += streakWin(base);
    A.balance += total;
    double profit = total - bet, ratio = bet > 0 ? profit / bet : 0;
    int tier = ratio >= 8 ? 5 : ratio >= 3 ? 4 : (ratio >= 1 || A.streak >= 2) ? 3 : 2; // fx.js tierFor
    static const char *SND[] = { "", "", "win_small", "win_medium", "win_large", "jackpot" };
    static const int WORD[] = { 0, 0, sprites_word_nice_idx, sprites_word_great_idx, sprites_word_bigwin_idx, sprites_word_jackpot_idx };
    sfx(SND[tier]);
    if (!(word.t > 0 && word.idx == sprites_word_blackjack_idx)) fxWord(WORD[tier]);
    snprintf(s, sizeof s, "+$%.2f", profit);
    fxPop(s, tier >= 4 ? C_GOLD : C_GREEN, tier >= 4);
    fxBurst(200, HUD_H + 100, tier * 5, tier >= 4 ? 3 : 0, 1.2f);
    if (tier >= 5) fxBurst(200, HUD_H + 90, 20, 2, 2.0f);
    fxShake(tier >= 3 ? tier : 0);
    mood(1, 60 + tier * 20);
  } else if (payout == bet && payout > 0) {
    A.balance += payout;
    fxPop("PUSH", C_CREAM, 0);
  } else if (payout > 0) { // partial loss (Plinko 0.5x): streak breaks, no refund
    streakLoss();
    A.balance += payout;
    snprintf(s, sizeof s, "-$%.2f", bet - payout);
    fxPop(s, RGB(0xFF7A72), 0);
    sfx("lose");
    mood(2, 70);
  } else if (freeSpin) {
    fxPop("FREE SPIN - NO LOSS", C_CREAM, 0);
  } else { // full loss: refunds are worked out first, then the streak, then the refund is paid
    cr_refund r = cr_loss_refund(bet, A.inv[IT_INSURANCE], A.cashbackSecs > 0);
    for (int i = 0; i < r.tickets; i++) consume(IT_INSURANCE);
    streakLoss();
    if (r.total > 0) {
      A.balance += r.total;
      snprintf(s, sizeof s, "REFUND +$%.2f", r.total);
      toast(s);
    }
    if (!strcmp(game, "crash")) fxWord(sprites_word_crashed_idx);
    else if (!strcmp(game, "plinko") || !strcmp(game, "roulette") || !strcmp(game, "horse")) fxWord(sprites_word_miss_idx);
    if (strcmp(game, "crash") && strcmp(game, "river")) sfx(!strcmp(game, "blackjack") ? "bust" : "lose");
    snprintf(s, sizeof s, "-$%.2f", bet);
    fxPop(s, RGB(0xFF7A72), 0);
    fxShake(2);
    mood(2, 70);
  }
  checkRun();
}

static void useItem(int it) {
  const char *why = itemCanUseNow(it);
  if (why) { sfx("ui_error"); toast(why); return; }
  char t[64];
  switch (it) {
    case IT_BOTTLE: A.timeLeft += CR_TIME_BOTTLE_SECONDS; toast("+30 SECONDS!"); break;
    case IT_MAGNET: A.magnet = 1; toast("MAGNET READY FOR YOUR NEXT SPIN"); break;
    case IT_FLOATIES: A.floaties++; snprintf(t, sizeof t, "FLOATIES STACKED: %d", A.floaties); toast(t); break;
    case IT_GREASE: A.grease = 1; toast("GREASE FIRE IS LIT!"); break;
    case IT_CUTTER: A.goal = cr_goal_cutter_goal(A.goal); toast("GOAL LOWERED BY 10%"); break;
    case IT_PEEK: dealerPeekNow(); toast("HIDDEN CARD REVEALED"); break;
    case IT_HORSESHOE: A.horseshoes++; snprintf(t, sizeof t, "HORSESHOES STACKED: %d", A.horseshoes); toast(t); break;
    case IT_WEIGHTED: A.weighted++; snprintf(t, sizeof t, "WEIGHTED BALLS: %d", A.weighted); toast(t); break;
    case IT_CASHBACK: A.cashbackSecs += 60; toast("CASHBACK +60 SECONDS"); break;
    case IT_JESTER: A.jesterSecs += 60; toast("JESTER HAT +60 SECONDS"); break;
    case IT_ROSEKAT: A.roseKat += 2; toast("MAGNUM OPUS: 2 BOOSTED DROPS"); break;
    case IT_VINYL: A.vinyl++; toast("FREE MAX SPIN READY"); break;
    case IT_FILTH_TEA: {
      int pool[64], n = 0;
      for (int i = 0; i < A.consumedN; i++) if (A.consumed[i] != IT_FILTH_TEA) pool[n++] = i;
      int k = pool[cr_rand_int(&RNG, n)], got = A.consumed[k];
      A.consumed[k] = A.consumed[--A.consumedN];
      A.inv[got]++;
      snprintf(t, sizeof t, "TEA REFUNDED %s", ITEMS[got].name);
      toast(t);
      break;
    }
  }
  consume(it);
  sfx("item_use");
  fxBurst(160, 120, 6, 1, 0.8f);
}

// ======================= shared drawing =======================
static void drawDice(float x, float y, int frameOverride) {
  int f = frameOverride >= 0 ? frameOverride : A.mood;
  float hop = 0;
  if (!A.reduced) {
    if (f == 1 && A.moodT > 0) hop = -floorf(fabsf(sinf(A.tick * 0.25f)) * 6); // cheer hop
    else if (f == 2 && A.moodT > 0) hop = 2;                                     // slump
    else hop = ((A.tick / 30) & 1) ? -1 : 0;                                     // idle bob
  }
  sprFrame(sprites_host_idx, f, 3, x, y + hop, 2, 2);
  if (f == 0 && A.blinkT > 0) { // blink: host.png eyes sit at columns 9-10 / 14-15, rows 9-11
    rect(x + 18, y + hop + 18, 4, 6, C_CREAM); rect(x + 28, y + hop + 18, 4, 6, C_CREAM);
    rect(x + 18, y + hop + 20, 4, 2, C_INK); rect(x + 28, y + hop + 20, 4, 2, C_INK);
  }
  if (f == 2 || (A.running && A.timeLeft <= 15 && A.scene == SC_GAME)) { // sweat drop
    float d = (A.tick % 40) / 40.0f * 10;
    spr(sprites_droplet_idx, x + 46, y + hop + 6 + d, 1);
  }
  sparkle(x - 4, y + 8, A.tick, C_GOLD);
  sparkle(x + 54, y + 16, A.tick + 20, C_GOLD);
}

static void hud(void) {
  rect(0, 0, TOP_W, HUD_H, C_INK);
  rect(1, 1, TOP_W - 2, HUD_H - 3, RGB(0x1D1A2C));
  rect(0, HUD_H - 2, TOP_W, 2, C_PURPLE);
  float x = 6;
  textO(x, 10, 1, C_GOLD, C_INK, "CASINO");
  textO(x + textW("CASINO ", 1), 10, 1, C_CORAL, C_INK, "RUN");
  x += textW("CASINO RUN", 1) + 3;
  sparkle(x + 1, 7, A.tick, C_CYAN);
  x += 7;
  rect(x, 6, 1, 16, C_GREY_D);
  x += 6;
  spr(sprites_coin_idx, x, 7, 1);
  x += 17;
  char b[24], g[24], t[8], st[24];
  snprintf(b, sizeof b, "$%.2f", A.shownBalance);
  int bs = textW(b, 2) > 92 ? 1 : 2;
  u32 bc = A.shownBalance < A.balance - 0.01 ? C_GREEN : A.shownBalance > A.balance + 0.01 ? C_CORAL : C_GOLD;
  textO(x, bs == 2 ? 6 : 10, bs, bc, C_INK, b);
  x += textW(b, bs) + 6;
  rect(x, 6, 1, 16, C_GREY_D);
  x += 6;
  snprintf(g, sizeof g, "GOAL $%.0f", A.goal);
  text(x, 10, 1, C_CREAM, g);
  x += textW(g, 1) + 6;
  rect(x, 6, 1, 16, C_GREY_D);
  x += 6;
  int tl = A.timeLeft < 0 ? 0 : A.timeLeft;
  snprintf(t, sizeof t, "%d:%02d", tl / 60, tl % 60);
  u32 tc = tl <= 15 ? C_CORAL : C_CREAM;
  if (tl <= 15 && tl > 0 && A.running && !A.reduced && (A.tick / 15) % 2) tc = RGB(0xFF7A72);
  textO(x, 6, 2, tc, C_INK, t);
  x += textW(t, 2) + 6;
  rect(x, 6, 1, 16, C_GREY_D);
  x += 5;
  sprFrame(sprites_flame_idx, A.reduced ? 0 : (A.tick / 6) % 3, 3, x, 7, 1, 1);
  x += 13;
  snprintf(st, sizeof st, "STREAK %d +%d%%", A.streak, (int)lround(cr_streak_bonus_rate(A.streak) * 100));
  text(x, 10, 1, A.streak >= 3 ? C_GOLD : C_ORANGE, st);
}

static void dimField(int alpha) { rect(0, HUD_H, TOP_W, FIELD_H, ALPHA(C_INK, alpha)); }

// Pop-in scale for overlay panels (ease-out back); 1 with Reduced Motion.
static void overlayBegin(float cx, float cy) {
  if (A.reduced || A.overlayT >= 10) return;
  float t = A.overlayT / 10.0f - 1, k = 1.70158f, s = 1 + t * t * ((k + 1) * t + k);
  C2D_ViewTranslate(cx, cy);
  C2D_ViewScale(s, s);
  C2D_ViewTranslate(-cx, -cy);
}

static void drawField(void) {
  C2D_ViewReset();
  C2D_ViewTranslate(shx, HUD_H + shy);
  gameDrawTop(A.game, 0);
  C2D_ViewReset();
}

// ======================= bottom: gameplay shell =======================
static int repeatT;
static int clampBet(int b) {
  int max = A.balance >= 1 ? (int)floor(A.balance) : 1;
  return b < 1 ? 1 : b > max ? max : b;
}

static void switchGame(int g) {
  if (g == A.game || gameLocksTabs()) return;
  A.game = g;
  sfx("ui_tab");
  musicPlay(MUSIC[g]);
}

static void drawTabs(int selected) {
  for (int i = 0; i < G_COUNT; i++) {
    float x = 4 + i * 52;
    int on = i == selected, lock = gameLocksTabs() && i != A.game;
    oct(x, 2, 52, 36, 2, C_INK);
    oct(x + 1, 3, 50, 34, 2, on ? C_GOLD : RGB(0x2A2640));
    if (!on) rect(x + 2, 3, 48, 1, C_PANELHI);
    if (on) C2D_DrawTriangle(x + 21, 37, C_GOLD, x + 31, 37, C_GOLD, x + 26, 43, C_GOLD, 0.5f);
    if (lock) sprT(TAB_ICON[i], x + 17, 5, 1, C_GREY_D, 0.6f); else spr(TAB_ICON[i], x + 17, 5, 1);
    textC(x + 26, 26, 1, on ? C_INK : lock ? C_GREY : C_CREAM, TAB_NAME[i]);
    if (hit(x, 2, 52, 36) && !lock) { A.panel = PANEL_NONE; switchGame(i); }
  }
}

static void openItemsAt(int it) {
  int kinds[IT_COUNT], n = ownedKinds(kinds, IT_COUNT);
  A.panel = PANEL_ITEMS; A.sel2 = 0;
  for (int i = 0; i < n; i++) if (kinds[i] == it) A.sel2 = i;
  sfx("ui_open");
}

static void itemColumn(void) {
  oct(266, 44, 50, 98, 3, C_INK);
  oct(267, 45, 48, 96, 3, C_GOLD);
  oct(269, 47, 44, 92, 2, RGB(0x1D1A2C));
  int kinds[3], n = ownedKinds(kinds, 3);
  for (int k = 0; k < 3; k++) {
    float y = 49 + k * 30;
    oct(271, y, 40, 28, 2, C_PANEL);
    rect(272, y + 1, 38, 1, C_PANELHI);
    if (k < n) {
      spr(ITEMS[kinds[k]].sprite, 278, y + 1, 1);
      if (A.inv[kinds[k]] > 1) { char c[6]; snprintf(c, sizeof c, "%d", A.inv[kinds[k]]); textO(307 - textW(c, 1), y + 18, 1, C_GOLD, C_INK, c); }
      if (hit(271, y, 40, 28) && !(A.game == G_CRASH && G.flying)) openItemsAt(kinds[k]);
    }
  }
}

static void shopItemsRow(float y) {
  int shopOn = A.panel == PANEL_SHOP, itemsOn = A.panel == PANEL_ITEMS, lock = gameLocksTabs() && A.panel == PANEL_NONE;
  if (button(30, 70, y, 94, 17, lock ? B_DIM : shopOn ? B_GOLD : B_PURPLE, "", 1)) { A.panel = shopOn ? PANEL_NONE : PANEL_SHOP; A.sel2 = 0; sfx(shopOn ? "ui_close" : "ui_open"); }
  int itemsLock = A.panel == PANEL_NONE && A.game == G_CRASH && G.flying; // keep cash-out reachable
  if (button(31, 170, y, 94, 17, itemsLock ? B_DIM : itemsOn ? B_GOLD : B_PURPLE, "", 1)) { A.panel = itemsOn ? PANEL_NONE : PANEL_ITEMS; A.sel2 = 0; sfx(itemsOn ? "ui_close" : "ui_open"); }
  spr(sprites_icon_shop_idx, 86, y - 1, 1);
  text(110, y + 5, 1, shopOn ? C_INK : lock ? C_GREY : C_CREAM, "SHOP");
  spr(sprites_bag_idx, 186, y + 1, 1);
  text(210, y + 5, 1, itemsOn ? C_INK : C_CREAM, "ITEMS");
}

static void betPanel(void) {
  panel(4, 160, 312, 50, C_PURPLE_L, C_PANEL);
  int lock = gameBusy();
  text(14, 168, 1, C_CREAM, "BET");
  char b[16];
  snprintf(b, sizeof b, "$%d", A.bet);
  textO(14, 182, textW(b, 2) > 62 ? 1 : 2, C_GOLD, C_INK, b);
  rect(84, 168, 1, 34, C_PURPLE_L);
  static const char *L[4] = { "MIN", "+10", "+25", "MAX" };
  for (int i = 0; i < 4; i++) {
    int style = lock ? B_DIM : i == 3 ? B_GOLD : B_PURPLE;
    if (button(40 + i, 92 + i * 56, 170, 52, 30, style, L[i], 1)) {
      A.bet = clampBet(i == 0 ? 1 : i == 1 ? A.bet + 10 : i == 2 ? A.bet + 25 : 1 << 30);
      sfx("bet_chip");
    }
  }
}

static void bottomGame(void) {
  tiles(sprites_cabinet_idx, 0, 0, BOT_W, SCREEN_H);
  drawTabs(A.game);
  drawDice(10, 68, -1);
  itemColumn();
  gameDrawControls();
  shopItemsRow(142);
  betPanel();
  gameFooter();
}

// ======================= shop / items =======================
// Card labels: two short lines, as on the shop mockup ("DEALERS PEEK"); the full name is on the top screen.
static const char *CARD_NAME[IT_COUNT] = {
  [IT_DOUBLE_COIN] = "DOUBLE\nCOIN", [IT_HULA] = "LUCKY\nHULA GIRL", [IT_BOTTLE] = "TIME IN A\nBOTTLE", [IT_MAGNET] = "ROULETTE\nMAGNET",
  [IT_FLOATIES] = "POOL\nFLOATIES", [IT_INSURANCE] = "INSURANCE\nTICKET", [IT_FILTH_TEA] = "FILTH-TEA", [IT_MATCH] = "LUCKY\nMATCH",
  [IT_SHIELD] = "HEAT\nSHIELD", [IT_GREASE] = "GREASE\nFIRE", [IT_CUTTER] = "GOAL\nCUTTER", [IT_PEEK] = "DEALERS\nPEEK",
  [IT_HORSESHOE] = "GOLDEN\nHORSESHOE", [IT_WEIGHTED] = "WEIGHTED\nBALL", [IT_CASHBACK] = "CASHBACK\nCOUPON",
  [IT_JESTER] = "THOTTIES\nJESTER HAT", [IT_ROSEKAT] = "MAGNUM\nOPUS", [IT_VINYL] = "RECORD\nVINYL",
};
static void money(char *out, size_t n, double v) { snprintf(out, n, v < 0 ? "-$%.2f" : "$%.2f", fabs(v)); }
static void detailPanel(int it, int shop, int slot) {
  tiles(sprites_cabinet_idx, 0, HUD_H, TOP_W, FIELD_H);
  textCO(200, 32, 2, C_CREAM, C_INK, shop ? "CASINO SHOP" : "YOUR ITEMS");
  panel(10, 54, 380, 182, C_PURPLE_L, C_PANEL);
  float cx[2] = { 13, 383 }, cy[2] = { 57, 229 };
  for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) rect(cx[i], cy[j], 4, 4, C_GOLD);
  if (it < 0) {
    textCO(200, 112, 2, C_CREAM, C_INK, "NO ITEMS YET");
    textC(200, 140, 1, C_CREAM_D, "BUY ITEMS IN THE SHOP. OPEN ITEMS WITH X.");
    return;
  }
  const item_def *d = &ITEMS[it];
  oct(30, 66, 104, 92, 6, C_PURPLE_L);
  oct(32, 68, 100, 88, 5, RGB(0x1D1A2C));
  spr(d->sprite, 82 - 39, 112 - 39, 3);
  rect(146, 70, 1, 84, C_PURPLE_L);
  int h = wrapL(158, 66, 226, 2, C_GOLD, d->name);
  text(158, 70 + h, 2, C_CREAM, d->type);
  char p[32];
  if (shop) {
    int price = itemPrice(it), sold = A.shopSold[slot];
    snprintf(p, sizeof p, sold ? "SOLD OUT" : "$%d", price);
    textO(158, 94 + h, 3, sold ? C_GREY : A.balance >= price ? C_GOLD : C_CORAL, C_INK, p);
  } else {
    snprintf(p, sizeof p, "OWNED: %d", A.inv[it]);
    textO(158, 94 + h, 3, C_GOLD, C_INK, p);
  }
  rect(30, 164, 340, 1, C_PURPLE_L);
  int ds = textW(d->desc, 2) > 680 ? 1 : 2;
  int dh = wrapC(200, ds == 2 ? 169 : 174, 350, ds, C_CREAM, d->desc);
  if (!shop && d->effect[0] && dh <= 22) textC(200, 171 + dh, 2, C_CYAN, d->effect);
  rect(30, 212, 340, 1, C_PURPLE_L);
  textC(200, 218, 1, C_CREAM, shop ? "REFRESHES AFTER EACH GOAL OR NEW RUN." : d->note);
}

static void gridMove(u32 down, int n) {
  if (n <= 0) return;
  int s = A.sel2;
  if (down & KEY_RIGHT && s % 2 == 0 && s + 1 < n) s++;
  if (down & KEY_LEFT && s % 2 == 1) s--;
  if (down & KEY_DOWN && s + 2 < n) s += 2;
  if (down & KEY_UP && s - 2 >= 0) s -= 2;
  if (s != A.sel2) { A.sel2 = s; sfx("ui_hover"); }
}

static void topShop(void) {
  int s = A.sel2 < 4 ? A.sel2 : 0;
  detailPanel(A.shop[s], 1, s);
  hud();
}

static void bottomShop(u32 down) {
  tiles(sprites_cabinet_idx, 0, 0, BOT_W, SCREEN_H);
  drawTabs(-1);
  drawDice(6, 70, -1);
  itemColumn();
  gridMove(down, 4);
  for (int i = 0; i < 4; i++) {
    float x = 62 + (i & 1) * 101, y = 46 + (i >> 1) * 52;
    int it = A.shop[i], sel = A.sel2 == i, sold = A.shopSold[i], price = itemPrice(it);
    int style = sold ? B_DIM : sel ? B_GOLD : B_PURPLE;
    if (button(50 + i, x, y, 97, 48, style | (sold && sel ? 0x100 : 0), "", 1)) { if (A.sel2 == i) down |= KEY_A; A.sel2 = i; sfx("ui_hover"); }
    if (!sold) spr(ITEMS[it].sprite, x + 5, y + 11, 1);
    u32 tc = sold ? C_GREY : sel ? C_INK : C_CREAM;
    text(x + 35, y + 5, 1, tc, CARD_NAME[it]);
    char p[16];
    snprintf(p, sizeof p, sold ? "SOLD" : "$%d", price);
    if (sel && !sold) text(x + 35, y + 31, 2, C_INK, p);
    else textO(x + 35, y + 31, 2, sold ? C_GREY : (A.balance >= price ? C_GOLD : C_CORAL), C_INK, p);
  }
  shopItemsRow(151);
  panel(4, 168, 312, 44, C_PURPLE_L, C_PANEL);
  int it = A.shop[A.sel2], price = itemPrice(it), sold = A.shopSold[A.sel2], can = !sold && A.balance >= price;
  char a[24];
  money(a, sizeof a, A.balance - (sold ? 0 : price));
  textC(70, 175, 1, C_CREAM, "AFTER BUY");
  textCO(70, 187, 2, sold ? C_GREY : A.balance - price >= 0 ? C_GOLD : C_CORAL, C_INK, sold ? "-" : a);
  rect(138, 175, 1, 30, C_PURPLE_L);
  char bl[24];
  snprintf(bl, sizeof bl, sold ? "SOLD OUT" : "BUY $%d", price);
  if (button(60, 148, 172, 160, 36, can ? B_GOLD : B_DIM, "", 1)) down |= KEY_A;
  if (can) padGlyph(160, 184, 'A');
  textC(can ? 236 : 228, 186, 2, can ? C_INK : C_GREY, bl);
  footer("D:SELECT|A:BUY|B:BACK|X:ITEMS|Y:CLOSE");
  if (down & KEY_A) {
    if (sold) sfx("ui_error");
    else if (A.balance < price) { sfx("ui_nofunds"); toast("NOT ENOUGH MONEY"); }
    else {
      pressFlash(60);
      A.balance -= price; A.inv[it]++; A.shopSold[A.sel2] = 1;
      sfx("ui_buy");
      fxBurst(82, 112, 10, 1, 1.0f);
      char t[48]; snprintf(t, sizeof t, "BOUGHT %s", ITEMS[it].name); toast(t);
      checkRun();
    }
  }
}

static void topItems(void) {
  int kinds[IT_COUNT], n = ownedKinds(kinds, IT_COUNT);
  if (A.sel2 >= n) A.sel2 = n ? n - 1 : 0;
  detailPanel(n ? kinds[A.sel2] : -1, 0, 0);
  hud();
}

static void bottomItems(u32 down) {
  tiles(sprites_cabinet_idx, 0, 0, BOT_W, SCREEN_H);
  drawTabs(-1);
  drawDice(6, 70, -1);
  int kinds[IT_COUNT], n = ownedKinds(kinds, IT_COUNT);
  gridMove(down, n);
  int page = A.sel2 / 4;
  if (!n) textC(188, 80, 1, C_CREAM_D, "NO ITEMS YET.\nVISIT THE SHOP.");
  for (int k = 0; k < 4; k++) {
    int i = page * 4 + k;
    if (i >= n) break;
    float x = 62 + (k & 1) * 128, y = 46 + (k >> 1) * 52;
    int it = kinds[i], sel = A.sel2 == i;
    if (button(70 + k, x, y, 124, 48, sel ? B_GOLD : B_PURPLE, "", 1)) { if (A.sel2 == i) down |= KEY_A; A.sel2 = i; sfx("ui_hover"); }
    spr(ITEMS[it].sprite, x + 5, y + 11, 1);
    text(x + 36, y + 5, 1, sel ? C_INK : C_CREAM, CARD_NAME[it]);
    char c[8];
    snprintf(c, sizeof c, "X%d", A.inv[it]);
    if (sel) text(x + 36, y + 31, 2, C_INK, c); else textO(x + 36, y + 31, 2, C_CREAM, C_INK, c);
    if (ITEMS[it].autoBadge) {
      oct(x + 84, y + 31, 36, 13, 2, sel ? C_INK : C_GOLD_D);
      oct(x + 85, y + 32, 34, 11, 2, sel ? C_GOLD : RGB(0x221D33));
      textC(x + 102, y + 33, 1, sel ? C_INK : C_GOLD, "AUTO");
    }
  }
  if (n > 4) { char pg[16]; snprintf(pg, sizeof pg, "PAGE %d/%d", page + 1, (n + 3) / 4); textC(32, 136, 1, C_GREY, pg); }
  shopItemsRow(151);
  panel(4, 168, 312, 44, C_PURPLE_L, C_PANEL);
  int it = n ? kinds[A.sel2] : -1;
  char o[16];
  snprintf(o, sizeof o, "OWNED %d", it >= 0 ? A.inv[it] : 0);
  textCO(70, 183, 2, C_CREAM, C_INK, o);
  rect(138, 175, 1, 30, C_PURPLE_L);
  const char *why = it >= 0 ? itemCanUseNow(it) : "NO ITEM";
  if (button(61, 148, 172, 160, 36, why ? B_DIM : B_GOLD, "", 1)) down |= KEY_A;
  if (!why) { padGlyph(160, 184, 'A'); textC(236, 186, 2, C_INK, "USE ITEM"); }
  else wrapC(228, why[0] && textW(why, 1) > 150 ? 180 : 186, 150, 1, C_GREY, why);
  footer("D:SELECT|A:USE|B:BACK|X:CLOSE|Y:SHOP");
  if (down & KEY_A && it >= 0) { pressFlash(61); useItem(it); }
}

// ======================= menus =======================
static int menuNav(u32 down, int n) {
  if (A.menuLock) return 0;
  if (down & KEY_DOWN) { A.sel = (A.sel + 1) % n; sfx("ui_hover"); }
  if (down & KEY_UP) { A.sel = (A.sel + n - 1) % n; sfx("ui_hover"); }
  return (down & KEY_A) ? 1 : 0;
}
static void footerFramed(const char *spec) { footerEx(spec, 1); }

// Big first button plus two wide ones (start and pause menus).
static int menuButtons(const char **labels) {
  static const float Y[3] = { 46, 104, 142 }, H[3] = { 48, 30, 30 };
  int tapped = -1;
  for (int i = 0; i < 3; i++) {
    float x = i == 0 ? 98 : 34, w = i == 0 ? 186 : 250;
    if (button(100 + i, x, Y[i], w, H[i], A.sel == i ? B_GOLD : B_PURPLE, labels[i], i == 0 ? 3 : 2)) { tapped = i; A.sel = i; }
  }
  if (A.sel == 0) { sparkle(100, 48, A.tick, C_GOLD); sparkle(282, 90, A.tick + 20, C_GOLD); }
  return tapped;
}

static void topTitle(void) {
  frameScreen(TOP_W, SCREEN_H);
  for (int i = 0; i < 11; i++) { // marquee bulbs chase
    int on = A.reduced ? (i & 1) : ((i + A.tick / 8) & 1);
    sprFrame(sprites_bulb_idx, on, 2, 122 + i * 15, 14, 1, 1);
    sprFrame(sprites_bulb_idx, !on, 2, 122 + i * 15, 158, 1, 1);
  }
  C2D_Image logo = img(sprites_logo_idx);
  float bob = A.reduced ? 0 : ((A.tick / 40) & 1);
  C2D_DrawImageAt(logo, floorf(200 - logo.subtex->width), 26 + bob, 0.5f, NULL, 2, 2);
  sparkle(70, 70, A.tick, C_GOLD);
  sparkle(334, 40, A.tick + 13, C_CYAN);
  textCO(200, 172, 2, C_GOLD, C_INK, "MAKE THE GOAL BEFORE TIME RUNS OUT.");
  textC(200, 197, 1, C_CREAM, "WIN BIG. RISK MORE.");
  textC(200, 210, 1, C_CREAM, "CASH OUT BEFORE IT ALL DISAPPEARS.");
}

static void bottomTitle(u32 down) {
  frameScreen(BOT_W, SCREEN_H);
  titleRule(160, 14, 280, 2, C_CREAM, "READY TO RUN?");
  drawDice(30, 42, 1);
  static const char *L[3] = { "PLAY", "HOW TO PLAY", "SETTINGS" };
  int t = menuButtons(L);
  textC(160, 186, 1, C_CREAM, "START $100  |  GOAL $300  |  2 MIN");
  footerFramed("D:SELECT|A:CONFIRM|T:TAP TO SELECT");
  int act = menuNav(down, 3) ? A.sel : t;
  if (act < 0) return;
  pressFlash(100 + act);
  sfx("ui_confirm");
  if (act == 0) newRun();
  else if (act == 1) { A.backTo = SC_TITLE; A.helpTopic = 0; A.helpInGames = 0; go(SC_HELP); }
  else { A.backTo = SC_TITLE; go(SC_SETTINGS); }
}

static void topPause(void) {
  drawField();
  dimField(150);
  hud();
  overlayBegin(200, 133);
  panel(71, 84, 258, 99, C_PURPLE_L, C_PANEL);
  textCO(200, 92, 4, C_GOLD, C_INK, "PAUSED");
  sparkle(100, 108, A.tick, C_GOLD);
  sparkle(300, 108, A.tick + 20, C_GOLD);
  rect(96, 132, 208, 1, C_PURPLE_L);
  textCO(200, 140, 2, C_CREAM, C_INK, "TAKE A BREATHER.");
  textCO(200, 160, 2, C_CREAM, C_INK, "YOUR RUN IS PAUSED.");
  C2D_ViewReset();
}

static void bottomPause(u32 down) {
  frameScreen(BOT_W, SCREEN_H);
  titleRule(160, 14, 280, 2, C_CREAM, "PAUSE MENU");
  drawDice(30, 42, 0);
  static const char *L[3] = { "RESUME", "SETTINGS", "HOW TO PLAY" };
  int t = menuButtons(L);
  textC(160, 186, 1, C_CREAM, "TIMER STOPPED WHILE PAUSED");
  footerFramed("D:SELECT|A:CONFIRM|B:RESUME");
  int act = menuNav(down, 3) ? A.sel : t;
  if (!A.menuLock && (down & (KEY_B | KEY_START))) act = 0;
  if (act < 0) return;
  pressFlash(100 + act);
  sfx(act == 0 ? "ui_close" : "ui_confirm");
  if (act == 0) go(SC_GAME);
  else if (act == 1) { A.backTo = SC_PAUSE; go(SC_SETTINGS); }
  else { A.backTo = SC_PAUSE; A.helpTopic = 0; A.helpInGames = 0; go(SC_HELP); }
}

// ---------- settings ----------
static void topSettings(void) {
  if (A.running) { tiles(sprites_cabinet_idx, 0, HUD_H, TOP_W, FIELD_H); hud(); }
  else frameScreen(TOP_W, SCREEN_H);
  titleRule(200, 36, 260, 2, C_CREAM, "SETTINGS");
  panel(28, 62, 344, 150, C_PURPLE_L, C_PANEL);
  drawDice(52, 96, 1);
  rect(124, 74, 1, 98, C_PURPLE_L);
  static const char *NAME[4] = { "MUSIC", "SOUND EFFECTS", "REDUCED MOTION", "BACK" };
  static const char *DESC[4] = { "BACKGROUND MUSIC FOR\nEACH GAME AND MENU.", "BUTTONS, WINS, CARDS,\nPEGS AND COUNTDOWN.",
    "LESS SCREEN SHAKE.\nFEWER PARTICLES AND FLASHES.", "SAVE YOUR SETTINGS\nAND GO BACK." };
  int s = A.sel;
  textO(136, 76, 2, C_GOLD, C_INK, NAME[s]);
  rect(136, 98, 222, 1, C_PURPLE_L);
  text(136, 106, 1, C_CREAM, DESC[s]);
  char v[16] = "";
  if (s == 0) snprintf(v, sizeof v, "%d%%", A.music);
  else if (s == 1) snprintf(v, sizeof v, "%d%%", A.sfx);
  else if (s == 2) snprintf(v, sizeof v, "%s", A.reduced ? "ON" : "OFF");
  textCO(247, 134, 4, s == 2 && !A.reduced ? C_GREY : C_CYAN, C_INK, v);
  rect(44, 184, 312, 1, C_PURPLE_L);
  textC(200, 192, 1, C_CREAM, "GAMEPLAY AND ODDS STAY THE SAME");
}

static void volumeRow(int row, float y, const char *label, int *val) {
  int sel = A.sel == row;
  oct(14, y, 292, 28, 4, C_INK);
  oct(15, y + 1, 290, 26, 3, sel ? C_GOLD : C_PURPLE_L);
  oct(17, y + 3, 286, 22, 2, RGB(0x2E2550));
  textO(26, y + 10, 1, C_CREAM, C_INK, label);
  if (button(200 + row * 2, 126, y + 4, 20, 20, B_PURPLE, "-", 1)) { *val = *val >= 10 ? *val - 10 : 0; A.sel = row; sfx("ui_click"); }
  for (int i = 0; i < 10; i++) rect(150 + i * 8, y + 7, 7, 14, i < *val / 10 ? C_CYAN : C_PANELHI);
  char p[8];
  snprintf(p, sizeof p, "%d%%", *val);
  textO(266 - textW(p, 1), y + 10, 1, C_CREAM, C_INK, p);
  if (button(201 + row * 2, 274, y + 4, 20, 20, B_PURPLE, "+", 1)) { *val = *val <= 90 ? *val + 10 : 100; A.sel = row; sfx("ui_click"); }
}

static void bottomSettings(u32 down) {
  frameScreen(BOT_W, SCREEN_H);
  titleRule(160, 12, 280, 2, C_CREAM, "AUDIO AND COMFORT");
  if (!A.menuLock) {
    if (down & KEY_DOWN) { A.sel = (A.sel + 1) % 4; sfx("ui_hover"); }
    if (down & KEY_UP) { A.sel = (A.sel + 3) % 4; sfx("ui_hover"); }
    int d = (down & KEY_RIGHT) ? 1 : (down & KEY_LEFT) ? -1 : 0;
    if (d && A.sel == 0) { A.music += d * 10; if (A.music < 0) A.music = 0; if (A.music > 100) A.music = 100; sfx("ui_click"); }
    if (d && A.sel == 1) { A.sfx += d * 10; if (A.sfx < 0) A.sfx = 0; if (A.sfx > 100) A.sfx = 100; sfx("ui_click"); }
    if (d && A.sel == 2) { A.reduced = d < 0; sfx("ui_click"); }
    if (down & KEY_A && A.sel == 2) { A.reduced = !A.reduced; sfx("ui_click"); }
  }
  volumeRow(0, 36, "MUSIC", &A.music);
  volumeRow(1, 72, "SOUND EFFECTS", &A.sfx);
  oct(14, 108, 292, 30, 4, C_INK);
  oct(15, 109, 290, 28, 3, A.sel == 2 ? C_GOLD : C_PURPLE_L);
  oct(17, 111, 286, 24, 2, RGB(0x2E2550));
  textO(26, 119, 1, C_CREAM, C_INK, "REDUCED MOTION");
  if (button(210, 168, 112, 62, 22, A.reduced ? B_GOLD : B_PURPLE, "ON", 1)) { A.reduced = 1; A.sel = 2; sfx("ui_click"); }
  if (button(211, 234, 112, 62, 22, !A.reduced ? B_GOLD : B_PURPLE, "OFF", 1)) { A.reduced = 0; A.sel = 2; sfx("ui_click"); }
  int back = button(212, 52, 148, 216, 30, A.sel == 3 ? B_GOLD : B_PURPLE, "BACK", 2);
  if (A.backTo == SC_PAUSE) textC(160, 186, 1, C_CREAM, "YOUR RUN STAYS PAUSED");
  footerFramed("D:SELECT|<>:ADJUST|B:BACK");
  if (back || (!A.menuLock && ((down & KEY_B) || (down & KEY_A && A.sel == 3)))) {
    saveWrite();
    sfx("ui_close");
    int s = A.backTo == SC_PAUSE ? 1 : 2;
    go(A.backTo);
    A.sel = s;
  }
}

// ---------- how to play ----------
static const char *TOPIC[5] = { "BASICS", "GAMES", "HOT STREAK", "ITEMS", "CONTROLS" };
static const char *GUIDE_NAME[G_COUNT] = { "PLINKO", "ROULETTE", "CRASH", "BLACKJACK", "RIVER", "HORSE RACE" };
static const char *GUIDE_STEPS[G_COUNT] = {
  "1. CHOOSE\n   YOUR BET.\n2. PRESS A\n   TO DROP.\n3. LAND FOR\n   A PAYOUT.",
  "1. CHOOSE\n   YOUR BET.\n2. PICK A\n   COLOUR.\n3. PRESS A\n   TO SPIN.",
  "1. PRESS A\n   TO LAUNCH.\n2. WATCH IT\n   CLIMB.\n3. A OR B:\n   CASH OUT.",
  "BEAT THE\nDEALER.\nSTAY AT\n21 OR LESS.\nA: DEAL/HIT\nB: STAND",
  "A: START/STEP\nB: CASH OUT\n\nEACH STEP\nRAISES RISK\nAND PAYOUT.",
  "1. PICK YOUR\n   HORSE.\n2. CHOOSE\n   YOUR BET.\n3. PRESS A\n   TO RACE." };
static const char *GUIDE_L1[G_COUNT] = { "PAYOUT = BET X SLOT MULTIPLIER", "RED / BLACK: 2X  |  GREEN: 14X", "CASH OUT BEFORE THE CRASH!",
  "WIN 2X  |  NATURAL 2.5X  |  TIE 1X", "CASH OUT TO KEEP YOUR RETURN.", "YOUR HORSE WINS: 4X RETURN" };
static const char *GUIDE_L2[G_COUNT] = { "$10 BET X 2X = $20 RETURN", "WINNING PAYOUT INCLUDES YOUR STAKE.", "CRASH BEFORE CASHING OUT = LOST BET.",
  "PAYOUT INCLUDES YOUR STAKE", "GET HIT AND LOSE YOUR BET.", "$10 BET = $40 RETURN BEFORE BONUSES" };

static void demoState(int g) {
  memset(&G, 0, sizeof G);
  G.lastSlot = -1; G.result = -1; G.winner = -1; G.mult = 1; G.colour = CR_RED;
  if (g == G_PLINKO) { G.dropping = 40; G.ballX = 217; G.ballY = 86; }
  else if (g == G_ROULETTE) { int i = 0; while (cr_wheel_order[i] != 21) i++; G.angle = -i * 6.2831853f / 37; G.result = 21; }
  else if (g == G_CRASH) { G.flying = 1; G.frames = 65; G.mult = 1.65; }
  else if (g == G_BLACKJACK) { G.dh[0] = 29; G.dh[1] = 12; G.dn = 2; G.ph[0] = 45; G.ph[1] = 44; G.pn = 2; G.phase = 1; }
  else if (g == G_RIVER) { G.crossing = 1; G.lane = 2; }
  else { G.race = 150; G.winner = 1; G.pick = 1; }
}

static void helpBasics(void) {
  panel(14, 66, 372, 76, C_PURPLE_L, C_PANEL);
  drawDice(28, 74, 1);
  rect(94, 74, 1, 60, C_PURPLE_L);
  spr(sprites_coin_idx, 106, 81, 1);
  textO(126, 80, 2, C_CREAM, C_INK, "START WITH $100.");
  spr(sprites_goalFlag_idx, 105, 106, 2);
  textO(126, 108, 2, C_CREAM, C_INK, "REACH $300 IN");
  float x = 130 + textW("REACH $300 IN", 2);
  spr(sprites_timer_idx, x, 110, 1);
  textO(x + 18, 108, 2, C_CREAM, C_INK, "2 MIN.");
  panel(14, 150, 182, 72, C_PURPLE_L, C_PANEL);
  spr(sprites_coin_idx, 26, 159, 1);
  textO(46, 159, 2, C_GOLD, C_INK, "CASH OUT");
  rect(26, 180, 158, 1, C_PURPLE_L);
  text(26, 188, 1, C_CREAM, "END THE RUN.\nSAVE YOUR SCORE.");
  panel(204, 150, 182, 72, C_PURPLE_L, C_PANEL);
  sprFrame(sprites_flame_idx, (A.tick / 6) % 3, 3, 216, 158, 1, 1);
  textO(234, 159, 2, C_CYAN, C_INK, "KEEP GOING");
  rect(216, 180, 158, 1, C_PURPLE_L);
  text(216, 188, 1, C_CREAM, "CHASE A HIGHER GOAL.\nGET A FRESH 2 MINUTES.");
}

static void helpGame(int g) {
  panel(12, 66, 376, 134, C_PURPLE_L, C_PANEL);
  games_t save = G;
  demoState(g);
  C2D_ViewTranslate(22, 76);
  C2D_ViewScale(0.5f, 0.5f);
  uiSnap = 2;
  gameDrawTop(g, 1);
  uiSnap = 1;
  C2D_ViewReset();
  G = save;
  rect(15, 72, 7, 124, C_PANEL); rect(222, 72, 10, 124, C_PANEL); // crop sprites drifting past the preview window
  rect(21, 75, 202, 1, C_PURPLE_L); rect(21, 182, 202, 1, C_PURPLE_L);
  rect(21, 75, 1, 108, C_PURPLE_L); rect(222, 75, 1, 108, C_PURPLE_L);
  rect(234, 76, 1, 114, C_PURPLE_L);
  { // six 2x lines at 19 px so the steps fit the panel
    char buf[160];
    snprintf(buf, sizeof buf, "%s", GUIDE_STEPS[g]);
    float y = 79;
    for (char *line = strtok(buf, "\n"); line; line = strtok(NULL, "\n"), y += 19) text(244, y, 2, C_CREAM, line);
  }
  panel(12, 204, 376, 34, C_PURPLE_L, RGB(0x221D33));
  textC(200, 210, 1, C_GOLD, GUIDE_L1[g]);
  textC(200, 223, 1, C_CREAM, GUIDE_L2[g]);
}

static void helpStreak(void) {
  panel(14, 66, 372, 76, C_PURPLE_L, C_PANEL);
  static const char *W[6] = { "WINS", "1", "2", "3", "4", "5+" }, *B[6] = { "PROFIT\nBONUS", "+0%", "+10%", "+20%", "+35%", "+50%" };
  static const float X[7] = { 20, 74, 126, 178, 230, 282, 380 };
  for (int c = 0; c < 6; c++) {
    float cx = (X[c] + X[c + 1]) / 2 - (c == 5 ? 22 : 0);
    if (c) rect(X[c], 72, 1, 64, C_PURPLE_L);
    textCO(cx, 78, c ? 2 : 1, c == 5 ? C_GOLD : C_CREAM, C_INK, W[c]);
    textCO(c == 5 ? cx + 22 : cx, c ? 110 : 106, c ? 2 : 1, c == 5 ? C_GOLD : C_CREAM, C_INK, B[c]);
  }
  rect(20, 100, 360, 1, C_PURPLE_L);
  for (int k = 0; k < 3; k++) sprFrame(sprites_flame_idx, (A.tick / 6 + k) % 3, 3, 330 + k * 12, 72, 1, 1);
  textO(320, 89, 1, C_GOLD, C_INK, "ON FIRE!");
  oct(108, 148, 184, 18, 4, C_GOLD);
  oct(110, 150, 180, 14, 3, RGB(0x221D33));
  textC(200, 153, 1, C_GOLD, "BONUS APPLIES TO PROFIT.");
  panel(14, 170, 372, 28, C_PURPLE_L, C_PANEL);
  text(26, 180, 1, C_CREAM, "EXAMPLE:");
  rect(84, 174, 1, 20, C_PURPLE_L);
  text(96, 176, 2, C_CREAM, "$10 PROFIT + 20% =");
  textO(98 + textW("$10 PROFIT + 20% =", 2) + 8, 176, 2, C_GOLD, C_INK, "$12");
  text(26, 210, 1, C_CREAM, "A LOSS RESETS YOUR STREAK.");
  rect(196, 204, 1, 24, C_PURPLE_L);
  text(208, 206, 1, C_GOLD, "ITEMS");
  text(208 + textW("ITEMS ", 1), 206, 1, C_CREAM, "CAN PROTECT");
  text(208, 217, 1, C_CREAM, "YOUR STREAK.");
}

static void helpItems(void) {
  panel(14, 66, 372, 46, C_PURPLE_L, C_PANEL);
  spr(sprites_icon_shop_idx, 44, 71, 2);
  sparkle(36, 80, A.tick, C_GOLD); sparkle(90, 80, A.tick + 20, C_GOLD);
  rect(102, 72, 1, 34, C_PURPLE_L);
  textO(116, 72, 2, C_CREAM, C_INK, "BUY IN THE SHOP.");
  textO(116, 91, 2, C_CREAM, C_INK, "OPEN ITEMS WITH");
  padGlyph(126 + textW("OPEN ITEMS WITH", 2), 94, 'X');
  panel(18, 118, 364, 46, C_PURPLE_L, C_PANEL);
  spr(sprites_timeBottle_idx, 30, 128, 1);
  rect(86, 124, 1, 34, C_PURPLE_L);
  textO(98, 124, 2, C_GOLD, C_INK, "TIME IN A BOTTLE");
  text(98, 147, 1, C_CREAM, "USE TO ADD 30 SECONDS.");
  panel(18, 170, 364, 46, C_PURPLE_L, C_PANEL);
  spr(sprites_luckyMatch_idx, 30, 180, 1);
  rect(86, 176, 1, 34, C_PURPLE_L);
  textO(98, 176, 2, C_GOLD, C_INK, "LUCKY MATCH");
  text(98, 199, 1, C_CREAM, "AUTO: PROTECTS YOUR STREAK ONCE.");
  textC(200, 225, 1, C_CREAM, "CHECK EACH ITEM FOR WHEN IT CAN BE USED.");
}

static void helpControls(void) {
  panel(14, 66, 372, 46, C_PURPLE_L, C_PANEL);
  drawDice(44, 60, 0);
  rect(112, 72, 1, 34, C_PURPLE_L);
  textCO(250, 72, 2, C_CREAM, C_INK, "USE THESE CONTROLS\nTO PLAY CASINO RUN.");
  panel(18, 116, 364, 122, C_PURPLE_L, C_PANEL);
  static const char K[7] = { 'A', 'B', 'X', 'Y', 'L', 'S', 'D' };
  static const char *D[7] = { "PRIMARY ACTION", "BACK / SECONDARY ACTION", "OPEN ITEMS", "OPEN SHOP", "SWITCH GAME", "PAUSE", "SELECT / ADJUST BET" };
  for (int i = 0; i < 7; i++) {
    float y = 120 + floorf(i * 16.5f);
    if (i) rect(22, y - 1, 356, 1, C_PURPLE_L);
    if (i == 4) { padGlyph(66, y + 1, 'L'); text(80, y + 3, 1, C_GREY, "/"); padGlyph(88, y + 1, 'R'); }
    else if (i == 5) { padGlyph(56, y + 1, 'S'); text(72, y + 3, 1, C_CREAM, "START"); }
    else padGlyph(72, y + 1, K[i]);
    text(150, y + 3, 1, C_CREAM, D[i]);
  }
  rect(136, 118, 1, 118, C_PURPLE_L);
}

static void topHelp(void) {
  if (A.running) { tiles(sprites_cabinet_idx, 0, HUD_H, TOP_W, FIELD_H); hud(); }
  else tiles(sprites_cabinet_idx, 0, 0, TOP_W, SCREEN_H);
  titleRule(200, 31, 300, 2, C_CREAM, "HOW TO PLAY");
  char sub[40];
  if (A.helpTopic == 1) snprintf(sub, sizeof sub, "GAMES - %s", GUIDE_NAME[A.helpGame]);
  else snprintf(sub, sizeof sub, "%s", TOPIC[A.helpTopic]);
  textCO(200, 53, 1, C_GOLD, C_INK, sub);
  switch (A.helpTopic) {
    case 0: helpBasics(); break;
    case 1: helpGame(A.helpGame); break;
    case 2: helpStreak(); break;
    case 3: helpItems(); break;
    default: helpControls();
  }
}

static void bottomHelp(u32 down) {
  frameScreen(BOT_W, SCREEN_H);
  int paused = A.backTo == SC_PAUSE;
  if (A.helpInGames) {
    titleRule(160, 12, 280, 2, C_CREAM, "CHOOSE A GAME");
    if (!A.menuLock) {
      int g = A.helpGame;
      if (down & KEY_RIGHT && g % 2 == 0) g++;
      if (down & KEY_LEFT && g % 2 == 1) g--;
      if (down & KEY_DOWN && g + 2 < G_COUNT) g += 2;
      if (down & KEY_UP && g >= 2) g -= 2;
      if (g != A.helpGame) { A.helpGame = g; sfx("ui_hover"); }
    }
    for (int i = 0; i < G_COUNT; i++) {
      float x = 16 + (i & 1) * 148, y = 38 + (i >> 1) * 40;
      int sel = A.helpGame == i;
      if (button(300 + i, x, y, 140, 34, sel ? B_SEL : B_PURPLE, "", 1)) { A.helpGame = i; sfx("ui_hover"); }
      spr(TAB_ICON[i], x + 10, y + 8, 1);
      textO(x + 84 - textW(TAB_NAME[i], 2) / 2.0f, y + 9, 2, sel ? C_GOLD : C_CREAM, C_INK, TAB_NAME[i]);
    }
    int prev = button(320, 30, 160, 89, 20, B_OUTLINE, "PREV TOPIC", 1);
    int next = button(321, 201, 160, 89, 20, B_OUTLINE, "NEXT TOPIC", 1);
    textCO(160, 162, 2, C_CREAM, C_INK, "2 / 5");
    if (paused) textC(160, 189, 1, C_CREAM, "YOUR RUN STAYS PAUSED");
    footerFramed("D:SELECT|A:OPEN|L/R:TOPIC|B:BACK");
    if (!A.menuLock && (down & KEY_B)) { A.helpInGames = 0; sfx("ui_close"); A.menuLock = 6; }
    if (prev || (!A.menuLock && (down & KEY_L))) { A.helpInGames = 0; A.helpTopic = 0; sfx("ui_tab"); }
    if (next || (!A.menuLock && (down & KEY_R))) { A.helpInGames = 0; A.helpTopic = 2; sfx("ui_tab"); }
    return;
  }
  titleRule(160, 12, 280, 2, C_CREAM, "CHOOSE A TOPIC");
  int ctl = A.helpTopic == 4;
  float r0 = ctl ? 34 : 38, rh = ctl ? 26 : 30, gap = ctl ? 31 : 38;
  if (!A.menuLock) {
    int t = A.helpTopic;
    static const int DN[5] = { 2, 3, 4, 4, 4 }, UP[5] = { 0, 1, 0, 1, 2 }, RT[5] = { 1, 1, 3, 3, 4 }, LT[5] = { 0, 0, 2, 2, 4 };
    if (down & KEY_DOWN) t = DN[t];
    if (down & KEY_UP) t = UP[t];
    if (down & KEY_RIGHT) t = RT[t];
    if (down & KEY_LEFT) t = LT[t];
    if (down & KEY_R && t < 4) t++;
    if (down & KEY_L && t > 0) t--;
    if (t != A.helpTopic) { A.helpTopic = t; sfx("ui_hover"); }
  }
  for (int i = 0; i < 5; i++) {
    float x = i == 4 ? 20 : 20 + (i & 1) * 144, y = r0 + (i >> 1) * gap, w = i == 4 ? 278 : 134;
    if (button(330 + i, x, y, w, rh, A.helpTopic == i ? B_SEL : B_PURPLE, TOPIC[i], 2)) {
      if (A.helpTopic == i && i == 1) { A.helpInGames = 1; A.menuLock = 4; }
      A.helpTopic = i; sfx("ui_hover");
    }
  }
  float py = ctl ? 132 : 156;
  int prev = button(340, 44, py, 73, 22, A.helpTopic > 0 ? B_OUTLINE : B_OUTLINE_DIM, "PREV", 1);
  int next = button(341, 203, py, 73, 22, A.helpTopic < 4 ? B_OUTLINE : B_OUTLINE_DIM, "NEXT", 1);
  char pg[8];
  snprintf(pg, sizeof pg, "%d / 5", A.helpTopic + 1);
  textCO(160, py + 3, 2, C_CREAM, C_INK, pg);
  if (ctl) textC(160, 160, 1, C_CREAM, "FOLLOW EACH GAMES BUTTON HINTS.\nTAP BOTTOM-SCREEN BUTTONS TO ACT.");
  if (paused) textC(160, ctl ? 188 : 186, 1, C_CREAM, "YOUR RUN STAYS PAUSED");
  footerFramed("D:SELECT|A:OPEN|L/R:PAGE|B:BACK");
  if (prev && A.helpTopic > 0) { A.helpTopic--; sfx("ui_tab"); }
  if (next && A.helpTopic < 4) { A.helpTopic++; sfx("ui_tab"); }
  if (!A.menuLock && (down & KEY_A) && A.helpTopic == 1) { A.helpInGames = 1; A.menuLock = 4; sfx("ui_confirm"); }
  if (!A.menuLock && (down & KEY_B)) {
    sfx("ui_close");
    int s = A.backTo == SC_PAUSE ? 2 : 1;
    go(A.backTo);
    A.sel = s;
  }
}

// ---------- goal / coin flip / results ----------
static void topGoal(void) {
  drawField();
  dimField(130);
  hud();
  overlayBegin(200, 133);
  panel(54, 62, 292, 140, C_GOLD, RGB(0x2E2550));
  textCO(200, 72, 4, C_GOLD, C_INK, "GOAL HIT!");
  sparkle(78, 88, A.tick, C_GOLD); sparkle(322, 88, A.tick + 20, C_GOLD);
  rect(80, 112, 240, 1, C_PURPLE_L);
  drawDice(78, 128, 1);
  textC(240, 120, 2, C_CREAM, "BALANCE");
  char b[24], g[32];
  snprintf(b, sizeof b, "$%.2f", A.balance);
  textCO(240, 142, textW(b, 4) > 190 ? 3 : 4, C_GOLD, C_INK, b);
  snprintf(g, sizeof g, "GOAL $%.0f CLEARED", A.goal);
  textC(240, 182, 1, C_CREAM, g);
  C2D_ViewReset();
}

static void bottomGoal(u32 down) {
  frameScreen(BOT_W, SCREEN_H);
  titleRule(160, 12, 296, 2, C_CREAM, "CASH OUT OR KEEP GOING?");
  char c[32], n[32];
  snprintf(c, sizeof c, "CASH OUT $%.0f", floor(A.balance));
  snprintf(n, sizeof n, "NEXT GOAL $%.0f", cr_next_goal(A.balance));
  int t0 = button(400, 30, 36, 260, 56, A.sel == 0 ? B_GOLD : B_PURPLE, "", 1);
  if (A.sel == 0) textC(160, 44, 3, C_INK, c); else textCO(160, 44, 3, C_GOLD, C_INK, c);
  textC(160, 76, 1, A.sel == 0 ? C_INK : C_CREAM, "END RUN AND SAVE SCORE");
  int t1 = button(401, 30, 98, 260, 70, A.sel == 1 ? B_GOLD : B_PURPLE, "", 1);
  if (A.sel == 1) textC(160, 106, 3, C_INK, "KEEP GOING"); else textCO(160, 106, 3, C_GOLD, C_INK, "KEEP GOING");
  textC(160, 136, 2, A.sel == 1 ? C_INK : C_CREAM, n);
  textC(160, 156, 1, A.sel == 1 ? C_INK : C_CYAN, "TIMER RESETS TO 2:00");
  textC(160, 180, 1, C_CREAM, "CONTINUE WITH YOUR CURRENT BALANCE");
  footerFramed("D:SELECT|A:CONFIRM|T:TAP TO CHOOSE");
  int act = -1;
  if (!A.menuLock) {
    if (down & (KEY_UP | KEY_DOWN)) { A.sel = !A.sel; sfx("ui_hover"); }
    if (down & KEY_A) act = A.sel;
  }
  if (t0) act = 0;
  if (t1) act = 1;
  if (act < 0) return;
  pressFlash(400 + act);
  if (act == 0) { // Cash Out: ends the run and saves the score
    recordScore();
    endRun(SC_CASHOUT, 0);
    sfx("payout_total");
    fxBurst(200, 60, 40, 4, 1.6f);
  } else { // Keep Going: next goal, fresh timer, shop refreshed
    A.round++;
    A.goal = cr_next_goal(A.balance);
    A.timeLeft = CR_START_TIME; A.timeFrames = 0;
    shopRoll();
    go(SC_GAME);
    sfx("new_round");
    char t[48]; snprintf(t, sizeof t, "ROUND %d! NEW GOAL $%.0f", A.round, A.goal); toast(t);
  }
}

static void topCoin(void) {
  drawField();
  dimField(130);
  hud();
  overlayBegin(200, 133);
  panel(54, 54, 292, 160, C_CORAL, RGB(0x2E2550));
  textCO(200, 62, 4, C_CORAL, C_INK, "LAST CHANCE!");
  rect(80, 100, 240, 1, C_CORAL);
  textC(200, 108, 2, C_CREAM, "EMERGENCY COIN FLIP");
  drawDice(110, 130, A.flipT >= 70 ? (A.flipWin ? 1 : 2) : 2);
  // Coin: squash-spins (cos) and arcs up while flipping, then lands on the result.
  int spinning = A.flipT > 0 && A.flipT < 70 && !A.reduced;
  float sx = spinning ? 3 * fabsf(cosf(A.flipT * 0.35f)) : 3, lift = spinning ? sinf(A.flipT / 70.0f * 3.14159f) * 22 : 0;
  C2D_Image coin = img(sprites_coin_idx);
  C2D_DrawImageAt(coin, floorf(250 - 7 * sx), floorf(132 - lift), 0.5f, NULL, fmaxf(sx, 0.3f), 3);
  rect(80, 186, 240, 1, C_PURPLE_L);
  const char *m = A.flipT >= 70 ? (A.flipWin ? "HEADS! YOU SURVIVED!" : "TAILS... THE RUN ENDS") : "ONE FLIP TO STAY IN THE RUN";
  textC(200, 194, 1, A.flipT >= 70 ? (A.flipWin ? C_GREEN : C_CORAL) : C_CREAM, m);
  C2D_ViewReset();
}

static void bottomCoin(u32 down) {
  frameScreen(BOT_W, SCREEN_H);
  titleRule(160, 12, 296, 2, C_CREAM, "YOUR LAST CHANCE");
  char w[32], g[32];
  snprintf(w, sizeof w, "RETURN WITH $%.0f", cr_coin_flip_rescue(A.goal));
  oct(16, 34, 140, 50, 4, C_INK); oct(17, 35, 138, 48, 3, C_GREEN); oct(19, 37, 134, 44, 2, RGB(0x1D1A2C));
  textCO(86, 40, 2, C_GREEN, C_INK, "WIN");
  textC(86, 66, 1, C_CREAM, w);
  oct(164, 34, 140, 50, 4, C_INK); oct(165, 35, 138, 48, 3, C_CORAL); oct(167, 39 - 2, 134, 44, 2, RGB(0x1D1A2C));
  textCO(234, 40, 2, C_CORAL, C_INK, "LOSE");
  textC(234, 66, 1, C_CREAM, "RUN ENDS");
  textC(160, 92, 1, C_CREAM, "WIN RESTORES 20% OF YOUR GOAL");
  int flipping = A.flipT > 0;
  int t = button(410, 30, 106, 260, 48, flipping ? B_DIM : B_GOLD, "", 1);
  padGlyph(66, 124, 'A');
  textC(172, 119, 3, flipping ? C_GREY : C_INK, "FLIP COIN");
  snprintf(g, sizeof g, "CURRENT GOAL $%.0f", A.goal);
  textC(160, 164, 1, C_CREAM, g);
  if (A.inv[IT_DOUBLE_COIN]) textC(160, 178, 1, C_CYAN, "DOUBLE-HEADED COIN READY");
  else { char l[32]; snprintf(l, sizeof l, "FLIPS LEFT THIS RUN: %d", 3 - A.coinFlips); textC(160, 178, 1, C_CREAM_D, l); }
  footerFramed("A:FLIP|T:TAP TO FLIP");
  if (!flipping && !A.menuLock && ((down & KEY_A) || t)) {
    pressFlash(410);
    A.coinFlips++;
    A.flipWin = cr_rand(&RNG) < 0.5;
    if (A.inv[IT_DOUBLE_COIN]) { A.flipWin = 1; consume(IT_DOUBLE_COIN); }
    A.flipT = 1;
    sfx("coin_flip");
  }
}

static void coinTick(void) {
  if (A.flipT <= 0) return;
  A.flipT++;
  if (A.flipT == 70) {
    if (A.flipWin) { sfx("win_medium"); mood(1, 90); fxBurst(250, 150, 20, 0, 1.4f); }
    else { sfx("lose"); mood(2, 90); }
  }
  if (A.flipT >= 130) {
    A.flipT = 0;
    if (A.flipWin) { A.balance = cr_coin_flip_rescue(A.goal); go(SC_GAME); toast("HEADS! BALANCE RESTORED"); }
    else { endRun(SC_RUNOVER, 1); sfx("game_over"); }
  }
}

static void statsRow(float y, int goals) {
  rect(80, y, 240, 1, C_PURPLE_L);
  rect(200, y + 4, 1, 30, C_PURPLE_L);
  textC(140, y + 6, 1, C_CREAM, "GOALS CLEARED");
  textC(260, y + 6, 1, C_CREAM, "BEST STREAK");
  char gs[8], ss[8];
  snprintf(gs, sizeof gs, "%d", goals);
  snprintf(ss, sizeof ss, "%d", A.bestStreak);
  textCO(140, y + 18, 2, C_GOLD, C_INK, gs);
  textCO(260, y + 18, 2, C_GOLD, C_INK, ss);
}

static void topRunOver(void) {
  drawField();
  dimField(150);
  hud();
  overlayBegin(200, 133);
  panel(54, 36, 292, 186, C_CORAL, RGB(0x2E2550));
  textCO(200, 44, 3, C_CORAL, C_INK, "GAME OVER");
  rect(80, 72, 240, 1, C_CORAL);
  textC(200, 78, 2, C_CREAM, A.endReason ? "OUT OF MONEY" : "TIME RAN OUT");
  drawDice(76, 104, 2);
  textC(240, 102, 1, C_CREAM, A.endReason ? "FINAL BALANCE" : "BALANCE AT TIMEOUT");
  char b[24];
  snprintf(b, sizeof b, "$%.2f", A.endBalance);
  textCO(240, 116, textW(b, 4) > 190 ? 3 : 4, C_GOLD, C_INK, b);
  statsRow(160, A.round - 1);
  rect(80, 198, 240, 1, C_PURPLE_L);
  textC(200, 204, 1, C_CREAM, "RUN ENDED - NO CASH OUT");
  C2D_ViewReset();
}

static void topCashout(void) {
  frameScreen(TOP_W, SCREEN_H);
  textCO(200, 14, 4, C_GREEN, C_INK, "CASHED OUT!");
  sparkle(54, 24, A.tick, C_GOLD); sparkle(346, 24, A.tick + 20, C_CYAN);
  panel(40, 54, 320, 140, C_GOLD, RGB(0x2E2550));
  drawDice(62, 72, 1);
  textC(240, 64, 2, C_CREAM, "FINAL CASH OUT");
  spr(sprites_coin_idx, 134, 92, 2);
  char b[24];
  snprintf(b, sizeof b, "$%.2f", A.endBalance);
  textO(172, 90, textW(b, 4) > 176 ? 3 : 4, C_GOLD, C_INK, b);
  rect(66, 136, 268, 1, C_PURPLE_L);
  rect(200, 142, 1, 42, C_PURPLE_L);
  textC(132, 146, 1, C_CREAM, "GOALS CLEARED");
  textC(268, 146, 1, C_CREAM, "BEST STREAK");
  char gs[8], ss[8];
  snprintf(gs, sizeof gs, "%d", A.round);
  snprintf(ss, sizeof ss, "%d", A.bestStreak);
  textCO(132, 160, 3, C_GOLD, C_INK, gs);
  textCO(268, 160, 3, C_GOLD, C_INK, ss);
  textCO(200, 206, 2, A.resultSaved ? C_CYAN : C_CORAL, C_INK, A.resultSaved ? "SCORE SAVED ON THIS 3DS" : "SAVE FAILED - SCORE NOT STORED");
}

static void resultsBottom(u32 down, int cashed) {
  frameScreen(BOT_W, SCREEN_H);
  titleRule(160, 12, 280, 2, C_CREAM, cashed ? "RUN COMPLETE" : "RUN OVER");
  int n = cashed ? 3 : 2;
  const char *labels[3] = { cashed ? "PLAY AGAIN" : "TRY AGAIN", cashed ? "HIGH SCORES" : "MAIN MENU", "MAIN MENU" };
  int tapped = -1;
  float y = 36;
  for (int i = 0; i < n; i++) {
    float h = i == 0 ? 54 : (cashed ? 32 : 46);
    int sel = A.sel == i;
    if (button(420 + i, 30, y, 260, h, sel ? B_GOLD : B_PURPLE, "", 1)) { tapped = i; A.sel = i; }
    if (i == 0) {
      if (sel) textC(160, y + 8, 3, C_INK, labels[0]); else textCO(160, y + 8, 3, C_GOLD, C_INK, labels[0]);
      textC(160, y + 38, 1, sel ? C_INK : C_CREAM, "START A NEW RUN");
    } else if (sel) textC(160, y + h / 2 - 8, 2, C_INK, labels[i]);
    else textCO(160, y + h / 2 - 8, 2, C_GOLD, C_INK, labels[i]);
    y += h + 6;
  }
  textC(160, 186, 1, C_CREAM, "START $100  |  GOAL $300  |  2 MIN");
  footerFramed("D:SELECT|A:CONFIRM|T:TAP TO CHOOSE");
  int act = menuNav(down, n) ? A.sel : tapped;
  if (act < 0) return;
  pressFlash(420 + act);
  sfx("ui_confirm");
  if (act == 0) newRun();
  else if (cashed && act == 1) { A.scoreSel = A.lastScoreRank >= 0 ? A.lastScoreRank : 0; A.backTo = A.scene; go(SC_SCORES); }
  else go(SC_TITLE);
}

static void topScores(void) {
  frameScreen(TOP_W, SCREEN_H);
  for (int i = 0; i < 4; i++) { rect(30 + i * 12, 20, 4, 4, i & 1 ? C_GOLD_D : C_GOLD); rect(334 + i * 12, 20, 4, 4, i & 1 ? C_GOLD : C_GOLD_D); }
  textCO(200, 14, 2, C_CREAM, C_INK, "LOCAL HIGH SCORES");
  panel(30, 50, 340, 136, C_PURPLE_L, RGB(0x2E2550));
  if (!A.scoreCount) {
    drawDice(60, 84, 0);
    textCO(232, 96, 2, C_CREAM, C_INK, "NO RUNS SAVED YET");
    textC(232, 122, 1, C_CREAM_D, "CASH OUT AT A GOAL TO SAVE A SCORE.");
  } else {
    score_t *s = &A.scores[A.scoreSel];
    char badge[24];
    snprintf(badge, sizeof badge, A.scoreSel == 0 ? "PERSONAL BEST" : "RANK %d", A.scoreSel + 1);
    float bw = textW(badge, 2) + 30;
    oct(200 - bw / 2, 39, bw, 22, 4, C_INK);
    oct(201 - bw / 2, 40, bw - 2, 20, 3, C_GOLD);
    textC(200, 43, 2, C_INK, badge);
    sparkle(196 - bw / 2, 50, A.tick, C_GOLD); sparkle(204 + bw / 2, 50, A.tick + 20, C_GOLD);
    drawDice(56, 76, 1);
    rect(130, 70, 1, 64, C_PURPLE_L);
    char b[24];
    snprintf(b, sizeof b, "$%.2f", s->amount);
    spr(sprites_coin_idx, 144, 82, 2);
    textO(180, 80, textW(b, 4) > 180 ? 3 : 4, C_GOLD, C_INK, b);
    textCO(252, 118, 2, C_CREAM, C_INK, "CASHED OUT");
    rect(46, 144, 308, 1, C_PURPLE_L);
    char g[32], st[32];
    snprintf(g, sizeof g, "GOALS CLEARED: %d", s->goals);
    snprintf(st, sizeof st, "BEST STREAK: %d", s->streak);
    textCO(118, 158, 1, C_CREAM, C_INK, g);
    rect(200, 150, 1, 24, C_PURPLE_L);
    textCO(280, 158, 1, C_CREAM, C_INK, st);
  }
  titleRule(200, 200, 280, 1, C_CREAM, "SAVED ON THIS 3DS");
}

static void bottomScores(u32 down) {
  frameScreen(BOT_W, SCREEN_H);
  titleRule(160, 12, 280, 2, C_CREAM, "YOUR BEST RUNS");
  text(32, 34, 1, C_CREAM, "RANK");
  textC(160, 34, 1, C_CREAM, "CASH OUT");
  text(254, 34, 1, C_CREAM, "GOALS");
  if (!A.menuLock && A.scoreCount) {
    if (down & KEY_DOWN && A.scoreSel + 1 < A.scoreCount) { A.scoreSel++; sfx("ui_hover"); }
    if (down & KEY_UP && A.scoreSel > 0) { A.scoreSel--; sfx("ui_hover"); }
  }
  int first = A.scoreSel - 1;
  if (first > A.scoreCount - 3) first = A.scoreCount - 3;
  if (first < 0) first = 0;
  for (int r = 0; r < 3; r++) {
    int i = first + r;
    float y = 46 + r * 34;
    if (i >= A.scoreCount) { oct(24, y, 272, 30, 4, ALPHA(C_PANEL, 160)); textC(160, y + 11, 1, C_GREY_D, "-"); continue; }
    int sel = i == A.scoreSel;
    if (button(440 + r, 24, y, 272, 30, sel ? B_GOLD : B_PURPLE, "", 1)) { A.scoreSel = i; sfx("ui_hover"); }
    char rk[4], am[24], gl[8];
    snprintf(rk, sizeof rk, "%d", i + 1);
    snprintf(am, sizeof am, "$%.2f", A.scores[i].amount);
    snprintf(gl, sizeof gl, "%d", A.scores[i].goals);
    u32 c = sel ? C_INK : C_CREAM;
    textC(46, y + 7, 2, c, rk);
    textC(160, y + 7, 2, c, am);
    textC(272, y + 7, 2, c, gl);
  }
  textC(160, 152, 1, C_CREAM, "SELECT A RUN TO VIEW ITS DETAILS.");
  int back = button(450, 74, 164, 172, 26, B_PURPLE, "BACK", 2);
  footerFramed("D:SELECT|A:VIEW|B:BACK");
  if (back || (!A.menuLock && (down & KEY_B))) { sfx("ui_close"); int s = 1; go(A.backTo); A.sel = s; }
}

// ======================= main loop =======================
static void updateGame(u32 down, u32 held) {
  // The run timer runs during play, Shop and Items; it stops for Pause, Goal, Coin Flip and menus.
  if (++A.timeFrames >= 60) {
    A.timeFrames = 0;
    if (A.timeLeft > 0) {
      A.timeLeft--;
      if (A.timeLeft <= 10 && A.timeLeft > 0) sfx("time_tick");
    }
  }
  if (A.timeLeft <= 0 && !G.dropping) { endRun(SC_RUNOVER, 0); sfx("game_over"); return; } // web: only Plinko balls finish

#ifdef CR_DEBUG
  // Test build only (make EXTRA=-DCR_DEBUG): reach goal / coin-flip / items without grinding.
  static int dbgSel;
  if (down & KEY_SELECT) { // cycles: all items, +$250, broke
    int k = dbgSel++ % 3;
    if (k == 0) { for (int i = 0; i < IT_COUNT; i++) A.inv[i]++; toast("DEBUG: ALL ITEMS"); }
    else if (k == 1) { A.balance = A.goal + 50; checkRun(); }
    else { A.balance = 0.5; checkRun(); }
    return;
  }
#endif
  if (down & KEY_Y) { // dedicated Shop button; locked mid-round like the SHOP button
    if (A.panel == PANEL_SHOP) { A.panel = PANEL_NONE; sfx("ui_close"); }
    else if (!gameLocksTabs()) { A.panel = PANEL_SHOP; A.sel2 = 0; sfx("ui_open"); }
    else sfx("ui_error");
    return;
  }
  if (down & KEY_START) { go(SC_PAUSE); sfx("ui_open"); return; }
  if (down & KEY_X && A.game == G_CRASH && G.flying && A.panel == PANEL_NONE) { sfx("ui_error"); return; } // keep cash-out reachable
  if (down & KEY_X) {
    if (A.panel == PANEL_ITEMS) { A.panel = PANEL_NONE; sfx("ui_close"); }
    else { A.panel = PANEL_ITEMS; A.sel2 = 0; sfx("ui_open"); }
    return;
  }
  if (A.panel != PANEL_NONE) {
    if (down & KEY_B) { A.panel = PANEL_NONE; sfx("ui_close"); }
    gameUpdate(0, 0); // a round in motion keeps playing underneath
    return;
  }
  if (!gameLocksTabs()) {
    if (down & KEY_L) switchGame((A.game + G_COUNT - 1) % G_COUNT);
    if (down & KEY_R) switchGame((A.game + 1) % G_COUNT);
    int d = (held & KEY_UP) ? 1 : (held & KEY_DOWN) ? -1 : 0;
    if (d) {
      repeatT++;
      int fire = (down & (KEY_UP | KEY_DOWN)) || (repeatT > 18 && repeatT % 3 == 0);
      if (fire) { int b = clampBet(A.bet + d * (repeatT > 60 ? 5 : 1)); if (b != A.bet) sfx("ui_hover"); A.bet = b; }
    } else repeatT = 0;
    A.bet = clampBet(A.bet);
    // B on an idle game screen opens Pause (the footer's BACK); B mid-round belongs to the game
    if (down & KEY_B && !(A.game == G_RIVER && G.crossing)) { go(SC_PAUSE); sfx("ui_open"); return; }
  }
  gameUpdate(down, held);
}

int main(void) {
  romfsInit();
  gfxInitDefault();
  C3D_Init(C3D_DEFAULT_CMDBUF_SIZE);
  C2D_Init(C2D_DEFAULT_MAX_OBJECTS * 2);
  C2D_Prepare();
  C3D_RenderTarget *top = C2D_CreateScreenTarget(GFX_TOP, GFX_LEFT);
  C3D_RenderTarget *bot = C2D_CreateScreenTarget(GFX_BOTTOM, GFX_LEFT);
  SHEET = C2D_SpriteSheetLoad("romfs:/gfx/sprites.t3x");
  if (!SHEET) svcBreak(USERBREAK_PANIC);
  C3D_TexSetFilter(img(0).tex, GPU_NEAREST, GPU_NEAREST); // pixel art: nearest-neighbour only

  cr_seed(&RNG, (u32)osGetTime());
  srand((unsigned)osGetTime());
  saveLoad();
  audioInit();
  A.scene = SC_TITLE; A.game = G_PLINKO; A.bet = 10;
  A.balance = A.shownBalance = CR_START_BALANCE; A.goal = CR_START_GOAL; A.timeLeft = CR_START_TIME;
  gamesReset();
  musicPlay("music_lobby");
  int secFrames = 0;

  while (aptMainLoop()) {
    hidScanInput();
    uiFrameStart();
    u32 down = hidKeysDown(), held = hidKeysHeld();
    A.tick++;
    if (A.menuLock > 0) A.menuLock--;
    if (A.fade > 0) A.fade--;
    A.overlayT++;
    if (A.moodT > 0 && --A.moodT == 0) A.mood = 0;
    if (A.blinkT > 0) A.blinkT--;
    else if (rand() % 240 == 0) A.blinkT = 6;
    if (A.running && ++secFrames >= 60) { // item timers count real time, like Date.now() on the web
      secFrames = 0;
      if (A.cashbackSecs > 0) A.cashbackSecs--;
      if (A.jesterSecs > 0) A.jesterSecs--;
    }
    double diff = A.balance - A.shownBalance; // balance counter rolls toward the real value
    if (fabs(diff) < 0.01 || A.reduced) A.shownBalance = A.balance;
    else A.shownBalance += diff * 0.18;
    fxUpdate();

    if (A.scene == SC_GAME) updateGame(down, held);
    else if (A.scene == SC_COINFLIP) coinTick();
    else if (A.scene == SC_TITLE && (down & KEY_SELECT) && (held & KEY_L) && (held & KEY_R)) break; // hidden exit
    audioTick(A.scene == SC_PAUSE || ((A.scene == SC_SETTINGS || A.scene == SC_HELP) && A.running));

    C3D_FrameBegin(C3D_FRAME_SYNCDRAW);
    C2D_TargetClear(top, C_CABINET);
    C2D_SceneBegin(top);
    C2D_ViewReset();
    switch (A.scene) {
      case SC_TITLE: topTitle(); break;
      case SC_GAME:
        if (A.panel == PANEL_SHOP) topShop();
        else if (A.panel == PANEL_ITEMS) topItems();
        else { drawField(); hud(); }
        break;
      case SC_PAUSE: topPause(); break;
      case SC_SETTINGS: topSettings(); break;
      case SC_HELP: topHelp(); break;
      case SC_GOAL: topGoal(); break;
      case SC_COINFLIP: topCoin(); break;
      case SC_CASHOUT: topCashout(); break;
      case SC_RUNOVER: topRunOver(); break;
      default: topScores(); break;
    }
    C2D_ViewReset();
    fxDraw();
    if (A.fade > 0) rect(0, 0, TOP_W, SCREEN_H, ALPHA(C_INK, A.fade * 22));

    C2D_TargetClear(bot, C_CABINET);
    C2D_SceneBegin(bot);
    C2D_ViewReset();
    switch (A.scene) {
      case SC_TITLE: bottomTitle(down); break;
      case SC_GAME:
        if (A.panel == PANEL_SHOP) bottomShop(down);
        else if (A.panel == PANEL_ITEMS) bottomItems(down);
        else bottomGame();
        break;
      case SC_PAUSE: bottomPause(down); break;
      case SC_SETTINGS: bottomSettings(down); break;
      case SC_HELP: bottomHelp(down); break;
      case SC_GOAL: bottomGoal(down); break;
      case SC_COINFLIP: bottomCoin(down); break;
      case SC_CASHOUT: resultsBottom(down, 1); break;
      case SC_RUNOVER: resultsBottom(down, 0); break;
      default: bottomScores(down); break;
    }
    if (A.fade > 0) rect(0, 0, BOT_W, SCREEN_H, ALPHA(C_INK, A.fade * 22));
    C3D_FrameEnd(0);
  }

  audioExit();
  C2D_SpriteSheetFree(SHEET);
  C2D_Fini();
  C3D_Fini();
  gfxExit();
  romfsExit();
  return 0;
}
