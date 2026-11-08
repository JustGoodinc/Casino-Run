# Casino Run — Audit & Status

Audited 2026-11-07 against the handover spec. Source of truth: this repo (`JustGoodinc/Casino-Run`), last commit `2344fb0 how to play`.
The `casino-run-how-to-play-update.zip` bundle matches the committed files. `Documents/casino-run` is an unrelated empty Godot stub.

Status labels: **Verified** = exercised in a browser this session · **Code-read** = confirmed by reading source only · **Broken / Missing** as stated.

---

## A. Architecture

No build step, no framework, no modules. Three files do everything:

| File | Lines | Role |
|---|---|---|
| `index.html` | ~610 | All screens as static markup: title, How to Play modal, HUD, 6 game screens, shop, leaderboard, goal/cash-out/game-over/coin-flip/item popups |
| `script.js` | ~4580 | One global script. All state is top-level `let` variables, and the systems talk by calling each other's functions directly |
| `style.css` | ~2640 | Styles. Breakpoints at 500px and 620px |
| `manifest.json` | | PWA manifest. Its icons (`icon-192.png`, `icon-512.png`) **do not exist** |
| `service-worker.js` | | Clears caches and passes requests to the network. It is **never registered**: `index.html` actively unregisters every SW and deletes caches on each load |
| `.github/workflows/static.yml` | | GitHub Pages deploy of repo root on push to `main` |

Cache busting is the `?v=NN` query on `script.js`/`style.css` in `index.html` (now `v=21`). Bump it on every deploy.

**Settlement flow (every game):** validate bet → `changeBalance(-bet)` → animate → compute payout → `applyWinBonus()` (Hula Girl → Hot Streak → history) or `processFullLoss()` (Insurance, Cashback → streak loss → history) → `changeBalance(+payout)` → `checkGameState()` (time-out → goal → coin flip).
The money is settled immediately. Popups only display it, through the `queuePopupStep` promise queue.

## B. Systems inventory

| System | Where | Status |
|---|---|---|
| Balance / goal / timer HUD | `updateUI`, timer `setInterval` | Verified |
| Goal progression | `continueRun` | Verified. **Differs from spec**: the new goal is `ceil(balance × 3)`, not `ceil(goal × 1.75)` |
| Cash out / keep going | `cashOutRun`, `continueRun` | Verified. Inventory, streak and timed items carry over on keep going. Shop refreshes; prices rise 18% per round |
| Emergency coin flip | `showCoinFlipPopup` | Verified. **Differs from spec**: max 3 flips per run, and a win restores **20% of the current goal**, not $100. Double-Headed Coin forces a win |
| Hot Streak | `handleHotStreakWin/Loss` | Verified. The table matches the spec, applies to profit only and carries across games |
| Popup queue | `queuePopupStep` | Verified. Order: All-In (queued at bet time), item breaks, streak toasts, then money popup, then goal popup |
| Item break animation | `showItemBreakAnimation` | Code-read. Fires on every consumed item |
| Inventory bag + per-game filter | `renderInventory`, `isItemRelevantToGame` | Code-read |
| Run summary + history + graph | `showGameOverScreen`, `cashOutRun` | Verified. The graph appears on **game over only**, not on cash out |
| Leaderboard (Supabase REST) | `loadLiveLeaderboard`, `submitLiveLeaderboardScore` | **Broken**: host `deprjdkxyrrbfgfjukay.supabase.co` does not resolve (DNS). The project is probably paused or deleted |
| "Saved locally" fallback | `submitScore` | Misleading: kept in memory only and lost on reload. There is no `localStorage` anywhere |
| Save system | — | **Missing**: no saves, settings or lifetime stats exist |
| PWA / offline | — | **Missing**: the SW is never registered and the icons are missing |
| How to Play | modal in `index.html` | Verified (5 tabs). The item page is **hardcoded with 8 of 18 items**, not generated from the catalog |
| Dev easter egg | `setupDevUEasterEgg` | Verified. Clicking the "u" in the logo **3 times** adds every item. There is no `u` key binding |
| Sound | WebAudio tones | Code-read |
| Reduced motion / safe-area | — | Missing |

## C. Minigames (odds from source; EV = expected return per $1, computed exactly from the code's distributions)

Bets: a whole-dollar slider from $1 to `floor(balance)` on every game. Any bet that equals your whole balance is "All-In" (animation only).

| Game | Rules as implemented | Payout | EV | Notes |
|---|---|---|---|---|
| Plinko | Slot rolled up front with odds 38/23/18/13/8%, then the physics ball is steered into it | 0×, 0.5×, 1×, 2×, 5× | **0.955** (was ~1.83–1.89 and varied with screen width) | Several balls can be in flight at once. Weighted Ball shifts the rolled slot +1/+2 before the drop, so the visual slot always matches the payout |
| Roulette | 37-pocket wheel; bet red/black/green | red/black 2×, green 14× | red 0.973, green 0.378 | Roulette Magnet: 55% chance the result is forced to your colour, **red/black only** (green + Magnet was EV 7.87). Red + Magnet EV 1.54 for one spin |
| Crash | `m = 1 + 0.55t²`; crash point `0.96 / (1 − U)`, capped at 100× | bet × m | **0.96 at every cash-out target** (was up to 1.34) | ~4% of rounds crash instantly at 1.00× |
| Blackjack | One deck, reshuffled at ≤10 cards; dealer stands on all 17s | win 2×, natural 2.5×, push returns stake | — | No dealer-blackjack check: a player natural pays 3:2 even when the dealer also has 21. No double or split |
| Elephant River | 5 lanes; hit chance per step `min(0.12 + 0.08·lane, 0.55)`; multiplier `0.96 / P(survive to lane)` | 1.20×, 1.67×, 2.60×, 4.65×, 9.69× | **0.96 at every lane** (was up to 1.23) | Pool Floaties (id `frogSneakers`) ×0.55 per stack, floor 0.2. They reset when the round ends |
| Horse Race | 4 horses, winner uniformly random | 4× (+0.5× per Golden Horseshoe, stacks with no cap) | 1.00, 1.125 with one shoe | The visual winner always matches the settled winner (code-read: the winner's track position is forced to 1) |

## D. Item catalog (`shopItemData` in script.js)

Shop: 4 slots per refresh = 1 guaranteed "easter-egg" item (Jester Hat / Magnum Opus / Vinyl) + 3 random others. Price = `ceil(base × (1 + 0.18 × (round − 1)) / 5) × 5`.

| Item | Base $ | Kind | Effect as implemented | Stacking / expiry |
|---|---|---|---|---|
| Double-Headed Coin | 75 | Auto | The next coin flip wins | One per flip |
| Lucky Hula Girl | 100 | Passive | +10% of profit per copy on every win | Stacks, permanent |
| Time in a Bottle | 45 | Use | +30 s | No cap |
| Roulette Magnet | 60 | Use | Next red/black spin: 55% chance the result is forced to your colour. Green spins leave it active | Single flag (a second use is wasted) |
| Pool Floaties | 55 | Use | Lowers Elephant River hit chance for the current/next crossing | Counter; cleared at round end |
| Insurance Ticket | 70 | Auto | Refunds 50% of a fully lost bet, up to 2 tickets at once | **2 tickets + Cashback = 105% refund** |
| Filth-Tea | 85 | Use | Re-adds a random consumed item (never itself) | — |
| Lucky Match | 90 | Auto | Streak survives one loss | Checked before Heat Shield |
| Heat Shield | 95 | Auto | A loss lowers the streak by 1 instead of resetting it | |
| Grease Fire | 105 | Use | Next streak bonus ×3. The next loss first burns 25% of the balance | Single flag |
| Goal Cutter | 90 | Use | Goal −10% (minimum $50) | |
| Dealer's Peek Card | 40 | Use | Reveals the dealer's hole card mid-hand | |
| Golden Horseshoe | 50 | Use | +0.5× Horse Race payout per copy for the next race | Counter; cleared after the race |
| Weighted Ball | 55 | Use | Next ball: slot index +1 or +2 | Counter queue (doesn't overwrite) ✔ |
| Cashback Coupon | 80 | Timed | 5% back on full losses for 60 s | Extra coupons add time (wall clock) |
| Thottie's Jester Hat | 95 | Timed | A dealer 21 counts as 20 for 60 s | Extra hats add time |
| RoseKat's Magnum Opus | 110 | Use | +2 boosts: the next 2 *winning* drops add 4× profit | Separate counter from Weighted Ball, so the two don't corrupt each other ✔. The bonus counts as profit, so Hula Girl and Hot Streak stack on top of it |
| EJM's Record Vinyl | 125 | Use | Next spin is free at max bet | Counter |

Resolution order on a win: game modifiers (Weighted Ball → Magnum Opus) → Hula Girl → Hot Streak (× Grease Fire). On a loss: Insurance → Cashback → Grease Fire burn → Lucky Match → Heat Shield → reset.

## E. UI notes

- No horizontal overflow at 375px on any screen (Verified).
- The cash-out card is ~680px tall with `overflow: hidden` and no max-height, so it will clip on short phones. The spec asks for a scrollable summary.
- The timer shows raw seconds. There is no visual intensity scaling for the streak below "On Fire" (5+).
- How to Play is hardcoded (see B).

## F. Bug & risk report

### Fixed this session (all Verified by `tests/regression.js`, 15/15 pass; 9 of these checks failed on the original build)

| Sev | Bug | Fix |
|---|---|---|
| Critical | **Timer froze while any win popup played (6.25 s each), and betting stayed open** → effectively unlimited time | The timer pauses only for blocking modals (goal, coin flip). The money popup is shortened to 2 s |
| Critical | **Roulette read your colour at settlement, not at spin**, so switching colour as the wheel landed always won | Colour locked when the spin starts |
| High | Elephant River let you keep stepping past the shore: lane 8 paid 8.44× and the multiplier never stopped rising | Capped at lane 5 |
| High | Bets in flight during a reset (roulette spin, Plinko ball, blackjack deal, river hop, queued popups) settled into the **next** run (+$100 seen) | A `runId` token is checked in every async callback and in the popup queue |
| High | The GOAL HIT popup opened even after the balance fell back below the goal, so cash-out could submit a "successful" run below the goal | The popup re-checks `balance >= goal` when it opens |
| High | After cashing out you were stuck on a dead game screen. You had to submit, and could never leave without reloading | Submit and the new **SKIP — BACK TO TITLE** button both return to the title |
| High | Dev stash (all 18 items) runs could be submitted to the leaderboard | A dev run skips the submission; the flag resets each run |
| Medium | EJM's Vinyl was used up when spinning with no colour picked | The colour check now runs before the Vinyl is spent |
| Medium | Grease Fire was wasted on a win with a 0% streak bonus, contradicting its description | Stays lit until a bonus actually applies |
| Low | Blackjack push left no history entry | Recorded |

### Balance retune (approved 2026-11-07: "retune to ~0.96 EV")

Every game where the player chooses when to cash out now returns about 0.96 per $1, whatever the strategy. Verified by `tests/regression.js` (Crash 0.955–0.960 sampled at 1.1×/2×/5×/20×; River exactly 0.960 at lanes 1–5; Plinko 0.957 sampled; live Plinko drop pays the rolled 5× slot).

| Game | Before | After |
|---|---|---|
| Plinko | ~1.83–1.89, edges hit 25%+, varied with width | 0.955, fixed odds, same on every screen |
| Crash | 1.06–1.34 | 0.96 at every target |
| Elephant River | 1.21–1.23 at lanes 1–2 | 0.96 at every lane; lane 5 now pays 9.69× |
| Roulette Magnet on green | 7.87 | Magnet ignores green |

Left as is: Roulette red/black (0.973), Horse Race (1.00, because the spec fixes 4×), and Blackjack (house edge not computed). Items keep their positive effects by design.

### Open — needs your decision

1. Insurance ×2 + Cashback refunds 105% of a loss.
2. The goal formula is `balance × 3`, but the spec says `goal × 1.75`. The coin flip pays 20% of the goal (up to 3 times), but the spec says $100. Which is intended?
3. Horse Race returns 1.00 at the spec's 4×. Reaching 0.96 would mean paying 3.84×.
4. The leaderboard trusts the client: anyone holding the public anon key can POST any score. Real protection needs server-side checks (an RLS insert policy with range/length CHECK constraints at minimum; true anti-forgery needs server-validated runs). The policies couldn't be inspected because the project host is down.

### Open — bugs not yet fixed

| Sev | Issue |
|---|---|
| Critical (ops) | Supabase host doesn't resolve, so the leaderboard is down for everyone. Restore or unpause the project in the Supabase dashboard |
| Medium | Blackjack: no dealer-natural check (player BJ vs dealer BJ should push) |
| Medium | A roulette spin or blackjack hand that's still running when the timer hits 0 can settle after the game-over screen is drawn (final stats may be stale) |
| Low | "Saved locally" isn't persisted |
| Low | Roulette Magnet is a boolean, so a second activation before spinning is wasted |
| Low | The shop shuffle uses a biased `sort(() => Math.random() - 0.5)` |
| Low | Missing PWA icons; SW unregistered |

## G. Implementation status vs spec

| Feature | Status |
|---|---|
| 6 minigames wired to shared balance/streak/history | Verified |
| Hot Streak table + cross-game carry | Verified |
| Lucky Match / Heat Shield / Grease Fire / Filth-Tea | Verified (Filth-Tea code-read) |
| Weighted Ball queue, Magnum Opus independence | Code-read ✔ |
| Golden Horseshoe 4 → 4.5× | Code-read ✔ (stacks +0.5 each) |
| All-In animation, popup queue, item-break animation | Present, partly verified |
| Run summary, history, balance graph | Verified (no graph on cash out) |
| Goal ×1.75 progression | **Differs** (×3 of balance) |
| Coin flip = $100 | **Differs** (20% of goal, 3 flips) |
| Shared leaderboard | **Broken** (host down) |
| Local saves | Missing |
| PWA offline/install | Missing |
| Dynamic How to Play item list | Missing (hardcoded) |
| Dev egg via `u` key | **Differs** (3 clicks on the "u" in the logo) |
| Reduced motion, safe-area | Missing |
| Automated tests | Added: `tests/regression.js` (browser console, deterministic) |

---

## Next priority

1. **Restore the Supabase project** (dashboard), then add an RLS insert policy plus CHECK constraints (`char_length(player_name) between 1 and 12`, `final_balance between 0 and <cap>`).
2. Decide the remaining questions above (goal formula, coin flip, Insurance + Cashback, Horse Race).
3. Blackjack: add a dealer-natural check (player BJ vs dealer BJ should push), and compute its house edge.
4. Make the cash-out summary scrollable and add the graph to it; generate the How to Play item list from `shopItemData`.

## How to test

```bash
py -m http.server 8765
```

Open `http://localhost:8765/`, paste `tests/regression.js` into the DevTools console, and read the printed table (20 checks, about 40 s). Keep the tab visible: background tabs throttle animation frames, and Plinko balls then fall in slow motion.

Cache-bust version: `v=22`.
