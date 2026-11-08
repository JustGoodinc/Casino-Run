// Host check: the C rules must reproduce the web rules.js outcomes seed for seed.
//   gcc -std=c99 -O2 -I3ds/source 3ds/source/rules.c 3ds/tests/rules_check.c -lm -o rules_check && ./rules_check
// (TinyCC works too: tcc -I3ds/source 3ds/source/rules.c 3ds/tests/rules_check.c -o rules_check.exe)
// Regenerate the vectors whenever rules.js changes: node 3ds/tests/make_vectors.mjs > 3ds/tests/rules_vectors.h
#include <stdio.h>
#include "rules.h"
#include "rules_vectors.h"

static int fails = 0;
#define CHECK(cond, ...) do { if (!(cond)) { fails++; printf("FAIL seed %u: ", v->seed); printf(__VA_ARGS__); printf("\n"); } } while (0)

int main(void) {
  for (unsigned k = 0; k < sizeof CR_VECTORS / sizeof CR_VECTORS[0]; k++) {
    const cr_vector *v = &CR_VECTORS[k];
    cr_rng r;
    int deck[52];
    cr_seed(&r, v->seed);
    for (int i = 0; i < 8; i++) { int got = cr_roll_plinko_slot(&r); CHECK(got == v->plinko[i], "plinko[%d] %d != %d", i, got, v->plinko[i]); }
    for (int i = 0; i < 4; i++) { double got = cr_crash_point(&r); CHECK(got == v->crash[i], "crash[%d] %.17g != %.17g", i, got, v->crash[i]); }
    for (int i = 0; i < 6; i++) { int got = cr_roll_roulette(&r, -1); CHECK(got == v->roulette[i], "roulette[%d] %d != %d", i, got, v->roulette[i]); }
    for (int i = 0; i < 6; i++) { int got = cr_roll_roulette(&r, CR_RED); CHECK(got == v->magnet[i], "magnet[%d] %d != %d", i, got, v->magnet[i]); }
    cr_shuffled_deck(&r, deck);
    for (int i = 0; i < 52; i++) CHECK(deck[i] == v->deck[i], "deck[%d] %d != %d", i, deck[i], v->deck[i]);
    { double got = cr_rand(&r); CHECK(got == v->raw, "raw %.17g != %.17g", got, v->raw); }
  }
  {
    const cr_vector *v = &CR_VECTORS[0];
    for (int lane = 0; lane <= 5; lane++) CHECK(cr_frog_multiplier(lane) == CR_FROG_MULT[lane], "frog lane %d", lane);
  }
  {
    const cr_vector *v = &CR_VECTORS[0];
    CHECK(cr_run_state(0, 500, 300) == CR_TIMEOUT && cr_run_state(5, 300, 300) == CR_GOAL
      && cr_run_state(5, 0.5, 300) == CR_BROKE && cr_run_state(5, 1, 300) == CR_PLAY, "run state");
    CHECK(cr_roulette_payout(CR_RED, 1) == 2 && cr_roulette_payout(CR_BLACK, 2) == 2 && cr_roulette_payout(CR_GREEN, 0) == 14
      && cr_roulette_payout(CR_RED, 2) == 0 && cr_roulette_payout(CR_BLACK, 0) == 0, "roulette payout");
    CHECK(cr_horse_payout(0) == 4 && cr_horse_payout(2) == 5, "horse payout");
    CHECK(cr_blackjack_payout(21, 20, 1) == 2.5 && cr_blackjack_payout(22, 25, 0) == 0 && cr_blackjack_payout(18, 22, 0) == 2
      && cr_blackjack_payout(19, 18, 0) == 2 && cr_blackjack_payout(18, 18, 0) == 1 && cr_blackjack_payout(17, 20, 0) == 0
      && cr_dealer_hits(16) && !cr_dealer_hits(17), "blackjack payout");
  }
  printf(fails ? "%d FAILED\n" : "rules.c matches rules.js (%d failures)\n", fails);
  return fails != 0;
}
