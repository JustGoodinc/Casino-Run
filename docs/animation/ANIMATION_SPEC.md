# Animation Spec

Tokens (in `theme-cabinet.css`): `--ease-pop: cubic-bezier(.34,1.56,.64,1)` (overshoot, for rewards) · `--ease-snap: cubic-bezier(.2,0,0,1)` (mechanical).
Reduced motion (setting or OS preference) collapses every animation to 1 ms, turns particles off, removes shake, and makes words fade without scaling.

| Animation | Duration | Easing / frames | Trigger | Interruptible | Sound sync | Tier |
|---|---|---|---|---|---|---|
| Button press | 60 ms | snap; sinks 4px, shadow removed | `:active` | yes | `ui_click` on pointerdown | 1 |
| Button hover/focus | 60 ms | lift 1px, brightness 1.12 | `:hover`, `:focus-visible` | yes | — | 1 |
| Word pop (NICE!…JACKPOT!) | 900 ms | scale .2 → 1.15 → 1 with −12° → 3° → 0°, then drift up and fade | `CR.fx.celebrate` / `loss` / `goal` | non-blocking, auto-removed | tier sound at t=0 | 2–6 |
| Coin/chip burst | 0.8–1.6 s per particle | gravity 700 px/s², 2× sprites | celebrate (6 / 14 / 28 / 60 particles by tier) | non-blocking | — | 2–5 |
| Confetti rain | 2.6 s | 5-colour 3px strip frames | goal hit | non-blocking | `goal_fanfare` | 6 |
| Screen shake | 300 ms | 6 steps, ±2/4/6px by tier | tier ≥ 3, losses (2px) | yes | — | 3–6 |
| Payout cascade | 300 ms + 260 ms per bonus line + 120 ms, then 760 ms exit | pop card; lines slide in; total pops 1.35 → 1; card flies into the balance | `showMoneyGainPopup` (queued) | **tap skips to the total** | `cascade_tick` rising +15% per line, `payout_total` | 3–5 |
| Balance counter | ~250 ms | 25% lerp per frame | `CR.hud.update` | retargets | — | 2 |
| Goal bar fill | 300 ms | snap | updateUI | yes | — | 2 |
| Timer urgency | 1 s loop | 2-step pulse, red | ≤ 15 s left | — | `time_tick` each second, pitch rising | 4 |
| Streak pip light | 260 ms | pop | streak +1 | — | `streak_N` | 3 |
| ON FIRE flames | 300 ms loop | 3-frame sprite cycle | streak ≥ 5 | — | — | 4 |
| Card deal | 220 ms | drops from −30px with −8°, pop | card element created | — | `card_deal` | 2 |
| Plinko slot hit | 420 ms | cup jumps 8px, brightens | ball lands | — | `plinko_land` (pitch per slot) | 2 |
| Elephant walk | 500 ms loop | 2 frames, steps | always | — | `river_step` per step | 1 |
| Horse gallop | 200 ms loop | 2 frames, steps | `.racing` | — | `horse_clop` every 200 ms | 1 |
| Rocket flame | 80 ms per frame | 2 frames | crash running | — | live synth whine | 1 |
| Crash explosion | 0.9 s | star/sparkle/chip burst | crash point hit | non-blocking | `crash_boom` | 4 |

Only the payout cascade has any duration that could add up, and it is skippable. Nothing blocks input: game buttons stay live under every popup.
