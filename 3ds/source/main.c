// Casino Run 3DS: stage 3 vertical slice (Plinko). Top screen = board, bottom = HUD + host.
// Outcomes come from rules.c (same rules and RNG as the web build); the ball is steered into the
// pre-rolled slot exactly like the web game, so the visual always matches the payout.
#include <3ds.h>
#include <citro2d.h>
#include <stdio.h>
#include "rules.h"
#include "sprites.h"

#define TOP_W 400
#define BOT_W 320
#define SCREEN_H 240
#define ROWS 7

static C2D_SpriteSheet sheet;
static C2D_TextBuf textBuf;
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

static void text(float x, float y, float size, u32 color, const char *s) {
  C2D_Text t;
  C2D_TextParse(&t, textBuf, s);
  C2D_TextOptimize(&t);
  C2D_DrawText(&t, C2D_WithColor, x, y, 0.5f, size, size, color);
}

static void draw(C2D_Image img, float x, float y, float depth) { C2D_DrawImageAt(img, x, y, depth, NULL, 1, 1); }

static float slotX(int slot) { return 40 + (slot + 0.5f) * (TOP_W - 80) / 5.0f; }

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
  textBuf = C2D_TextBufNew(1024);

  cr_rng rng;
  cr_seed(&rng, (u32)osGetTime());
  double balance = CR_START_BALANCE, goal = CR_START_GOAL;
  int bet = 10, dropping = 0, target = 0, mood = 0, lastSlot = -1;
  float ballX = 0, ballY = 0;
  Tex3DS_SubTexture hostSub;

  while (aptMainLoop()) {
    hidScanInput();
    u32 down = hidKeysDown();
    if (down & KEY_START) break;
    if (!dropping) {
      if (down & KEY_UP && bet < (int)balance) bet++;
      if (down & KEY_DOWN && bet > 1) bet--;
      if (down & KEY_A && balance >= bet) {
        balance -= bet;
        target = cr_roll_plinko_slot(&rng);
        dropping = 1; ballX = TOP_W / 2.0f; ballY = 8; mood = 0;
      }
    } else {
      // Fall one row every 12 px; between rows drift toward the target with a peg-bounce zigzag.
      ballY += 2.0f;
      int row = (int)(ballY / 24);
      float aim = TOP_W / 2.0f + (slotX(target) - TOP_W / 2.0f) * (ballY / 200.0f);
      ballX += (aim + ((row & 1) ? 6 : -6) - ballX) * 0.15f;
      if (ballY >= 204) {
        double win = bet * cr_plinko_mult[target];
        balance += win;
        mood = win > bet ? 1 : win < bet ? 2 : 0;
        lastSlot = target;
        dropping = 0;
        if (balance >= goal) goal = cr_next_goal(balance);
      }
    }

    C2D_TextBufClear(textBuf);
    C3D_FrameBegin(C3D_FRAME_SYNCDRAW);

    C2D_TargetClear(top, C2D_Color32(0x19, 0x17, 0x27, 0xFF));
    C2D_SceneBegin(top);
    C2D_Image plate = C2D_SpriteSheetGetImage(sheet, sprites_plate_idx);
    for (int y = 0; y < SCREEN_H; y += 32)
      for (int x = 0; x < TOP_W; x += 32) draw(plate, x, y, 0);
    C2D_Image peg = C2D_SpriteSheetGetImage(sheet, sprites_peg_idx);
    for (int r = 1; r <= ROWS; r++)
      for (int i = 0; i < r + 2; i++) draw(peg, TOP_W / 2.0f + (i - (r + 1) / 2.0f) * 34 - 3, 20 + r * 24, 0.1f);
    for (int s = 0; s < 5; s++) {
      char label[16];
      snprintf(label, sizeof label, "%gx", cr_plinko_mult[s]);
      C2D_DrawRectSolid(slotX(s) - 30, 212, 0.2f, 60, 26, s == lastSlot ? 0xFFFFFFFF : SLOT_COLOR[s]);
      text(slotX(s) - 12, 216, 0.6f, 0xFF170C0E, label);
    }
    if (dropping) draw(C2D_SpriteSheetGetImage(sheet, sprites_ball_idx), ballX - 4, ballY, 0.3f);

    C2D_TargetClear(bottom, C2D_Color32(0x29, 0x26, 0x3A, 0xFF));
    C2D_SceneBegin(bottom);
    C2D_Image logo = C2D_SpriteSheetGetImage(sheet, sprites_logo_idx);
    draw(logo, (BOT_W - logo.subtex->width) / 2.0f, 6, 0);
    C2D_DrawImageAt(frame(sprites_host_idx, mood, 3, &hostSub), 16, 150, 0, NULL, 2, 2);
    char hud[96];
    snprintf(hud, sizeof hud, "Balance $%.2f\nGoal    $%.0f\nBet     $%d", balance, goal, bet);
    text(90, 82, 0.7f, 0xFF4EC3F4, hud);
    text(90, 176, 0.5f, 0xFFCEF0FF, "A drop   Up/Down bet\nSTART quit");

    C3D_FrameEnd(0);
  }

  C2D_TextBufDelete(textBuf);
  C2D_SpriteSheetFree(sheet);
  C2D_Fini();
  C3D_Fini();
  gfxExit();
  romfsExit();
  return 0;
}
