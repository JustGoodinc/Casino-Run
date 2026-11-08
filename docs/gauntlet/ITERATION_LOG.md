# Iteration Log

## Iteration 1 (2026-11-07)

**Reviewed:** title, HUD + Plinko, Blackjack, River, Horses, mobile shop, 400×240 (iter-0 shots) against the 7 references.

**Five biggest weaknesses found:** empty/flat playfields; no visible score calculation; no machine framing; static page background; plain roulette/crash canvases.

**Assets created (validated, tex3ds PASS):**
- `tiles/`: cabinet (diamond lattice), plate (riveted steel), water, turf, velvet, felt, stars
- `frames/`: 7 metal 9-slice frames with gold corner rivets and a per-game accent stripe
- `ui/bulb` (2-frame marquee bulb)

**Implemented:**
- Every game sits in a framed, textured machine. The background drifts, water flows and stars scroll.
- Marquee signs: THE PEG FOUNDRY, THE RUBY WHEEL, ROCKET RUCKUS, THE TWENTY-ONE CLUB, ELEPHANT RIVER, DERBY DASH, CASINO SHOP. Bulbs chase, and they race and flash on wins (longer for bigger tiers, 2.5 s on goal).
- Payout cascade shows **BET × MULT**. The multiplier climbs as each line lands, the card is styled by tier, and tier 5 cycles colours.
- The crash canvas is now transparent over the starfield.

**Sound (same session, before iteration 1):** 8 Plinko peg variants (no repeats, pitch rises by row); 6 per-game music loops that crossfade per screen and load only when that game opens.

**Tests:** asset validator PASS (134 sprites, 60 clips; tex3ds atlas 45.9 KB). Live check: a forced 5× Plinko win showed BET $20 × 6.80X = +$136 (100 + 8 Hula + 28 streak), which is correct. Regression suite: see AUTONOMOUS_PROGRESS.

**Evidence:** `screenshots/iter-1/`.

**Remaining:** generic coin bursts in every game; no floating numbers at the impact point; roulette wheel and hazards are flat; no mascot.

## Iteration 2 (2026-11-07)

**Weakness targeted:** every game celebrated with the same coins in the same place; no Nubby-style number at the point of impact.

**Assets created:** `fx/droplet`, `fx/minicard`, `fx/shoe` (validated; tex3ds atlas 46.1 KB).

**Implemented (`fx.js`, `theme-cabinet.css`):**
- Impact anchors per game: landed Plinko slot, roulette wheel, crash multiplier, player hand, elephant, winning horse.
- Per-game debris kits: Plinko coins + sparkles · Roulette red/gold chips · Crash stars + cyan chips · Blackjack mini cards + gold chips · River water droplets · Horses horseshoes + confetti. Tier 4+ adds the shared chips and stars on top.
- Floating pixel numbers: "+$N" at the impact point. Tiers 2–3 do a quick rise; 4–5 expand to 40/60px and wobble. Losses show a red "−$N". All fade instead of moving in reduced-motion mode.

**Tests:** regression 20/20; live horse win showed +$75.00 (tier 4) and 28 particles at the winner.

**QA finding (environment):** browser-pane screenshots lag one capture behind the page, and CSS animations can stall while the pane throttles. Verify transient effects by reading DOM state, or seek animations (`a.currentTime = N; a.pause()`), then capture twice.

**Evidence:** `screenshots/iter-2/horse-bigwin-number.jpg`, `horse-shoe-particles.jpg`.

## Iteration 3 (2026-11-07)

**Weaknesses targeted:** the roulette wheel was a flat canvas disc; no character presence anywhere (both references lean on characters: Nubby's portrait, Balatro's jokers).

**Assets created (validated, tex3ds atlas 51.3 KB):** `roulette/bowl` (static wooden bowl with gold diamond deflectors, 164×164), `roulette/hub` (gold turret, rotates with the wheel), `characters/host` ("Dice": die-headed showman in top hat and purple suit; 3 frames: idle, cheer, sweat).

**Implemented:**
- Roulette: the spinning wheel sits inside the static bowl, with the hub sprite drawn at the centre. The ball sprite hides during the spin and drops (bounce) into the winning pocket under the pointer.
- Dice replaces the coin icon beside the balance. He bobs when idle, cheers on wins (0.7 s + 0.35 s per tier; 2.5 s on goal) and sweats on losses. He only appears in the HUD (no new layout width); zoomed 0.75 on phones.

**Tests:** regression 20/20; live red win showed BET $30 × 2.00X = +$60, GREAT!, +$30, ball visible, host = cheer; 375px: no overflow on any of the 7 screens, host inside the HUD.

**Evidence:** `screenshots/iter-3/`.

**Remaining:** river hazards and horses could use more animation frames; crash rocket trail; per-game sound stingers on big wins; the web layout isn't a 3DS layout (Studio mockups are); the music loops haven't been judged by ear.

## Iteration 4 (2026-11-08), on `main`, deployed

**Owner bug report (iPhone screenshot):** the roulette wheel sat off-centre in its bowl on phones. **Cause:** `style.css` shrinks `#roulette-canvas` to 260px under 500px wide, while the bowl hole is sized for 300px. **Fix:** the canvas is pinned at 300px and the whole wheel assembly scales (`zoom` 0.86 ≤500px, 0.78 ≤360px). **Verified at 390px:** the wheel and bowl centres coincide (offset 0,0); no overflow.

**Audio:** 6 per-game big-win stingers (`sting_*`) built from each game's music instruments, played on tier-4+ wins 180 ms after the tier sound. Verified: a Crash tier-4 win played `win_large` + `sting_crash`.

**Visual:** Crash exhaust trail (10 flickering pixel puffs, gold → orange → red → smoke); river hazards bob on the water (staggered per lane, uses `translate` so the mirrored sprites keep their flip).

**Tests:** validator PASS (66 clips). Regression 19/20 on the first run. The Plinko drop timed out because the pane was throttled to 2 fps; re-run in isolation, it paid exactly $140 (PASS). The test's wait was raised from 60 s to 180 s.

**Bag fix (same iteration, owner screenshot):** under 500px the ITEMS bag docks into the HUD streak row as an icon + count button, and its item list opens as a dropdown that wraps in rows. On wider screens it floats beside the column as before. Verified at 390px (in the HUD, items in rows of 3, no overflow) and on desktop (floating, `position: fixed`). Regression 20/20.

## Iteration 5 (2026-11-08): end-of-run screens

**Weakness:** GOAL HIT / CASHED OUT / GAME OVER / LAST CHANCE used plain text headings and had no art, yet they're the biggest moments in a run.

**Assets:** word sprites `goalhit`, `cashedout`, `gameover`, `lastchance` (validated; tex3ds atlas 52.8 KB).

**Implemented:** pixel word headings (popping in, with an aria-label for screen readers); a 2× Dice on goal/cash-out (cheering) and game over (sweating); stats in an inset ink box with the final balance in gold 30px; pixel-framed balance graph; cards scroll inside the viewport (`max-height: 100dvh − 32px`).

**Tests:** all 4 headings load, 3 large hosts present, game-over screen reviewed by screenshot; regression 20/20.

## Iteration 6 (2026-11-08): living title screen

**Weakness:** the title was the most static screen, where both references are lively.

**Implemented:** chasing marquee bulb rows above and below the logo; Dice bouncing beside a pulsing PLAY button. No new assets (reuses `ui/bulb` and `characters/host`).

**Tests:** regression 20/20 (includes the dev easter egg via the logo's "u" hotspot). Evidence: `screenshots/iter-5-6/`.

**Vault:** project notes now live in the owner's Obsidian vault (`Roblox-AI-Memory/03_PROJECTS/Casino-Run/`); update them after each milestone.

## Iteration 7 (2026-11-08): animated river hazards + 4-frame gallop

**Weakness:** the river hazards were single-frame sprites that only bobbed, while the elephant and horses animate.

**Assets:** `river/croc`, `log`, `boat`, `canoe` are now 2-frame strips: the croc snaps its jaw open and paddles its legs, the canoe paddle strokes with a splash, the boat's porthole glints, and every hazard leaves a 2-frame wake. First draft of the open jaw used two rows of teeth that read as a checkerboard, so it was cut to one row.

**Implemented:** `.car img` shows one frame of the strip (`object-fit: none` + `object-position`) and flips with `hazardFrames`, layered on the existing bob; the boat uses its own 26px frame width. No gameplay code touched (hazards are decorative).

**Tests:** validator PASS (144 sprites, tex3ds 53.4 KB); each img measured 56×24 / 52×24 CSS px (exactly one 2× frame). Evidence: `screenshots/iter-7/hazard-frames-8x.png`.

**Gallop:** horses went from 2 to 4 frames (stretched in the air → front lands → gathered → back pushes); `.racing` steps through all 4 at 0.1 s/frame (same rate as before). Evidence: `screenshots/iter-7/horse-gallop-8x.png`. tex3ds atlas now 56.9 KB.

**Test fix:** the Plinko check failed whenever the app window was minimised, because the browser pauses `requestAnimationFrame` entirely (not just throttles it). The test now drives frames with a 16 ms timer during the drop only. Regression **20/20 in 33 s** with the window hidden (it used to need up to 3 minutes).

## Iteration 8 (2026-11-08): pixel-art roulette wheel

**Weakness:** the pockets and numbers were the last canvas-drawn art with smooth antialiased edges, next to 2x pixel sprites (bowl, hub, ball).

**Implemented (`drawRouletteWheel` in script.js):** pockets, pocket floors (dark shade of each colour), gold frets, a wooden cone and rims are drawn at half resolution and upscaled 2x with smoothing off (the sprites' grid). Numbers go on at full res in the pixel font (crisp at 10px). Then `snapToPalette` snaps every pixel to 12 palette colours with hard alpha: verified 0 partially transparent pixels. The wheel redraws once the pixel font loads (before, the first draw could use the fallback font).

**Critique → fix:** the first render showed pockets in numeric order 0-36, so same-colour pockets sat side by side (10/11 black, 18/19 red). Pockets now follow the European wheel order (`WHEEL_ORDER`), so red/black alternate. **Odds unchanged:** the result is still rolled uniformly first; only the pocket the wheel rotates to was remapped (`WHEEL_ORDER.indexOf(result)`).

**Tests:** new regression check (wheel order has all 37 numbers once and alternates colours); regression **21/21** in 40 s. Evidence: `screenshots/iter-8/wheel-pixel-draft.png` → `wheel-pixel-final.png`.

## Iteration 9 (2026-11-08): phone-width check of the new art

Verification only, at 375×812 in the visible pane. Roulette: wheel centred in the bowl (offset 0,0), no horizontal scroll; a forced spin to 17 put the ball in the black pocket between 25 and 34 under the pointer, which is 17 in the European order. River: each hazard shows exactly one frame, and the mirrored croc and canoe face the way they travel (checked at 8× zoom). Race: each horse shows one gallop frame with no strip bleed. No changes were needed.

## Iteration 10 (2026-11-08): rules.js, 3DS port stage 1a

**Goal:** stage 1 of `docs/3ds/PORTING_PLAN.md`: pure rules out of the DOM code with a seedable RNG, so the C port can be checked against the same seed.

**Implemented:** new `rules.js` (`CR.rules`): Plinko slot odds and roll, roulette colours / pocket roll / Magnet pull, crash point, river crash chance and multiplier, deck shuffle, card and hand values, blackjack, plus `rand`, `randInt`, `pick` and `shuffle`. `script.js` binds them with `let` (so tests can still stub them); 123 lines removed. All 14 outcome-deciding `Math.random` calls now go through `CR.rules.rand()`; the 18 left are sound pitch and ball wobble. `rand()` reads `Math.random` at call time unless `CR.rules.seed(n)` switches to mulberry32.

**Behaviour:** payouts and odds are unchanged, with the same number and order of random draws per game. One deliberate fix: the shop used `sort(() => Math.random() - 0.5)`, a biased shuffle, and now uses Fisher-Yates. Shop stock is still 4 unique items, and all 18 items appeared across 2,000 rotations.

**Tests:** new check "Seeded rules are deterministic" (seed 42 twice gives identical outcomes; seed 7 differs). Regression **22/22** in 30 s.

**Still in stage 1:** settlement (`applyRoundWin`, `processFullLoss`, Hot Streak, items) and goal/timer progression still live in `script.js` alongside DOM updates.
