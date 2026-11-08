# Control Maps

Global: **D-pad** moves focus and steps the bet (left/right ±$1; hold accelerates) · **A** confirm or main action · **B** cancel / second action · **L / R** previous / next item page · **SELECT** next game tab · **START** pause and settings · **Touch** acts directly on anything on the bottom screen.

| Game | A | B | X | Y | D-pad | Touch |
|---|---|---|---|---|---|---|
| Plinko | Drop ball | — | Use Weighted Ball | — | Bet | Drop button, item grid |
| Roulette | Spin | — | Red / Black / Green cycle | Use Magnet | Bet | Colour buttons |
| Crash | Start | **Cash out** (same press as A while rising, so panic-mashing works) | — | — | Bet | Big cash-out button |
| Blackjack | Deal / Hit | Stand | Use Peek Card | — | Bet | Hit / Stand buttons |
| Elephant River | Start / Step | Cash out | Use Floaties | — | Bet | Step / Cash buttons |
| Horse Race | Race | — | — | Use Horseshoe | Up/down pick horse, left/right bet | Horse buttons |
| Goal popup | Keep going | Cash out | — | — | — | Buttons |
| Shop | Buy focused | Back | — | — | Move focus | Cards |

Web parity: every one of these actions is already a real `<button>`, so keyboard and gamepad focus navigation works on the web today (`:focus-visible` style in `theme-cabinet.css`). A Gamepad API adapter that maps to the same actions is not implemented yet.
