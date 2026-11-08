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
