// Casino Run 3DS: shared state and module interfaces.
// Layout and look follow docs/3ds/design/Design-Bible.md and its mockups; rules come from rules.c
// (seed-for-seed port of rules.js) and the run/item behaviour of script.js.
#ifndef CR_APP_H
#define CR_APP_H
#include <3ds.h>
#include <citro2d.h>
#include "rules.h"
#include "sprites.h"

#define TOP_W 400
#define BOT_W 320
#define SCREEN_H 240
#define HUD_H 28                 /* top HUD bar; the playfield sits below it */
#define FIELD_H (SCREEN_H - HUD_H)

// Design-bible palette (0xRRGGBB) -> citro2d ABGR.
#define RGB(h) (0xFF000000u | (((h) & 0xFFu) << 16) | ((h) & 0xFF00u) | (((h) >> 16) & 0xFFu))
#define ALPHA(c, a) (((c) & 0x00FFFFFFu) | ((u32)(a) << 24))
#define C_INK RGB(0x0E0C17)
#define C_CABINET RGB(0x191727)
#define C_PANEL RGB(0x29263A)
#define C_PANELHI RGB(0x3B3752)
#define C_PURPLE RGB(0x6944B8)
#define C_PURPLE_D RGB(0x4A3486)
#define C_PURPLE_L RGB(0x9B7BF0)
#define C_GOLD RGB(0xF4C34E)
#define C_GOLD_D RGB(0xB8862B)
#define C_GOLD_SEL RGB(0x6B5220)
#define C_CREAM RGB(0xFFF0CE)
#define C_CREAM_D RGB(0xD9C49A)
#define C_CYAN RGB(0x37D9E8)
#define C_CORAL RGB(0xF45B58)
#define C_RED_D RGB(0xA8323A)
#define C_GREEN RGB(0x7EDD65)
#define C_GREEN_D RGB(0x3F9447)
#define C_ORANGE RGB(0xFF9E45)
#define C_GREY RGB(0x8B87A3)
#define C_GREY_D RGB(0x5B5772)
#define C_FELT RGB(0x2E7D4F)
#define C_FELT_D RGB(0x1F5C38)
#define C_WHITE RGB(0xFFFFFF)

// Tab order on the bottom screen (bible §3 / mockups).
enum { G_PLINKO, G_ROULETTE, G_CRASH, G_BLACKJACK, G_RIVER, G_HORSE, G_COUNT };

enum {
  SC_TITLE, SC_GAME, SC_PAUSE, SC_SETTINGS, SC_HELP, SC_GOAL, SC_COINFLIP, SC_CASHOUT, SC_RUNOVER, SC_SCORES
};
enum { PANEL_NONE, PANEL_SHOP, PANEL_ITEMS }; // bottom-screen overlays during play

// ---------- items (script.js shopItemData) ----------
enum {
  IT_DOUBLE_COIN, IT_HULA, IT_BOTTLE, IT_MAGNET, IT_FLOATIES, IT_INSURANCE, IT_FILTH_TEA, IT_MATCH, IT_SHIELD,
  IT_GREASE, IT_CUTTER, IT_PEEK, IT_HORSESHOE, IT_WEIGHTED, IT_CASHBACK, IT_JESTER, IT_ROSEKAT, IT_VINYL, IT_COUNT
};
typedef struct {
  const char *name, *type, *desc, *effect, *note;
  int price, sprite, usable, autoBadge;
} item_def;
extern const item_def ITEMS[IT_COUNT];

typedef struct { double amount; int goals, streak; } score_t;
#define MAX_SCORES 10

typedef struct {
  // run
  int running, round, timeLeft, timeFrames, streak, bestStreak, coinFlips, runId;
  double balance, goal, shownBalance;
  int bet, game;
  int inv[IT_COUNT];
  int consumed[64], consumedN;
  int shop[4], shopSold[4];
  // active item effects
  int magnet, floaties, horseshoes, weighted, roseKat, vinyl, grease, cashbackSecs, jesterSecs, effectFrames;
  // scenes
  int scene, panel, backTo, prevScene, sel, sel2, helpTopic, helpGame, helpInGames, scoreSel, menuLock;
  int resultSaved, endReason; // endReason 0 timeout, 1 coin flip lost
  double endBalance;
  int fade, overlayT;
  // settings (persisted)
  int music, sfx, reduced;
  score_t scores[MAX_SCORES];
  int scoreCount, lastScoreRank;
  // coin flip
  int flipT, flipWin;
  // host / fx
  int mood, moodT, blinkT, tick, shake;
  int toastT;
  char toast[64];
  int lowTimeBeat;
} app_t;

typedef struct {
  // Plinko
  int dropping, target, lastSlot, lastRow, slotFlash;
  float ballX, ballY, ballVX;
  // Roulette
  int spin, colour, result, freeSpin, resultFlash;
  float angle, angleFrom, angleTo;
  int spinBet;
  // Crash
  int flying, frames, crashed, cashed, crashBet, boomT;
  double crashPoint, mult;
  // Blackjack: phase 0 idle, 1 player turn, 2 dealer drawing, 3 done
  int deck[52], deckLeft, ph[16], pn, dh[16], dn, phase, timer, natural, peeked, bjBet, dealAnim;
  double bjMult;
  // River: lane 0 left bank, 1-4 still logs, 5 safe shore (right). hopFail is rolled when a hop starts;
  // sinkT/landT drive the sink + crocodile and the log dip.
  int crossing, lane, hop, splashed, banked, riverBet, hopFail, sinkT, landT;
  // Horse
  int race, pick, winner, raceBet, raceShoes;
} games_t;

extern app_t A;
extern games_t G;
extern cr_rng RNG;
extern C2D_SpriteSheet SHEET;

// ---------- ui.c ----------
typedef struct { int down, held, up, x, y, px, py; } touch_t;
extern touch_t T;
extern int uiSnap;
enum { B_GOLD, B_PURPLE, B_SEL, B_DIM, B_RED, B_BLACK, B_GREEN, B_OUTLINE, B_OUTLINE_DIM, B_TAB, B_TAB_ON, B_GHOST };
C2D_Image img(int idx);
void spr(int idx, float x, float y, float s);
void sprT(int idx, float x, float y, float s, u32 tint, float blend);
void sprFrame(int idx, int f, int frames, float x, float y, float sx, float sy);
void tiles(int idx, float x, float y, float w, float h);
void rect(float x, float y, float w, float h, u32 c);
void oct(float x, float y, float w, float h, int c, u32 col);
int textW(const char *s, int scale);
void text(float x, float y, int scale, u32 c, const char *s);
void textO(float x, float y, int scale, u32 c, u32 outline, const char *s);   // outlined
void textC(float cx, float y, int scale, u32 c, const char *s);
void textCO(float cx, float y, int scale, u32 c, u32 outline, const char *s);
int wrapC(float cx, float y, float w, int scale, u32 c, const char *s);       // centred, word-wrapped; returns height
int wrapL(float x, float y, float w, int scale, u32 c, const char *s);
void panel(float x, float y, float w, float h, u32 border, u32 fill);
void frameScreen(float w, float h);
void titleRule(float cx, float y, float w, int scale, u32 c, const char *s);
int button(int id, float x, float y, float w, float h, int style, const char *label, int scale);
int hit(float x, float y, float w, float h);
void pressFlash(int id);
void padGlyph(float x, float y, char k);
void footer(const char *spec);
void footerEx(const char *spec, int framed);
void sparkle(float x, float y, int phase, u32 c);
void uiFrameStart(void);

// ---------- fx (main.c) ----------
void fxBurst(float x, float y, int count, int kind, float speed);
void fxPop(const char *s, u32 c, int big);
void fxWord(int spriteIdx);
void fxShake(int n);
void toast(const char *msg);

// ---------- audio.c ----------
void audioInit(void);
void audioExit(void);
void sfx(const char *name);
void sfxPitch(const char *name, float pitch);
void musicPlay(const char *name);
void audioTick(int duck);

// ---------- save.c ----------
void saveLoad(void);
int saveWrite(void);

// ---------- items.c ----------
int itemPrice(int it);
void shopRoll(void);
int ownedKinds(int *out, int max);
const char *itemCanUseNow(int it); // NULL = usable now, else the reason

// ---------- games.c ----------
void gamesReset(void);
int gameBusy(void);
int gameLocksTabs(void);
void gameUpdate(u32 down, u32 held);
void gameDrawTop(int g, int preview);
void gameDrawControls(void);
void gameFooter(void);
void dealerPeekNow(void);

// ---------- settlement (main.c) ----------
void stakeTaken(double bet);
void settleRound(double payout, double bet, const char *game, int freeSpin);
void checkRun(void);
#endif
