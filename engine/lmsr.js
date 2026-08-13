/**
 * lmsr.js
 * -----------------------------------------------------------------------
 * A standalone, dependency-free implementation of the Logarithmic Market
 * Scoring Rule (LMSR) automated market maker for a binary (Yes/No) market.
 *
 * Nothing in this file knows about HTTP, a database, or React. It is pure
 * math, on purpose — this is the part of the project that should work
 * correctly and be testable completely on its own, before any of the
 * "plumbing" (API, DB, UI) gets built around it.
 *
 * ----------------------------------------------------------------------
 * THE MENTAL MODEL (see conversation for the full walkthrough):
 *
 *   - qYes / qNo: running totals of how many Yes / No shares have ever
 *     been issued by the market maker. Just counters, nothing fancier.
 *
 *   - b: the "liquidity parameter" — a fixed knob chosen when the market
 *     is created. Small b = thin market, big price swings on small
 *     trades. Large b = deep market, needs bigger trades to move price.
 *
 *   - cost(qYes, qNo, b): the total amount of money that has flowed into
 *     the market so far, as a function of the current share counts. The
 *     price of the *next* increment of a Yes share is the slope of this
 *     function with respect to qYes — practically, buying = moving from
 *     one point on this curve to another, and paying the difference.
 *
 *   - price(qYes, qNo, b): the current implied probability of Yes (and,
 *     symmetrically, of No). Always sums to 1. This is a softmax over
 *     (qYes/b, qNo/b) — same shape as softmax in ML.
 * ----------------------------------------------------------------------
 */

/**
 * Numerically-stable log(e^a + e^b).
 *
 * Why this exists: for large qYes/b or qNo/b, e^x can overflow to
 * Infinity in floating point, even though the *true* mathematical
 * result of log(e^a + e^b) is a perfectly reasonable number. The
 * standard trick is to factor out the larger of the two exponents
 * before exponentiating, which keeps every intermediate value small.
 *
 *   log(e^a + e^b) = m + log(e^(a-m) + e^(b-m)),  where m = max(a, b)
 *
 * This is the same trick used under the hood by softmax/log-sum-exp
 * implementations in ML libraries.
 */
function logSumExp(a, b) {
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
}

/**
 * The LMSR cost function.
 *
 * cost(qYes, qNo) = b * log( e^(qYes/b) + e^(qNo/b) )
 *
 * Represents total money collected by the market maker so far, given
 * the current outstanding share counts. Trades are priced by taking
 * the *difference* in this function between two states (see costOfTrade
 * below) — the function itself is rarely useful in isolation, but it's
 * the foundation everything else is built on.
 */
export function costFunction(qYes, qNo, b) {
  if (b <= 0) throw new Error('Liquidity parameter b must be positive');
  return b * logSumExp(qYes / b, qNo / b);
}

/**
 * Current market prices (implied probabilities) for Yes and No.
 * These always sum to 1 by construction — it's a softmax over the two
 * outcomes' share counts.
 */
export function getPrices(qYes, qNo, b) {
  if (b <= 0) throw new Error('Liquidity parameter b must be positive');
  // Stable softmax: subtract the max exponent before exponentiating.
  const m = Math.max(qYes / b, qNo / b);
  const eYes = Math.exp(qYes / b - m);
  const eNo = Math.exp(qNo / b - m);
  const total = eYes + eNo;
  return {
    yes: eYes / total,
    no: eNo / total,
  };
}

/**
 * The dollar cost to buy `shares` additional shares of `side`
 * ('yes' or 'no'), given the current state.
 *
 * This is just: cost(new state) - cost(old state). It's what a client
 * would call to show "if I buy this many shares, here's what it costs"
 * before the user confirms a trade.
 */
export function costOfTrade({ qYes, qNo, b, side, shares }) {
  if (shares < 0) throw new Error('shares must be non-negative');
  const before = costFunction(qYes, qNo, b);
  const after =
    side === 'yes'
      ? costFunction(qYes + shares, qNo, b)
      : costFunction(qYes, qNo + shares, b);
  return after - before;
}

/**
 * Given a dollar amount a trader wants to SPEND (not a share count —
 * traders think in dollars, e.g. "I want to put in $10"), figure out
 * how many shares of `side` that buys, and return the new state.
 *
 * This is the inverse of costOfTrade: instead of "shares -> cost", we
 * go "cost -> shares". There IS a closed-form algebraic solution (no
 * need for iterative search), derived like this for buying Yes:
 *
 *   cost(qYesNew, qNo) = spend + cost(qYes, qNo)
 *   b*log(e^(qYesNew/b) + e^(qNo/b)) = target      [target = RHS above]
 *   e^(qYesNew/b) = e^(target/b) - e^(qNo/b)
 *   qYesNew = b * log( e^(target/b) - e^(qNo/b) )
 *
 * Rewritten in a numerically-stable form (factoring out the larger
 * exponent so we never risk overflow), this becomes:
 *
 *   qYesNew = target + b * log(1 - e^((qNo - target)/b))
 *
 * where target = spend + cost(qYes, qNo)   [in dollar units, not /b]
 *
 * That refactor is exactly what's implemented below.
 */
export function buyShares({ qYes, qNo, b, side, spend }) {
  if (spend <= 0) throw new Error('spend must be positive');
  if (b <= 0) throw new Error('Liquidity parameter b must be positive');

  const costBefore = costFunction(qYes, qNo, b);
  const target = spend + costBefore; // dollar-denominated target cost

  // qOther is whichever side ISN'T being bought — its count doesn't
  // change during this trade.
  const qBuying = side === 'yes' ? qYes : qNo;
  const qOther = side === 'yes' ? qNo : qYes;

  // Stable form of qNew = b * log(e^(target/b) - e^(qOther/b))
  const qNew = target + b * Math.log(1 - Math.exp((qOther - target) / b));

  const sharesBought = qNew - qBuying;

  const newQYes = side === 'yes' ? qNew : qYes;
  const newQNo = side === 'no' ? qNew : qNo;

  return {
    sharesBought,
    newQYes,
    newQNo,
    prices: getPrices(newQYes, newQNo, b),
    avgPricePaid: spend / sharesBought,
  };
}

/**
 * The theoretical worst-case loss for the market maker, fixed at market
 * creation time purely by the choice of b. Useful for showing "here's
 * how much capital I need to be willing to risk to run this market."
 */
export function maxLoss(b) {
  return b * Math.log(2);
}
