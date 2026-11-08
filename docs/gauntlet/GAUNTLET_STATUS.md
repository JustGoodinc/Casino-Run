# Gauntlet Status

## Per-game checklist

✅ done and verified · ◐ partial · ✗ not yet

| Game | Art | UI/frame | Anim | Sound | Score FX | Special FX | Gameplay | Visual QA | Perf | 3DS |
|---|---|---|---|---|---|---|---|---|---|---|
| Plinko | ✅ pegs/ball/plate | ✅ | ✅ slot hit | ✅ 8 pegs + music | ✅ cascade | ✅ coins+sparkles at slot | ✅ | ✅ | ✅ | ✅ mockup |
| Roulette | ✅ bowl, hub, ball (wheel pockets still canvas) | ✅ | ✅ ball drop | ✅ ticks + tango | ✅ | ✅ chips | ✅ | ✅ | ✅ | ◐ |
| Crash | ✅ rocket, stars | ✅ | ✅ | ✅ boom + synth | ✅ | ✅ explosion | ✅ | ✅ | ✅ | ✅ |
| Blackjack | ✅ 53 cards | ✅ | ✅ deal | ✅ jazz | ✅ | ✅ mini cards | ✅ | ✅ | ✅ | ✅ |
| Elephant River | ✅ | ✅ | ✅ walk | ✅ calypso | ✅ | ✅ droplets | ✅ | ✅ | ✅ | ✅ |
| Horse Race | ✅ | ✅ | ✅ gallop | ✅ gallop | ✅ | ✅ horseshoes | ✅ | ✅ | ✅ | ✅ |
| Shell/HUD/shop | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ◐ web isn't a 3DS layout |

## Iteration log (summary; details in ITERATION_LOG.md)

| # | Focus | Result |
|---|---|---|
| 0 | Baseline redesign (commit 0e7d144) | 20/20 regression |
| 1 | Environments, frames, marquees, BET×MULT calculation, moving background | 20/20 (e3dab17) |
| 2 | Per-game debris kits, impact anchors, floating +$/−$ numbers | 20/20 (512f958) |
| 3 | Roulette bowl/hub/ball, Dice the host (reacts to wins/losses) | 20/20 |

## Next priorities

1. ~~Per-game reward effects + floating numbers~~ (done, iteration 2).
2. ~~Roulette wheel~~ (iteration 3: bowl, hub, ball).
3. ~~Host mascot~~ (iteration 3: Dice).
4. More animation frames for river hazards and horses; a crash rocket trail.
5. Per-game big-win sound stingers.
