# Progress Report: Audiovisual Gauntlet, batch 1 (2026-11-07)

Branch `redesign/audiovisual` (from `main` + uncommitted Phase-1 fixes). **Nothing committed.**

## Rebuild everything

```bash
node tools/sprite-generator/build.mjs
node tools/audio-generator/build.mjs
node tools/asset-validator/validate.mjs
```

The validator exits 1 on any failure. Asset Studio: serve the repo root and open `/tools/asset-studio/`.

## Done (built and checked this session)

| Phase | Output |
|---|---|
| 1 Audit | `docs/design-audit/` (5 docs, 1–10 ratings per subsystem) |
| 2 Bible | `docs/design-bible/VISUAL_BIBLE.md` (contrast-checked palette, typography, components, L1–L6 tiers, per-game identities), `docs/audio/AUDIO_BIBLE.md` |
| 3 Asset factory | Zero-dependency Node generators: `assets-src/` (palette, font, sprites, items, audio recipes) → `assets/` (PNG, TTF, WAV, manifest) |
| Sprites | **119**: 18 shop items (redrawn at 24×24 after review: v1 icons didn't resemble their names), elephant (2f), 4 horses (2f), rocket (2f), 4 river hazards, 52 cards + back (original J/Q/K portraits), 7 game icons, UI (bag, flame 3f, peg, ball, pointer, timer, flag, logo), FX (coin, 3 chips, sparkle, star, confetti), 16 popup words |
| Font | "Casino Run Pixel" 5×7: compiled to a real TTF (renders in Chrome) plus a 3DS glyph atlas |
| Audio | **47** synthesized sounds + an original 14.5 s music loop (A minor, 132 bpm); 22.05 kHz mono PCM16, −3 dBFS peaks, DC removed |
| 6 Audio engine | `audio.js`: sfx/music buses, limiter, voice caps (4 per sound / 24 total), volumes, mute, saved settings, synth fallback |
| 5 Feedback | `fx.js`: sprite particle system (220/60/0 quality caps), L2–L6 tiers by profit ÷ bet, word popups, shake, goal confetti, skippable payout cascade, HUD (counter, goal bar, timer urgency, 5-flame streak meter), settings panel |
| 8 Studio | `tools/asset-studio/`: sprite browser (zoom, backgrounds, frame playback/step/speed), audio tester (rate, volume, layer test, waveforms, peak/RMS), palette and font sizes, native 3DS top/bottom mockups for all 6 games, live game at 5 viewport presets, checks tab |
| 9 3DS docs | `docs/3ds/` (6 docs). Facts cited from the installed SDK headers; the rest marked [verify] |
| 10 Integration | Every emoji graphic replaced (68 uses → 0 rendered; ♠♥♦♣ remain only as internal deck keys). Theme layer `theme-cabinet.css`. All 6 games, shop, inventory, How to Play (item gallery now generated from the catalog), popups |

## Tests run (real results)

| Check | Result |
|---|---|
| `tests/regression.js` (20 gameplay/odds checks) on the redesigned build | **20/20 PASS** |
| Asset validator: 119 PNGs (CRC, size, palette, binary alpha, ≤256px), 47 WAVs (format, peak < −0.5 dBFS) | **PASS** |
| tex3ds (devkitPro 2.3.0) converts all sprites to one 3DS atlas | **PASS**, 37.8 KB; font atlas 0.6 KB |
| In-browser decode of all 47 clips (DC offset, silence, end clicks) | PASS after adding a 20 Hz high-pass (2 clips had DC offset) |
| Console errors / 404s across title, all 6 games, shop | None |
| Mobile 375×812, all 7 screens | No horizontal overflow |
| Screenshot review: title, HUD, Plinko, Blackjack, River, Horses, Shop | Done; bugs found and fixed below |

## Problems found → fixed

v1 Double-Headed Coin read as bread (fixed twice) · v1 horses had insect legs · 9/10 cards' pips overlapped the corner index · shop icon read as a burger · all items too small / unlike their names (redrawn at 24px) · DC offset in 2 clips · `tex3ds -a` rejected (uses `--atlas`) · streak meter showed 15 flames (strip not cropped) · inventory bag covered the HUD timer (moved bottom-right) · elephant tinted purple by an old emoji filter · payout popup could race the next queued popup (duration fixed) · test stub broken by random-pitch sounds (now stubs the slot roll) · index.html mojibake from a PowerShell write (repaired byte-exact).

## Not done / not verified (honest)

- **Audio has never been listened to.** Checked only by numbers and waveforms. Someone needs to play the Studio AUDIO tab and judge the sounds by ear.
- Game backgrounds and frames: the roulette wheel, crash and horse tracks keep their old CSS layouts recoloured; per-game environment art (Phase 4 environments) has not been drawn.
- Adaptive music: one loop only, with no high-stakes/victory/defeat states.
- Roulette wheel is still canvas-drawn (recoloured, pixel font), not sprite-based.
- Gamepad API adapter: not implemented (keyboard focus works via real buttons).
- The live web page at 400×240 is a scrolling web layout; the true 3DS layouts exist only as Studio mockups.
- No 3DS build exists; frame-time budgets are unmeasured on hardware.
- Leaderboard is still down (Supabase host does not resolve).

## Acceptance gates

| Gate | Status |
|---|---|
| Every existing game audited | ✅ |
| Unified design bible | ✅ |
| Shipped artwork original | ✅ generated from source in-repo |
| Asset manifest | ✅ `assets/manifest.json` (one shared manifest, not one per game) |
| No temporary art in completed flows | ⚠️ emoji gone; roulette, crash and track backgrounds still use the old CSS |
| Reproducible sources | ✅ |
| Studio previews assets | ✅ |
| Original SFX exist | ✅ |
| Events trigger feedback | ✅ wins (tiered), losses, goal, streak, items, shop, all-in |
| Large vs small rewards differ | ✅ L2–L5 differ in word, particle count, shake, sound |
| Audio tested for clipping/overlap | ✅ numerically (peaks, limiter, voice caps); ❌ not by ear |
| All games playable | ✅ regression + click-through |
| Desktop / mobile tested | ✅ |
| 3DS-size previews tested | ✅ Studio mockups; ⚠️ web page itself isn't a 3DS layout |
| Regression tests pass | ✅ 20/20 |

## Next priority

1. Listen to the audio and retune any recipes that sound harsh (`assets-src/audio/sfx.mjs`).
2. Per-game environment art: a roulette wheel sprite, a crash starfield, the horse track turf. Then replace the old CSS backgrounds.
3. Stage 1 of `docs/3ds/PORTING_PLAN.md`: extract the rules into a seedable `rules.js`.
4. Commit in reviewable chunks: Phase-1 fixes → asset pipeline → integration.
