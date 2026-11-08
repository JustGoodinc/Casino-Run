# Game Audit — Casino Run (design pass)

Baseline: branch `redesign/audiovisual`, created from `main` at `2344fb0` with the uncommitted Phase-1 fixes and the 0.96 return-per-$1 retune (see `/AUDIT.md`). Regression suite `tests/regression.js`: 20/20 pass before any redesign work.

The code is the authority. Everything below comes from `index.html`, `script.js` (~4.6k lines) and `style.css` (~2.6k lines). There's no build step and no dependencies.

## The six games, plus the meta-loop

All six are playable and all settle into one shared balance. "Score" in Casino Run means **money**: there are no points, so every scoring event below is a balance change.

| Game | Loop | Player actions | Win / loss | Special events | Current visuals | Current sound |
|---|---|---|---|---|---|---|
| **Plinko** | Bet → drop → slot pays 0/0.5/1/2/5× | Bet slider, DROP BALL | Slot ≥1× / 0× (0.5× = partial loss) | Weighted Ball, Magnum Opus 4× profit | DOM board with CSS-circle pegs, CSS ball, 5 text slots | Random-pitch peg ticks, cash chime |
| **Roulette** | Bet → pick colour → spin 4.1 s | Slider, Red/Black/Green, SPIN | Colour match 2×/14× | Magnet, Vinyl free spin | Canvas 2D wheel (37 wedges, Arial numbers), CSS pointer | Saw drone + square ticks |
| **Crash** | Bet → multiplier rises → cash out | START, CASH OUT | Cash before crash point | ~4% instant crash | Canvas line graph + glowing number | Saw "rocket" pitch tracks the multiplier |
| **Blackjack** | Bet → deal 2+2 → hit/stand → dealer to 17 | DEAL, HIT, STAND | Standard; natural pays 2.5× | Peek Card, Jester Hat | DOM cards: Unicode suits on white rectangles, "?" hole card | Triangle "deal" blip |
| **Elephant River** | Bet → step lanes 1–5 → cash out | START, STEP, CASH OUT | Survive steps / swept away | Pool Floaties | DOM lanes with emoji hazards 🪵🐊🚤🛶 and 🐘 player | Hop chirp, whoosh, hit thud |
| **Horse Race** | Bet → pick 1 of 4 → 4.2 s race | Pick horse, START | Your horse wins 4× | Golden Horseshoe | 4 identical 🐎 emoji sliding along CSS lanes | Start fanfare, gallop loop, finish chime |
| **Meta** | 120 s per stage, reach goal, keep going ×3 goal | Shop, inventory, cash out / keep going | Goal / time-out / broke → coin flip | Hot Streak, items, All-In | Teal/gold CSS panels, emoji item icons, Arial | Cash chime, lose buzz, siren under $10 |

Upgrades = the 18 shop items (see `ASSET_INVENTORY.md`). Difficulty progression: goal ×3 per stage, shop prices +18% per stage, and the timer resets.

## Visual inventory per surface

| Surface | Now | Problem |
|---|---|---|
| Background | Teal radial/linear gradients | Generic. The same everywhere, with no casino-machine identity |
| Logo | Arial text "Casino Run" with gold shadow | No lettering design at all |
| HUD | 4 `<p>` lines (Balance / Goal / Time / Streak) | No hierarchy: balance and timer look the same as the streak label. The timer has no urgency state |
| Nav | 7 identical rounded buttons | No game icons, so nothing tells the games apart |
| Bet slider | Native range + gradient | The best existing component; keep its behaviour |
| Popups | Gradient cards: money count-up, All-In, item break, goal, game over | Inconsistent styles; the money popup is the only "scoring" moment |
| Items | Emoji icons in round buttons | Emoji render differently on each OS and are not allowed by the art rules; unreadable at 3DS size |
| Result screens | Stat lines + canvas graph | Functional, but flat |
| Particles | None (CSS shake only) | Big and small wins feel the same |

## Design-quality scores (1–10, from reviewing current screenshots and code)

| Subsystem | Consistency | Personality | Readability | Animation | Audio | Feedback | Scoring satisfaction | Progression | Retro suitability |
|---|---|---|---|---|---|---|---|---|---|
| Shell / HUD / nav | 5 | 3 | 6 | 3 | 3 | 3 | 2 | 3 | 4 |
| Plinko | 5 | 4 | 6 | 6 | 4 | 4 | 3 | – | 5 |
| Roulette | 5 | 4 | 5 | 5 | 4 | 3 | 3 | – | 6 |
| Crash | 6 | 5 | 7 | 6 | 5 | 5 | 4 | – | 7 |
| Blackjack | 5 | 2 | 7 | 3 | 3 | 3 | 3 | – | 7 |
| Elephant River | 4 | 5 | 6 | 4 | 4 | 4 | 4 | – | 3 (emoji) |
| Horse Race | 4 | 3 | 6 | 4 | 4 | 3 | 3 | – | 3 (emoji) |
| Shop / items | 4 | 5 | 5 | 4 | 3 | 4 | 3 | 4 | 2 (emoji) |
| Results / summary | 6 | 3 | 6 | 5 | 3 | 3 | 4 | 5 | 5 |

Common evidence: 1 font (`Arial`), 61 CSS gradients, 241 `rgba()` uses, 40 distinct emoji used 68 times as graphics, 45 one-off `playTone()` calls with no mixer, volume or mute.

## Top problems → fixes

1. **Emoji as art** (68 uses). Replace with original pixel sprites from `tools/sprite-generator`.
2. **No feedback hierarchy**: a $0.50 win and a $5,000 win get the same popup. Add feedback tiers L1–L6 tied to profit ÷ bet (see `docs/design-bible/VISUAL_BIBLE.md`).
3. **No identity per game**: give each game an accent palette, an icon and a signature sound.
4. **HUD hierarchy**: balance becomes a big tick-up counter, the goal a progress bar, and the timer a segmented display with an urgency state.
5. **Audio has no mixer**: add a master bus, SFX/music volume, mute, a voice cap and a limiter.
6. **Accessibility**: there's no reduced-motion handling. Add a setting plus `prefers-reduced-motion`.
