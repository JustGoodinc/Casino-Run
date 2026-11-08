# Portability Audit (web → original Nintendo 3DS)

The 3DS toolchain is installed locally at `C:\devkitPro`: devkitARM `arm-none-eabi-gcc`, libctru (`3ds.h`), citro2d (`citro2d.h`) and tools including `tex3ds`, `3dsxtool` and `smdhtool`. Facts below marked **[SDK]** were read from those headers. Anything else is marked **[verify]**.

| Fact | Value | Source |
|---|---|---|
| Top screen | 400 × 240 | [SDK] `GSP_SCREEN_HEIGHT_TOP 400`, `GSP_SCREEN_WIDTH 240` (the framebuffer is rotated) |
| Bottom screen | 320 × 240 | [SDK] `GSP_SCREEN_HEIGHT_BOTTOM 320` |
| citro2d default object budget | 4096 per frame | [SDK] `C2D_DEFAULT_MAX_OBJECTS` |
| Audio formats | PCM8, PCM16, ADPCM, mono/stereo | [SDK] `ndsp/channel.h` |
| Texture dimensions | Power of two, ≤ 1024 | [verify] (common citro3d/tex3ds guidance) |

## What ports and what doesn't

| Layer | Web today | 3DS path | Difficulty |
|---|---|---|---|
| Game rules | Mixed into DOM handlers in `script.js` | Must be extracted to pure functions (bet → outcome → settlement) and re-implemented in C | **High** until the rules are separated from DOM code |
| RNG | `Math.random()` everywhere | Seedable PRNG (also enables deterministic tests) | Medium |
| Rendering | DOM + CSS + 3 canvases | citro2d sprites from a tex3ds atlas | Medium once the art is sprite-based |
| Art | Emoji + CSS gradients | **Not portable** | Fixed by the pixel-sprite pipeline (PNG atlases at native resolution) |
| Fonts | Arial | Bitmap font atlas | Fixed by the generated pixel font |
| Audio | WebAudio oscillators | ndsp + PCM16 WAV samples | Fixed by the generated WAV library (22.05 kHz mono PCM16, loads directly) |
| Input | Mouse/touch clicks only, no keyboard focus order | D-pad/A/B + touch | Medium: every action already maps to a button |
| Saves | None | `fsUser`/SD file | Defines the schema fresh |
| Leaderboard | Supabase REST | No web stack on device. Drop it, or use local high scores | — |
| Plinko physics | Per-frame float physics, peg loop O(pegs) | Fine at 44 pegs | Low |

Biggest blocker: game logic and presentation live in the same functions. Extracting a `rules` module is the main structural refactor; it is staged in `docs/3ds/PORTING_PLAN.md`.
