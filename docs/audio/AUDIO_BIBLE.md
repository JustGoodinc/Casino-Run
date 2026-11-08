# Casino Run — Audio Bible

**Identity: "warm chip cabinet."** Square and triangle voices softened with a lowpass, metallic FM bells for coins, filtered noise for physical objects (cards, water, chips), and short pitch-up flourishes for rewards. There are no samples from anywhere: every sound comes from `assets-src/audio/sfx.mjs` and is rendered by `tools/audio-generator/build.mjs`.

## Format

- Production: **22,050 Hz, mono, 16-bit PCM WAV** (`assets/audio/*.wav`). It plays everywhere and loads straight into 3DS `ndsp` as `NDSP_FORMAT_MONO_PCM16`.
- Mastering per file: peak-normalised to **−3 dBFS** (validator fails anything ≥ −0.5 dBFS). Category gain trims keep perceived loudness consistent: UI quietest, wins loudest, jackpot top.
- 3DS conversion: use as-is (PCM16), or convert to DSP-ADPCM for memory once the budget needs it.

## Engine (`script.js` → `sound` section)

`master → compressor (threshold −12 dB, ratio 8, acts as a limiter) → destination`, with an `sfx` bus and a `music` bus, each with its own gain.
- `sfx(name, {rate, gain})` plays a decoded buffer. `rate` gives pitch variation without extra files.
- Voice cap: 4 of the same sound at once (the oldest is cut), 24 total.
- Settings: SFX volume, music volume and mute, saved in `localStorage` (`casinoRun.settings`).
- Fallback: if a buffer isn't loaded yet or audio is unavailable, the old oscillator `playTone` path runs, so there's never silence or a crash.

## Event map

| Category | Sounds |
|---|---|
| UI | `ui_click`, `ui_hover`, `ui_confirm`, `ui_cancel`, `ui_error`, `ui_open`, `ui_close`, `ui_tab`, `ui_buy`, `ui_nofunds` |
| Betting | `bet_chip`, `all_in` |
| Scoring | `win_small`, `win_medium`, `win_large`, `jackpot`, `cascade_tick`, `payout_total`, `multiplier_up` |
| Streak | `streak_1` … `streak_5` (rising pitch, extra harmonic per step; 5 adds a flourish) |
| Loss | `lose`, `bust` |
| Plinko | `plinko_peg_1` … `plinko_peg_8` (glass, brass, metal, bell, wood and other timbres on C-major pentatonic notes; never the same variant twice in a row; pitch climbs ~1 semitone per peg row), `plinko_land` |
| Roulette | `roulette_tick`, `roulette_stop` |
| Crash | `crash_boom` (the rocket whine stays synthesised live because it tracks the multiplier) |
| Blackjack | `card_deal`, `card_flip` |
| River | `river_step`, `river_splash` |
| Horse | `horse_clop`, `horse_bugle`, `horse_finish` |
| Items | `item_use`, `item_break`, `grease_fire` |
| Progression | `goal_fanfare`, `game_over`, `coin_flip`, `time_tick`, `new_round` |
| Music | One original loop per screen, crossfaded (~0.4 s) on switch, loaded on first use (≈0.6 MB each): `music_lobby` (title; A minor chip, 132 bpm) · `music_plinko` (C major bouncing plucks + metal clanks, 140 bpm) · `music_roulette` (D minor tango, accordion + habanera bass + castanets, 112 bpm) · `music_crash` (E minor driving synth, octave bass + 16th arps, 150 bpm) · `music_blackjack` (F major cool-jazz swing, walking ii-V-I bass, muted lead, ride + brushes, 96 bpm) · `music_river` (G major calypso marimba, shaker + congas, 120 bpm) · `music_horse` (A major 6/8 gallop, brass lead, wood-block hooves). The shop keeps the current track. Built by `song()` in `assets-src/audio/sfx.mjs`. |

Dynamic streak sound: `streak_N` is chosen by the current Hot Streak (capped at 5) and layered on every win, so consecutive wins climb a major-pentatonic ladder (C5 E5 G5 A5 C6) without going above ~1.1 kHz fundamentals.

## Rules

1. A loss is never louder than a win.
2. Repeated sounds (pegs, ticks, clops) use ±rate variation so they don't sound machine-gunned.
3. Loops must stop on every run reset (`resetRunToTitleScreen`).
4. The low-money siren becomes a short `time_tick`-style pulse every 2 s; the 520 ms continuous loop is removed.
