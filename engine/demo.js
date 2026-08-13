/**
 * demo.js
 * -----------------------------------------------------------------------
 * A quick, human-readable script to SEE the pricing engine work before
 * any server or UI exists. Run with: npm run demo
 * -----------------------------------------------------------------------
 */
import { getPrices, buyShares, maxLoss } from './lmsr.js';

const b = 100;
let qYes = 0;
let qNo = 0;

const pct = (p) => `${(p * 100).toFixed(1)}%`;

console.log(`\nMarket created with liquidity parameter b = ${b}`);
console.log(`Max possible market-maker loss, fixed at creation: $${maxLoss(b).toFixed(2)}\n`);

let prices = getPrices(qYes, qNo, b);
console.log(`Before trade: Yes = ${pct(prices.yes)} / No = ${pct(prices.no)}`);

const trade1 = buyShares({ qYes, qNo, b, side: 'yes', spend: 10 });
qYes = trade1.newQYes;
qNo = trade1.newQNo;
console.log(
  `\nTrader A spends $10 on Yes -> buys ${trade1.sharesBought.toFixed(2)} shares ` +
    `(avg price $${trade1.avgPricePaid.toFixed(3)}/share)`
);
console.log(`After trade: Yes = ${pct(trade1.prices.yes)} / No = ${pct(trade1.prices.no)}`);

const trade2 = buyShares({ qYes, qNo, b, side: 'no', spend: 25 });
qYes = trade2.newQYes;
qNo = trade2.newQNo;
console.log(
  `\nTrader B spends $25 on No -> buys ${trade2.sharesBought.toFixed(2)} shares ` +
    `(avg price $${trade2.avgPricePaid.toFixed(3)}/share)`
);
console.log(`After trade: Yes = ${pct(trade2.prices.yes)} / No = ${pct(trade2.prices.no)}\n`);
