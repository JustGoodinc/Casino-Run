# Gauntlet Status

## Per-game checklist

✅ done and verified · ◐ partial · ✗ not yet

| Game | Art | UI/frame | Anim | Sound | Score FX | Special FX | Gameplay | Visual QA | Perf | 3DS |
|---|---|---|---|---|---|---|---|---|---|---|
| Plinko | ✅ pegs/ball/plate | ✅ | ✅ slot hit | ✅ 8 pegs + music | ✅ cascade | ◐ generic coins | ✅ | ✅ | ✅ | ✅ mockup |
| Roulette | ◐ wheel is canvas | ✅ | ◐ | ✅ ticks + tango | ✅ | ◐ | ✅ | ✅ | ✅ | ◐ |
| Crash | ✅ rocket, stars | ✅ | ✅ | ✅ boom + synth | ✅ | ✅ explosion | ✅ | ✅ | ✅ | ✅ |
| Blackjack | ✅ 53 cards | ✅ | ✅ deal | ✅ jazz | ✅ | ◐ | ✅ | ✅ | ✅ | ✅ |
| Elephant River | ✅ | ✅ | ✅ walk | ✅ calypso | ✅ | ◐ | ✅ | ✅ | ✅ | ✅ |
| Horse Race | ✅ | ✅ | ✅ gallop | ✅ gallop | ✅ | ◐ | ✅ | ✅ | ✅ | ✅ |
| Shell/HUD/shop | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ◐ web isn't a 3DS layout |

## Iteration log (summary; details in ITERATION_LOG.md)

| # | Focus | Result |
|---|---|---|
| 0 | Baseline redesign (commit 0e7d144) | 20/20 regression |
| 1 | Environments, frames, marquees, BET×MULT calculation, moving background | See ITERATION_LOG |

## Next priorities

1. Per-game reward effects + floating score numbers at the impact point.
2. Roulette wheel as a sprite (pixel rim, numbers, ball).
3. A host mascot for the marquee/HUD.
