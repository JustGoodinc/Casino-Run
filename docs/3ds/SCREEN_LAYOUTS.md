# Two-Screen Layouts

Mockups of all six games, drawn at native resolution with the real sprites and glyph atlas: **Asset Studio → SCREENS** (`tools/asset-studio/index.html`). Top 400×240, bottom 320×240 (touch). Text uses the 5×7 font at 1×, giving 7px caps.

Shared frame:
- **Top, rows 0–24:** HUD strip: coin + balance (gold), goal, clock + timer (cyan), 5 streak flames, then a 3px goal bar.
- **Bottom, rows 0–26:** bet readout + slider (D-pad left/right).
- **Bottom, rows 36–70:** context buttons (labels show the physical button).
- **Bottom, rows 80–192:** item grid (4×2 per page; L/R pages through).
- **Bottom, rows 200–238:** game tabs (touch, or SELECT to cycle).

| Game | Top screen | Bottom screen | Notes |
|---|---|---|---|
| Plinko | 7-row peg field (brass pegs 7px), ball, 5 slot cups | DROP (A) | Board fits 400 wide at 18px spacing; 44 pegs is fine for the per-frame collision loop |
| Roulette | Wheel (pre-rendered rotations or a rotated sprite), result readout | RED / BLACK / GREEN / SPIN | Draw the wheel as one sprite rotated by citro2d (a single quad) |
| Crash | Curve plus rocket sprite, big multiplier | START (A) / CASH OUT (B) | Cash out must stay 1 press, no menus |
| Blackjack | Dealer row and player row on felt; 31×40 cards fit 5 per row with gaps | DEAL / HIT / STAND | Card art is native 1×; no scaling needed |
| Elephant River | 5 water lanes, hazards scrolling, elephant | START / STEP / CASH | Lane height 32px |
| Horse Race | 4 lanes × 46px, horses 28×19 with 2 gallop frames | 4 horse picks + RACE | Pick with D-pad up/down |

Overlays (goal hit, game over, coin flip, run summary) take the bottom screen as the decision surface. The top screen shows the celebration (word sprite at 2×, particles).
