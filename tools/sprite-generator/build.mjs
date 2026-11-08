// node tools/sprite-generator/build.mjs
// Renders every sprite in assets-src/sprites.mjs to assets/sprites/<id>.png (frames side by side),
// compiles the pixel font, and merges entries into assets/manifest.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPRITES } from "../../assets-src/sprites.mjs";
import { PALETTE } from "../../assets-src/palette.mjs";
import { GLYPHS } from "../../assets-src/font5x7.mjs";
import { Img, toPng } from "./raster.mjs";
import { buildTtf } from "./ttf.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "assets");
const write = (rel, data) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return fs.statSync(file).size;
};

const sprites = [];
for (const def of SPRITES) {
  let frames = def.frames();
  if (def.outline !== false) frames = frames.map((f) => f.padded(1).outline("ink"));
  const fw = Math.max(...frames.map((f) => f.w)), fh = Math.max(...frames.map((f) => f.h));
  const strip = new Img(fw * frames.length, fh);
  frames.forEach((f, n) => strip.draw(f, n * fw + Math.floor((fw - f.w) / 2), fh - f.h));
  const file = `sprites/${def.id}.png`;
  const bytes = write(file, toPng(strip));
  sprites.push({ id: def.id, group: def.group, game: def.game, file, frameW: fw, frameH: fh, frames: frames.length, fps: def.fps || 0, bytes, label: def.label });
}

// Font: TTF for the web, PNG glyph atlas (16 cols, 6x8 cells) for the 3DS / canvas.
const fontBytes = write("fonts/casino-run-pixel.ttf", buildTtf());
const chars = Object.keys(GLYPHS);
const atlas = new Img(16 * 6, Math.ceil(chars.length / 16) * 9);
const glyphMap = {};
chars.forEach((ch, n) => {
  const x = (n % 16) * 6, y = Math.floor(n / 16) * 9;
  GLYPHS[ch].forEach((row, j) => [...row].forEach((p, i) => p === "#" && atlas.set(x + i, y + j, "white")));
  glyphMap[ch] = { x, y, w: GLYPHS[ch][0].length };
});
const atlasBytes = write("fonts/casino-run-pixel-atlas.png", toPng(atlas));
write("fonts/casino-run-pixel-atlas.json", JSON.stringify({ cell: [6, 9], glyphs: glyphMap }, null, 1));

write("palette.json", JSON.stringify(Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, v.hex])), null, 1));

const manifestPath = path.join(OUT, "manifest.json");
const prev = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const manifest = {
  ...prev,
  generated: new Date().toISOString(),
  sprites,
  fonts: [
    { id: "casino-run-pixel", file: "fonts/casino-run-pixel.ttf", bytes: fontBytes, note: "1 font px = 100 units; use font sizes in multiples of 10px" },
    { id: "casino-run-pixel-atlas", file: "fonts/casino-run-pixel-atlas.png", bytes: atlasBytes, note: "3DS/canvas glyph atlas, white glyphs, 6x9 cells" },
  ],
};
write("manifest.json", JSON.stringify(manifest, null, 1));
console.log(`sprites: ${sprites.length} files, ${sprites.reduce((a, s) => a + s.bytes, 0)} bytes; font ${fontBytes} bytes`);
