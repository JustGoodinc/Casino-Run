// node tools/audio-generator/build.mjs
// Renders every recipe in assets-src/audio/sfx.mjs to assets/audio/<id>.wav (22.05 kHz mono PCM16),
// masters it to -3 dBFS times its category trim, and merges entries into assets/manifest.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SFX, MUSIC, TRIM } from "../../assets-src/audio/sfx.mjs";
import { SR, master, stats, wav, reseed } from "./dsp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "assets/audio");
fs.mkdirSync(OUT, { recursive: true });

const audio = [];
Object.entries({ ...SFX, ...MUSIC }).forEach(([id, [category, recipe]], n) => {
  reseed(1000 + n); // deterministic noise per sound
  const raw = recipe();
  if (!raw.every(Number.isFinite)) throw new Error(`${id}: non-finite samples`);
  const x = master(raw, -3, TRIM[category]);
  const file = `audio/${id}.wav`;
  fs.writeFileSync(path.join(ROOT, "assets", file), wav(x));
  const s = stats(x);
  audio.push({ id, category, file, seconds: x.length / SR, peakDb: +s.peakDb.toFixed(2), rmsDb: +s.rmsDb.toFixed(2), bytes: 44 + x.length * 2, loop: category === "music" });
});

const manifestPath = path.join(ROOT, "assets/manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
manifest.audio = audio;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`audio: ${audio.length} files, ${(audio.reduce((a, x) => a + x.bytes, 0) / 1024).toFixed(0)} KB, max peak ${Math.max(...audio.map((a) => a.peakDb)).toFixed(2)} dBFS`);
