import { useState } from "react";
import { api } from "../api";

/**
 * ResolvePanel
 * -----------------------------------------------------------------------
 * The "admin" action — marking a market resolved as Yes or No, which
 * triggers payout calculation on the backend. There's no real auth
 * here, so anyone can resolve any market — fine for a solo sandbox,
 * and a good thing to flag in an interview as "here's the seam where
 * I'd add an admin role and auth check for production."
 *
 * Each payout row shows what a trader spent (across every trade they
 * placed on this market, win or lose), what they were paid out, and
 * the difference as profit (green) or loss (red).
 * -----------------------------------------------------------------------
 */
export function ResolvePanel({ marketId, resolved, outcome, onResolved }) {
  const [submitting, setSubmitting] = useState(false);
  const [payouts, setPayouts] = useState(null);
  const [error, setError] = useState(null);

  async function resolve(outcomeChoice) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.resolveMarket(marketId, outcomeChoice);
      setPayouts(result.payouts);
      await onResolved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (resolved) {
    return (
      <div className="card">
        <div className="card__title">Resolution</div>
        <p style={{ fontSize: 14, color: "var(--color-text-dim)" }}>
          This market resolved as{" "}
          <strong
            style={{
              color: outcome === "yes" ? "var(--color-yes)" : "var(--color-no)",
            }}>
            {outcome === "yes" ? "Yes" : "No"}
          </strong>
          . Winning shares paid $1 each.
        </p>
        {payouts && payouts.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {payouts.map((p) => (
              <div className="payout-row" key={p.trader}>
                <span>{p.trader}</span>
                <span style={{ display: "flex", gap: 16 }}>
                  <span style={{ color: "var(--color-text-faint)" }}>
                    spent ${p.spent.toFixed(2)}
                  </span>
                  <span>paid ${p.payout.toFixed(2)}</span>
                  <strong
                    style={{
                      color:
                        p.profit >= 0 ? "var(--color-yes)" : "var(--color-no)",
                      minWidth: 70,
                      textAlign: "right",
                    }}>
                    {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                  </strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__title">Resolve market</div>
      {error && <div className="error-banner">{error}</div>}
      <p
        style={{
          fontSize: 13,
          color: "var(--color-text-faint)",
          marginTop: 0,
        }}>
        Once you know the real-world outcome, resolve the market here. Winning
        shares will pay out $1 each; losing shares pay $0.
      </p>
      <div className="resolve-panel">
        <button
          className="btn btn--yes"
          disabled={submitting}
          onClick={() => resolve("yes")}>
          Resolve Yes
        </button>
        <button
          className="btn btn--no"
          disabled={submitting}
          onClick={() => resolve("no")}>
          Resolve No
        </button>
      </div>
    </div>
  );
}
