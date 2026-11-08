# Casino Run — Visual Design Bible

**Direction: "The Cabinet."** Casino Run is one overstuffed arcade cabinet. Each game is a machine bolted into it, the HUD is its brass instrument panel, and wins make it rattle. It's chunky pixel art with 1px dark outlines, a strict palette, hard shadows and no blur.

References (principles only; no assets copied): Balatro, for tactile cards and a score calculation you can watch tick up; Nubby's Number Factory, for machinery that physically reacts and escalating chaos on big hits.

## 1. Pixel rules

- Art is authored at **1× native pixels** and scaled only by integers (2×/3×/4×) using `image-rendering: pixelated`. 1× is also what ships to the 3DS.
- Every sprite gets an automatic **1px outline** in `ink` (the generator adds it), so all art reads as one sticker family.
- Light comes from the top-left. Shading uses one highlight and one shadow step from the palette; no gradients inside sprites.
- No emoji or Unicode pictographs anywhere in the game UI.

## 2. Palette (`assets-src/palette.mjs` is the source; exported to `assets/palette.json` and CSS vars)

| Token | Hex | Use | Contrast on cabinet |
|---|---|---|---|
| `ink` | #0E0C17 | Outlines, deepest shadow | — |
| `cabinet` | #191727 | Page background | — |
| `panel` | #29263A | Panels, cards back-plates | — |
| `panelHi` | #3B3752 | Panel bevel highlight | — |
| `purple` | #6944B8 | Fills, frames (**not text**, 2.6:1) | 2.61 ✗ |
| `purpleLight` | #9B7BF0 | Purple text, hover | 5.44 ✓ |
| `gold` | #F4C34E | Money, primary CTA, logo | 10.70 ✓ |
| `goldDark` | #B8862B | Gold shadow step | — |
| `cyan` | #37D9E8 | Info, timer, selection glint | 10.27 ✓ |
| `red` | #F45B58 | Loss, danger fills | 5.43 ✓ (large text) |
| `redLight` | #FF7A72 | Small loss text | 6.94 ✓ |
| `green` | #7EDD65 | Wins, profit | 10.41 ✓ |
| `cream` | #FFF0CE | Body text | 15.59 ✓ |
| `orange` | #FF9E45 | Streak, warnings | 8.57 ✓ |
| `pink` | #FF8CC6 | Elephant River hero (kept from the existing identity) | — |
| `blue` | #3A7BD5 | Water, card backs | — |
| `felt` | #2E7D4F | Blackjack/roulette felt | — |
| `brown` | #8A5A3B | Wood, horses | — |
| `white` | #FFFFFF | Sparkle cores only | — |

Text contrast rule: body text ≥ 4.5:1 (cream, gold, cyan, green, orange, purpleLight, redLight). Dark `cabinet` text is allowed on gold/cyan/green/red buttons (≥ 5.4:1).

## 3. Typography

- **Casino Run Pixel**, an original 5×7 bitmap font drawn in `assets-src/font5x7.mjs`. The generator compiles it to `assets/fonts/casino-run-pixel.ttf` (square-pixel outlines) for the web and to a PNG glyph atlas for the 3DS. It's all caps by design (lowercase maps to small caps), and widths are proportional.
- **Crisp sizes only**: 1 font pixel = 100 units, so use font sizes in **multiples of 10px** (10/20/30/40/60). Body copy is 20px; HUD numbers 30–40px; headlines and popups 60px or larger, or pre-rendered word sprites.
- Hierarchy: balance (40px gold) > timer/goal (30px) > labels (20px cream) > hints (20px purpleLight).
- On the 3DS the font renders at 1× (7px caps), the same density as DS-era HUD text, and is readable on both screens.

## 4. Components (`style.css`, "Cabinet" layer)

| Component | Look | States |
|---|---|---|
| Primary button | Gold plate, 2px ink border, 4px hard ink drop shadow | hover: lift 1px plus shadow 5px · pressed: sinks 4px, no shadow · focus: 2px cyan outline offset · disabled: panel grey, no shadow |
| Secondary / nav button | Panel plate, purple bevel, game icon sprite | active: gold border plus raised · hover: purpleLight border |
| Purchase button | Green plate with price chip | sold out: red stamp "SOLD OUT" sprite |
| Panel / modal | `panel` fill, 2px ink + 2px panelHi inner bevel, corner rivets | — |
| Score counter | Pixel digits; ticks up, scales 1.15 on change | gain: green flash · loss: red shake |
| Goal bar | Segmented 20-cell bar filling gold → green at 100% | — |
| Timer | Cyan segmented readout | ≤15s: red plus pulse plus tick sound |
| Streak meter | 5 flame pips; pip N lit at streak ≥ N | 5+: ON FIRE word sprite, orange glow |
| Multiplier badge | Orange pill "x2.5" | pops on change |

Same behaviour across inputs: `:hover` and `:focus-visible` share styles; `:active` gives the press. Every action is a real `<button>`, so D-pad/keyboard focus order works.

## 5. Feedback tiers (Phase 5 hierarchy)

Tier comes from **profit ÷ bet** (or the event type) in `fx.celebrate()`:

| Tier | Trigger | Word sprite | Particles | Shake | Sound |
|---|---|---|---|---|---|
| L1 | Any press | — | — | — | `ui_click` |
| L2 | Win, profit < 1× bet | NICE! | 6 coins | — | `win_small` |
| L3 | Profit 1–3× bet, or streak ≥ 2 | GREAT! | 14 coins + sparkles | 2px | `win_medium` + streak note |
| L4 | Profit 3–8× bet | BIG WIN! | 28 coins, chips, starburst | 4px | `win_large` |
| L5 | Profit ≥ 8× bet | JACKPOT! | 60 mixed + fountain | 6px | `jackpot` |
| L6 | Goal hit | GOAL! | Confetti rain | 6px | `goal_fanfare` |

Losses: `BUST` / `CRASHED` / `SPLASH` / `MISS` word sprites in red, a short downward shake and `lose`. These are never louder than a win.

Cascading payout (the money popup): base payout → each item bonus → Hot Streak bonus → **total**. Each line lands 260 ms after the previous one with a rising note, and a click skips to the total. Bets keep running underneath; it never blocks input.

Reduced motion (setting or `prefers-reduced-motion`): no shake, particles capped at 0, popups fade without scaling.

## 6. Game identities

| Game | Machine name (flavour) | Accent | Signature visual | Signature sound |
|---|---|---|---|---|
| Plinko | The Peg Foundry | orange + gold | Brass peg sprites, slot cups that light up and bounce on landing | Pentatonic pings rising as the ball descends |
| Roulette | The Ruby Wheel | red + gold | Wheel restyled to palette; pointer sprite; landed wedge flash | Decelerating ball rattle |
| Crash | Rocket Ruckus | cyan | Pixel rocket riding the curve, explodes at crash | Rising whine → boom |
| Blackjack | The Twenty-One Club | felt green | Original pixel cards (procedural pips, original J/Q/K portraits, purple back) | Paper snap per card |
| Elephant River | Elephant River | pink + blue | Pink elephant sprite hops between log lanes; croc/boat/canoe hazards | Water plop / splash |
| Horse Race | Derby Dash | brown + green | Four pixel horses with palette-swapped silks | Hoof clops, bugle start |

## 7. Motion tokens (`docs/animation/ANIMATION_SPEC.md` has the details)

`--ease-pop: cubic-bezier(.34,1.56,.64,1)` · `--ease-snap: cubic-bezier(.2,0,0,1)` · press 60 ms · pop 220 ms · word sprite 650 ms · cascade line 260 ms. Nothing that isn't skippable lasts longer than 1.2 s.
