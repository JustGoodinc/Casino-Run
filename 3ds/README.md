# Casino Run: Nintendo 3DS build

The full game on 3DS, built to the approved design in `docs/3ds/design/` (Design-Bible.md + 25 mockups; the mockup PNGs stay local, git-ignored). Install guide: `docs/3ds/INSTALL.md`.

- `source/main.c`: run flow and every screen: title, the six-game shell (HUD, tabs, Dice, item column, Shop/Items, bet panel, footer), pause, settings, How to Play (5 topics, 6 live game previews), goal, coin flip, cash-out, run over, local high scores. Also effects (particles, word pops, shake, transitions) and settlement (Hot Streak, Hula Girl, refunds, Grease Fire, Lucky Match/Heat Shield) ported from `script.js`.
- `source/games.c`: the six minigames, their item hooks and their animations. Outcomes are always rolled by `rules.c` first.
- `source/items.c`: the 18 items, shop rotation and round pricing. `source/save.c`: versioned, checksummed `sdmc:/3ds/casino-run/save.dat` (temp file + rename). `source/audio.c`: the web WAVs through ndsp (resident SFX, one music loop with crossfade).
- `source/ui.c`: pixel font, panels, bevelled buttons, glyphs, footer. `source/rules.c`: the verified C port of `rules.js` (`tests/rules_check.c`).
- `gfx/sprites.t3s`: atlas built from the original `assets/sprites`; clashing names (icons/words) are staged with a prefix by the Makefile.

## Build

From this folder in the devkitPro MSYS2 shell: `make` (`.3dsx`), `make cia` (installable `.cia`), `make EXTRA=-DCR_DEBUG` (test build: SELECT cycles all-items / reach-goal / go-broke).

**Status (2026-11-08):** full game builds clean (no warnings); every screen played in Azahar 2126.2 at 60 FPS (≈4 ms/frame); the `.cia` installs in Azahar, shows its Dice icon and title, launches and saves. Not yet run on real hardware.
