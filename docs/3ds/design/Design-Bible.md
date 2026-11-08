# Casino Run — Nintendo 3DS Design Bible

Consolidated edition · 8 November 2026

This edition consolidates the approved direction and mockups from the design conversation. The earlier design-bible document was not retrievable; this is a newly compiled reference, not a recovered copy of that document.

## 1. Design foundation

Casino Run is a single-player arcade casino with fictional money, short timed runs, six minigames, a shared balance, and items that modify play. The presentation combines chunky original pixel art with purple cabinet framing and gold primary actions. Dice, the original host character, reacts to play.

The approved Plinko composition established the visual system. Roulette and the later screens extend that system: preserve the screen hierarchy, framing, spacing, typography, mascot, navigation, and button treatment when changing game content.

### Fixed design decisions

- Top screen: gameplay, selected-item information, instructions, or results.
- Bottom screen: choices, navigation, and actions.
- During an active run, keep the timer inside the main HUD, between the goal and Hot Streak.
- Do not display the yellow goal progress bar or its empty track.
- Reuse the project's original screenshots and sprite assets. Production graphics must come from the original asset pack.
- Preserve the purple-and-gold interface, cream text, original Dice character, and consistent game icons.
- Scores are local to the 3DS; do not introduce online leaderboard dependencies.

## 2. Visual language

Use dark purple backgrounds, subtle diamond patterns, outlined panels, restrained highlights, and bevelled buttons. Gold indicates a primary action or selected choice; inactive choices use purple. Dim unavailable controls while keeping labels legible. Cyan communicates helpful information and enabled options; coral signals failure or danger.

Core source palette:

| Role | Hex |
| --- | --- |
| Ink | #0E0C17 |
| Cabinet | #191727 |
| Panel | #29263A |
| Panel highlight | #3B3752 |
| Purple | #6944B8 |
| Light purple | #9B7BF0 |
| Gold | #F4C34E |
| Dark gold | #B8862B |
| Cream | #FFF0CE |
| Cyan | #37D9E8 |
| Coral | #F45B58 |
| Green | #7EDD65 |
| Orange | #FF9E45 |

Use the original pixel font and uppercase labels. Preserve hard sprite edges, binary transparency, and nearest-neighbour integer scaling in the game. Use the original game-icon set: Plinko pegs, Roulette wheel, Crash rocket, Blackjack cards, pink River elephant, and brown horse head.

The rendered handheld shell and lighting are presentation framing, not assets to draw inside the game screens. Implement at the native 400×240 top-screen and 320×240 bottom-screen sizes and check readability there. The mockups establish composition; they are not pixel-perfect implementation maps.

## 3. Shared gameplay layout

The top HUD reads in order: Casino Run branding, balance, goal, timer, Hot Streak. Leave the playfield beneath it uncluttered. Results and interruptions may overlay a dimmed playfield while keeping the HUD visible.

The bottom gameplay screen has six game tabs across its upper edge. Highlight the current game. Dice sits at the left of the central action area, with context actions centrally placed and a compact item column at the right. Shop and Items sit beneath the main actions. The bet row contains the current bet and MIN, +10, +25, MAX controls. The footer displays the current physical-button functions.

Disable bet changes, game switching, and other incompatible actions while a round is resolving. All bet presets, including MAX, should share the same disabled treatment. Menu layouts may replace gameplay controls entirely: a pause screen should not retain an active bet bar.

## 4. Input conventions

| Input | Meaning |
| --- | --- |
| A | Primary action or confirm |
| B | Back or game-specific secondary action |
| X | Open Items; close it in the inventory view |
| L / R | Switch games when allowed; change guide topics in help |
| D-pad | Select options; adjust bets where appropriate |
| START | Pause during a run |
| Touch | Activate the visible bottom-screen controls |

Use green A, red B, and cyan X glyphs consistently. Show context-specific hints rather than expecting one action mapping to explain every game. Confirming menu selections uses A; avoid assigning an irreversible choice directly to B.

## 5. Run structure and results

Start with $100, a $300 goal, and 120 seconds. Reach the goal before time runs out. At a goal, offer Cash Out or Keep Going. Cash Out ends the run and saves its score. Keep Going sets the next goal to max(50, ceil(current balance × 3)) and resets the timer to 120 seconds. For example, $320 leads to a $960 next goal.

The approved Pause screen offers Resume, Settings, and How to Play. The timer stops while paused, including when reading settings/help opened from Pause.

| Screen | Top screen | Bottom screen |
| --- | --- | --- |
| Start | Original logo and tagline | Play, How to Play, Settings; starting rules |
| Pause | Dimmed gameplay, visible HUD, Paused panel | Resume, Settings, How to Play |
| Goal reached | Celebration and current balance | Cash Out amount or Keep Going, next goal and new timer |
| Successful cash-out | Final amount, goals cleared, best streak, local save confirmation | Play Again, High Scores, Main Menu |
| Run over | Failure reason, balance at timeout, goals cleared, best streak | Try Again, Main Menu |
| Emergency coin flip | Last Chance message and original coin art | Win/lose consequences and one Flip Coin action |
| Local scores | Selected run's amount and statistics | Ranked list and Back |

Timeout ends the run. A balance below $1 triggers the emergency coin flip: a win restores 20% of the current goal; a loss ends the run. At a $300 goal the rescue is $60. Do not imply a timer reset for this rescue without a separate rule decision.

Clearly distinguish an uncashed balance at timeout from a successful saved cash-out. Local-score values in the mockups are illustrative sample data. Show save confirmation only after a successful save in the actual game.

## 6. Minigames

| Game | Source artwork and top-screen content | Bottom actions and rule reminders |
| --- | --- | --- |
| Plinko | Riveted metal board, original pegs/ball, five coloured slots | Choose bet; A Drop. Slots return 0×, 0.5×, 1×, 2×, 5× |
| Roulette | Red diamond-pattern background and original single-zero wheel | Red 2×, Black 2×, Green 14×; Spin |
| Crash | Original starfield, rocket and rising multiplier | Launch; A or B Cash Out before crash; display current cash-out value |
| Blackjack | Correct green felt and original card sprites; dealer/player hands and totals | A Deal/Hit, B Stand. Win 2×, natural 2.5×, tie 1× |
| Elephant River | Original water, pink elephant, hazards and banks | A Start/Step Forward, B Cash Out; show lane and return |
| Horse Race | Four turf lanes, original horses/riders, finish line | Choose Dingo, Vas, HisterBlue, or The Horse; A Race; base return 4× |

Returns include the stake. Preserve game rules from the source handover. Do not silently add manual dodging to River, aiming to Plinko, cash-out to Horse Race, or split/double actions to Blackjack. The old 3DS Blackjack screenshots contain a known felt-background defect; use the corrected green felt direction shown in the approved mockup.

Hot Streak bonuses apply to profit: streak 1 = 0%, 2 = 10%, 3 = 20%, 4 = 35%, 5+ = 50%. Losses normally reset the streak; items may modify this. The source handover contains the detailed odds and item rules.

## 7. Shop and inventory

The Shop shows selected-item artwork, price, and effect on top, with four stock choices below. Make affordability visible and preview the remaining balance beside Buy. Keep Shop and Items distinct. The example stock is Lucky Match $90, Dealer's Peek Card $40, Thottie's Jester Hat $95, and Heat Shield $95.

Inventory uses the same detail/selection split but shows owned quantities instead of prices. Time in a Bottle adds 30 seconds and consumes one bottle. Automatically triggered items such as Lucky Match receive an Auto badge. Context determines whether a selected item can be used; do not present every item as a manually activated consumable.

## 8. Settings and help

Settings exposes Music volume, Sound Effects volume, and Reduced Motion. The top screen explains the selected setting; the bottom provides controls and Back. Reduced Motion limits shake, particles, and flashes without changing gameplay or odds. Apply changes immediately in this design.

How to Play has five topics: Basics, Games, Hot Streak, Items, Controls. Show concise instruction on top and topic navigation below. The Games topic offers all six games, each with an original gameplay preview and short control/rule summary. Keep instructional previews visually distinct from live playable actions. All six game lessons share the same Games topic index, 2 / 5.

## 9. Package contents and review status

Open mockups/index.html to browse all 25 mockups. The collection includes gameplay, menus, results, inventory, settings, local scores, and the complete guide set. Earlier screens were approved individually or followed by a request to continue. The final eight guide mockups were completed under the user's instruction to finish the rest without individual approval stops.

The original Plinko reference is preserved separately in references/plinko-original-reference.png. That recovered image predates the requested HUD corrections: it still shows the yellow goal bar and lacks the final main-HUD timer. Do not copy those superseded details. The final corrected Plinko image from the earlier chat was not available; the approved Roulette and later screens show the accepted HUD treatment.

These images were produced with the original screenshots and sprites supplied to the image editor. Generated pixels may reinterpret small details, card pips, glyphs, or spacing. For production, use the original source sprites and game data rather than extracting replacement assets from these presentation images.

## 10. Implementation checks and remaining decisions

- Check text, touch targets, and sprite scale at native resolution on both screens.
- Preserve the main-HUD timer and absence of the goal progress bar across all active-run screens.
- Validate selected-tab highlighting, button colours, and disabled controls against actual state.
- Display dynamic totals from game data; keep rounded display values separate from payout calculations.
- Keep high scores local. A direct start-menu link to High Scores has not been added to the approved start-screen image; the successful cash-out screen provides access.
- Goal-choice timing, inventory/shop timing, and coin-flip timing need explicit implementation rules; do not infer them solely from a static timer in a mockup.
- Handle save failures and unavailable-item explanations in implementation; separate error-state mockups are not included.
- Do not infer additional rule or economy changes from a visual treatment. Preserve unresolved source balancing questions until decided.

For the original gameplay specification, see references/original-game-handover.md. Its older UI/input proposals are historical context; the approved design decisions in this bible take precedence for presentation and navigation.
