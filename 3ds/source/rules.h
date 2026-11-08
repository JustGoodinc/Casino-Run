// Casino Run rules: C port of rules.js (3DS port stage 2, docs/3ds/PORTING_PLAN.md).
// Same seed -> same outcomes as CR.rules.seed(n) in the web build (checked by 3ds/tests/rules_check.c).
#ifndef CR_RULES_H
#define CR_RULES_H
#include <stdint.h>

typedef struct { uint32_t a; } cr_rng;
void   cr_seed(cr_rng *r, uint32_t seed);
double cr_rand(cr_rng *r);          // [0, 1), mulberry32
int    cr_rand_int(cr_rng *r, int n);

enum { CR_GREEN, CR_RED, CR_BLACK };
enum { CR_START_BALANCE = 100, CR_START_GOAL = 300, CR_START_TIME = 120 };

// Plinko
extern const double cr_plinko_mult[5];
extern const double cr_plinko_odds[5];
int    cr_roll_plinko_slot(cr_rng *r);
// Roulette (European, single zero). magnet_color = CR_RED/CR_BLACK, or -1 for none.
extern const int cr_wheel_order[37];
int    cr_roulette_color(int n);
int    cr_random_roulette_number_for_color(cr_rng *r, int color);
int    cr_roll_roulette(cr_rng *r, int magnet_color);
// Crash
double cr_crash_point(cr_rng *r);
// Elephant River
double cr_frog_base_crash_chance(int lane);
double cr_frog_multiplier(int lane);
// Blackjack: a card is suit * 13 + rank index (ranks A,2..10,J,Q,K), deck built suit-major like the JS.
void   cr_shuffled_deck(cr_rng *r, int deck[52]);
int    cr_card_value(int card);
int    cr_hand_value(const int *hand, int count);
int    cr_is_blackjack(const int *hand, int count);
// Settlement
double cr_next_goal(double balance);
double cr_goal_cutter_goal(double goal);
double cr_coin_flip_rescue(double goal);
double cr_streak_bonus_rate(int streak);
double cr_hula_girl_bonus(double base_profit, int count);
double cr_streak_bonus(double base_profit, int streak, int grease_fire, int *grease_used);
double cr_grease_fire_burn(double balance);
typedef struct { int tickets; double insurance, cashback, total; } cr_refund;
cr_refund cr_loss_refund(double bet, int insurance_count, int cashback_active);

// Run state after a settled round: time up beats goal hit beats broke.
enum { CR_PLAY, CR_TIMEOUT, CR_GOAL, CR_BROKE, CR_TIME_BOTTLE_SECONDS = 30 };
int cr_run_state(int time_left, double balance, double goal);

#endif
