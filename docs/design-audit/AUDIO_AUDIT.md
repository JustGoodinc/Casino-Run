# Audio Audit (baseline)

Architecture: one lazily created `AudioContext`. `playTone(freq, dur, type, vol)` builds an oscillator and gain per call and connects it straight to `destination`. There is no bus, compressor, volume setting or mute.

| Event | Function | Notes |
|---|---|---|
| Any button pointerdown | `playButtonClickSound` | Fires for every `<button>`, including disabled-looking ones and duplicate presses |
| Peg hit | `playPegHitSound` | Random 650–1000 Hz triangle. Many balls at once means many unbounded voices |
| Card deal | `playCardDealSound` | Triangle blip, no paper texture |
| River hop / whoosh / hit | `playHopSound`, `playCarWhooshSound`, `playFrogHitSound` | Still named after the old "frog road" game |
| Horse start / gallop / finish | `playHorseStartSound`, gallop interval 170 ms | Gallop runs 2 tones per 170 ms for the whole race |
| Win | `playCashSound` (3-note arpeggio) | Identical for a $0.50 and a $5,000 win |
| Loss | `playLoseSound` | Same for every game |
| Game over | `playGameOverSound` | |
| Low money | `startLowMoneySiren` (520 ms loop) | Plays continuously under $10 and quickly becomes tiring |
| Roulette spin | `startRouletteSpinSound` | **Bug**: meant to slow down, but the inner interval ticks at a constant 62 ms |
| Crash rocket | `start/update/stopCrashRocketSound` | Pitch tracks the multiplier: good concept, keep it |
| Typewriter | `typeMessage` | One blip per character |

Problems:
1. No mixer, so overlapping wins and peg storms stack with no limiter. Sawtooth layers at a gain of 0.1 can approach clipping.
2. There is no score-intensity scaling or ascending streak pitch.
3. There is no per-game sonic identity; everything is sine, square or saw.
4. There is no music.
5. There are no user volume or mute controls, and no `prefers-reduced-motion`/accessibility settings.
6. `stopCrashRocketSound` nulls oscillators inside a 120 ms timeout, so a restart within 120 ms can orphan the new oscillator (low risk).

Redesign target: see `docs/audio/AUDIO_BIBLE.md`.
