/**
 * index.js
 * -----------------------------------------------------------------------
 * The Express API. Four real endpoints plus a list endpoint:
 *
 *   POST /api/markets            create a market
 *   GET  /api/markets            list all markets
 *   GET  /api/markets/:id        one market's full state + trade history
 *   POST /api/markets/:id/trades place a trade (buy Yes or No)
 *   POST /api/markets/:id/resolve   admin: resolve + compute payouts
 *
 * This file intentionally has NO pricing math in it — every dollar/share
 * calculation is delegated to engine/lmsr.js. The server's job is just:
 * validate input, call the engine, persist the result, respond.
 * -----------------------------------------------------------------------
 */
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { db } from "./db.js";
import { getPrices, buyShares, maxLoss } from "../engine/lmsr.js";

const app = express();
app.use(cors());
app.use(express.json());

// ---- helpers -------------------------------------------------------

function marketSummary(row) {
  const prices = getPrices(row.q_yes, row.q_no, row.b);
  return {
    id: row.id,
    question: row.question,
    resolutionDate: row.resolution_date,
    b: row.b,
    resolved: !!row.resolved,
    outcome: row.outcome,
    prices,
    maxLoss: maxLoss(row.b),
  };
}

function getMarketOrThrow(id) {
  const row = db.prepare("SELECT * FROM markets WHERE id = ?").get(id);
  if (!row) {
    const err = new Error("Market not found");
    err.status = 404;
    throw err;
  }
  return row;
}

// ---- routes ---------------------------------------------------------

// Create a market
app.post("/api/markets", (req, res, next) => {
  try {
    const { question, resolutionDate, b } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "question is required" });
    }
    if (!b || b <= 0) {
      return res
        .status(400)
        .json({ error: "b (liquidity parameter) must be a positive number" });
    }

    const id = nanoid(10);
    db.prepare(
      `INSERT INTO markets (id, question, resolution_date, b, q_yes, q_no, resolved, outcome, created_at)
       VALUES (?, ?, ?, ?, 0, 0, 0, NULL, ?)`
    ).run(id, question, resolutionDate ?? null, b, new Date().toISOString());

    const row = getMarketOrThrow(id);
    res.status(201).json(marketSummary(row));
  } catch (err) {
    next(err);
  }
});

// List all markets
app.get("/api/markets", (req, res, next) => {
  try {
    const rows = db
      .prepare("SELECT * FROM markets ORDER BY created_at DESC")
      .all();
    res.json(rows.map(marketSummary));
  } catch (err) {
    next(err);
  }
});

// One market's full state, including trade history for the price chart
app.get("/api/markets/:id", (req, res, next) => {
  try {
    const row = getMarketOrThrow(req.params.id);
    const trades = db
      .prepare(
        "SELECT * FROM trades WHERE market_id = ? ORDER BY created_at ASC"
      )
      .all(req.params.id);

    const volume = trades.reduce((sum, t) => sum + t.spend, 0);

    res.json({
      ...marketSummary(row),
      volume,
      trades: trades.map((t) => ({
        id: t.id,
        trader: t.trader,
        side: t.side,
        spend: t.spend,
        shares: t.shares,
        priceAfter: t.price_after,
        createdAt: t.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Place a trade
app.post("/api/markets/:id/trades", (req, res, next) => {
  try {
    const market = getMarketOrThrow(req.params.id);
    if (market.resolved) {
      return res
        .status(400)
        .json({ error: "Market is already resolved; no more trading" });
    }

    const { trader, side, spend } = req.body;
    if (!trader || typeof trader !== "string") {
      return res.status(400).json({ error: "trader is required" });
    }
    if (side !== "yes" && side !== "no") {
      return res.status(400).json({ error: "side must be 'yes' or 'no'" });
    }
    if (!spend || spend <= 0) {
      return res.status(400).json({ error: "spend must be a positive number" });
    }

    const result = buyShares({
      qYes: market.q_yes,
      qNo: market.q_no,
      b: market.b,
      side,
      spend,
    });

    const tradeId = nanoid(10);
    const now = new Date().toISOString();
    const priceAfter = side === "yes" ? result.prices.yes : result.prices.no;

    // Update the cached qYes/qNo on the market, and append the trade —
    // both in one transaction so they can never get out of sync.
    const tx = db.transaction(() => {
      db.prepare("UPDATE markets SET q_yes = ?, q_no = ? WHERE id = ?").run(
        result.newQYes,
        result.newQNo,
        market.id
      );
      db.prepare(
        `INSERT INTO trades (id, market_id, trader, side, spend, shares, price_after, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        tradeId,
        market.id,
        trader,
        side,
        spend,
        result.sharesBought,
        priceAfter,
        now
      );
    });
    tx();

    res.status(201).json({
      tradeId,
      sharesBought: result.sharesBought,
      avgPricePaid: result.avgPricePaid,
      prices: result.prices,
    });
  } catch (err) {
    next(err);
  }
});

// Resolve a market and compute payouts (admin-only in spirit — no real
// auth here since this is a solo demo, but this is the seam where
// an auth check would go in a real deployment)
app.post("/api/markets/:id/resolve", (req, res, next) => {
  try {
    const market = getMarketOrThrow(req.params.id);
    if (market.resolved) {
      return res.status(400).json({ error: "Market is already resolved" });
    }

    const { outcome } = req.body;
    if (outcome !== "yes" && outcome !== "no") {
      return res.status(400).json({ error: "outcome must be 'yes' or 'no'" });
    }

    db.prepare("UPDATE markets SET resolved = 1, outcome = ? WHERE id = ?").run(
      outcome,
      market.id
    );

    // Payouts: for each trader, sum their shares on the WINNING side.
    // Winning shares pay $1 each; losing shares pay $0 (so they're
    // just omitted).
    const payoutRows = db
      .prepare(
        `SELECT trader, SUM(shares) as totalShares
         FROM trades
         WHERE market_id = ? AND side = ?
         GROUP BY trader`
      )
      .all(market.id, outcome);

    const payouts = payoutRows.map((r) => ({
      trader: r.trader,
      winningShares: r.totalShares,
      payout: r.totalShares, // $1 per winning share
    }));

    res.json({ outcome, payouts });
  } catch (err) {
    next(err);
  }
});

// ---- error handler ---------------------------------------------------

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Prediction market API running on http://localhost:${PORT}`);
});
