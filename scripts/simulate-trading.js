/**
 * simulate-trading.js
 * -----------------------------------------------------------------------
 * Simulates a crowd of traders placing trades on an existing market over
 * time, so a demo market has a realistic-looking price history instead
 * of one or two manual trades.
 *
 * This calls the REAL running API over HTTP — the same way the React
 * frontend does — rather than importing the pricing engine directly.
 * That means it exercises the whole system end to end (validation, the
 * database transaction, everything), not just the math in isolation.
 *
 * Usage:
 *   node scripts/simulate-trading.js <marketId> [numberOfTrades]
 *
 * Example:
 *   node scripts/simulate-trading.js xPOPcEmyLx 25
 *
 * Requires the server to already be running (node server/index.js).
 * -----------------------------------------------------------------------
 */

const API_BASE = "http://localhost:4000/api";

const TRADER_NAMES = [
  "alice",
  "bob",
  "carol",
  "dave",
  "erin",
  "frank",
  "grace",
  "heidi",
];

function randomTrader() {
  return TRADER_NAMES[Math.floor(Math.random() * TRADER_NAMES.length)];
}

function randomSide() {
  return Math.random() < 0.5 ? "yes" : "no";
}

function randomSpend() {
  // Skew toward smaller trades with occasional bigger ones, which is a
  // more realistic distribution than a flat uniform random amount —
  // most trades in a real market are small, a few are large.
  const base = 5 + Math.random() * 20; // $5 - $25 typical
  const isWhale = Math.random() < 0.15; // 15% chance of a bigger trade
  return Math.round((isWhale ? base + Math.random() * 35 : base) * 100) / 100;
}

function randomDelayMs() {
  return 300 + Math.random() * 700; // 0.3s - 1s between trades
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function placeTrade(marketId, trader, side, spend) {
  const res = await fetch(`${API_BASE}/markets/${marketId}/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trader, side, spend }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Trade failed");
  }
  return data;
}

async function getMarket(marketId) {
  const res = await fetch(`${API_BASE}/markets/${marketId}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Could not fetch market");
  }
  return data;
}

async function main() {
  const [, , marketId, numTradesArg] = process.argv;

  if (!marketId) {
    console.error(
      "Usage: node scripts/simulate-trading.js <marketId> [numberOfTrades]"
    );
    process.exit(1);
  }

  const numTrades = Number(numTradesArg) || 20;

  // Confirm the market exists and isn't already resolved before we start.
  let market;
  try {
    market = await getMarket(marketId);
  } catch (err) {
    console.error(`Could not find market "${marketId}": ${err.message}`);
    console.error(
      "Make sure the server is running and the market ID is correct."
    );
    process.exit(1);
  }

  if (market.resolved) {
    console.error(
      `Market "${marketId}" is already resolved — no trading allowed.`
    );
    process.exit(1);
  }

  console.log(`\nSimulating ${numTrades} trades on: "${market.question}"`);
  console.log(`Starting price: Yes ${(market.prices.yes * 100).toFixed(1)}%\n`);

  for (let i = 1; i <= numTrades; i++) {
    const trader = randomTrader();
    const side = randomSide();
    const spend = randomSpend();

    try {
      const result = await placeTrade(marketId, trader, side, spend);
      const pct = (result.prices.yes * 100).toFixed(1);
      console.log(
        `[${i}/${numTrades}] ${trader} bought $${spend} of ${side.toUpperCase()} ` +
          `-> Yes price now ${pct}%`
      );
    } catch (err) {
      console.error(`[${i}/${numTrades}] Trade failed: ${err.message}`);
    }

    await sleep(randomDelayMs());
  }

  const final = await getMarket(marketId);
  console.log(
    `\nDone. Final price: Yes ${(final.prices.yes * 100).toFixed(1)}%`
  );
  console.log(`Total volume: $${final.volume.toFixed(2)}`);
  console.log(`Total trades on this market: ${final.trades.length}\n`);
}

main();
