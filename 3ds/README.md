# Casino Run: Nintendo 3DS build

Homebrew port in progress. See `docs/3ds/PORTING_PLAN.md` for the stages.

- `source/rules.c`, `rules.h`: C port of the web `rules.js` (stage 2). `tests/rules_check.c` checks it against vectors made from the real JS (`node 3ds/tests/make_vectors.mjs > 3ds/tests/rules_vectors.h`).
- `source/main.c`: stage 3 vertical slice. The top screen is a Plinko board using the shared rules and RNG; the bottom screen shows the logo, Dice the host and balance / goal / bet. Controls: A drops, Up/Down change the bet, START quits.
- `gfx/sprites.t3s`: atlas built by tex3ds straight from the web game's `assets/sprites` PNGs.

## Build

Needs devkitPro with the 3ds-dev group (devkitARM, libctru, citro2d, tex3ds). From this folder, in the devkitPro MSYS2 shell:

```bash
make
```

The output is `casino-run.3dsx`; run it with the Homebrew Launcher or a 3DS emulator.

**Status (2026-11-08):** builds clean (no warnings). It has **not been run yet**, either on hardware or in an emulator (none installed here).
