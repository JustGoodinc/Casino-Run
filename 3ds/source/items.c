// Item catalogue, shop rotation and pricing: script.js shopItemData / generateShopRotation / getRoundPrice.
#include <math.h>
#include "app.h"

const item_def ITEMS[IT_COUNT] = {
  [IT_DOUBLE_COIN] = { "DOUBLE-HEADED COIN", "TRIGGER", "GUARANTEES A WIN ON YOUR NEXT EMERGENCY COIN FLIP.", "", "TRIGGERS BY ITSELF WHEN YOU FLIP", 75, sprites_doubleHeadedCoin_idx, 0, 1 },
  [IT_HULA] = { "LUCKY HULA GIRL", "PASSIVE", "ADDS +10% EXTRA PROFIT TO EVERY WINNING BET. STACKS.", "+10% PROFIT EACH", "ALWAYS ACTIVE WHILE OWNED", 100, sprites_luckyHulaGirl_idx, 0, 1 },
  [IT_BOTTLE] = { "TIME IN A BOTTLE", "CONSUMABLE", "ADDS 30 SECONDS TO THE RUN TIMER.", "+30 SECONDS", "USING THIS CONSUMES 1 BOTTLE", 45, sprites_timeBottle_idx, 1, 0 },
  [IT_MAGNET] = { "ROULETTE MAGNET", "CONSUMABLE", "IMPROVES YOUR NEXT RED OR BLACK SPIN. NO EFFECT ON GREEN.", "", "USE BEFORE A ROULETTE SPIN", 60, sprites_rouletteMagnet_idx, 1, 0 },
  [IT_FLOATIES] = { "POOL FLOATIES", "CONSUMABLE", "LOWERS THE DANGER ON YOUR NEXT RIVER CROSSING. STACKS.", "", "USE BEFORE OR DURING A CROSSING", 55, sprites_frogSneakers_idx, 1, 0 },
  [IT_INSURANCE] = { "INSURANCE TICKET", "TRIGGER", "REFUNDS 50% OF A FULLY LOST BET. UP TO 2 TRIGGER AT ONCE.", "", "TRIGGERS BY ITSELF ON A LOSS", 70, sprites_insuranceTicket_idx, 0, 1 },
  [IT_FILTH_TEA] = { "FILTH-TEA", "CONSUMABLE", "REFUNDS A RANDOM ITEM YOU USED THIS RUN. IT WILL NOT REFUND ITSELF.", "", "USING THIS CONSUMES 1 TEA", 85, sprites_filthTea_idx, 1, 0 },
  [IT_MATCH] = { "LUCKY MATCH", "TRIGGER", "PROTECTS YOUR HOT STREAK FROM BREAKING ONE TIME AFTER A LOSS.", "", "TRIGGERS BY ITSELF ON A LOSS", 90, sprites_luckyMatch_idx, 0, 1 },
  [IT_SHIELD] = { "HEAT SHIELD", "TRIGGER", "ON A LOSS, LOWERS YOUR STREAK BY 1 INSTEAD OF RESETTING IT.", "", "TRIGGERS BY ITSELF ON A LOSS", 95, sprites_heatShield_idx, 0, 1 },
  [IT_GREASE] = { "GREASE FIRE", "CONSUMABLE", "TRIPLES YOUR NEXT HOT STREAK BONUS. LOSE FIRST AND IT BURNS 25% OF YOUR BALANCE.", "", "RISKY: USE WITH CARE", 105, sprites_greaseFire_idx, 1, 0 },
  [IT_CUTTER] = { "GOAL CUTTER", "CONSUMABLE", "LOWERS YOUR CURRENT MONEY GOAL BY 10%.", "-10% GOAL", "USING THIS CONSUMES 1 CUTTER", 90, sprites_goalCutter_idx, 1, 0 },
  [IT_PEEK] = { "DEALERS PEEK CARD", "CONSUMABLE", "REVEALS THE DEALERS HIDDEN CARD IN BLACKJACK.", "", "USE DURING A BLACKJACK HAND", 40, sprites_dealerPeek_idx, 1, 0 },
  [IT_HORSESHOE] = { "GOLDEN HORSESHOE", "CONSUMABLE", "USE BEFORE A HORSE RACE. EACH ONE ADDS +0.5X PAYOUT.", "+0.5X PAYOUT", "LASTS FOR ONE RACE", 50, sprites_goldenHorseshoe_idx, 1, 0 },
  [IT_WEIGHTED] = { "WEIGHTED BALL", "CONSUMABLE", "USE BEFORE PLINKO TO IMPROVE YOUR NEXT BALL. STACKS.", "", "USING THIS CONSUMES 1 BALL", 55, sprites_weightedBall_idx, 1, 0 },
  [IT_CASHBACK] = { "CASHBACK COUPON", "TIMED", "5% CASHBACK ON FULLY LOST BETS FOR 60 SECONDS. MORE COUPONS ADD TIME.", "+60 SECONDS", "THE CLOCK RUNS IN REAL TIME", 80, sprites_cashbackCoupon_idx, 1, 0 },
  [IT_JESTER] = { "THOTTIES JESTER HAT", "TIMED", "BLOCKS THE DEALER FROM GETTING 21 FOR 60 SECONDS. MORE HATS ADD TIME.", "+60 SECONDS", "THE CLOCK RUNS IN REAL TIME", 95, sprites_thottiesJesterHat_idx, 1, 0 },
  [IT_ROSEKAT] = { "ROSEKATS MAGNUM OPUS", "CONSUMABLE", "YOUR NEXT 2 WINNING PLINKO DROPS ADD 4X THE PROFIT AS BONUS MONEY.", "+2 BOOSTED DROPS", "USING THIS CONSUMES 1 OPUS", 110, sprites_roseKatMagnumOpus_idx, 1, 0 },
  [IT_VINYL] = { "EJMS RECORD VINYL", "CONSUMABLE", "ONE FREE ROULETTE SPIN AT MAX BET. MORE VINYLS ADD MORE SPINS.", "+1 FREE SPIN", "USING THIS CONSUMES 1 VINYL", 125, sprites_ejmRecordVinyl_idx, 1, 0 },
};

// Prices climb 18% per round, rounded up to $5 (getRoundPrice).
int itemPrice(int it) { return (int)(ceil(ITEMS[it].price * (1 + (A.round - 1) * 0.18) / 5) * 5); }

static void shuffle(int *a, int n) {
  for (int i = n - 1; i > 0; i--) { int j = cr_rand_int(&RNG, i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
}

// One guaranteed easter-egg item plus three normal items, in shuffled order.
void shopRoll(void) {
  static const int EGG[3] = { IT_JESTER, IT_ROSEKAT, IT_VINYL };
  int normal[IT_COUNT], n = 0;
  for (int i = 0; i < IT_COUNT; i++) if (i != IT_JESTER && i != IT_ROSEKAT && i != IT_VINYL) normal[n++] = i;
  shuffle(normal, n);
  A.shop[0] = EGG[cr_rand_int(&RNG, 3)];
  for (int i = 0; i < 3; i++) A.shop[i + 1] = normal[i];
  shuffle(A.shop, 4);
  for (int i = 0; i < 4; i++) A.shopSold[i] = 0;
}

int ownedKinds(int *out, int max) {
  int n = 0;
  for (int i = 0; i < IT_COUNT && n < max; i++) if (A.inv[i] > 0) out[n++] = i;
  return n;
}

const char *itemCanUseNow(int it) {
  if (A.inv[it] <= 0) return "NONE LEFT";
  if (!ITEMS[it].usable) return it == IT_HULA ? "ALWAYS ACTIVE" : "AUTO: TRIGGERS BY ITSELF";
  if (it == IT_PEEK && !(A.scene == SC_GAME && A.game == G_BLACKJACK && G.phase == 1 && !G.peeked)) return "USE DURING A BLACKJACK HAND";
  if (it == IT_FILTH_TEA) {
    for (int i = 0; i < A.consumedN; i++) if (A.consumed[i] != IT_FILTH_TEA) return NULL;
    return "NOTHING TO REFUND YET";
  }
  return NULL;
}
