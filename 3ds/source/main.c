// Casino Run 3DS: stage 3 slice (Plinko + Crash, SELECT switches). Top screen = game, bottom = HUD + host.
// Outcomes come from rules.c (same rules and RNG as the web build); the ball is steered into the
// pre-rolled slot exactly like the web game, so the visual always matches the payout.
#include <3ds.h>
#include <citro2d.h>
#include <stdio.h>
#include <ctype.h>
#include <math.h>
#include "rules.h"
#include "sprites.h"
#include "font_glyphs.h"

#define TOP_W 400
#define BOT_W 320
#define SCREEN_H 240
#define ROWS 7

static C2D_SpriteSheet sheet;
static const u32 SLOT_COLOR[5] = { 0xFF583AA8, 0xFF2B86B8, 0xFF4794F3, 0xFF4EC3F4, 0xFF65DD7E }; // ABGR

static C2D_Image frame(size_t idx, int n, int frames, Tex3DS_SubTexture *store) {
  C2D_Image img = C2D_SpriteSheetGetImage(sheet, idx);
  *store = *img.subtex;
  float span = (store->right - store->left) / frames;
  store->width /= frames;
  store->left += span * n;
  store->right = store->left + span;
  img.subtex = store;
  return img;
}

// Pixel font: the web game's glyph atlas (white glyphs), tinted per call, integer scale only.
static const cr_glyph *glyph(char c) {
  for (int i = 0; i < CR_GLYPH_COUNT; i++) if (CR_GLYPHS[i].c == c) return &CR_GLYPHS[i];
  return NULL;
}

static int textW(const char *s, int scale) {
  int w = 0;
  for (; *s && *s != '\n'; s++) { const cr_glyph *g = glyph((char)toupper((unsigned char)*s)); w += ((g ? g->w : 3) + 1) * scale; }
  return w > 0 ? w - scale : 0;
}

static void text(float x, float y, int scale, u32 color, const char *s) {
  C2D_Image atlas = C2D_SpriteSheetGetImage(sheet, sprites_casino_run_pixel_atlas_idx);
  const Tex3DS_SubTexture *a = atlas.subtex;
  C2D_ImageTint tint;
  C2D_PlainImageTint(&tint, color, 1.0f);
  // Whole-pixel positions: a centred line can land on x.5, and nearest sampling then drops each
  // glyph's left column (seen in Azahar at 1x).
  x = floorf(x);
  y = floorf(y);
  float cx = x;
  for (; *s; s++) {
    if (*s == '\n') { cx = x; y += (CR_FONT_CELL_H + 1) * scale; continue; }
    const cr_glyph *g = glyph((char)toupper((unsigned char)*s));
    if (!g) { cx += 4 * scale; continue; }
    Tex3DS_SubTexture sub = *a;
    sub.width = g->w;
    sub.height = CR_FONT_CELL_H;
    sub.left = a->left + (a->right - a->left) * g->x / a->width;
    sub.right = a->left + (a->right - a->left) * (g->x + g->w) / a->width;
    sub.top = a->top + (a->bottom - a->top) * g->y / a->height;
    sub.bottom = a->top + (a->bottom - a->top) * (g->y + CR_FONT_CELL_H) / a->height;
    C2D_Image img = { atlas.tex, &sub };
    C2D_DrawImageAt(img, cx, y, 0.5f, &tint, scale, scale);
    cx += (g->w + 1) * scale;
  }
}

static void draw(C2D_Image img, float x, float y, float depth) { C2D_DrawImageAt(img, x, y, depth, NULL, 1, 1); }

static float slotX(int slot) { return 40 + (slot + 0.5f) * (TOP_W - 80) / 5.0f; }

enum { GAME_PLINKO, GAME_CRASH, GAME_RIVER, GAME_ROULETTE, GAME_COUNT };
static const char *GAME_NAME[GAME_COUNT] = { "PLINKO", "CRASH", "ELEPHANT RIVER", "ROULETTE" };
static const char *GAME_HELP[GAME_COUNT] = { "A DROP  UP/DOWN BET  SELECT GAME", "A LAUNCH/CASH OUT  UP/DOWN BET  SELECT GAME",
  "A START/STEP  B CASH OUT  SELECT GAME", "A SPIN  LEFT/RIGHT COLOUR  UP/DOWN BET" };

typedef struct {
  double balance, goal;
  int bet, mood, game, tick, lock; // lock: frames A/B are ignored after a result (no accidental re-bet)
  // Elephant River: lane 0 = bank, 5 = far shore; hop = frames left in the current hop
  int crossing, lane, hop, splashed, banked;
  // Roulette: spin = frames left; colour = bet colour (CR_RED/CR_BLACK/CR_GREEN); result -1 = none yet
  int spin, colour, result;
  float angle, angleFrom, angleTo;
  // Plinko
  int dropping, target, lastSlot;
  float ballX, ballY;
  // Crash
  int flying, frames, crashed, cashed;
  double crashPoint, mult;
} state;

static void settle(state *s, double win) {
  s->balance += win;
  s->mood = win > s->bet ? 1 : win < s->bet ? 2 : 0;
  s->lock = 30; // Azahar test: leftover hop presses started (and lost) a new round right after a splash
  if (s->balance >= s->goal) s->goal = cr_next_goal(s->balance);
}

static int busy(const state *s) { return s->dropping || s->flying || s->crossing || s->spin; }

// ---------- Elephant River ----------
#define HOP_FRAMES 31 /* ~0.52 s, like the web hop */
static float laneY(int lane) { return 210 - lane * 34; }

static void updateRiver(state *s, cr_rng *rng, u32 down) {
  if (!s->crossing) {
    if (down & KEY_A && s->balance >= s->bet) {
      s->balance -= s->bet;
      s->crossing = 1; s->lane = 0; s->hop = 0; s->splashed = s->banked = 0; s->mood = 0;
    }
    return;
  }
  if (s->hop > 0) {
    if (--s->hop == 0 && cr_rand(rng) < cr_frog_base_crash_chance(s->lane)) { // swept away
      s->splashed = 1; s->crossing = 0;
      settle(s, 0);
    }
    return;
  }
  if (down & KEY_A && s->lane < 5) { s->lane++; s->hop = HOP_FRAMES; }
  else if (down & KEY_B && s->lane > 0) {
    s->banked = 1; s->crossing = 0;
    settle(s, s->bet * cr_frog_multiplier(s->lane));
  }
}

static void drawRiver(const state *s) {
  C2D_Image water = C2D_SpriteSheetGetImage(sheet, sprites_water_idx);
  int flow = (s->tick / 2) % 32;
  for (int y = 24; y < 200; y += 16)
    for (int x = -32; x < TOP_W; x += 32) draw(water, x + flow, y, 0);
  C2D_DrawRectSolid(0, 0, 0.05f, TOP_W, 24, 0xFF4F7D2E);   // far shore (felt green)
  C2D_DrawRectSolid(0, 196, 0.05f, TOP_W, 44, 0xFF4F7D2E); // riverbank
  text((TOP_W - textW("SAFE SHORE", 1)) / 2.0f, 8, 1, 0xFFCEF0FF, "SAFE SHORE");
  // Hazards drift across each lane, alternating direction (decorative: hits come from the rules RNG).
  static const int HAZ[5] = { sprites_log_idx, sprites_croc_idx, sprites_boat_idx, sprites_canoe_idx, sprites_log_idx };
  static const float SPEED[5] = { 1.4f, 1.8f, 2.2f, 1.2f, 1.6f };
  for (int k = 0; k < 5; k++) {
    Tex3DS_SubTexture sub;
    C2D_Image img = frame(HAZ[k], (s->tick / 15 + k) & 1, 2, &sub);
    float w = sub.width * 2, x = fmodf(s->tick * SPEED[k] + k * 97, TOP_W + w + 40) - w - 20;
    if (k & 1) C2D_DrawImageAt(img, floorf(TOP_W - x), laneY(k + 1) - 14, 0.1f, NULL, -2, 2); // leftward, mirrored
    else C2D_DrawImageAt(img, floorf(x), laneY(k + 1) - 14, 0.1f, NULL, 2, 2);
  }
  // Elephant: walks while hopping, sits on its lane otherwise.
  float from = laneY(s->lane - (s->hop > 0)), to = laneY(s->lane);
  float ey = s->hop > 0 ? to + (from - to) * s->hop / (float)HOP_FRAMES : to;
  Tex3DS_SubTexture esub;
  if (!s->splashed) C2D_DrawImageAt(frame(sprites_elephant_idx, s->hop > 0 ? (s->tick / 8) & 1 : 0, 2, &esub), 174, floorf(ey) - 30, 0.3f, NULL, 2, 2);
  else for (int k = 0; k < 10; k++) // splash: droplets thrown up where the elephant was
    C2D_DrawRectSolid(186 + (k * 37 % 30), floorf(ey) - 30 + (k * 13 % 22), 0.3f, 4, 4, k & 1 ? 0xFFFFFFFF : 0xFFE8D937);
  char m[48];
  if (s->splashed) snprintf(m, sizeof m, "SPLASH!");
  else if (s->banked) snprintf(m, sizeof m, "CASHED OUT %.2fX", cr_frog_multiplier(s->lane));
  else if (!s->crossing) snprintf(m, sizeof m, "PRESS A TO START");
  else if (s->lane == 0) snprintf(m, sizeof m, "PRESS A TO STEP"); // no cash-out on the bank
  else snprintf(m, sizeof m, "LANE %d  %.2fX", s->lane, cr_frog_multiplier(s->lane));
  text((TOP_W - textW(m, 2)) / 2.0f, 214, 2, s->splashed ? 0xFF583AF4 : 0xFF4EC3F4, m);
}

static void updatePlinko(state *s, cr_rng *rng, u32 down) {
  if (!s->dropping) {
    if (down & KEY_A && s->balance >= s->bet) {
      s->balance -= s->bet;
      s->target = cr_roll_plinko_slot(rng);
      s->dropping = 1; s->ballX = TOP_W / 2.0f; s->ballY = 8; s->mood = 0;
    }
    return;
  }
  // Fall 2 px a frame; drift toward the pre-rolled slot with a peg-bounce zigzag.
  s->ballY += 2.0f;
  int row = (int)(s->ballY / 24);
  float aim = TOP_W / 2.0f + (slotX(s->target) - TOP_W / 2.0f) * (s->ballY / 200.0f);
  s->ballX += (aim + ((row & 1) ? 6 : -6) - s->ballX) * 0.15f;
  if (s->ballY >= 204) {
    s->lastSlot = s->target;
    s->dropping = 0;
    settle(s, s->bet * cr_plinko_mult[s->target]);
  }
}

static void drawPlinko(const state *s) {
  C2D_Image plate = C2D_SpriteSheetGetImage(sheet, sprites_plate_idx);
  for (int y = 0; y < SCREEN_H; y += 32)
    for (int x = 0; x < TOP_W; x += 32) draw(plate, x, y, 0);
  C2D_Image peg = C2D_SpriteSheetGetImage(sheet, sprites_peg_idx);
  for (int r = 1; r <= ROWS; r++)
    for (int i = 0; i < r + 2; i++) draw(peg, TOP_W / 2.0f + (i - (r + 1) / 2.0f) * 34 - 3, 20 + r * 24, 0.1f);
  for (int k = 0; k < 5; k++) {
    char label[16];
    snprintf(label, sizeof label, "%gx", cr_plinko_mult[k]);
    C2D_DrawRectSolid(slotX(k) - 30, 212, 0.2f, 60, 26, k == s->lastSlot ? 0xFFFFFFFF : SLOT_COLOR[k]);
    text(slotX(k) - textW(label, 2) / 2.0f, 217, 2, 0xFF170C0E, label);
  }
  if (s->dropping) draw(C2D_SpriteSheetGetImage(sheet, sprites_ball_idx), s->ballX - 4, s->ballY, 0.3f);
}

static void updateCrash(state *s, cr_rng *rng, u32 down) {
  if (!s->flying) {
    if (down & KEY_A && s->balance >= s->bet) {
      s->balance -= s->bet;
      s->crashPoint = cr_crash_point(rng);
      s->flying = 1; s->frames = 0; s->mult = 1; s->crashed = s->cashed = 0; s->mood = 0;
    }
    return;
  }
  s->mult = cr_crash_multiplier_at(++s->frames / 60.0);
  if (s->mult >= s->crashPoint) { // rocket blows up at the crash point: bet lost
    s->mult = s->crashPoint;
    s->flying = 0; s->crashed = 1;
    settle(s, 0);
  } else if (down & (KEY_A | KEY_B)) { // cash out at the current multiplier
    s->flying = 0; s->cashed = 1;
    settle(s, s->bet * s->mult);
  }
}

static void drawCrash(const state *s) {
  C2D_Image stars = C2D_SpriteSheetGetImage(sheet, sprites_stars_idx);
  for (int y = 0; y < SCREEN_H; y += 64)
    for (int x = 0; x < TOP_W; x += 64) draw(stars, x, y, 0);
  // Rocket climbs along the curve: x by time, y by log multiplier (10x reaches the top).
  float t = s->frames / 60.0f, p = fminf(1, t / 6), h = fminf(1, logf((float)s->mult) / logf(10));
  float rx = 30 + p * 330, ry = 200 - h * 170;
  if (s->flying || s->cashed) {
    for (int k = 1; k <= 8; k++) { // exhaust trail: fading gold -> red puffs behind the rocket
      float q = fmaxf(0, t - k * 0.08f), px = 30 + fminf(1, q / 6) * 330, py = 200 - fminf(1, logf((float)cr_crash_multiplier_at(q)) / logf(10)) * 170;
      C2D_DrawRectSolid(px + 9, py + 34, 0.05f, 6, 6, k < 4 ? 0xFF4EC3F4 : k < 6 ? 0xFF459EFF : 0xFF583AA8);
    }
    Tex3DS_SubTexture sub;
    C2D_DrawImageAt(frame(sprites_rocket_idx, (s->frames / 4) & 1, 2, &sub), rx, ry, 0.2f, NULL, 2, 2);
  }
  if (s->crashed) { // pixel debris burst: 12 chunks on a ring, hot core in the middle
    static const u32 DEBRIS[3] = { 0xFF4EC3F4, 0xFF459EFF, 0xFF583AF4 }; // gold, orange, red
    for (int k = 0; k < 12; k++) {
      float a = k * 0.5236f, d = 14 + (k % 3) * 7, sz = 6 - (k % 3) * 2;
      C2D_DrawRectSolid(floorf(rx + 12 + cosf(a) * d), floorf(ry + 18 + sinf(a) * d), 0.2f, sz, sz, DEBRIS[k % 3]);
    }
    C2D_DrawRectSolid(rx + 6, ry + 12, 0.25f, 12, 12, 0xFFCEF0FF);
  }
  char m[24];
  snprintf(m, sizeof m, "%.2fx", s->mult);
  u32 col = s->crashed ? 0xFF583AF4 : s->cashed ? 0xFF4EC3F4 : 0xFFCEF0FF;
  text((TOP_W - textW(m, 4)) / 2.0f, 16, 4, col, m);
  const char *msg = s->crashed ? "CRASHED" : s->cashed ? "CASHED OUT" : s->flying ? "" : "PRESS A TO LAUNCH";
  text((TOP_W - textW(msg, 2)) / 2.0f, 58, 2, col, msg);
}

// ---------- Roulette ----------
#define SPIN_FRAMES 180 /* 3 s, ease-out */
#define TAU 6.2831853f
static const u32 POCKET_FACE[3] = { 0xFF65DD7E, 0xFF585BF4, 0xFF271719 };  // green, red, black (ABGR)
static const u32 POCKET_FLOOR[3] = { 0xFF47943F, 0xFF3A32A8, 0xFF170C0E };
static const char *COLOUR_NAME[3] = { "GREEN", "RED", "BLACK" };

static void updateRoulette(state *s, cr_rng *rng, u32 down) {
  if (!s->spin) {
    if (down & KEY_RIGHT) s->colour = s->colour == CR_RED ? CR_BLACK : s->colour == CR_BLACK ? CR_GREEN : CR_RED;
    if (down & KEY_LEFT) s->colour = s->colour == CR_RED ? CR_GREEN : s->colour == CR_GREEN ? CR_BLACK : CR_RED;
    if (down & KEY_A && s->balance >= s->bet) {
      s->balance -= s->bet;
      s->result = cr_roll_roulette(rng, -1); // no Magnet on 3DS yet
      int idx = 0;
      while (cr_wheel_order[idx] != s->result) idx++;
      // Wedge idx is centred at -90deg + idx*step + angle; bring it under the top pointer after 5 turns.
      float step = TAU / 37, target = -idx * step;
      float base = s->angle - fmodf(s->angle, TAU);
      s->angleFrom = s->angle;
      s->angleTo = base + 5 * TAU + fmodf(target + TAU, TAU);
      s->spin = SPIN_FRAMES; s->mood = 0;
    }
    return;
  }
  float p = 1 - (--s->spin) / (float)SPIN_FRAMES, e = 1 - (1 - p) * (1 - p) * (1 - p);
  s->angle = s->angleFrom + (s->angleTo - s->angleFrom) * e;
  if (s->spin == 0) settle(s, s->bet * cr_roulette_payout(s->colour, s->result));
}

static void wedge(float cx, float cy, float r0, float r1, float a0, float a1, u32 c) {
  float x00 = cx + cosf(a0) * r0, y00 = cy + sinf(a0) * r0, x01 = cx + cosf(a0) * r1, y01 = cy + sinf(a0) * r1;
  float x10 = cx + cosf(a1) * r0, y10 = cy + sinf(a1) * r0, x11 = cx + cosf(a1) * r1, y11 = cy + sinf(a1) * r1;
  C2D_DrawTriangle(x00, y00, c, x01, y01, c, x11, y11, c, 0.1f);
  C2D_DrawTriangle(x00, y00, c, x11, y11, c, x10, y10, c, 0.1f);
}

static void drawRoulette(const state *s) {
  C2D_Image velvet = C2D_SpriteSheetGetImage(sheet, sprites_velvet_idx);
  for (int y = 0; y < SCREEN_H; y += 32)
    for (int x = 0; x < TOP_W; x += 32) draw(velvet, x, y, 0);
  const float cx = 200, cy = 122, R = 104, step = TAU / 37;
  C2D_DrawCircleSolid(cx, cy, 0.05f, R + 6, 0xFF170C0E);
  C2D_DrawCircleSolid(cx, cy, 0.06f, R + 3, 0xFF2B86B8); // goldDark rim
  for (int i = 0; i < 37; i++) {
    int col = cr_roulette_color(cr_wheel_order[i]);
    float a0 = -1.5707963f - step / 2 + i * step + s->angle, a1 = a0 + step;
    wedge(cx, cy, R * 0.62f, R, a0, a1, POCKET_FACE[col]);
    wedge(cx, cy, R * 0.46f, R * 0.62f, a0, a1, POCKET_FLOOR[col]);
    C2D_DrawLine(cx + cosf(a0) * R * 0.46f, cy + sinf(a0) * R * 0.46f, 0xFF4EC3F4,
                 cx + cosf(a0) * R, cy + sinf(a0) * R, 0xFF4EC3F4, 1, 0.15f); // gold fret
    char n[4];
    snprintf(n, sizeof n, "%d", cr_wheel_order[i]);
    float am = a0 + step / 2;
    text(cx + cosf(am) * R * 0.81f - textW(n, 1) / 2.0f, cy + sinf(am) * R * 0.81f - 3, 1, 0xFFCEF0FF, n);
  }
  C2D_DrawCircleSolid(cx, cy, 0.2f, R * 0.46f, 0xFF243A5E); // wooden cone
  C2D_DrawCircleSolid(cx, cy, 0.21f, R * 0.38f, 0xFF3B5A8A);
  C2D_Image hub = C2D_SpriteSheetGetImage(sheet, sprites_hub_idx);
  draw(hub, cx - 21, cy - 21, 0.3f);
  // Pointer at the top; the ball sits in the winning pocket once the wheel stops.
  C2D_DrawTriangle(cx - 7, cy - R - 10, 0xFF4EC3F4, cx + 7, cy - R - 10, 0xFF4EC3F4, cx, cy - R + 2, 0xFF4EC3F4, 0.4f);
  if (!s->spin && s->result >= 0) C2D_DrawCircleSolid(cx, cy - R * 0.72f, 0.4f, 4, 0xFFFFFFFF);
  char m[40];
  if (s->spin) snprintf(m, sizeof m, "%s", COLOUR_NAME[s->colour]);
  else if (s->result >= 0) snprintf(m, sizeof m, "%d %s", s->result, COLOUR_NAME[cr_roulette_color(s->result)]);
  else snprintf(m, sizeof m, "BET %s", COLOUR_NAME[s->colour]);
  // Labels sit on ink panels: red text straight on the red velvet was unreadable (Azahar check).
  C2D_DrawRectSolid(4, 4, 0.45f, textW(m, 2) + 8, 26, 0xFF170C0E);
  text(8, 8, 2, s->result >= 0 && !s->spin && cr_roulette_color(s->result) == s->colour ? 0xFF4EC3F4 : 0xFFCEF0FF, m);
  char c[24];
  snprintf(c, sizeof c, "ON %s", COLOUR_NAME[s->colour]);
  float cw = textW(c, 2);
  C2D_DrawRectSolid(TOP_W - cw - 26, 4, 0.45f, cw + 22, 26, 0xFF170C0E);
  C2D_DrawRectSolid(TOP_W - cw - 21, 11, 0.5f, 10, 12, POCKET_FACE[s->colour]); // colour swatch
  C2D_DrawRectSolid(TOP_W - cw - 22, 10, 0.49f, 12, 14, 0xFFCEF0FF); // cream outline so black shows
  text(TOP_W - 8 - cw, 8, 2, 0xFFCEF0FF, c);
}

int main(void) {
  romfsInit();
  gfxInitDefault();
  C3D_Init(C3D_DEFAULT_CMDBUF_SIZE);
  C2D_Init(C2D_DEFAULT_MAX_OBJECTS);
  C2D_Prepare();
  C3D_RenderTarget *top = C2D_CreateScreenTarget(GFX_TOP, GFX_LEFT);
  C3D_RenderTarget *bottom = C2D_CreateScreenTarget(GFX_BOTTOM, GFX_LEFT);
  sheet = C2D_SpriteSheetLoad("romfs:/gfx/sprites.t3x");
  if (!sheet) svcBreak(USERBREAK_PANIC);
  // Pixel art: nearest-neighbour sampling (linear filtering smeared 1x glyphs).
  C3D_TexSetFilter(C2D_SpriteSheetGetImage(sheet, 0).tex, GPU_NEAREST, GPU_NEAREST);

  cr_rng rng;
  cr_seed(&rng, (u32)osGetTime());
  state s = { .balance = CR_START_BALANCE, .goal = CR_START_GOAL, .bet = 10, .lastSlot = -1, .mult = 1, .colour = CR_RED, .result = -1 };
  Tex3DS_SubTexture hostSub;

  while (aptMainLoop()) {
    hidScanInput();
    u32 down = hidKeysDown();
    if (down & KEY_START) break;
    if (!busy(&s)) {
      if (down & KEY_UP && s.bet < (int)s.balance) s.bet++;
      if (down & KEY_DOWN && s.bet > 1) s.bet--;
      if (down & KEY_SELECT) { s.game = (s.game + 1) % GAME_COUNT; s.mood = 0; down = 0; }
    }
    s.tick++;
    if (s.lock > 0) { s.lock--; down &= ~(u32)(KEY_A | KEY_B); }
    if (s.game == GAME_PLINKO) updatePlinko(&s, &rng, down);
    else if (s.game == GAME_CRASH) updateCrash(&s, &rng, down);
    else if (s.game == GAME_RIVER) updateRiver(&s, &rng, down);
    else updateRoulette(&s, &rng, down);

    C3D_FrameBegin(C3D_FRAME_SYNCDRAW);
    C2D_TargetClear(top, C2D_Color32(0x19, 0x17, 0x27, 0xFF));
    C2D_SceneBegin(top);
    if (s.game == GAME_PLINKO) drawPlinko(&s);
    else if (s.game == GAME_CRASH) drawCrash(&s);
    else if (s.game == GAME_RIVER) drawRiver(&s);
    else drawRoulette(&s);

    C2D_TargetClear(bottom, C2D_Color32(0x29, 0x26, 0x3A, 0xFF));
    C2D_SceneBegin(bottom);
    C2D_Image logo = C2D_SpriteSheetGetImage(sheet, sprites_logo_idx);
    draw(logo, (BOT_W - logo.subtex->width) / 2.0f, 6, 0);
    C2D_DrawImageAt(frame(sprites_host_idx, s.mood, 3, &hostSub), 16, 150, 0, NULL, 2, 2);
    char hud[128];
    snprintf(hud, sizeof hud, "%s\nBalance $%.2f\nGoal    $%.0f\nBet     $%d", GAME_NAME[s.game], s.balance, s.goal, s.bet);
    text(80, 74, 2, 0xFF4EC3F4, hud);
    text((BOT_W - textW(GAME_HELP[s.game], 1)) / 2.0f, 222, 1, 0xFFCEF0FF, GAME_HELP[s.game]);
    C3D_FrameEnd(0);
  }

  C2D_SpriteSheetFree(sheet);
  C2D_Fini();
  C3D_Fini();
  gfxExit();
  romfsExit();
  return 0;
}
