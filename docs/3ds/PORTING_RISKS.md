# Porting Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Game rules tangled with DOM code | Port re-implements behaviour by guesswork, so odds drift | High today | Stage 1 rules extraction plus shared-seed parity tests |
| Plinko physics is frame-rate dependent (per-frame steps) | Different landing visuals at 30 fps | Medium | Payout no longer depends on physics (slot is rolled first, then steered), so only visuals can differ. Run 2 physics steps per 30 Hz frame |
| Crash timing uses wall-clock `performance.now` | Hitches change the multiplier at cash-out | Medium | Use a tick counter; settle on the tick the button is read |
| Old 3DS CPU budget for particles + 44-peg collision | Frame drops | Low–Medium | Particle cap 60 on "low" quality; collision only checks pegs in the ball's row band |
| Text legibility at 7px caps on the bottom screen | Readability | Low | Every label in the Studio mockups is already 1× font; longer item descriptions go in a scrolling detail panel |
| Audio voice count | Clipped sounds | Low | 8-voice pool, oldest voice is stolen first (same policy as web) |
| Leaderboard expectations | Feature gap | Certain | Local scores only; state it in-game |
| Hardware numbers marked [verify] | Wrong budget | Medium | Profile on real hardware before locking budgets |
