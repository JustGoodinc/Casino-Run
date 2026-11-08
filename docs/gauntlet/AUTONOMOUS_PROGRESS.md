# Autonomous Progress: restart checkpoint

**Branch:** work directly on `main` (owner granted push authority 2026-11-08). Every push deploys live to casinorun.fun via GitHub Pages. Run regression (20/20) + validator before pushing.
**Current gauntlet iteration:** 19 (iterations 1–18 shipped to main, live).
**Owner vault (keep updated):** `\\192.168.1.141\ServerSSD\obsidian\Knowledge\Roblox-AI-Memory\03_PROJECTS\Casino-Run\` (Casino-Run-Current-State, -Design-Bible, -Important-Decisions, -Lessons-Learned). Update it after every milestone, then run `py <vault>\Roblox-AI-Memory\00_START_HERE\tools\build_catalog.py`.

## Resume in 4 commands

```bash
cd C:/Users/admin/Documents/GitHub/Casino-Run
node tools/sprite-generator/build.mjs
node tools/audio-generator/build.mjs
node tools/asset-validator/validate.mjs
```

Then serve the repo root (`py -m http.server 8765`), open `/index.html?nocache=N`, and paste/eval `tests/regression.js`. It takes ~40 s; keep the tab visible, because background tabs throttle Plinko. Bump `?v=` with a Node script, never PowerShell `Set-Content` (it mangles UTF-8).

## Working now (verified)

- Gameplay: 24/24 regression after iteration 15 (passes with the window minimised).
- Assets: 134 sprites, 60 audio clips (53 SFX + 7 music loops), all validator checks PASS; tex3ds atlas 45.9 KB.
- Per-game music with crossfade and lazy loading; 8 Plinko peg variants.
- Framed, textured machines with marquees; BET × MULT payout calculation.

## Known issues

- Leaderboard host does not resolve (Supabase project paused/deleted); the owner must restore it.
- **HTTPS is broken (owner action):** GitHub Pages has no certificate for `www.casinorun.fun` (https serves the `*.github.io` cert; `https_enforced: false`). The apex A records include an extra `192.64.119.200` (registrar parking) next to the four GitHub IPs, which typically blocks the certificate. Fix: delete that A record at the registrar, then in repo Settings → Pages remove and re-add `www.casinorun.fun`, wait for the certificate, tick Enforce HTTPS. http:// works meanwhile.
- The audio was judged by ear by the owner ("sounded great") for the batch-1 SFX. The per-game music loops and peg variants have only been checked numerically.
- Roulette wheel is palette-snapped pixel art (iteration 8); river hazards 2 frames, horses 4 (iteration 7).

## Next tasks (in order)

1. ~~Per-game reward effects + floating numbers~~ (done in iteration 2: `CR.fx.popNumber`, KITS, IMPACT in fx.js).
2. ~~Roulette wheel~~ (iteration 3).
3. ~~Host mascot~~ (iteration 3: Dice, `CR.fx.hostMood`).
3b. ~~River hazard frames~~ (iteration 7). Crash trail + stingers done in iteration 4. 4-frame gallop also iteration 7. Roulette pixel wheel: iteration 8. rules.js stage 1a: iteration 10. Stage 1b: iteration 11. Stage 2 C core: iteration 12 (3ds/source/rules.c, matches rules.js on 16 seeds). Stage 3 slice: iteration 13 (3ds/ builds casino-run.3dsx; not run). Pixel font on 3DS: it. 14. Stage 1 complete: it. 15 (runState). Emulator run: iteration 16 (Azahar at C:SERSDMINTOOLSAZAHAR). NEXT: THE OTHER 5 GAMES ON 3DS, EACH CHECKED IN AZAHAR.
4. Collection-wide regression + 375 / 400×240 / 320×240 checks; then commit.

## Files touched by the gauntlet

`assets-src/sprites.mjs` (TILES, frames, bulb), `assets-src/audio/sfx.mjs` (peg variants, song(), 6 tracks), `audio.js` (lazy music, crossfade), `fx.js` (marquees, marqueeHot), `script.js` (peg variants, SCREEN_MUSIC, lastSettlement + BET×MULT), `theme-cabinet.css` (iteration-1 block), `docs/gauntlet/*`.
