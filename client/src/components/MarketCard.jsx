import { Link } from "react-router-dom";

/**
 * MarketCard
 * -----------------------------------------------------------------------
 * Purely presentational — takes a market object as a prop and renders
 * it. It doesn't fetch anything or hold its own state; all the data it
 * needs is handed to it by the parent (HomePage). This is a common React
 * pattern worth knowing the name of: "presentational" or "dumb" components
 * vs. "container" components that manage state/data-fetching.
 * -----------------------------------------------------------------------
 */
export function MarketCard({ market }) {
  const yesPct = Math.round(market.prices.yes * 100);

  return (
    <Link to={`/markets/${market.id}`} className="market-card">
      <div className="market-card__top">
        <div className="market-card__question">{market.question}</div>
        <div
          className="market-card__prob"
          style={{
            color: yesPct >= 50 ? "var(--color-yes)" : "var(--color-no)",
          }}>
          {yesPct}%
        </div>
      </div>

      <div className="market-card__bar">
        <div
          className="market-card__bar-fill"
          style={{ width: `${yesPct}%` }}
        />
      </div>

      <div className="market-card__meta">
        {market.resolved ? (
          <span className={`badge badge--resolved-${market.outcome}`}>
            Resolved &middot; {market.outcome === "yes" ? "Yes" : "No"}
          </span>
        ) : (
          <span className="badge badge--open">Open</span>
        )}
        <span>Liquidity b = {market.b}</span>
      </div>
    </Link>
  );
}
