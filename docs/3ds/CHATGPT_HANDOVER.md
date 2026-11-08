# Handover: design and gameplay plan for Casino Run on Nintendo 3DS

You are picking up planning work on **Casino Run**, a small arcade casino game. A web version is live, and a native Nintendo 3DS homebrew build already runs in an emulator. Your job is **not to write code**. Write a **design and gameplay plan for the 3DS version** that the engineer (another AI working in the repo) can build from, iteration by iteration.

Everything you need is in this document. If you need a fact that isn't here, list it as an open question instead of guessing.

---

## 1. What the game is

- Single-player, short-session arcade casino. **Fictional money only**: no real-money gambling, no purchases, no gambling ads. This is a hard rule.
- **A run:** start with **$100**, a **goal of $300** and a **120-second timer**. Hit the goal before time runs out.
  - When you hit the goal you choose to **cash out** (run ends, score saved) or **keep going**. Keeping going sets a new goal of `max(50, ceil(balance × 3))` and resets the timer to 120 s.
  - If time runs out you lose. If your balance drops below $1 you get an **emergency coin flip**: win and your balance is set to 20% of the goal; lose and the run ends.
- **Six mini-games**, each betting from the same balance: Plinko, Roulette, Crash, Blackjack, Elephant River, Horse Race. Rules are in section 3.
- **Hot Streak:** consecutive wins add a profit bonus. Streak 2 = +10%, 3 = +20%, 4 = +35%, 5+ = +50% ("ON FIRE"). A loss resets it.
- **Shop and items:** 18 items with fictional prices (section 4) that bend the rules: insurance, streak protection, per-game boosts and so on.
- **Host mascot "Dice":** a pixel character with three expressions (idle, cheering, sweating) who reacts to every result.
- **Leaderboard:** online on the web; the 3DS version will have **local scores only**.

## 2. Art and audio direction (keep it)

- **References** (for quality, not to copy): Balatro and Nubby's Number Factory. Chunky pixel art, loud juicy feedback, "cabinet / arcade machine" framing, a big payout counter that climbs (BET × MULT boxes).
- **Original art only,** generated procedurally by the project's own pipeline. **No emoji**, no third-party or web-sourced art or sound.
- **Pixel rules:** fixed palette (below), 1-pixel ink outlines, binary alpha, integer scaling only (1× / 2×), nearest-neighbour sampling.
- **Pixel font:** 5×7 glyphs in 6×9 cells. Uppercase A–Z, 0–9 and `! ? . , : ; " - + = / % $ ( ) [ ] < > # & * _ @ |`. **No lowercase and no apostrophe**, so plan your on-screen copy accordingly.
- **Palette (hex):** ink 0E0C17, cabinet 191727, panel 29263A, panelHi 3B3752, purple 6944B8, purpleLight 9B7BF0, gold F4C34E, goldDark B8862B, cyan 37D9E8, cyanDark 1E8FA0, red F45B58, redDark A8323A, redLight FF7A72, green 7EDD65, greenDark 3F9447, cream FFF0CE, creamDark D9C49A, orange FF9E45, orangeDark C4621E, pink FF8CC6, pinkDark C9558F, blue 3A7BD5, blueDark 24508F, felt 2E7D4F, brown 8A5A3B, brownDark 5E3A24, grey 8B87A3, greyDark 5B5772, white FFFFFF.
- **Per-game identity:**

  | Game | Machine name | Background | Accent | Music |
  |---|---|---|---|---|
  | Plinko | – | riveted metal plate | orange | – |
  | Roulette | "The Ruby Wheel" | red velvet | red | tango |
  | Crash | – | starfield | cyan | synth |
  | Blackjack | – | green felt | gold | jazz |
  | Elephant River | – | flowing water | pink | calypso |
  | Horse Race | – | turf | green | gallop |

  There is also a lobby track.
- **Feedback tiers** by profit ÷ bet: under 1× small, 1–3× medium (or a streak of 2+), 3–8× big, 8×+ huge, goal hit = maximum. Bigger tiers get more debris, screen shake, word pop-ups (NICE / GREAT / BIG WIN / JACKPOT) and stingers.
- **Existing assets you can plan around:**
  - 144 sprites: characters, the 52 cards plus a back, 18 item icons, word pop-ups, tiles, cabinet frames, the logo and Dice.
  - 53 sound effects, including 8 Plinko peg variants and per-game big-win stingers.
  - 7 music loops (4.6 MB in total).
  - Mono, 22,050 Hz, 16-bit audio.

## 3. Game rules and odds (source of truth; do not change silently)

Every game is tuned to return **about 0.96 per $1 bet** (a deliberate decision by the owner). The rules live in one shared module, `rules.js` on the web and `3ds/source/rules.c` on 3DS, and the C version is tested to match the JS **seed for seed**. If your plan wants different odds or payouts, mark it clearly as a **proposal** and include the expected-return maths.

| Game | Rules | Pays (stake included) |
|---|---|---|
| Plinko | The slot is rolled first, then the ball is steered into it. Slot odds 38 / 23 / 18 / 13 / 8 %. | 0×, 0.5×, 1×, 2×, 5× (return 0.955) |
| Roulette | European single-zero wheel in real pocket order. Colour bets only. | red/black 2×, green 14× |
| Crash | Crash point `0.96 / (1 − U)`, capped at 100×. Multiplier climbs as `1 + t² × 0.55` (t in seconds). Cash out any time before the crash. | bet × multiplier at cash-out |
| Blackjack | Single 52-card deck, reshuffled at 10 cards left. Dealer stands on all 17s. Hit and stand only (no double or split). | natural 2.5×, win 2×, push 1× |
| Elephant River | 5 lanes; each step has a hit chance of `min(0.12 + lane × 0.08, 0.55)` (20 / 28 / 36 / 44 / 52 %). Cash out any lane ≥ 1; lane 5 is the far shore. | 0.96 / survival-to-lane: 1.20×, 1.67×, 2.60×, 4.65×, 9.69× |
| Horse Race | 4 horses: Dingo, Vas, HisterBlue, The Horse. Uniform winner, decided before the animation. | 4× (+0.5× per Golden Horseshoe) |

## 4. Items (web version; none on 3DS yet)

| Item | $ | Effect |
|---|---|---|
| Double-Headed Coin | 75 | Next emergency coin flip is a win |
| Lucky Hula Girl | 100 | +10% profit on every win (stacks) |
| Time in a Bottle | 45 | +30 s on the timer |
| Roulette Magnet | 60 | Next red/black spin: 55% chance the result is forced to your colour (not green) |
| Pool Floaties | 55 | Lower the danger on the next River crossing (stacks) |
| Insurance Ticket | 70 | Refunds 50% of a fully lost bet; up to 2 trigger at once |
| Filth-Tea | 85 | Refunds a random consumed item from this run |
| Lucky Match | 90 | Protects the Hot Streak once after a loss |
| Heat Shield | 95 | On a loss, the streak drops by 1 instead of to 0 |
| Grease Fire | 105 | Triples the next streak bonus; if you lose first, burns 25% of your balance |
| Goal Cutter | 90 | Lowers the current goal by 10% |
| Dealer's Peek Card | 40 | Reveals the dealer's hidden card |
| Golden Horseshoe | 50 | +0.5× on the next Horse Race payout |
| Weighted Ball | 55 | Shifts the next Plinko result 1–2 slots up (stacks) |
| Cashback Coupon | 80 | 5% back on fully lost bets for 60 s |
| Thottie's Jester Hat | 95 | Dealer can't make 21 for 60 s |
| RoseKat's Magnum Opus | 110 | Next 2 winning Plinko drops add 4× profit as a bonus |
| EJM's Record Vinyl | 125 | One free Roulette spin at max bet |

The shop shows 4 items per rotation, one of them guaranteed from a small "easter egg" set. Several item names refer to the owner's friends; keep those names.

Known balance questions the owner hasn't decided yet (your plan may recommend, but should not assume):
- The goal is ×3 balance, while the original spec said ×1.75.
- The coin-flip rescue pays 20% of the goal, while the spec said $100.
- Insurance ×2 plus Cashback can refund 105% of a loss.
- Horse Race returns exactly 1.00 per $1 at 4×, above the 0.96 target.

## 5. Current 3DS build (what exists today)

- **Toolchain:** devkitPro (devkitARM, libctru, citro2d, tex3ds), C99, output `casino-run.3dsx`.
  - Tested in the **Azahar** emulator at 60 FPS.
  - **Never run on real hardware yet.**
- **Screens:** top 400×240, bottom 320×240 (touch-capable, currently unused).
- **Art:** one tex3ds sprite atlas packed straight from the web PNGs, plus the pixel-font atlas.
- **Already built** (one vertical slice per game, cycled with SELECT):
  - **Plinko:** 7 peg rows and 5 coloured slots; A drops a ball.
  - **Crash:** rocket with exhaust trail, big multiplier, debris burst on crash; A launches, A or B cashes out.
  - **Elephant River:** flowing water, animated hazards, elephant hop; A starts and steps, B cashes out, splash on a hit.
  - **Roulette:** palette wheel, eased spin onto the pre-rolled pocket under a gold pointer; Left/Right picks colour, A spins.
  - **Horse Race:** turf, finish line, 4-frame gallop; Left/Right picks the horse, A races.
  - **Blackjack:** the web's pixel cards and a hidden dealer card; A deals and hits, B stands.
  - **Bottom screen:** logo, balance / goal / bet, Dice reacting (idle / cheer / sweat) and a one-line control hint.
  - **Global:** Up/Down change the bet; A/B are locked for 0.5 s after each result so mashing can't accidentally re-bet; START quits.
- **Missing on 3DS:**
  - the run timer and the run structure (goal popup, keep going / cash out, game over, coin flip);
  - Hot Streak and the shop and items;
  - sound and music;
  - the payout cascade, word pop-ups, screen shake and particles;
  - touch input, saves and local scores;
  - a title screen and How to Play;
  - settings (volume, reduced motion).
- **An earlier plan** (`docs/3ds/` in the repo) proposed the following. Treat it as a starting point you may revise.
  - **Layout:** top screen = playfield plus a HUD strip. Bottom screen = bet slider, context buttons labelled with the physical button, a 4×2 item grid paged with L/R, and game tabs (touch or SELECT).
  - **Controls:** A = primary action, B = cash out or stand, X/Y = use the relevant item, D-pad = bet. Panic-mashing to cash out in Crash must work.
  - **Budgets:**
    - sprites at most 256×256 each;
    - atlas at most 512 KB (now about 57 KB);
    - 30 FPS target (Old 3DS);
    - at most 8 simultaneous sound effects plus 1 streamed music track;
    - particle cap of 220 (60 on low quality);
    - app RAM under 16 MB (unverified).
  - Stereoscopic 3D is optional (a two-layer parallax on the top screen at most). Saves go in `sdmc:/3ds/casino-run/`.

## 6. What I need from you

A **design and gameplay plan for the 3DS version**, written so it can be built in small, testable steps. Please cover:

1. **Vision and pillars.** What the 3DS version should feel like in three to five sentences, and what makes it more than a port: the two screens, physical buttons, touch, portable sessions.
2. **Session and run structure** on 3DS: title, run start, the goal popup flow, game over, coin flip, cash-out and score screens. Should a run be 120 s on a handheld, or something else? Justify it.
3. **Two-screen layout for every screen.** For each of the six games plus the shop, title, results and pause screens, say what goes on the top and bottom screens. Give rough pixel regions within 400×240 and 320×240. Mark where touch is used and what the button-only alternative is.
4. **Controls.** A complete map for buttons, D-pad, L/R, START/SELECT and touch, consistent across games. Say how the player picks bets quickly; bet presets may beat a ±1 slider.
5. **Per-game design notes.** For each game: what to keep from the web, what changes for a small screen, how the result is staged (anticipation, then reveal, then payout cascade) and which existing assets and sounds it uses. Flag any rule change as a proposal with its expected-return maths.
6. **Shop and items on 3DS.** How the shop appears, how items are bought and used with buttons, and which items need reworking for 3DS. Flag the balance questions in section 4.
7. **Juice and feedback.** How the feedback tiers, Dice, word pop-ups, the BET × MULT cascade, screen shake and stingers translate to 3DS within the particle and voice budgets. Include a reduced-motion option.
8. **Progression and saves.** Local high scores, any unlocks that fit a portable game (cosmetic only; no real money), what is saved and when.
9. **Accessibility and comfort.** Text size at 1× and 2×, colour-blind safety (red and black roulette, the slot colours), sound-only cues, left-handed play.
10. **Build roadmap.** An ordered list of small iterations, each with a goal, what to build, and how to verify it in the Azahar emulator (screens and inputs to check). Put the run structure (timer and goal flow) early.
11. **Risks and open questions** for the owner.

**Format:** Markdown with the numbered sections above. Use tables for layouts and controls. Keep it concrete enough to build from (pixel regions, button names, frame counts where they matter). Mark anything that depends on hardware facts you aren't sure of as **[verify]**.

**Please don't:**
- propose real-money features or loot boxes for money;
- copy Balatro's or Nubby's art or layouts;
- add emoji;
- change odds without the maths;
- assume online features on 3DS.
