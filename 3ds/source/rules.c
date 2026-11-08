// C port of rules.js. Keep the two files in step: every function here mirrors one in CR.rules.
#include <math.h>
#include "rules.h"

void cr_seed(cr_rng *r, uint32_t seed) { r->a = seed; }

// mulberry32, bit-identical to the JS (Math.imul == low 32 bits of the uint32 product).
double cr_rand(cr_rng *r) {
  uint32_t t;
  r->a += 0x6d2b79f5u;
  t = (r->a ^ (r->a >> 15)) * (1u | r->a);
  t = (t + (t ^ (t >> 7)) * (61u | t)) ^ t;
  return (double)(t ^ (t >> 14)) / 4294967296.0;
}

int cr_rand_int(cr_rng *r, int n) { return (int)floor(cr_rand(r) * n); }

// ---------- Plinko ----------
const double cr_plinko_mult[5] = { 0, 0.5, 1, 2, 5 };
const double cr_plinko_odds[5] = { 0.38, 0.23, 0.18, 0.13, 0.08 };

int cr_roll_plinko_slot(cr_rng *r) {
  double roll = cr_rand(r);
  for (int i = 0; i < 5; i++) {
    roll -= cr_plinko_odds[i];
    if (roll < 0) return i;
  }
  return 0;
}

// ---------- Roulette ----------
const int cr_wheel_order[37] = { 0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26 };

int cr_roulette_color(int n) {
  static const unsigned char red[37] = { 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1,
    1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1 };
  return n == 0 ? CR_GREEN : red[n] ? CR_RED : CR_BLACK;
}

int cr_random_roulette_number_for_color(cr_rng *r, int color) {
  int options[37], count = 0;
  for (int i = 0; i <= 36; i++) if (cr_roulette_color(i) == color) options[count++] = i;
  return options[cr_rand_int(r, count)];
}

// Magnet pulls 55% of spins to the bet colour (never green). The JS short-circuits the same way.
int cr_roll_roulette(cr_rng *r, int magnet_color) {
  if (magnet_color >= 0 && cr_rand(r) < 0.55) return cr_random_roulette_number_for_color(r, magnet_color);
  return cr_rand_int(r, 37);
}

// ---------- Crash: P(point > m) = 0.96 / m, capped at 100x ----------
double cr_crash_multiplier_at(double seconds) { return 1 + seconds * seconds * 0.55; }

double cr_crash_point(cr_rng *r) {
  return fmin(100, fmax(1, 0.96 / (1 - cr_rand(r))));
}

// ---------- Elephant River: multiplier = 0.96 / survival ----------
double cr_frog_base_crash_chance(int lane) { return fmin(0.12 + lane * 0.08, 0.55); }

double cr_frog_multiplier(int lane) {
  double survival = 1;
  for (int i = 1; i <= lane; i++) survival *= 1 - cr_frog_base_crash_chance(i);
  return 0.96 / survival;
}

// ---------- Blackjack ----------
void cr_shuffled_deck(cr_rng *r, int deck[52]) {
  for (int i = 0; i < 52; i++) deck[i] = i;
  for (int i = 51; i > 0; i--) {
    int j = cr_rand_int(r, i + 1), t = deck[i];
    deck[i] = deck[j];
    deck[j] = t;
  }
}

int cr_card_value(int card) {
  int rank = card % 13; // 0 = A, 1..9 = 2..10, 10..12 = J Q K
  return rank == 0 ? 11 : rank >= 10 ? 10 : rank + 1;
}

int cr_hand_value(const int *hand, int count) {
  int total = 0, aces = 0;
  for (int i = 0; i < count; i++) {
    total += cr_card_value(hand[i]);
    if (hand[i] % 13 == 0) aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

int cr_is_blackjack(const int *hand, int count) { return count == 2 && cr_hand_value(hand, count) == 21; }

// ---------- Settlement ----------
double cr_next_goal(double balance) { return fmax(50, ceil(balance * 3)); }
double cr_goal_cutter_goal(double goal) { return fmax(50, ceil(goal * 0.9)); }
double cr_coin_flip_rescue(double goal) { return goal * 0.2; }

double cr_streak_bonus_rate(int streak) {
  return streak >= 5 ? 0.5 : streak == 4 ? 0.35 : streak == 3 ? 0.2 : streak == 2 ? 0.1 : 0;
}

double cr_hula_girl_bonus(double base_profit, int count) { return base_profit > 0 ? base_profit * 0.1 * count : 0; }

double cr_streak_bonus(double base_profit, int streak, int grease_fire, int *grease_used) {
  double bonus = fmax(0, base_profit) * cr_streak_bonus_rate(streak);
  *grease_used = grease_fire && bonus > 0;
  return *grease_used ? bonus * 3 : bonus;
}

double cr_grease_fire_burn(double balance) { return balance * 0.25; }

cr_refund cr_loss_refund(double bet, int insurance_count, int cashback_active) {
  cr_refund out;
  out.tickets = insurance_count < 2 ? insurance_count : 2;
  out.insurance = bet * 0.5 * out.tickets;
  out.cashback = cashback_active ? bet * 0.05 : 0;
  out.total = out.insurance + out.cashback;
  return out;
}

int cr_run_state(int time_left, double balance, double goal) {
  return time_left <= 0 ? CR_TIMEOUT : balance >= goal ? CR_GOAL : balance < 1 ? CR_BROKE : CR_PLAY;
}
