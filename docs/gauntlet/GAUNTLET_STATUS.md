# Gauntlet Status

## Per-game checklist

✅ done and verified · ◐ partial · ✗ not yet

| Game | Art | UI/frame | Anim | Sound | Score FX | Special FX | Gameplay | Visual QA | Perf | 3DS |
|---|---|---|---|---|---|---|---|---|---|---|
| Plinko | ✅ pegs/ball/plate | ✅ | ✅ slot hit | ✅ 8 pegs + music | ✅ cascade | ✅ coins+sparkles at slot | ✅ | ✅ | ✅ | ◐ builds as .3dsx slice (not run) |
| Roulette | ✅ bowl, hub, ball, pixel wheel in European order (it. 8) | ✅ | ✅ ball drop | ✅ ticks + tango | ✅ | ✅ chips | ✅ | ✅ 375px (it. 9) | ✅ | ◐ rules in C |
| Crash | ✅ rocket, stars | ✅ | ✅ exhaust trail | ✅ boom + synth | ✅ | ✅ explosion | ✅ | ✅ | ✅ | ◐ rules in C |
| Blackjack | ✅ 53 cards | ✅ | ✅ deal | ✅ jazz | ✅ | ✅ mini cards | ✅ | ✅ | ✅ | ◐ rules in C |
| Elephant River | ✅ hazards 2-frame (it. 7) | ✅ | ✅ walk, croc snap, paddle | ✅ calypso | ✅ | ✅ droplets | ✅ | ✅ 375px | ✅ | ◐ rules in C |
| Horse Race | ✅ | ✅ | ✅ 4-frame gallop (it. 7) | ✅ gallop | ✅ | ✅ horseshoes | ✅ | ✅ 375px | ✅ | ◐ rules in C |
| Shell/HUD/shop | ✅ | ✅ | ✅ title bulbs, end screens | ✅ | — | — | ✅ | ✅ | ✅ | ◐ bottom-screen HUD in slice |

"Rules in C" = `3ds/source/rules.c` reproduces `rules.js` seed for seed (`3ds/tests/rules_check.c`, 0 failures); no on-device screen for that game yet.

## Iteration log (summary; details in ITERATION_LOG.md)

| # | Focus | Result |
|---|---|---|
| 0 | Baseline redesign | 20/20 (0e7d144) |
| 1 | Environments, frames, marquees, BET×MULT, moving background | 20/20 (e3dab17) |
| 2 | Per-game debris kits, impact anchors, floating +$/−$ | 20/20 (512f958) |
| 3 | Roulette bowl/hub/ball, Dice the host | 20/20 (05843f3) |
| 4 | Crash trail, hazard bob, big-win stingers, mobile bag dock | 20/20 |
| 5 | End-of-run screens (pixel headings, big Dice) | 20/20 |
| 6 | Living title screen | 20/20 (f491774) |
| 7 | Animated river hazards, 4-frame gallop; minimised-window-safe test | 20/20 (aedd354) |
| 8 | Pixel-art roulette wheel, European pocket order | 21/21 (43c7dfc) |
| 9 | Phone-width check of new art | no changes needed |
| 10 | `rules.js` with a seedable RNG (3DS stage 1a) | 22/22 (dddf253) |
| 11 | Settlement formulas into `rules.js` (stage 1b) | 23/23 (37151ca) |
| 12 | C rules core matching JS seed for seed (stage 2) | 0 failures (eb55d35) |
| 13 | First `.3dsx` build: Plinko slice (stage 3) | builds clean, not run (b290efb) |

## Next priorities

1. Owner: fix HTTPS (DNS A record `192.64.119.200` beside the GitHub IPs blocks the certificate) and restore Supabase.
2. Owner: listen to the per-game music, peg variants and stingers (only checked numerically).
3. 3DS: pixel font (`font.t3x`) for on-device text, then the other five games' screens; run on an emulator or hardware.
4. Web: timer tick and round state machine into `rules.js` (the last part of stage 1).
