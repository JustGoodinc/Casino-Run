# Asset Inventory

## Before redesign (baseline)

There are **no image or audio files** in the repo. `manifest.json` references `icon-192.png`/`icon-512.png`, which don't exist. All "art" is one of:

| Kind | Where | Count | Status |
|---|---|---|---|
| Emoji glyphs | index.html, script.js | 40 distinct / 68 uses | Temporary → replace |
| Unicode suits ♠♥♦♣ | Blackjack cards | 4 | Temporary → pixel suits |
| CSS shapes (pegs, ball, lanes, coin) | style.css | — | Temporary → sprites |
| Canvas drawing (roulette wheel, crash graph, results graph) | script.js | 3 | Keep the procedural drawing, restyle with palette tokens |
| WebAudio oscillator tones | script.js | 45 calls | Replace with the generated sample library; keep the synthesis fallback |

## Emoji → original sprite mapping (redesign target)

| Emoji | Meaning | Replacement sprite id |
|---|---|---|
| 🐘 | Elephant River player | `river/elephant` (2-frame hop) |
| 🪵 🐊 🚤 🛶 | River hazards | `river/log`, `river/croc`, `river/boat`, `river/canoe` |
| 🐎 ×4 | Horses | `horse/horse` (2-frame gallop, 4 jockey colours via palette swap) |
| ♠♥♦♣ | Card suits | `cards/suit-*` |
| 🪙 ⏳ 🧲 🛟 🎟️ 🍵 🔥 🛡️ 🛢️ 🎯 👀 🐎 ⚪ 💸 🎭 🖼️ 💿 🌺 | 18 shop items | `items/<itemId>` |
| 🎒 | Inventory bag | `ui/bag` |
| 🔥 | Streak flame | `ui/flame` (3-frame flicker) |
| 🎰 🟡 🎡 🚀 🃏 | Game icons in help/nav | `icons/<game>` |

## After redesign

The generated inventory is `assets/manifest.json`, written by `tools/sprite-generator/build.mjs` and `tools/audio-generator/build.mjs`. The Asset Studio (`tools/asset-studio/`) reads that manifest, so it is the source of truth; this doc doesn't duplicate it.
