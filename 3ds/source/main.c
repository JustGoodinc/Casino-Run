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

enum { GAME_PLINKO, GAME_CRASH, GAME_COUNT };
static const char *GAME_NAME[GAME_COUNT] = { "PLINKO", "CRASH" };
static const char *GAME_HELP[GAME_COUNT] = { "A DROP  UP/DOWN BET  SELECT GAME", "A LAUNCH/CASH OUT  UP/DOWN BET  SELECT GAME" };

typedef struct {
  double balance, goal;
  int bet, mood, game;
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
  if (s->balance >= s->goal) s->goal = cr_next_goal(s->balance);
}

static int busy(const state *s) { return s->dropping || s->flying; }

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
  state s = { .balance = CR_START_BALANCE, .goal = CR_START_GOAL, .bet = 10, .lastSlot = -1, .mult = 1 };
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
    if (s.game == GAME_PLINKO) updatePlinko(&s, &rng, down);
    else updateCrash(&s, &rng, down);

    C3D_FrameBegin(C3D_FRAME_SYNCDRAW);
    C2D_TargetClear(top, C2D_Color32(0x19, 0x17, 0x27, 0xFF));
    C2D_SceneBegin(top);
    if (s.game == GAME_PLINKO) drawPlinko(&s);
    else drawCrash(&s);

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
