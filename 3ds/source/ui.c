// Drawing and widget helpers: pixel font, chamfered panels, bevelled buttons, glyphs, footer.
// Everything is drawn at one depth so citro2d paints in submission order.
#include <ctype.h>
#include <math.h>
#include <string.h>
#include "app.h"
#include "font_glyphs.h"

#define Z 0.5f
touch_t T;
int uiSnap = 1; // 2 while drawing a half-scale preview, so glyphs land on whole screen pixels
static float snap(float v) { return floorf(v / uiSnap) * uiSnap; }
static int flashId, flashT;

C2D_Image img(int idx) { return C2D_SpriteSheetGetImage(SHEET, idx); }
void spr(int idx, float x, float y, float s) { C2D_DrawImageAt(img(idx), snap(x), snap(y), Z, NULL, s, s); }
void sprT(int idx, float x, float y, float s, u32 tint, float blend) {
  C2D_ImageTint t;
  C2D_PlainImageTint(&t, tint, blend);
  C2D_DrawImageAt(img(idx), floorf(x), floorf(y), Z, &t, s, s);
}

// One frame of a horizontal strip sprite; negative sx mirrors.
void sprFrame(int idx, int f, int frames, float x, float y, float sx, float sy) {
  C2D_Image im = img(idx);
  Tex3DS_SubTexture sub = *im.subtex;
  float span = (sub.right - sub.left) / frames;
  sub.width /= frames;
  sub.left += span * f;
  sub.right = sub.left + span;
  im.subtex = &sub;
  C2D_DrawImageAt(im, snap(x), snap(y), Z, NULL, sx, sy);
}

// Tile a texture over a rectangle, cropping the edge tiles (no scissor needed).
void tiles(int idx, float x, float y, float w, float h) {
  C2D_Image im = img(idx);
  const Tex3DS_SubTexture *s = im.subtex;
  for (float ty = 0; ty < h; ty += s->height)
    for (float tx = 0; tx < w; tx += s->width) {
      Tex3DS_SubTexture sub = *s;
      float cw = fminf(s->width, w - tx), ch = fminf(s->height, h - ty);
      sub.width = cw;
      sub.height = ch;
      sub.right = s->left + (s->right - s->left) * cw / s->width;
      sub.bottom = s->top + (s->bottom - s->top) * ch / s->height;
      C2D_Image part = { im.tex, &sub };
      C2D_DrawImageAt(part, x + tx, y + ty, Z, NULL, 1, 1);
    }
}

void rect(float x, float y, float w, float h, u32 c) { if (w > 0 && h > 0) C2D_DrawRectSolid(floorf(x), floorf(y), Z, floorf(w), floorf(h), c); }

// Stepped (pixel) chamfered rectangle.
void oct(float x, float y, float w, float h, int c, u32 col) {
  x = floorf(x); y = floorf(y); w = floorf(w); h = floorf(h);
  rect(x, y + c, w, h - 2 * c, col);
  for (int i = 0; i < c; i++) {
    rect(x + c - i, y + i, w - 2 * (c - i), 1, col);
    rect(x + c - i, y + h - 1 - i, w - 2 * (c - i), 1, col);
  }
}

// ---------- pixel font ----------
static const cr_glyph *glyphOf(char c) {
  c = (char)toupper((unsigned char)c);
  for (int i = 0; i < CR_GLYPH_COUNT; i++) if (CR_GLYPHS[i].c == c) return &CR_GLYPHS[i];
  return NULL;
}

int textW(const char *s, int scale) {
  int w = 0, best = 0;
  for (; *s; s++) {
    if (*s == '\n') { if (w > best) best = w; w = 0; continue; }
    const cr_glyph *g = glyphOf(*s);
    w += ((g ? g->w : 3) + 1) * scale;
  }
  if (w > best) best = w;
  return best > 0 ? best - scale : 0;
}

static void textRaw(float x, float y, int scale, u32 color, const char *s) {
  C2D_Image atlas = img(sprites_casino_run_pixel_atlas_idx);
  const Tex3DS_SubTexture *a = atlas.subtex;
  C2D_ImageTint tint;
  C2D_PlainImageTint(&tint, color, 1.0f);
  x = snap(x); y = snap(y); // whole pixels: nearest sampling drops a glyph column at x.5
  float cx = x;
  for (; *s; s++) {
    if (*s == '\n') { cx = x; y += (CR_FONT_CELL_H + 2) * scale; continue; }
    const cr_glyph *g = glyphOf(*s);
    if (!g) { cx += 4 * scale; continue; }
    Tex3DS_SubTexture sub = *a;
    sub.width = g->w;
    sub.height = CR_FONT_CELL_H;
    sub.left = a->left + (a->right - a->left) * g->x / a->width;
    sub.right = a->left + (a->right - a->left) * (g->x + g->w) / a->width;
    sub.top = a->top + (a->bottom - a->top) * g->y / a->height;
    sub.bottom = a->top + (a->bottom - a->top) * (g->y + CR_FONT_CELL_H) / a->height;
    C2D_Image im = { atlas.tex, &sub };
    C2D_DrawImageAt(im, cx, y, Z, &tint, scale, scale);
    cx += (g->w + 1) * scale;
  }
}

void text(float x, float y, int scale, u32 c, const char *s) { textRaw(x, y, scale, c, s); }

// Ink outline plus a one-step drop, like the chunky labels in the mockups.
void textO(float x, float y, int scale, u32 c, u32 o, const char *s) {
  int d = scale >= 3 ? 2 : 1;
  textRaw(x - d, y, scale, o, s);
  textRaw(x + d, y, scale, o, s);
  textRaw(x, y - d, scale, o, s);
  textRaw(x, y + d + (scale >= 2), scale, o, s);
  textRaw(x, y, scale, c, s);
}

static void lines(float cx, float y, int scale, u32 c, u32 o, const char *s, int outlined) {
  char buf[160];
  while (*s) {
    const char *e = strchr(s, '\n');
    size_t n = e ? (size_t)(e - s) : strlen(s);
    if (n >= sizeof buf) n = sizeof buf - 1;
    memcpy(buf, s, n);
    buf[n] = 0;
    float x = cx - textW(buf, scale) / 2.0f;
    if (outlined) textO(x, y, scale, c, o, buf); else textRaw(x, y, scale, c, buf);
    y += (CR_FONT_CELL_H + 2) * scale;
    s += n + (e ? 1 : 0);
    if (!e) break;
  }
}
void textC(float cx, float y, int scale, u32 c, const char *s) { lines(cx, y, scale, c, 0, s, 0); }
void textCO(float cx, float y, int scale, u32 c, u32 o, const char *s) { lines(cx, y, scale, c, o, s, 1); }

// Greedy word wrap into lines no wider than w.
static int wrap(float x, float y, float w, int scale, u32 c, const char *s, int centre) {
  char line[160], word[64];
  int n = 0, h = 0;
  line[0] = 0;
  while (1) {
    while (*s == ' ') s++;
    int k = 0;
    while (*s && *s != ' ' && *s != '\n' && k < 63) word[k++] = *s++;
    word[k] = 0;
    char trial[224];
    snprintf(trial, sizeof trial, "%s%s%s", line, n ? " " : "", word);
    if (k && n && textW(trial, scale) > w) {
      if (centre) textC(x, y + h, scale, c, line); else text(x, y + h, scale, c, line);
      h += (CR_FONT_CELL_H + 2) * scale;
      snprintf(line, sizeof line, "%s", word);
      n = 1;
    } else if (k) { snprintf(line, sizeof line, "%s", trial); n = 1; }
    if (*s == '\n' || !*s) {
      if (n) { if (centre) textC(x, y + h, scale, c, line); else text(x, y + h, scale, c, line); h += (CR_FONT_CELL_H + 2) * scale; }
      line[0] = 0; n = 0;
      if (!*s) break;
      s++;
    }
  }
  return h;
}
int wrapC(float cx, float y, float w, int scale, u32 c, const char *s) { return wrap(cx, y, w, scale, c, s, 1); }
int wrapL(float x, float y, float w, int scale, u32 c, const char *s) { return wrap(x, y, w, scale, c, s, 0); }

// ---------- panels ----------
void panel(float x, float y, float w, float h, u32 border, u32 fill) {
  oct(x, y, w, h, 5, C_INK);
  oct(x + 1, y + 1, w - 2, h - 2, 4, border);
  oct(x + 3, y + 3, w - 6, h - 6, 3, fill);
}

// Full-screen menu frame: double purple border with gold corner studs (start/pause/results mockups).
void frameScreen(float w, float h) {
  tiles(sprites_cabinet_idx, 0, 0, w, h);
  rect(2, 2, w - 4, 2, C_PURPLE_L);
  rect(2, h - 4, w - 4, 2, C_PURPLE_L);
  rect(2, 2, 2, h - 4, C_PURPLE_L);
  rect(w - 4, 2, 2, h - 4, C_PURPLE_L);
  rect(5, 5, w - 10, 1, C_PURPLE);
  rect(5, h - 6, w - 10, 1, C_PURPLE);
  rect(5, 5, 1, h - 10, C_PURPLE);
  rect(w - 6, 5, 1, h - 10, C_PURPLE);
  float cx[2] = { 1, w - 6 }, cy[2] = { 1, h - 6 };
  for (int i = 0; i < 2; i++)
    for (int j = 0; j < 2; j++) { rect(cx[i], cy[j], 5, 5, C_GOLD_D); rect(cx[i] + 1, cy[j] + 1, 3, 3, C_GOLD); }
}

// "—— TITLE ——" header line used across the menus.
void titleRule(float cx, float y, float w, int scale, u32 c, const char *s) {
  int tw = textW(s, scale);
  float lineY = y + (CR_FONT_CELL_H * scale) / 2.0f;
  rect(cx - w / 2, lineY, (w - tw) / 2 - 8, 1, C_PURPLE_L);
  rect(cx + tw / 2 + 8, lineY, (w - tw) / 2 - 8, 1, C_PURPLE_L);
  textCO(cx, y, scale, c, C_INK, s);
}

void sparkle(float x, float y, int phase, u32 c) {
  int r = (phase % 40) < 20 ? 2 : 1; // gentle twinkle
  rect(x - r - 1, y, 2 * r + 3, 1, c);
  rect(x, y - r - 1, 1, 2 * r + 3, c);
  rect(x - 1, y - 1, 3, 3, c);
}

// ---------- input ----------
void uiFrameStart(void) {
  u32 down = hidKeysDown(), held = hidKeysHeld(), up = hidKeysUp();
  touchPosition tp;
  hidTouchRead(&tp);
  T.down = !!(down & KEY_TOUCH);
  T.held = !!(held & KEY_TOUCH);
  T.up = !!(up & KEY_TOUCH);
  if (T.held) { T.x = tp.px; T.y = tp.py; }
  if (T.down) { T.px = tp.px; T.py = tp.py; }
  if (flashT > 0 && --flashT == 0) flashId = 0;
}

static int inside(int x0, int y0, float x, float y, float w, float h) { return x0 >= x && x0 < x + w && y0 >= y && y0 < y + h; }
int hit(float x, float y, float w, float h) { return T.up && inside(T.px, T.py, x, y, w, h) && inside(T.x, T.y, x, y, w, h); }
void pressFlash(int id) { flashId = id; flashT = 6; }

// Bevelled button. Returns 1 when tapped (press and release inside). DIM buttons draw but never fire.
int button(int id, float x, float y, float w, float h, int style, const char *label, int scale) {
  int sel = style & 0x100;
  style &= 0xFF;
  int pressed = (T.held && inside(T.px, T.py, x, y, w, h) && inside(T.x, T.y, x, y, w, h)) || (id && flashId == id);
  if (style == B_DIM || style == B_OUTLINE_DIM) pressed = 0;
  if (style != B_GHOST) {
    u32 border = C_PURPLE_L, fill = C_PURPLE_D, hi = C_PURPLE, lo = RGB(0x2E2156), txt = C_CREAM;
    switch (style) {
      case B_GOLD: border = RGB(0xFFE7A0); fill = C_GOLD; hi = RGB(0xFFE08A); lo = C_GOLD_D; txt = C_INK; break;
      case B_SEL: border = C_GOLD; fill = C_GOLD_SEL; hi = RGB(0x8A6A28); lo = RGB(0x4A3818); txt = C_GOLD; break;
      case B_DIM: border = C_GREY_D; fill = RGB(0x3E3A50); hi = RGB(0x4A4660); lo = RGB(0x2A2738); txt = C_GREY; break;
      case B_RED: border = RGB(0xFF8A84); fill = RGB(0xC8414A); hi = C_CORAL; lo = C_RED_D; txt = C_CREAM; break;
      case B_BLACK: border = C_GREY_D; fill = RGB(0x1E1B2A); hi = RGB(0x2E2A40); lo = C_INK; txt = C_CREAM; break;
      case B_GREEN: border = RGB(0xA8F08E); fill = RGB(0x3FA047); hi = C_GREEN; lo = C_GREEN_D; txt = C_CREAM; break;
      case B_OUTLINE: border = C_GOLD; fill = RGB(0x221D33); hi = fill; lo = fill; txt = C_GOLD; break;
      case B_OUTLINE_DIM: border = C_GREY_D; fill = RGB(0x221D33); hi = fill; lo = fill; txt = C_GREY; break;
    }
    if (sel) border = C_GOLD;
    float oy = pressed ? 1 : 0;
    oct(x, y + oy, w, h - oy, 4, C_INK);
    oct(x + 1, y + 1 + oy, w - 2, h - 2 - oy, 3, border);
    if (sel) oct(x + 2, y + 2 + oy, w - 4, h - 4 - oy, 3, C_GOLD);
    int in = sel ? 3 : 2;
    oct(x + in, y + in + oy, w - 2 * in, h - 2 * in - oy, 2, fill);
    if (style != B_OUTLINE && style != B_OUTLINE_DIM) {
      rect(x + in + 2, y + in + oy, w - 2 * in - 4, 2, pressed ? lo : hi);
      rect(x + in + 2, y + h - in - 2, w - 2 * in - 4, 2, pressed ? hi : lo);
    }
    if (label && *label) {
      int nl = 1;
      for (const char *p = label; *p; p++) nl += *p == '\n';
      float th = nl * (CR_FONT_CELL_H + 2) * scale - 2 * scale;
      float ty = y + oy + (h - th) / 2.0f + (scale > 1 ? 1 : 0);
      if (style == B_GOLD) textC(x + w / 2.0f, ty, scale, txt, label);
      else textCO(x + w / 2.0f, ty, scale, txt, C_INK, label);
    }
  }
  if (style == B_DIM || style == B_OUTLINE_DIM) return 0;
  return hit(x, y, w, h);
}

// Button glyphs: green A, red B, cyan X, grey L/R, d-pad, touch, arrows.
void padGlyph(float x, float y, char k) {
  if (k == 'A' || k == 'B' || k == 'X' || k == 'Y') {
    u32 c = k == 'A' ? C_GREEN : k == 'B' ? C_CORAL : k == 'X' ? C_CYAN : C_GREY;
    C2D_DrawCircleSolid(x + 6, y + 6, Z, 7, C_INK);
    C2D_DrawCircleSolid(x + 6, y + 6, Z, 6, c);
    char s[2] = { k, 0 };
    text(x + 6 - textW(s, 1) / 2.0f, y + 2, 1, C_INK, s);
  } else if (k == 'L' || k == 'R') {
    oct(x, y + 1, 11, 11, 2, C_INK);
    oct(x + 1, y + 2, 9, 9, 1, C_GREY);
    char s[2] = { k, 0 };
    text(x + 6 - textW(s, 1) / 2.0f, y + 3, 1, C_INK, s);
  } else if (k == 'D') { // d-pad
    rect(x + 4, y, 5, 13, C_INK); rect(x, y + 4, 13, 5, C_INK);
    rect(x + 5, y + 1, 3, 11, C_GREY); rect(x + 1, y + 5, 11, 3, C_GREY);
  } else if (k == 'T') { // stylus tap: screen outline and a pointer
    rect(x, y + 2, 12, 9, C_GREY); rect(x + 1, y + 3, 10, 7, C_INK);
    rect(x + 8, y + 6, 3, 6, C_CREAM); rect(x + 7, y + 9, 5, 3, C_CREAM);
  } else if (k == '<' || k == '>') {
    float d = k == '<' ? -1 : 1, cx = x + 3;
    C2D_DrawTriangle(cx - 3 * d, y + 2, C_GREY, cx - 3 * d, y + 11, C_GREY, cx + 3 * d, y + 6.5f, C_GREY, Z);
  } else if (k == 'S') { // START
    C2D_DrawCircleSolid(x + 6, y + 6, Z, 6, C_INK);
    C2D_DrawCircleSolid(x + 6, y + 6, Z, 5, C_GREY_D);
  }
}

static float glyphW(const char *g) {
  float w = 0;
  for (; *g; g++) {
    if (*g == '/') { w += 7; continue; }
    w += (*g == '<' || *g == '>') ? 8 : (*g == 'L' || *g == 'R') ? 12 : 14;
  }
  return w;
}

// Footer: "A:ACT|B:BACK|X:ITEM|L/R:GAME". A leading '~' dims an entry. Glyphs: A B X L R D T < > S, '/' between.
// Gameplay screens use an ink bar; framed menus keep the hints inside the frame under a rule line.
void footerEx(const char *spec, int framed) {
  float gy = framed ? 211 : 220;
  if (framed) rect(14, 204, BOT_W - 28, 1, C_PURPLE_L);
  else { rect(0, 212, BOT_W, 28, C_INK); rect(0, 212, BOT_W, 1, C_PURPLE); }
  char items[6][40];
  int n = 0;
  for (const char *p = spec; *p && n < 6;) {
    const char *e = strchr(p, '|');
    size_t k = e ? (size_t)(e - p) : strlen(p);
    if (k > 39) k = 39;
    memcpy(items[n], p, k);
    items[n++][k] = 0;
    p += k + (e ? 1 : 0);
    if (!e) break;
  }
  float widths[6], total = 0;
  for (int i = 0; i < n; i++) {
    const char *it = items[i] + (items[i][0] == '~');
    const char *colon = strchr(it, ':');
    char g[8] = "";
    if (colon) { size_t gl = (size_t)(colon - it); if (gl > 7) gl = 7; memcpy(g, it, gl); g[gl] = 0; }
    widths[i] = glyphW(g) + (colon ? 3 : 0) + textW(colon ? colon + 1 : it, 1);
    total += widths[i] + (i ? 17 : 0);
  }
  float x = (BOT_W - total) / 2.0f;
  for (int i = 0; i < n; i++) {
    int dim = items[i][0] == '~';
    const char *it = items[i] + dim;
    const char *colon = strchr(it, ':');
    if (i) { rect(x + 8, gy - 1, 1, 14, C_GREY_D); x += 17; }
    float gx = x;
    if (colon)
      for (const char *g = it; g < colon; g++) {
        if (*g == '/') { text(gx, gy + 2, 1, C_GREY, "/"); gx += 7; continue; }
        padGlyph(gx, gy, *g);
        gx += (*g == '<' || *g == '>') ? 8 : (*g == 'L' || *g == 'R') ? 12 : 14;
      }
    text(colon ? gx + 3 : gx, gy + 2, 1, dim ? C_GREY_D : C_CREAM, colon ? colon + 1 : it);
    x += widths[i];
  }
}
void footer(const char *spec) { footerEx(spec, 0); }
