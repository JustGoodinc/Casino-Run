# Asset & Performance Budgets

**Measured** = from `tools/asset-validator/validate.mjs` / `assets/manifest.json`. **[SDK]** = read from the installed libctru headers. **[verify]** = commonly cited, not confirmed against official documentation here; check on hardware before relying on it.

| Budget | Planning limit | Current | Status |
|---|---|---|---|
| Sprite frame size | ≤ 256×256 | Largest: logo 118×63; cards 33×42 | Measured ✓ |
| Sprite atlas (tex3ds, compressed) | ≤ 512 KB | **36.6 KB** for all 119 sprites | Measured ✓ |
| Texture dimensions | Power of two, ≤ 1024 [verify] | tex3ds packs and pads automatically | Measured ✓ (tex3ds accepted every input) |
| Sprite PNG bytes (web) | — | 30.6 KB total | Measured |
| citro2d objects per frame | 4096 default [SDK: `C2D_DEFAULT_MAX_OBJECTS`] | Worst case ≈ 44 pegs + 220 particles + ~60 UI ≈ 330 | Estimate ✓ |
| Active particles | 220 high / 60 low | `fx.js` caps exactly this | Code ✓ |
| SFX memory (PCM16, resident) | ≤ 2 MB | ~0.9 MB (53 clips) | Measured ✓ |
| Music (7 loops, 4.6 MB total) | Stream one track at a time from RomFS; never all resident | Web loads each track only when its game opens | Measured; 3DS streaming not built. Converting to DSP-ADPCM would cut it to roughly a quarter [verify] |
| Simultaneous SFX voices | 8 on 3DS (ndsp has 24 channels [SDK channel API; verify count]) | Web caps 24 total / 4 per sound | Web code ✓; the 3DS pool needs a cap of 8 |
| Frame time | 33.3 ms (30 fps target) | Not measured on hardware | **Unverified** |
| Main RAM for the app | Keep < 16 MB [verify; old 3DS app RAM is larger but shared] | Assets total < 2 MB | Estimate |

Low-cost alternatives already chosen: no blur or glow on sprites (hard ink outlines instead), particles are sprites with no per-pixel effects, shake is a whole-layer translate, and the roulette wheel is a single rotating quad.
