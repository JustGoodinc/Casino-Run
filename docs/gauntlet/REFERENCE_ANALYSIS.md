# Reference Analysis

References: 7 user-supplied screenshots (4× Nubby's Number Factory, 3× Balatro), stored locally in `screenshots/reference/` and **git-ignored** (third-party art; studied for principles only, never copied).

## Nubby's Number Factory: what makes it work

- **The whole screen is a machine.** The playfield is a framed metal cabinet; pipes, readout boxes and a character portrait are bolted on around it. Nothing floats on an empty background.
- **Physical, round, tactile objects.** Spiky number balls with strong outlines and a bright fill per value tier.
- **Dedicated readouts** for each number (coins, round, target), each in its own framed box.
- **Escalation through density.** Big moments flood the screen with particles and floating numbers, yet the board stays readable because the objects have dark outlines against a darker field.
- **Slot strip at the top.** Upgrades sit as numbered slots: progress is a visible physical inventory.

## Balatro: what makes it work

- **One strict palette, everywhere.** Gold, red, blue and dark slate; every panel shares a corner radius and inset shadow.
- **The calculation is the hero.** A blue chips box × a red mult box are huge, centred, and animate on every contribution; the round score is the biggest number on screen.
- **A left information column** stacks blind, score, hand and money, each with a label above a big value.
- **Moving background.** A slow swirl keeps the screen alive when idle without competing.
- **Cards with thick outlines and character.** Strong silhouettes, flat colour, readable at a glance.

## Principles adopted for Casino Run (original execution)

| Principle | Casino Run implementation |
|---|---|
| Screen as a machine | 9-slice riveted metal frames per game with an accent stripe; named marquee signs with chasing bulbs |
| Calculation as hero | Payout cascade shows **BET** (cyan) × **MULT** (orange) = win; the multiplier climbs with each bonus line |
| Moving idle background | Diamond cabinet tile drifting slowly; water flows; stars drift (all CSS background-position, cheap, off with reduced motion) |
| Textured playfields | Riveted plate (Plinko), quilted velvet (Roulette), starfield (Crash), felt weave (Blackjack), flowing water (River), mown turf (Horses) |
| Outlined, readable objects | 1px ink outline on every sprite; hard ink drop shadows on panels |
| Escalation | L2–L6 tiers: word sprite, particle count, shake, marquee frenzy length, popup size/colour |
