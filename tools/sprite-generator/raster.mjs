// Tiny palette-indexed raster + PNG encoder. Zero dependencies (node:zlib only).
import zlib from "node:zlib";
import { KEY_TO_HEX, NAME_TO_KEY, hexToRgba } from "../../assets-src/palette.mjs";
import { GLYPHS, ALIASES } from "../../assets-src/font5x7.mjs";

const toKey = (c) => (c.length === 1 ? c : NAME_TO_KEY[c]);

export class Img {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null); // palette key or null
  }
  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c == null ? null : toKey(c);
    return this;
  }
  get(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  // Grid of palette keys ('.' = skip). swaps maps a key to another palette name/key.
  blit(grid, x = 0, y = 0, swaps = {}) {
    grid.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === ".") return;
      this.set(x + i, y + j, swaps[ch] ? toKey(swaps[ch]) : ch);
    }));
    return this;
  }
  // Disc lit from the top-left: hi on the lit rim, lo on the far side.
  ball(cx, cy, r, base, hi, lo) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x + 0.5 - 0.5, y);
      if (d > r + 0.25) continue;
      const lit = (-x - y) / (r * 1.414);
      this.set(cx + x, cy + y, lit > 0.45 && d > r * 0.35 ? hi : lit < -0.35 ? lo : base);
    }
    return this;
  }
  disc(cx, cy, r, c) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (Math.hypot(x, y) <= r + 0.25) this.set(cx + x, cy + y, c);
    return this;
  }
  ring(cx, cy, r0, r1, colorAt) {
    for (let y = -r1; y <= r1; y++) for (let x = -r1; x <= r1; x++) {
      const d = Math.hypot(x, y);
      if (d >= r0 - 0.25 && d <= r1 + 0.25) this.set(cx + x, cy + y, typeof colorAt === "function" ? colorAt(Math.atan2(y, x), d) : colorAt);
    }
    return this;
  }
  line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  text(str, x, y, c, scale = 1) {
    let cx = x;
    for (const ch of str) {
      const g = glyph(ch);
      if (!g) continue;
      g.rows.forEach((row, j) => [...row].forEach((p, i) => {
        if (p === "#") this.rect(cx + i * scale, y + j * scale, scale, scale, c);
      }));
      cx += (g.width + 1) * scale;
    }
    return this;
  }
  // 1px outline on transparent pixels touching opaque ones (4-neighbour = clean pixel-art edge).
  outline(c = "ink", diagonal = false) {
    const k = toKey(c), add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      if (diagonal) n.push([1, 1], [-1, -1], [1, -1], [-1, 1]);
      if (n.some(([dx, dy]) => { const v = this.get(x + dx, y + dy); return v && v !== k; })) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.set(x, y, k));
    return this;
  }
  padded(n) {
    const out = new Img(this.w + n * 2, this.h + n * 2);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) out.px[(y + n) * out.w + x + n] = this.px[y * this.w + x];
    return out;
  }
  // Hard drop shadow (dx,dy) under opaque pixels, Balatro/Nubby sticker look.
  shadow(dx = 1, dy = 1, c = "ink") {
    const out = new Img(this.w + dx, this.h + dy);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.get(x, y)) out.set(x + dx, y + dy, c);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const v = this.get(x, y); if (v) out.set(x, y, v); }
    return out;
  }
  scaled(s) {
    const out = new Img(this.w * s, this.h * s);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = this.px[Math.floor(y / s) * this.w + Math.floor(x / s)];
    return out;
  }
  // Map every non-null pixel through fn(key, x, y) -> key.
  recolor(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = this.px[y * this.w + x];
      if (v) this.px[y * this.w + x] = toKey(fn(v, x, y));
    }
    return this;
  }
  draw(img, x, y) {
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const v = img.px[j * img.w + i]; if (v) this.set(x + i, y + j, v); }
    return this;
  }
  rgba() {
    const buf = Buffer.alloc(this.w * this.h * 4);
    this.px.forEach((k, i) => { if (k) Buffer.from(hexToRgba(KEY_TO_HEX[k])).copy(buf, i * 4); });
    return buf;
  }
}

export function glyph(ch) {
  const rows = GLYPHS[ch] || GLYPHS[ALIASES[ch]];
  if (!rows) return null;
  return { rows, width: rows[0].length };
}

export function textWidth(str, scale = 1) {
  let w = 0;
  for (const ch of str) { const g = glyph(ch); if (g) w += (g.width + 1) * scale; }
  return Math.max(0, w - scale);
}

// ---- PNG encoding (RGBA8, filter 0) ----
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}

export function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const toPng = (img) => encodePng(img.w, img.h, img.rgba());
