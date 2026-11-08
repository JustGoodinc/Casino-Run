# Autonomous Progress: restart checkpoint

**Branch:** `redesign/audiovisual` (never pushed; `main` deploys to GitHub Pages, so don't merge without the owner).
**Current gauntlet iteration:** 2 (iteration 1 committed).

## Resume in 4 commands

```bash
cd C:/Users/admin/Documents/GitHub/Casino-Run
node tools/sprite-generator/build.mjs
node tools/audio-generator/build.mjs
node tools/asset-validator/validate.mjs
```

Then serve the repo root (`py -m http.server 8765`), open `/index.html?nocache=N`, and paste/eval `tests/regression.js`. It takes ~40 s; keep the tab visible, because background tabs throttle Plinko. Bump `?v=` with a Node script, never PowerShell `Set-Content` (it mangles UTF-8).

## Working now (verified)

- Gameplay: 20/20 regression after iteration 1.
- Assets: 134 sprites, 60 audio clips (53 SFX + 7 music loops), all validator checks PASS; tex3ds atlas 45.9 KB.
- Per-game music with crossfade and lazy loading; 8 Plinko peg variants.
- Framed, textured machines with marquees; BET × MULT payout calculation.

## Known issues

- Leaderboard host does not resolve (Supabase project paused/deleted); the owner must restore it.
- The audio was judged by ear by the owner ("sounded great") for the batch-1 SFX. The per-game music loops and peg variants have only been checked numerically.
- Roulette wheel is still canvas-drawn; the hazards are static sprites.

## Next tasks (in order)

1. Per-game reward effects + floating "+$N" numbers at the impact point (fx.js `CR.fx.popNumber`, game-specific particle kinds).
2. Roulette wheel sprite (rim, pockets, ball) replacing the canvas fill.
3. Host mascot sprite in the HUD that reacts to wins and losses.
4. Collection-wide regression + 375 / 400×240 / 320×240 checks; then commit.

## Files touched by the gauntlet

`assets-src/sprites.mjs` (TILES, frames, bulb), `assets-src/audio/sfx.mjs` (peg variants, song(), 6 tracks), `audio.js` (lazy music, crossfade), `fx.js` (marquees, marqueeHot), `script.js` (peg variants, SCREEN_MUSIC, lastSettlement + BET×MULT), `theme-cabinet.css` (iteration-1 block), `docs/gauntlet/*`.
