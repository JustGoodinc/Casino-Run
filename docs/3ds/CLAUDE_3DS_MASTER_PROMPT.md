# Master prompt: build Casino Run for Nintendo 3DS (.cia)

Paste everything below the line into a new Claude Code session opened on `C:\Users\admin\Documents\GitHub\Casino-Run`.

---

You are taking over the Nintendo 3DS port of **Casino Run**. It's my own original browser arcade casino, and all the money in it is fictional. Your job is to finish the port as a complete, charming, polished 3DS game that matches the approved design mockups exactly. Deliver it as an installable **`.cia`** that shows up with its own icon and banner on my 3DS HOME Menu.

Work autonomously. Don't stop to ask me questions or wait for approval between checkpoints. Pick the best option, record why, and keep going until the "Definition of done" at the bottom is met. Only stop for something irreversible, destructive or security-sensitive: force-pushing, rewriting history, deleting branches, or changing repo/Pages/domain settings. You may commit and push to `main` (it auto-deploys the web game, so never break the web build).

## 0. Read first, in this order

1. **The approved design package.** Unzip `C:\Users\admin\Documents\Codex\2026-11-08\referenced-chatgpt-conversation-this-is-an\outputs\casino-run-design-bible-and-mockups.zip` into `docs/3ds/design/`.
   - Commit `Design-Bible.md` and `README.md`.
   - Add `docs/3ds/design/mockups/` and `docs/3ds/design/references/` to `.gitignore`. The PNGs are about 45 MB and must not bloat the live-site repo.
   - Read `Design-Bible.md` in full, then **look at every one of the 25 mockups** in `docs/3ds/design/mockups/` with your image viewer before writing any UI code.
2. **The project docs.** Read `docs/3ds/CHATGPT_HANDOVER.md`, `docs/3ds/PORTING_PLAN.md`, `docs/3ds/SCREEN_LAYOUTS.md`, `docs/3ds/CONTROL_MAPS.md`, `docs/3ds/ASSET_BUDGETS.md`, `docs/3ds/PORTING_RISKS.md` and `3ds/README.md`.
3. **The code.**
   - `3ds/source/main.c` (the current prototype: 6 playable games, no menus, no shop, no sound, no saves) and `3ds/source/rules.c/.h`.
   - `rules.js`, the single source of truth for odds and payouts.
   - The parts of `script.js` that hold run, shop, item and timer behaviour.
4. **My memory vault.** Open `\\192.168.1.141\ServerSSD\obsidian\Knowledge\Roblox-AI-Memory\03_PROJECTS\Casino-Run\`, read `Current-State`, `Design-Bible`, `Important-Decisions` and `Lessons-Learned`, then follow `00_START_HERE\CLAUDE_MEMORY_RULES.md`.

## 1. Sources of truth (when they disagree)

| Question | Wins |
|---|---|
| Layout, colours, which screen shows what, button labels, HUD order, input glyphs | `Design-Bible.md` first, then the mockup for that screen |
| Odds, payouts, item effects, goal maths, streak table, timer rules | `rules.js` / `rules.c` (verified seed-for-seed) and then `script.js` |
| Pixel art, sprites, font, sounds, music | The original files in `assets/` only |

**Don't deviate from the new design.** Every screen in the mockups must exist on the 3DS with the same composition:

- the same elements in the same places, in the same order;
- the same colours (the bible's palette hexes);
- the same text in the same uppercase pixel font;
- the same button states.

Don't add, remove, rename, reorder or restyle anything visible. Only three things may differ from the mockups:

1. Native resolution. Top screen is 400×240 and bottom is 320×240. The handheld shell, glow and outer "CASINO RUN" title in the mockups are presentation framing; never draw them.
2. Exact pixels. The mockups are AI-rendered composites, so redraw nothing from them. Build every screen from the original sprites in `assets/sprites/` and the pixel font in `assets/fonts/`, packed through `3ds/gfx/sprites.t3s` / tex3ds.
3. Live values. Show real game data, not the sample numbers in the mockups.

Superseded details you must **not** copy:

- the yellow goal progress bar and its track (it's gone everywhere);
- the missing HUD timer in `references/plinko-original-reference.png` (the timer sits between Goal and Streak);
- the checkerboard Blackjack felt in old 3DS screenshots (use the solid green felt from the Blackjack mockup).

Never change odds, payouts or EV (≈0.96) to suit a visual. If the bible leaves a rule open, copy what the web game does and record it in the vault's `Important-Decisions`. The web game behaves like this:

- The run timer **keeps running** in the Shop, in Items and during win popups.
- The timer pauses **only** while the Goal-reached choice, the Emergency coin flip or the Pause menu (plus Settings/How to Play opened from Pause) is open.
- If time hits 0 while Plinko balls are still falling, it waits for them to land.
- The coin-flip rescue does not reset the timer.

## 2. Screens to build (one per mockup, all 25)

Gameplay screens, all sharing the HUD and bottom layout from bible §3:

- Plinko (use the Roulette mockup's HUD with the Plinko board)
- Roulette
- Crash
- Blackjack
- Elephant River
- Horse Race

Run flow:

- Start screen
- Pause
- Goal reached (Cash Out / Keep Going)
- Successful cash-out results
- Run over
- Emergency coin flip
- Local high scores

Shop and Items:

- Shop
- Items / inventory (with the Auto badge)

Settings: Music volume, SFX volume and Reduced Motion.

How to Play:

- the 5 topics (Basics, Games 2/5, Hot Streak, Items, Controls), using the How to Play and How to Play: Games mockups;
- the 6 game guides (guide-plinko is covered by the Games index; build guide-roulette, guide-crash, guide-blackjack, guide-river and guide-horse-race);
- guide-hot-streak, guide-items and guide-controls.

Shared rules from the bible that must hold on every gameplay screen:

- **Top HUD.** Order: CASINO RUN logo │ coin + balance │ GOAL $ │ timer m:ss │ flame + STREAK n +x%.
- **Bottom screen.**
  - 6 game tabs with icons, the current tab gold with a pointer notch.
  - Dice on the left, the context actions in the middle and a 3-slot item column on the right.
  - SHOP and ITEMS buttons below the actions.
  - The BET panel with MIN / +10 / +25 / MAX (MAX gold).
  - A footer with green **A**, red **B** and cyan **X** glyphs plus **L/R GAME**.
- **While a round is resolving,** bet presets (including MAX), tab switching and incompatible actions all share one dimmed disabled style, with labels still legible.
- **Inputs (bible §4).**
  - A = primary action; B = back, or the game's secondary action (Stand, Cash Out).
  - X = Items; L/R = switch game (or change guide topic in help); D-pad = select and adjust bet.
  - START = Pause during a run.
  - **Touch works on every visible bottom-screen control**, with hit boxes exactly matching the drawn buttons.
  - Never put an irreversible choice on B.
- **Saves.** High scores and settings are saved locally to `sdmc:/3ds/casino-run/save.dat`.
  - Version the file.
  - Write to a temp file, then rename it over the real one.
  - If the file is missing or corrupt, fall back to defaults instead of crashing.
  - Show "saved" only after a successful write, and a clear message if the save fails.
  - No network code at all.

## 3. Charm and animation (required)

The game must feel alive, but every animation lives **inside** the approved layouts and uses only existing art. Animation never moves where things sit at rest, and never changes rules, timing of outcomes or odds. Everything below runs at 60 fps, is driven by frame counters (not wall-clock) and is pixel-snapped with nearest filtering.

**Dice (the host)**

- 2-frame idle bob (1 px, ~0.5 s period).
- A blink every 3–5 s.
- Sparkle twinkle around him, as in the mockups.
- Reactions (use any existing Dice frames in `assets/sprites/characters/`):
  - on a win, a hop and cheer;
  - on a big win (≥5× or goal), a bigger hop and sparkle burst;
  - on a loss, a slump for ~1 s;
  - with under 15 s left, he sweats or shakes and the timer pulses coral.
- He looks toward the action button while you hover or select it.

**Buttons and UI**

- Pressed buttons drop 1–2 px with the bevel inverted for 4 frames.
- Selection moves with a quick 4-frame slide or highlight.
- Tab changes slide the notch.
- Gold primary buttons get a slow sparkle glint.
- Disabled buttons fade over 6 frames.

**Numbers**

- The balance rolls up or down to its new value over ~20 frames, with a coin tick sound.
- Payout pop-ups ("+$40 2×") rise and fade over the playfield.
- The streak flame flickers, and grows a size step at 3+ and 5+.

**Transitions**

- Screens wipe or fade over 8–12 frames.
- Overlays (Pause, Goal, Results, Coin flip) dim the playfield and scale or pop their panel in.

**Per game** (all motion follows the outcome `rules.c` already rolled)

- **Plinko.** Balls bounce off pegs with a peg flash, then the slot lights up.
- **Roulette.** The wheel eases out to the rolled pocket and the ball settles into it; the winning label flashes.
- **Crash.** The rocket has exhaust particles and gentle shake as the multiplier climbs, then a debris burst on crash.
- **Blackjack.** Cards slide from the shoe with a flip frame, and the totals tick.
- **River.** The elephant does a hop arc with a splash; hazards drift.
- **Horses.** Gallop frames with dust puffs, a finish-line flash and a photo-finish pause.

**Celebrations**

- Goal reached gets confetti and a fanfare.
- The coin flip gets a spinning coin.
- Run over gets a short, gentle sad sting, never harsh.

**Reduced Motion** cuts shake, particles, flashes and screen wipes (instant swaps instead). It never changes gameplay, odds or timing.

**Audio**

- Port the sound effects in `assets/audio/*.wav` and each game's music (`music_lobby`, `music_plinko`, `music_roulette`, `music_crash`, `music_blackjack`, `music_river`, `music_horse`) using `ndsp`, streamed from romfs.
- Convert to a 3DS-friendly format and rate, keeping within `ASSET_BUDGETS.md`.
- Music crossfades when the game changes.
- Peg sounds vary in pitch, as on the web.
- Music and SFX volume come from Settings and apply immediately.

## 4. Engineering rules

- Keep the C rules port authoritative. `3ds/tests/rules_check.c` must keep passing with 0 failures; run it with TinyCC at `C:\Users\admin\AppData\Local\EZ-CorridorKey\_internal\triton\runtime\tcc\tcc.exe` (or gcc).
  - If you add rules (items, shop prices, goal maths), add them to `rules.c` with golden vectors generated from `rules.js` by `3ds/tests/make_vectors.mjs`, and prove that a deliberate mismatch fails.
- Split `main.c` only when it gets in the way, by scene (`scene_title.c`, `scene_game_*.c`, `ui.c`, `audio.c`, `save.c`). Use one simple scene state machine. Don't build an engine.
- Build with devkitPro (`make` in `3ds/`) through the Bash tool's MSYS2.
  - Build with no warnings.
  - Keep within memory (no leaks across 100 scene changes) and hold a steady 60 fps on Old 3DS. Watch draw-call and texture budgets.
- Never touch privileged keys or credentials. The 3DS build has no network code.
- The web game must stay green: `tests/regression.js` passes 28/28 at `http://localhost:8765/` (serve the repo root).

## 5. Verify like a player, in checkpoints

Work in checkpoints and commit after each one with a clear message:

1. Shell (HUD, tabs, footer, transitions, Dice)
2. Start screen, Pause and Settings
3. The six gameplay screens restyled to the mockups
4. Run flow (goal, cash-out, run over, coin flip, high scores and saves)
5. Shop and Items
6. How to Play (all topics and guides)
7. Audio
8. Charm pass
9. CIA packaging

At each checkpoint:

1. **Build** the `.3dsx` and run it in the Azahar emulator: `C:\Users\admin\Tools\Azahar\azahar-windows-msvc-2126.2\azahar.exe`.
2. **Drive it** with `3ds/tools/azahar-press.ps1` and capture with `3ds/tools/azahar-grab.ps1`. Default keys: A=A, B=S, X=Z, Up=T, Down=G, Left=F, Right=H, START=M, SELECT=N.
   - The press helper refuses to type unless Azahar is the foreground window. **Never drive the emulator while I'm using the PC.** If keys go elsewhere, stop and use another route.
3. **Compare each captured screen side by side** with its mockup. Save comparison images to `docs/gauntlet/3ds/`, and list every difference you find and fix it.
   - "Looks close" is not a pass. Check element order, colours, labels, button states, the HUD timer, and that the goal bar is absent.
4. **Play every game for real:** win, lose, tie or bust, cash out, run out of time, hit the goal, Keep Going, go broke and get the coin flip. Buy and use items, pause mid-round, and spam buttons during resolution.
5. **Log everything.** Write results in `docs/gauntlet/ITERATION_LOG.md` and update the vault's `Current-State`. Never claim something works that you didn't see work. Say plainly what's unverified (for example, real hardware).

## 6. Package as a .cia that appears on the HOME Menu

1. **Get the tools.** Fetch `makerom` (Project_CTR) and `bannertool` from their official GitHub release pages.
   - Verify the SHA-256 against the release, and keep them in `C:\Users\admin\Tools\3ds-cia\` (never inside the repo).
   - I authorise these two downloads.
2. **Make the HOME Menu assets from original art only.**
   - A 48×48 icon: Dice or the Casino Run logo, built from the original sprites.
   - A 256×128 banner: the CASINO RUN logo on the purple cabinet, as on the start-screen mockup.
   - A banner jingle of ≤3 s cut from `goal_fanfare.wav`.
   - Put them in `3ds/meta/`.
3. **Write `3ds/meta/casino-run.rsf`.**
   - Title "Casino Run", publisher "JustGoodinc", product code `CTR-H-CSRN`.
   - A unique homebrew-range **UniqueId** (for example `0xC5A1E`), and make sure it doesn't collide with common homebrew.
   - SD-card access for saves.
4. **Add a `make cia` target** to `3ds/Makefile` that:
   1. builds the ELF;
   2. runs `bannertool makebanner` and `bannertool makesmdh`;
   3. runs `makerom -f cia -target t -exefslogo -elf … -rsf … -icon … -banner … -o casino-run.cia`.

   Keep build outputs git-ignored.
5. **Verify the CIA.**
   - Install it in Azahar (File → Install CIA). Confirm that it appears in the game list with the correct icon and title and that it launches and plays.
   - Confirm that saves persist across relaunches.
   - Record the file size and SHA-256.
6. **Deliver.**
   - Copy the CIA to `C:\Users\admin\rojo\deliverables\casino-run.cia` and send it to me.
   - Write `docs/3ds/INSTALL.md` with plain install steps. A 3DS needs custom firmware (Luma3DS) and a CIA installer such as FBI or Universal-Updater. The steps are: copy the `.cia` to the SD card, open FBI → SD → select the file → Install CIA, and the Casino Run icon appears on the HOME Menu.
   - Don't write custom-firmware setup steps yourself; link 3ds.hacks.guide.

## 7. Definition of done

- All 25 mockup screens exist on the 3DS and match their mockups, with side-by-side comparisons saved. Every interactive control works with both buttons and touch.
- A full run works end to end: start, play all 6 games, shop and items, pause, goal and Keep Going, cash-out and saved score, timeout and run over, broke and coin flip, high scores, settings and help.
- Odds and payouts are unchanged:
  - `rules_check` reports 0 failures;
  - the web regression passes 28/28;
  - the web game at casinorun.fun still works.
- Animations and Dice reactions are in place, and Reduced Motion is respected.
- Music and SFX play, and the volume settings work.
- Steady 60 fps in Azahar, and no crashes in a 30-minute soak (spam inputs, every scene).
- `casino-run.cia` installs in Azahar, shows its icon and banner title, launches and saves.
- The CIA is delivered with `INSTALL.md`.
- The vault notes (Current-State, Important-Decisions, Lessons-Learned) are updated and the catalog rebuilt with `py "\\192.168.1.141\ServerSSD\obsidian\Knowledge\Roblox-AI-Memory\00_START_HERE\tools\build_catalog.py"`.
- The final report lists what was verified in Azahar and what still needs checking on real hardware.
