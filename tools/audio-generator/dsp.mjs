// Minimal offline synth: oscillators, ADSR, one-pole filters, FM bells, noise, echo, mixing.
// Everything is deterministic (seeded noise) so builds are reproducible.
export const SR = 22050;

let seed = 1;
export const reseed = (s) => (seed = s >>> 0 || 1);
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

export const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
export const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// Envelope: attack, decay to sustain, hold until dur - release, release.
function envAt(t, dur, { a = 0.005, d = 0.05, s = 0.6, r = 0.05 } = {}) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  return Math.max(0, s * (1 - (t - (dur - r)) / r));
}

const WAVES = {
  sine: (p) => Math.sin(p * 2 * Math.PI),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  pulse25: (p) => (p % 1 < 0.25 ? 1 : -1),
  tri: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
  saw: (p) => 2 * (p % 1) - 1,
};

// f -> f1 exponential glide; vib = [rateHz, depthSemitones].
export function tone({ f, f1 = f, dur, type = "sine", env, vol = 1, vib, lp }) {
  const out = buf(dur);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let freq = f * (f1 / f) ** (t / dur);
    if (vib) freq *= 2 ** ((Math.sin(2 * Math.PI * vib[0] * t) * vib[1]) / 12);
    phase += freq / SR;
    out[i] = WAVES[type](phase) * envAt(t, dur, env) * vol;
  }
  return lp ? lowpass(out, lp) : out;
}

// Exponentially decaying FM bell (coins, pegs, glass).
export function bell({ f, ratio = 1.4, index = 3, dur = 0.4, decay = 6, vol = 1 }) {
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, e = Math.exp(-decay * t);
    out[i] = Math.sin(2 * Math.PI * f * t + index * e * Math.sin(2 * Math.PI * f * ratio * t)) * e * vol * Math.min(1, t / 0.002);
  }
  return out;
}

export function noise({ dur, env, vol = 1, lp, hp, decay }) {
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = rand() * vol * (decay ? Math.exp(-decay * t) * Math.min(1, t / 0.002) : envAt(t, dur, env));
  }
  let o = out;
  if (lp) o = lowpass(o, lp);
  if (hp) o = highpass(o, hp);
  return o;
}

// One-pole filters; cutoff may be a number or fn(t) for sweeps.
export function lowpass(x, cutoff) {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = typeof cutoff === "function" ? cutoff(i / SR) : cutoff;
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += a * (x[i] - y);
    out[i] = y;
  }
  return out;
}
export function highpass(x, cutoff) {
  const lo = lowpass(x, cutoff);
  return x.map((v, i) => v - lo[i]);
}

// Feedback delay: each repeat is fb times the previous one.
export function echo(x, delay = 0.12, fb = 0.35, tail = 0.4) {
  const d = Math.round(delay * SR), out = new Float32Array(x.length + Math.round(tail * SR));
  out.set(x);
  for (let i = d; i < out.length; i++) out[i] += out[i - d] * fb;
  return out;
}

// mix([[buffer, startSec, gain], ...]) -> one buffer long enough for all parts.
export function mix(parts, minDur = 0) {
  const len = Math.max(Math.round(minDur * SR), ...parts.map(([b, s = 0]) => Math.round(s * SR) + b.length));
  const out = new Float32Array(len);
  for (const [b, s = 0, g = 1] of parts) {
    const o = Math.round(s * SR);
    for (let i = 0; i < b.length; i++) out[o + i] += b[i] * g;
  }
  return out;
}

export const seq = (notes, step, fn) => mix(notes.map((n, k) => [fn(n, k), k * step]));

export function stats(x) {
  let peak = 0, sum = 0;
  for (const v of x) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  const db = (v) => (v > 0 ? 20 * Math.log10(v) : -120);
  return { peakDb: db(peak), rmsDb: db(Math.sqrt(sum / x.length)), peak };
}

// Peak-normalise to target dBFS, then a short fade-out so nothing ends on a click.
export function master(x, targetDb = -3, trim = 1) {
  x = highpass(x, 20); // removes DC offset (pulse waves with a 25% duty cycle aren't zero-mean)
  const { peak } = stats(x);
  const g = peak > 0 ? (10 ** (targetDb / 20) / peak) * trim : 0;
  const out = x.map((v) => v * g);
  const fade = Math.min(out.length, Math.round(0.004 * SR));
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}

export function wav(x) {
  const data = Buffer.alloc(x.length * 2);
  x.forEach((v, i) => data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2));
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
