import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  costFunction,
  getPrices,
  costOfTrade,
  buyShares,
  maxLoss,
} from './lmsr.js';

test('a fresh market with no shares issued starts at 50/50', () => {
  const prices = getPrices(0, 0, 100);
  assert.ok(Math.abs(prices.yes - 0.5) < 1e-9);
  assert.ok(Math.abs(prices.no - 0.5) < 1e-9);
  // prices must always sum to 1
  assert.ok(Math.abs(prices.yes + prices.no - 1) < 1e-9);
});

test('buying $10 of Yes on a fresh b=100 market matches the hand-worked example (~54.8%)', () => {
  const result = buyShares({ qYes: 0, qNo: 0, b: 100, side: 'yes', spend: 10 });

  // From the manual walkthrough: ~19.1 shares, new price ~54.8%
  assert.ok(Math.abs(result.sharesBought - 19.1) < 0.1);
  assert.ok(Math.abs(result.prices.yes - 0.548) < 0.001);
  assert.ok(Math.abs(result.prices.no - 0.452) < 0.001);
});

test('buying Yes increases Yes price and decreases No price, and they still sum to 1', () => {
  const before = getPrices(0, 0, 100);
  const { prices: after } = buyShares({ qYes: 0, qNo: 0, b: 100, side: 'yes', spend: 25 });

  assert.ok(after.yes > before.yes);
  assert.ok(after.no < before.no);
  assert.ok(Math.abs(after.yes + after.no - 1) < 1e-9);
});

test('a smaller liquidity parameter b produces a bigger price swing for the same trade', () => {
  const thin = buyShares({ qYes: 0, qNo: 0, b: 20, side: 'yes', spend: 10 });
  const deep = buyShares({ qYes: 0, qNo: 0, b: 500, side: 'yes', spend: 10 });

  const thinSwing = thin.prices.yes - 0.5;
  const deepSwing = deep.prices.yes - 0.5;

  assert.ok(thinSwing > deepSwing);
});

test('costOfTrade and buyShares agree with each other (inverse operations)', () => {
  const b = 100;
  const { sharesBought, newQYes, newQNo } = buyShares({
    qYes: 0,
    qNo: 0,
    b,
    side: 'yes',
    spend: 15,
  });

  // If we ask "what would it cost to buy exactly that many shares",
  // we should get back very close to the original $15 spend.
  const recomputedCost = costOfTrade({
    qYes: 0,
    qNo: 0,
    b,
    side: 'yes',
    shares: sharesBought,
  });

  assert.ok(Math.abs(recomputedCost - 15) < 1e-6);
  assert.ok(newQYes > 0);
  assert.equal(newQNo, 0);
});

test('repeated buys on the same side keep pushing price toward 1 but never reach or exceed it', () => {
  let qYes = 0;
  let qNo = 0;
  const b = 50;
  let lastPrice = 0.5;

  for (let i = 0; i < 20; i++) {
    const result = buyShares({ qYes, qNo, b, side: 'yes', spend: 20 });
    assert.ok(result.prices.yes > lastPrice, 'price should keep climbing');
    assert.ok(result.prices.yes < 1, 'price should never reach or exceed 1');
    lastPrice = result.prices.yes;
    qYes = result.newQYes;
    qNo = result.newQNo;
  }
});

test('cost function is symmetric: an all-No market costs the same as an equivalent all-Yes market', () => {
  const b = 100;
  const costYesHeavy = costFunction(30, 0, b);
  const costNoHeavy = costFunction(0, 30, b);
  assert.ok(Math.abs(costYesHeavy - costNoHeavy) < 1e-9);
});

test('maxLoss scales linearly with b, as the theory predicts (b * ln(2))', () => {
  const loss100 = maxLoss(100);
  const loss200 = maxLoss(200);
  assert.ok(Math.abs(loss200 - loss100 * 2) < 1e-9);
  assert.ok(Math.abs(loss100 - 69.31) < 0.01); // 100 * ln(2) ≈ 69.31
});

test('rejects an invalid (non-positive) liquidity parameter', () => {
  assert.throws(() => costFunction(0, 0, 0));
  assert.throws(() => costFunction(0, 0, -5));
});

test('rejects a non-positive spend amount', () => {
  assert.throws(() => buyShares({ qYes: 0, qNo: 0, b: 100, side: 'yes', spend: 0 }));
  assert.throws(() => buyShares({ qYes: 0, qNo: 0, b: 100, side: 'yes', spend: -10 }));
});
