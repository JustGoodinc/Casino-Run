// Compiles the 5x7 bitmap glyphs into a minimal TrueType font: each horizontal pixel run is one
// rectangle contour. 1 font pixel = 100 units, unitsPerEm 1000, so the font is crisp at multiples of 10px.
import { GLYPHS, ALIASES } from "../../assets-src/font5x7.mjs";

const PX = 100, ASC = 800, DESC = 200;

function glyphRects(rows) {
  const rects = [];
  rows.forEach((row, r) => {
    let start = -1;
    for (let c = 0; c <= row.length; c++) {
      const on = row[c] === "#";
      if (on && start < 0) start = c;
      if (!on && start >= 0) { rects.push([start, r, c - start]); start = -1; }
    }
  });
  // Row 6 sits on the baseline; row 7 (if any) is a descender.
  return rects.map(([c, r, len]) => ({ x0: c * PX, x1: (c + len) * PX, y0: (6 - r) * PX, y1: (7 - r) * PX }));
}

class W {
  constructor() { this.parts = []; this.len = 0; }
  u8(v) { const b = Buffer.alloc(1); b.writeUInt8(v); return this.push(b); }
  u16(v) { const b = Buffer.alloc(2); b.writeUInt16BE(v & 0xffff); return this.push(b); }
  i16(v) { const b = Buffer.alloc(2); b.writeInt16BE(v); return this.push(b); }
  u32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v >>> 0); return this.push(b); }
  tag(s) { return this.push(Buffer.from(s, "ascii")); }
  push(b) { this.parts.push(b); this.len += b.length; return this; }
  buf() { return Buffer.concat(this.parts); }
}

const pad4 = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);
function checksum(b) {
  b = pad4(b);
  let s = 0;
  for (let i = 0; i < b.length; i += 4) s = (s + b.readUInt32BE(i)) >>> 0;
  return s;
}

export function buildTtf(familyName = "Casino Run Pixel") {
  const chars = Object.keys(GLYPHS).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  const glyphs = [{ name: ".notdef", rects: [{ x0: 0, x1: 400, y0: 0, y1: 700 }], adv: 500 }];
  const gid = {};
  for (const ch of chars) {
    const rows = GLYPHS[ch];
    gid[ch] = glyphs.length;
    glyphs.push({ rects: ch === " " ? [] : glyphRects(rows), adv: (rows[0].length + 1) * PX });
  }
  const cmapEntries = chars.map((ch) => [ch.codePointAt(0), gid[ch]]);
  for (const [alias, target] of Object.entries(ALIASES)) if (gid[target] && !GLYPHS[alias]) cmapEntries.push([alias.codePointAt(0), gid[target]]);
  cmapEntries.sort((a, b) => a[0] - b[0]);

  // glyf + loca
  const glyfParts = [], loca = [0];
  let maxPoints = 0, maxContours = 0, bbox = [0, -DESC, 0, ASC];
  for (const g of glyphs) {
    if (!g.rects.length) { glyfParts.push(Buffer.alloc(0)); loca.push(loca.at(-1)); continue; }
    const w = new W();
    const xs = g.rects.flatMap((r) => [r.x0, r.x1]), ys = g.rects.flatMap((r) => [r.y0, r.y1]);
    const [xMin, xMax, yMin, yMax] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    bbox = [Math.min(bbox[0], xMin), Math.min(bbox[1], yMin), Math.max(bbox[2], xMax), Math.max(bbox[3], yMax)];
    w.i16(g.rects.length).i16(xMin).i16(yMin).i16(xMax).i16(yMax);
    g.rects.forEach((_, i) => w.u16(i * 4 + 3));
    w.u16(0); // no instructions
    const pts = g.rects.flatMap((r) => [[r.x0, r.y0], [r.x0, r.y1], [r.x1, r.y1], [r.x1, r.y0]]); // clockwise
    pts.forEach(() => w.u8(0x01));
    let px = 0, py = 0;
    pts.forEach(([x]) => { w.i16(x - px); px = x; });
    pts.forEach(([, y]) => { w.i16(y - py); py = y; });
    maxPoints = Math.max(maxPoints, pts.length);
    maxContours = Math.max(maxContours, g.rects.length);
    const b = pad4(w.buf());
    glyfParts.push(b);
    loca.push(loca.at(-1) + b.length);
  }
  const glyf = Buffer.concat(glyfParts);
  const locaW = new W(); loca.forEach((o) => locaW.u32(o));

  const n = glyphs.length, advMax = Math.max(...glyphs.map((g) => g.adv));
  const head = new W().u32(0x00010000).u32(0x00010000).u32(0).u32(0x5f0f3cf5).u16(0x000b).u16(1000)
    .u32(0).u32(0).u32(0).u32(0).i16(bbox[0]).i16(bbox[1]).i16(bbox[2]).i16(bbox[3])
    .u16(0).u16(8).i16(2).i16(1).i16(0);
  const hhea = new W().u32(0x00010000).i16(ASC).i16(-DESC).i16(0).u16(advMax).i16(0).i16(0).i16(bbox[2])
    .i16(1).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).u16(n);
  const maxp = new W().u32(0x00010000).u16(n).u16(maxPoints).u16(maxContours).u16(0).u16(0).u16(2)
    .u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0);
  const hmtx = new W(); glyphs.forEach((g) => hmtx.u16(g.adv).i16(0));
  const post = new W().u32(0x00030000).u32(0).i16(-100).i16(100).u32(0).u32(0).u32(0).u32(0).u32(0);

  const codes = cmapEntries.map((e) => e[0]);
  const os2 = new W().u16(4).i16(550).u16(400).u16(5).u16(0)
    .i16(500).i16(500).i16(0).i16(100).i16(500).i16(500).i16(0).i16(300).i16(100).i16(300).i16(0);
  os2.push(Buffer.from([2, 0, 5, 0, 0, 0, 0, 0, 0, 0])); // panose
  os2.u32(1).u32(0).u32(0).u32(0).tag("CRUN").u16(0x40).u16(Math.min(...codes)).u16(Math.min(0xffff, Math.max(...codes)))
    .i16(ASC).i16(-DESC).i16(0).u16(ASC).u16(DESC).u32(1).u32(0).i16(500).i16(700).u16(0).u16(32).u16(1);

  // cmap format 4, one segment per code point.
  const segs = [...cmapEntries.map(([c, g]) => ({ start: c, end: c, delta: (g - c) & 0xffff })), { start: 0xffff, end: 0xffff, delta: 1 }];
  const segX2 = segs.length * 2, sr = 2 ** Math.floor(Math.log2(segs.length)) * 2;
  const sub = new W().u16(4).u16(16 + segs.length * 8).u16(0).u16(segX2).u16(sr).u16(Math.log2(sr / 2)).u16(segX2 - sr);
  segs.forEach((s) => sub.u16(s.end)); sub.u16(0);
  segs.forEach((s) => sub.u16(s.start)); segs.forEach((s) => sub.u16(s.delta)); segs.forEach(() => sub.u16(0));
  const cmap = new W().u16(0).u16(1).u16(3).u16(1).u32(12).push(sub.buf());

  const names = { 1: familyName, 2: "Regular", 3: `${familyName} Regular 1.0`, 4: familyName, 5: "Version 1.0", 6: familyName.replace(/ /g, "") + "-Regular" };
  const strs = Object.entries(names).map(([id, s]) => [Number(id), Buffer.from(s, "utf16le").swap16()]);
  const name = new W().u16(0).u16(strs.length).u16(6 + strs.length * 12);
  let off = 0;
  strs.forEach(([id, b]) => { name.u16(3).u16(1).u16(0x409).u16(id).u16(b.length).u16(off); off += b.length; });
  strs.forEach(([, b]) => name.push(b));

  const tables = { "OS/2": os2.buf(), cmap: cmap.buf(), glyf, head: head.buf(), hhea: hhea.buf(), hmtx: hmtx.buf(), loca: locaW.buf(), maxp: maxp.buf(), name: name.buf(), post: post.buf() };
  const tags = Object.keys(tables).sort();
  const numT = tags.length, es = Math.floor(Math.log2(numT)), srT = 2 ** es * 16;
  const dir = new W().u32(0x00010000).u16(numT).u16(srT).u16(es).u16(numT * 16 - srT);
  let offset = 12 + numT * 16;
  const bodies = [];
  for (const t of tags) {
    const b = tables[t];
    dir.tag(t).u32(checksum(b)).u32(offset).u32(b.length);
    const p = pad4(b); bodies.push(p); offset += p.length;
  }
  const font = Buffer.concat([dir.buf(), ...bodies]);
  // head.checkSumAdjustment lives at byte 8 of the head table.
  const headOffset = dir.buf().length + bodies.slice(0, tags.indexOf("head")).reduce((a, b) => a + b.length, 0);
  font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headOffset + 8);
  return font;
}
