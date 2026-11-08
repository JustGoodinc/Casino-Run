# Installing Casino Run on a Nintendo 3DS

`casino-run.cia` installs like any homebrew title and appears on the HOME Menu with its own icon (Dice) and banner (the Casino Run logo with a short fanfare).

## What you need

- A 3DS / 2DS / New 3DS with custom firmware (Luma3DS). Setting that up is outside this guide: follow https://3ds.hacks.guide.
- A CIA installer on the console, for example **FBI** or **Universal-Updater**.
- For sound: the console's DSP firmware dump at `sd:/3ds/dspfirm.cdc` (most CFW setups already have it; without it the game runs silent).

## Install

1. Turn the 3DS off and put its SD card in your PC.
2. Copy `casino-run.cia` anywhere on the SD card, e.g. `sd:/cias/`.
3. Put the card back, power on, open **FBI**.
4. **SD** → the folder you used → `casino-run.cia` → **Install CIA** → confirm.
5. Press HOME. Casino Run is on the HOME Menu.

To uninstall: FBI → Titles → Casino Run → Delete Title.

## Saves

High scores and settings live in `sd:/3ds/casino-run/save.dat`. They are written to a temporary file first and then swapped in, so a crash or power loss can't half-write them. Delete that folder to reset.

## Controls

A primary action · B back / secondary action · X items · Y shop · L/R switch game · D-pad select and adjust bet · START pause · touch any bottom-screen button.

## Building it yourself

```
cd 3ds
make          # casino-run.3dsx (Homebrew Launcher)
make cia      # casino-run.cia
```

`make cia` needs `makerom` (3DSGuy/Project_CTR v0.19.0) and `bannertool` (carstene1ns/3ds-bannertool 1.2.3, the maintained fork; the original repository no longer exists). Their default paths are at the top of the `cia` target in `3ds/Makefile`; override them with `make cia MAKEROM=... BANNERTOOL=...`. The HOME Menu art is regenerated from the original sprites with `powershell -File 3ds/tools/make-meta.ps1`.
