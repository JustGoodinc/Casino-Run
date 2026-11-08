# Visual Comparisons

Judged from real screenshots: `screenshots/iter-N/` vs `screenshots/reference/` (the references stay local). The ratings are design-review estimates, not measurements.

## Iteration 1 (2026-11-07)

| Category | Reference | Casino Run iter-0 | Casino Run iter-1 | Evidence | Priority next |
|---|---|---|---|---|---|
| Main menu | High | Medium-high (pixel logo, ink buttons) | Same, plus drifting cabinet background | iter-0/title.jpg | Low |
| Gameplay interface / framing | High | Low (plain panels) | **Medium-high**: metal frames, marquees, textured playfields | iter-1/plinko-marquee-plate.jpg, crash-starfield.jpg, roulette-velvet.jpg | Medium |
| Score display | High (chips × mult) | Medium (cascade, $ only) | **Medium-high**: BET × MULT boxes, multiplier climbs | iter-1/payout-bet-x-mult.jpg | Medium |
| Animated effects | High | Medium (generic coins for every game) | Medium (+ marquee frenzy on wins) | — | **High**: per-game effects, floating numbers at impact |
| Game objects | High | Medium-high (original sprites) | Same | iter-0/blackjack.jpg, horse.jpg | Medium: roulette wheel still canvas |
| Character design | High | Low-medium (elephant, horses, card faces) | Same | iter-0/river.jpg | Medium: a host mascot |
| Popup effects | High | Medium-high (word sprites) | Same + tier styling | — | Low |
| Visual hierarchy | High | Medium-high (big gold balance) | Same | iter-0/hud-plinko.jpg | Low |
| Backgrounds | High | Low (static grid) | **Medium-high** | iter-1/* | Low |
| Colour consistency | High | High (one palette) | High | all | — |

**Biggest remaining gaps:** (1) every game celebrates with the same coin burst; (2) there are no floating numbers where the win happens (Nubby's strongest trait); (3) the roulette wheel and the horse/river hazards are still flat; (4) there's no mascot/host character.
