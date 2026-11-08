// node tools/asset-validator/validate.mjs
// The acceptance gate for generated assets. Re-reads every exported file (not the generator's
// in-memory data) and checks: PNG validity, dimensions vs manifest, palette conformity, binary
// alpha, 3DS frame budget; WAV format (22.05 kHz mono PCM16) and headroom (peak < -0.5 dBFS).
// If devkitPro's tex3ds is installed, it also converts every sprite into a 3DS texture atlas.
// Exits 1 on any failure.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const A = (f) => path.join(ROOT, "assets", f);
const manifest = JSON.parse(fs.readFileSync(A("manifest.json"), "utf8"));
const palette = new Set(Object.values(JSON.parse(fs.readFileSync(A("palette.json"), "utf8"))).map((h) => h.toLowerCase()));
const failures = [];
const fail = (id, msg) => failures.push(`${id}: ${msg}`);

function readPng(file) {
  const b = fs.readFileSync(file);
  if (!b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new Error("bad signature");
  let off = 8, w, h, idat = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off), type = b.toString("ascii", off + 4, off + 8), data = b.subarray(off + 8, off + 8 + len);
    if (zlib.crc32(b.subarray(off + 4, off + 8 + len)) >>> 0 !== b.readUInt32BE(off + 8 + len)) throw new Error(`bad CRC in ${type}`);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6) throw new Error("expected RGBA8"); }
    if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = [];
  for (let y = 0; y < h; y++) {
    if (raw[y * (w * 4 + 1)] !== 0) throw new Error("unexpected PNG filter (generator writes filter 0)");
    for (let x = 0; x < w; x++) { const o = y * (w * 4 + 1) + 1 + x * 4; px.push([raw[o], raw[o + 1], raw[o + 2], raw[o + 3]]); }
  }
  return { w, h, px };
}

for (const s of manifest.sprites) {
  try {
    const { w, h, px } = readPng(A(s.file));
    if (w !== s.frameW * s.frames || h !== s.frameH) fail(s.id, `size ${w}x${h} != manifest ${s.frameW * s.frames}x${s.frameH}`);
    if (s.frameW > 256 || s.frameH > 256) fail(s.id, "frame exceeds 256px 3DS budget");
    let opaque = 0;
    for (const [r, g, b, a] of px) {
      if (a !== 0 && a !== 255) { fail(s.id, "semi-transparent pixel"); break; }
      if (!a) continue;
      opaque++;
      const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      if (!palette.has(hex)) { fail(s.id, `off-palette colour ${hex}`); break; }
    }
    if (!opaque) fail(s.id, "empty image");
  } catch (e) { fail(s.id, e.message); }
}

for (const a of manifest.audio || []) {
  const b = fs.readFileSync(A(a.file));
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") { fail(a.id, "not a WAV"); continue; }
  const fmt = b.readUInt16LE(20), ch = b.readUInt16LE(22), sr = b.readUInt32LE(24), bits = b.readUInt16LE(34);
  if (fmt !== 1 || ch !== 1 || sr !== 22050 || bits !== 16) fail(a.id, `format ${fmt}/${ch}ch/${sr}Hz/${bits}bit, expected PCM mono 22050 16`);
  let peak = 0;
  for (let i = 44; i + 1 < b.length; i += 2) peak = Math.max(peak, Math.abs(b.readInt16LE(i)) / 32768);
  const db = 20 * Math.log10(peak || 1e-9);
  if (db >= -0.5) fail(a.id, `peak ${db.toFixed(2)} dBFS (clipping risk)`);
}

// 3DS: convert every sprite + the font atlas with the real toolchain.
const tex3ds = "C:/devkitPro/tools/bin/tex3ds.exe";
let t3 = { ok: false, note: "tex3ds not found; skipped" };
if (fs.existsSync(tex3ds)) {
  const cache = path.join(ROOT, "tools/asset-validator/.cache");
  fs.mkdirSync(cache, { recursive: true });
  const inputs = manifest.sprites.map((s) => A(s.file));
  try {
    // tex3ds 2.3.0 on Windows rejects the short "-a" flag; the long form works.
    execFileSync(tex3ds, ["--atlas", "-f", "rgba8", "-o", path.join(cache, "sprites.t3x"), "-H", path.join(cache, "sprites.h"), ...inputs], { stdio: "pipe" });
    execFileSync(tex3ds, ["-f", "a8", "-o", path.join(cache, "font.t3x"), A("fonts/casino-run-pixel-atlas.png")], { stdio: "pipe" });
    const kb = (f) => (fs.statSync(path.join(cache, f)).size / 1024).toFixed(1);
    const subs = (fs.readFileSync(path.join(cache, "sprites.h"), "utf8").match(/#define/g) || []).length;
    t3 = { ok: true, note: `${inputs.length} sprites -> sprites.t3x ${kb("sprites.t3x")} KB (${subs} header defines); font.t3x ${kb("font.t3x")} KB (A8)` };
  } catch (e) {
    t3 = { ok: false, note: String(e.stderr || e.message).slice(0, 300) };
    fail("tex3ds", t3.note);
  }
}
manifest.tex3ds = { ...t3, checked: new Date().toISOString() };
fs.writeFileSync(A("manifest.json"), JSON.stringify(manifest, null, 1));

console.log(`sprites ${manifest.sprites.length}, audio ${(manifest.audio || []).length}, tex3ds: ${t3.ok ? "PASS" : "FAIL"} - ${t3.note}`);
if (failures.length) { console.error("FAIL\n" + failures.join("\n")); process.exit(1); }
console.log("ALL ASSET CHECKS PASS");
