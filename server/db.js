/**
 * db.js
 * -----------------------------------------------------------------------
 * SQLite setup, using better-sqlite3 (synchronous — no async/await needed
 * for queries, which keeps the trade-pricing logic simple and avoids
 * race conditions between concurrent writes for this demo).
 *
 * Two tables only:
 *   - markets: one row per market, including a CACHED copy of the
 *     current qYes/qNo totals (for fast price reads).
 *   - trades: append-only log of every trade ever placed. This is the
 *     source of truth. Positions and price history are both derived
 *     from this table rather than stored separately, so there's only
 *     ever one place that can be "wrong."
 * -----------------------------------------------------------------------
 */
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "market.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    resolution_date TEXT,
    b REAL NOT NULL,
    q_yes REAL NOT NULL DEFAULT 0,
    q_no REAL NOT NULL DEFAULT 0,
    resolved INTEGER NOT NULL DEFAULT 0,
    outcome TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    market_id TEXT NOT NULL,
    trader TEXT NOT NULL,
    side TEXT NOT NULL,
    spend REAL NOT NULL,
    shares REAL NOT NULL,
    price_after REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (market_id) REFERENCES markets(id)
  );

  CREATE INDEX IF NOT EXISTS idx_trades_market_id ON trades(market_id);
`);
