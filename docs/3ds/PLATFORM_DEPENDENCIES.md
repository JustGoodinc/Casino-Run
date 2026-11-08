# Platform Dependencies (web APIs the game uses → 3DS replacement)

| Web dependency | Where | 3DS replacement |
|---|---|---|
| DOM + CSS layout/animation | index.html, style.css, theme-cabinet.css | citro2d immediate-mode drawing; animation curves from ANIMATION_SPEC |
| Canvas 2D (roulette, crash, results graph, particles) | script.js, fx.js | citro2d primitives and sprites |
| WebAudio (`AudioContext`, buffers, compressor) | audio.js (only file) | ndsp; software limiter not needed if mix gains are respected |
| Live oscillator (crash rocket whine) | script.js `startCrashRocketSound` | Pre-render 8 pitch steps, or a looped sample with ndsp rate changes |
| `fetch` + `decodeAudioData` | audio.js | RomFS file reads |
| `localStorage` (settings) | audio.js `CR.settings` | SD-card JSON file |
| Supabase REST leaderboard | script.js | Dropped; local high scores |
| `Math.random` | everywhere | Seedable PRNG (stage 1 of PORTING_PLAN) |
| `requestAnimationFrame` / `performance.now` timing | Plinko physics, crash, horse race | Fixed 30 Hz tick: Plinko physics is per-frame, so the step count per second must match the web's 60 Hz (run 2 physics steps per frame) |
| TTF webfont | theme-cabinet.css | Glyph atlas (already generated) |
| Pointer events | everywhere | HID + touch |
