import { useState } from "react";
import { api } from "../api";

/**
 * TradePanel
 * -----------------------------------------------------------------------
 * Lets the user pick Yes/No, enter a trader name and dollar amount, and
 * submit a trade. After a successful trade, it calls `onTraded` — the
 * parent (MarketPage) passes in a function that re-fetches the market,
 * which is how the price and chart update immediately without a page
 * reload. This is the "lift state up" pattern: this component doesn't
 * hold the market's data itself, it just tells its parent "something
 * changed, go refresh."
 * -----------------------------------------------------------------------
 */
export function TradePanel({ marketId, resolved, onTraded }) {
  const [side, setSide] = useState("yes");
  const [trader, setTrader] = useState("");
  const [spend, setSpend] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLastResult(null);

    const amount = Number(spend);
    if (!trader.trim()) {
      setError("Enter a trader name (any name works — this is a sandbox).");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter a positive dollar amount.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.placeTrade(marketId, {
        trader: trader.trim(),
        side,
        spend: amount,
      });
      setLastResult(result);
      await onTraded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (resolved) {
    return (
      <div className="card">
        <div className="card__title">Trading</div>
        <div className="empty-state">
          This market has been resolved — trading is closed.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__title">Place a trade</div>

      <div className="trade-tabs">
        <button
          type="button"
          className={`trade-tab ${
            side === "yes" ? "trade-tab--active-yes" : ""
          }`}
          onClick={() => setSide("yes")}>
          Buy Yes
        </button>
        <button
          type="button"
          className={`trade-tab ${side === "no" ? "trade-tab--active-no" : ""}`}
          onClick={() => setSide("no")}>
          Buy No
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {lastResult && (
        <div className="success-banner">
          Bought {lastResult.sharesBought.toFixed(2)} {side} shares at an
          average price of ${lastResult.avgPricePaid.toFixed(3)}.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="trader">Trader name</label>
          <input
            id="trader"
            type="text"
            placeholder="e.g. alice, or your own name"
            value={trader}
            onChange={(e) => setTrader(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="spend">Amount to spend ($)</label>
          <input
            id="spend"
            type="number"
            min="0.01"
            step="0.01"
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className={`btn btn--block ${
            side === "yes" ? "btn--yes" : "btn--no"
          }`}
          disabled={submitting}>
          {submitting
            ? "Placing trade…"
            : `Buy ${side === "yes" ? "Yes" : "No"} — $${spend || "0"}`}
        </button>
      </form>
    </div>
  );
}
