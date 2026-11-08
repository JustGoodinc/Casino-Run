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

## Iteration 11 (2026-11-08): settlement formulas into rules.js (3DS stage 1b)

**Implemented:** `CR.rules` now also holds the money formulas: `START` (100 / 300 / 120 s), `nextGoal` (balance × 3, minimum 50), `goalCutterGoal` (−10%), `coinFlipRescue` (20% of goal), `streakBonusRate`, `streakBonus` (Grease Fire triples a real bonus and is used up only then), `hulaGirlBonus` (+10% of profit each), `greaseFireBurn` (25% of balance) and `lossRefund` (up to 2 Insurance Tickets at 50% each, plus 5% Cashback). `script.js` keeps only the side effects: consuming items, toasts, popups, HUD. No values changed.

**Tests:** new "Settlement formulas" check pins each formula to its documented value; the existing end-to-end Grease Fire, insurance and goal checks still pass. Regression **23/23** in 30 s.

**Stage 1 status:** all outcome and money rules now live in `rules.js`. Still in `script.js`: the timer tick and run/round state machine, which are tied to DOM timers. The C port (stage 2) can start from `rules.js`, compared against JS by seed.

## Iteration 12 (2026-11-08): C rules core (3DS stage 2)

**Implemented:** `3ds/source/rules.c` + `rules.h` mirror `rules.js` function by function: mulberry32 (bit-identical, uint32), Plinko, roulette with Magnet, crash, river, deck shuffle and hand values, and the settlement formulas. Money stays `double`, like the JS (the 3DS ARM11 has hardware VFP doubles). Cards are `suit * 13 + rank`, in the JS deck order.

**Equivalence check:** `3ds/tests/make_vectors.mjs` runs the real `rules.js` in a Node `vm` and writes `rules_vectors.h` (seeds 1–16: 8 Plinko slots, 4 crash points, 6 roulette spins, 6 Magnet spins, a full 52-card shuffle and the next raw random, plus river multipliers). `rules_check.c` compares them with exact `==` on doubles.

**Results:** built with the TinyCC bundled in an installed app (no host gcc on this PC) and run: **0 failures**. Negative test: changing one vector made it fail (`plinko[0] 2 != 3`, exit 1). The first negative test passed by mistake because the quoted `#include` picked up the real header beside `rules_check.c`, so the test was redone with both files isolated. The files also compile for the 3DS CPU (devkitARM, `-march=armv6k -mfloat-abi=hard -mfpu=vfp -Wall -Wextra`) with no warnings.

**Next 3DS stage:** renderer (citro2d) using the existing `sprites.t3x` atlas.

## Iteration 13 (2026-11-08): first 3DS build (stage 3 vertical slice)

**Implemented:** `3ds/` homebrew project (Makefile from the devkitPro citro2d example; title, description and author set). `gfx/sprites.t3s` has tex3ds pack the web game's own PNGs (logo, host, peg, ball, plate tile), so the art has one source. `source/main.c`: the top screen (400×240) tiles the plate, draws 7 rows of pegs and 5 palette-coloured multiplier slots; A drops a ball whose slot is pre-rolled by `cr_roll_plinko_slot` and steered there, then settled with `cr_plinko_mult`. The bottom screen (320×240) shows the logo, Dice at 2× (idle / cheer / sweat frame chosen by the result, cut from the 3-frame strip with a sub-texture) and balance / goal / bet. Up/Down change the bet; START quits. Goal steps with `cr_next_goal`.

**Tests:** `make` in devkitPro MSYS2 builds `casino-run.3dsx` (176 KB) and `.smdh` with **no warnings** (the one `-Wformat-truncation` warning was fixed). Build outputs are git-ignored. **Not run:** no emulator or hardware here, so how it looks and plays on the device is unverified. Text uses the 3DS system font for now; the pixel-font atlas (`font.t3x`, A8) is ready for the next pass.

## Iteration 14 (2026-11-08): pixel font on 3DS

**Implemented:** the web game's glyph atlas (`assets/fonts/casino-run-pixel-atlas.png`, white 5×7 glyphs in 6×9 cells) is packed into the 3DS sprite sheet. `3ds/tests/make_font.mjs` turns its JSON into `3ds/source/font_glyphs.h` (63 glyphs: A–Z, 0–9, punctuation, `$ % /`). `text()` in `main.c` cuts a sub-texture per glyph, tints it to a palette colour and draws it at an integer scale (2× HUD and slot labels, 1× controls line), centred via `textW()`. The system font and the `C2D_TextBuf` are gone, so on-device text now matches the web font.

**Tests:** `make` builds clean, no warnings. Not run on device or emulator, so glyph UVs are unverified on screen.

## Iteration 15 (2026-11-08): run state into rules (stage 1 complete)

**Implemented:** `runState(timeLeft, balance, goal)` in `rules.js` (time up, then goal hit, then broke, then play: the same priority as before) and `TIME_BOTTLE_SECONDS`. `checkGameState` now reads the state from rules and keeps only the screen changes. Mirrored in C as `cr_run_state` / `CR_TIME_BOTTLE_SECONDS`. The 1-second `setInterval` tick stays in `script.js`, because it is the platform clock (on 3DS it becomes the frame loop).

**Tests:** web regression **24/24** (new "Run state priority"); C `rules_check` 0 failures including run state; regenerated vectors identical (no rule values moved); `.3dsx` builds clean.

## Iteration 16 (2026-11-08): first run in an emulator (Azahar)

**Setup:** Azahar 2126.2, the official portable Windows MSVC build from `azahar-emu/azahar` GitHub releases (owner approved the install). Unzipped to `C:\Users\admin\Tools\Azahar`; SHA-256 matched GitHub's published asset digest. Launched with `azahar.exe <path>.3dsx`; the window was captured with a PowerShell `CopyFromScreen` script and keys were sent with `keybd_event` (default mapping: A = A, D-pad Up = T).

**Verified on the emulator:** the build boots and holds 60 FPS. Top screen: plate tiles, 7 peg rows, 5 coloured multiplier slots. Bottom screen: logo, pixel-font HUD, Dice. A drops a ball that visibly falls through the pegs, and the bet is taken at once ($100 → $90). It lands in its pre-rolled slot, the slot lights up and the payout is settled (1× = push back to $100). On a 2× win Dice switches to the cheer frame. Up ×3 changed the bet $10 → $13.

**Bug found and fixed:** the 1× controls line was unreadable, with each glyph missing its left column (`text-1x-before.png`). The first guess, linear filtering, did not fix it (nearest filtering was kept anyway, since it is right for pixel art). The real cause was the centred line starting at x.5, so nearest sampling dropped a column. `text()` now floors x and y; the line is clean after the fix (`text-1x-after.png`).

Evidence: `screenshots/iter-16/`.

## Iteration 17 (2026-11-08): Crash on 3DS

**Rules:** the climb curve `1 + t² × 0.55` (which was inline in `runCrash`) is now `crashMultiplierAt` in `rules.js` / `cr_crash_multiplier_at` in C; web regression check "Crash climb curve" (25/25).

**3DS:** `main.c` reorganised into a `state` struct with per-game update and draw functions; SELECT switches game when nothing is in play. Crash: tiled star field; the rocket (2-frame strip, 2×) climbs with x by time and y by log multiplier, with an 8-puff gold→red exhaust trail; a big pixel-font multiplier; A launches and A/B cash out. At the crash point the rocket becomes a 12-chunk pixel debris burst. The first version drew a flat red box, which read poorly in Azahar and was replaced.

**Verified in Azahar (60 FPS):** a flight at 1.65× with its trail; cash-out at 1.35× paid exactly $13.52 on $10 (balance $70 → $60 → $73.52) with Dice cheering; crashes at 1.01× / 1.02× / 1.26× took the bet, with Dice sweating. C check 0 failures; vectors unchanged. Evidence: `screenshots/iter-17/`.

## Iteration 18 (2026-11-08): Elephant River on 3DS

**Implemented:** third 3DS game (SELECT cycles Plinko → Crash → River). Water tiles flow sideways; felt-green shore and bank; four 2-frame hazard sprites drift across lanes 1–5 in alternating directions (mirrored with a negative scale), decorative as on the web. The elephant (2-frame walk, 2×) hops a lane in 31 frames (~0.52 s, like the web), then rolls `cr_frog_base_crash_chance(lane)`; lane 5 is the shore. B cashes out at `cr_frog_multiplier(lane)`. A splash draws a droplet burst, a red SPLASH! and sweating Dice.

**Verified in Azahar (60 FPS):** lane 2 shows 1.67×, matching the web's 0.96 / (0.80 × 0.72). Cash-out paid exactly $16.67 on $10 with Dice cheering; a splash lost the bet.

**Found in testing → fixed:**
1. Leftover hop presses right after a splash started and lost a new $10 round. Fix: A/B are ignored for 30 frames (0.5 s) after any result, in all games. The emulator re-test was inconclusive because of key-timing jitter in the test harness (~300 ms per key); the logic is two lines and correct on inspection.
2. Lane 0 displayed "0.96X", a payout you can't take on the bank. It now says PRESS A TO STEP.

Evidence: `screenshots/iter-18/`.

## Iteration 19 (2026-11-08): Roulette on 3DS; payout table shared

**Rules:** the colour-bet payout (red/black 2×, green 14×, stake included) moved from the spin handler into `roulettePayout` (`rules.js`) / `cr_roulette_payout` (C). The web spin now calls it. New regression check "Roulette payout table" (26/26) plus the same cases in `rules_check.c` (0 failures).

**3DS:** the fourth game. The wheel is built from triangles in the palette, in the same European order as the web (face, dark pocket floor, gold frets, wooden cone, the web's hub sprite) on the velvet tile, with 1× pixel-font numbers. Left/Right picks the colour, A spins: the result is rolled first and the wheel eases out over 3 s to put that pocket under the gold pointer, where the ball rests.

**Verified in Azahar (60 FPS):** a spin landed on 4 black, between 19 and 21 as on a real wheel, with pointer and ball on 4; the red bet lost. After Right → black, a spin landed on 21 red and the black bet lost. Balances were exact.

**Found → fixed:** the red "ON RED" label was unreadable on red velvet (`roulette-4-black-label-bug.png`). Both labels now sit on ink panels, with a colour swatch.

## Iteration 20 (2026-11-08): Horse Race on 3DS

**Rules:** `rollHorseWinner` (uniform of 4) and `horsePayout(horseshoes)` (4× + 0.5× per Golden Horseshoe) moved into `rules.js` / C; the web race uses both. Regression check "Horse payout" (27/27); C check 0 failures; vectors unchanged.

**3DS:** the fifth game: turf tiles, 4 lanes with rails, a chequered finish line, the four jockey-silk horses on their 4-frame gallop at 2×. Left/Right picks the horse (gold marker); A runs a 4.2 s race. The winner is rolled first and the race animates toward it with the same progress curve as the web (wobble, a winner boost, losers stopping short). The winner's name turns gold.

**Verified in Azahar (60 FPS):** picked Vas; mid-race gallop captured; Dingo won at the line; the bet was lost and Dice sweated.

**Found → fixed:** the pixel font has no apostrophe, so "AND THEY'RE OFF!" would have rendered with a gap. Reworded to "AND THEY ARE OFF!".

## Iteration 21 (2026-11-08): Blackjack on 3DS (all six games now on 3DS)

**Rules:** `dealerHits` (stands on all 17s; the web dealer now uses it) and `blackjackPayout(player, dealer, natural)` (2.5 / 0 / 2 / 1 / 0, the same table `finishBlackjackRound` pays) in `rules.js` and C. Regression "Blackjack payout table" (28/28); C check 0 failures; vectors unchanged.

**3DS:** the sixth game. The web's own 52 pixel cards plus the back are packed in suit-major order, so a card's sprite is `sprites_A_spade_idx + card`, matching `rules.c` numbering (verified contiguous: 21…72). Deal order matches the web (player, dealer, player, dealer); the deck reshuffles at 10 cards left, like the web. A deals/hits, B stands; the dealer draws one card every 0.4 s until `cr_dealer_hits` is false. A natural pays 2.5× immediately.

**Verified in Azahar (60 FPS):** deal showed DEALER 5 + ? (hole card face-down) against YOU 15 (5♠ Q♦). On stand the dealer drew 7, 3, 2 to 17 and stood; DEALER WINS, bet lost, Dice sweating.

**Found → fixed (rebuilt, not re-captured):** the felt tile drawn alone read as a harsh green/black checkerboard (`blackjack-deal-felt-bug.png`). It is a translucent weave meant to sit on felt green, as on the web, so a felt-green base is now drawn under it. The re-capture was abandoned because the owner started using the PC and synthetic key presses stopped reaching Azahar. Synthetic input must not be sent while the owner is active.

## Iteration 22 (2026-11-08): the full 3DS game to the approved design, packaged as a .cia

**Built from** `docs/3ds/design/Design-Bible.md` and all 25 mockups (studied before any UI code). New modules: `ui.c`, `games.c`, `items.c`, `save.c`, `audio.c`, `app.h`; `main.c` rewritten as a scene machine.

**On 3DS now:** title, the six games in the mockup shell (HUD with timer between goal and streak, no goal bar; tabs in mockup order; Dice; item column; SHOP/ITEMS; bet panel with MIN/+10/+25/MAX; context footers), Shop (4-item rotation, round pricing, after-buy preview), Items (18 items, all effects from `script.js`, AUTO badges), Pause, Settings (music/SFX/Reduced Motion, saved), How to Play (5 topics, 6 guides with live half-scale previews), Goal (Cash Out / Keep Going), Emergency Coin Flip (3 per run, Double-Headed Coin), Cash-out results, Run over, Local high scores (top 10 on SD). Music per game with crossfade, all SFX, peg pitch variation.

**Charm:** Dice idles, blinks, hops on wins, slumps and sweats on losses and low time; bevelled buttons press in; balance rolls; result words and payout pops; confetti, coins, debris, splash, hoof dust; peg flashes, ball arcs, cards slide from the shoe and flip, the roulette ball drops into its pocket; screen fades and pop-in panels. Reduced Motion cuts shake, particles, flashes and transitions only.

**Rules unchanged:** C check 0 failures. Decisions where the bible was open follow the web: the timer runs in Shop/Items, stops for Pause/Goal/Coin flip; timeout waits only for a Plinko ball; item timers count real time. No web files changed.

**Verified in Azahar (60 FPS, ≈4 ms/frame):** every screen captured (`docs/gauntlet/3ds/`) and compared with its mockup; win/loss/crash/cash-out/bust/stand/splash/race/timeout/goal/keep going/coin flip/cash-out/high scores all played; items bought and used; touch (held tap) starts a run. `.cia` installed through Azahar's File → Install CIA, listed as "Casino Run" with the Dice icon, launched and ran.

**Found → fixed:** Crash result text doubled the CRASHED word and its trail lingered; shop card names overflowed (now the mockup's short names); "$-10.00" → "-$10.00"; pause text touched the panel edge; guide steps overflowed; half-scale previews dropped glyph columns (pixel snapping); Shop was touch-only (Y now opens it).

**Not verified:** real hardware (sound needs the console's DSP firmware); the banner jingle and HOME Menu banner were built but only seen as files (Azahar's game list shows the icon, not the banner).
