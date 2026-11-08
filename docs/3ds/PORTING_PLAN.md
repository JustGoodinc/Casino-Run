# 3DS Porting Plan (original Nintendo 3DS baseline)

Status: **planning plus asset validation only. No 3DS build exists yet.** Toolchain verified installed at `C:\devkitPro` (devkitARM, libctru, citro2d, tex3ds 2.3.0).

## What already ports

| Layer | Web source | 3DS form | Evidence |
|---|---|---|---|
| Sprites | `assets-src/*.mjs` → `assets/sprites/*.png` at 1× | tex3ds atlas `.t3x` | `tools/asset-validator/validate.mjs` runs tex3ds on all 119 sprites: **PASS, 36.6 KB compressed** |
| Font | `assets-src/font5x7.mjs` | `assets/fonts/casino-run-pixel-atlas.png` → A8 t3x (0.6 KB) | Same run |
| Palette | `assets-src/palette.mjs` | C header of RGBA constants (generate from `assets/palette.json`) | — |
| SFX + music | `assets/audio/*.wav` 22.05 kHz mono PCM16 | `ndsp` `NDSP_FORMAT_MONO_PCM16` buffers | Format checked by the validator; the ndsp format enum is in `libctru/include/3ds/ndsp/channel.h` |
| Feedback tiers, timings | `fx.js` (tier table), `docs/animation/ANIMATION_SPEC.md` | Re-implemented in C with the same numbers | — |

## Stages

1. **Rules extraction (web).** *Done 2026-11-08 (dddf253, 37151ca): `rules.js` holds every outcome and money formula; `CR.rules.seed(n)` = mulberry32. Timer tick + round state machine still in script.js.* Move pure game rules out of DOM handlers into `rules.js`: bet validation, the outcome generators (`rollPlinkoSlot`, `generateCrashPoint`, `getFrogMultiplier`, roulette, blackjack hand values, horse winner), settlement (`applyRoundWin`, `processFullLoss`, Hot Streak, items) and goal/timer progression. Inject the RNG (seedable). `tests/regression.js` must stay green throughout. *This is the gate for everything below.*
2. **C core.** *Done 2026-11-08: `3ds/source/rules.c` + `rules.h`; `3ds/tests/rules_check.c` matches 16 seeds of golden vectors from the real `rules.js` (`make_vectors.mjs`), built and run with TinyCC on Windows, 0 failures; also compiles for armv6k/VFP with devkitARM -Wall -Wextra clean.* Port `rules.js` 1:1 to C (`source/rules.c`) and check it against the JS with shared seeds: same seed → same outcomes, compared by a test harness on PC.
3. **Renderer.** *Started 2026-11-08: `3ds/` builds `casino-run.3dsx` (Plinko vertical slice: board on top, HUD + host on bottom, atlas from the web PNGs, outcomes from rules.c). Not yet run on hardware or emulator.* citro2d: one sprite sheet, one glyph sheet. The top screen draws the game playfield and HUD; the bottom screen draws controls and inventory (see `SCREEN_LAYOUTS.md`).
4. **Input.** HID mapping per `CONTROL_MAPS.md`; touch hit-boxes reuse the bottom-screen layout rectangles.
5. **Audio.** ndsp with an 8-voice SFX pool plus 1 music channel; WAVs loaded from RomFS.
6. **Saves.** Settings plus best cash-out in `sdmc:/3ds/casino-run/save.json` (the web game has no save schema yet; define one shared schema).
7. **Leaderboard.** None on device (no Supabase). Local high-score table.

## Out of scope until stage 1 lands

Stereoscopic 3D (optional per brief; plan a 2-layer parallax on the top screen only), CIA packaging, online features.
