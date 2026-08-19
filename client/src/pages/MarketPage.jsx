import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { PriceChart } from "../components/PriceChart";
import { TradePanel } from "../components/TradePanel";
import { ResolvePanel } from "../components/ResolvePanel";

/**
 * MarketPage
 * -----------------------------------------------------------------------
 * The trading view for a single market. useParams() reads the `:id`
 * segment out of the URL (e.g. /markets/abc123 -> id = "abc123") — that's
 * how React Router hands URL data to a page component.
 *
 * `loadMarket` is passed down to TradePanel and ResolvePanel as
 * onTraded / onResolved. When either of those components successfully
 * completes an action, they call this function, which re-fetches the
 * market and updates state — that's the entire mechanism behind "the
 * chart and price update immediately after a trade, with no page
 * reload." React just re-renders whatever depends on that state.
 * -----------------------------------------------------------------------
 */
export function MarketPage() {
  const { id } = useParams();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMarket();
  }, [id]);

  async function loadMarket() {
    try {
      const data = await api.getMarket(id);
      setMarket(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="empty-state">Loading market…</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!market) return null;

  const yesPct = Math.round(market.prices.yes * 100);
  const noPct = 100 - yesPct;

  return (
    <>
      <Link to="/" className="back-link">
        &larr; All markets
      </Link>

      <div className="market-header">
        <h1 className="market-header__question">{market.question}</h1>
        <div className="market-header__meta">
          <span>Liquidity b = {market.b}</span>
          <span>Volume ${market.volume.toFixed(2)}</span>
          <span>Max loss ${market.maxLoss.toFixed(2)}</span>
          {market.resolutionDate && (
            <span>Resolves {market.resolutionDate}</span>
          )}
        </div>
      </div>

      <div className="price-hero">
        <span className="price-hero__value price-hero__value--yes">
          {yesPct}%
        </span>
        <span className="price-hero__label">Yes</span>
        <span style={{ color: "var(--color-text-faint)" }}>&middot;</span>
        <span className="price-hero__value price-hero__value--no">
          {noPct}%
        </span>
        <span className="price-hero__label">No</span>
      </div>

      <div className="card">
        <div className="card__title">Probability over time</div>
        <PriceChart trades={market.trades} />
      </div>

      <TradePanel
        marketId={market.id}
        resolved={market.resolved}
        onTraded={loadMarket}
      />

      <ResolvePanel
        marketId={market.id}
        resolved={market.resolved}
        outcome={market.outcome}
        onResolved={loadMarket}
      />

      <div className="card">
        <div className="card__title">Trade history</div>
        {market.trades.length === 0 ? (
          <div className="empty-state">No trades yet.</div>
        ) : (
          <table className="trades-table">
            <thead>
              <tr>
                <th>Trader</th>
                <th>Side</th>
                <th>Spend</th>
                <th>Shares</th>
                <th>Price after</th>
              </tr>
            </thead>
            <tbody>
              {[...market.trades].reverse().map((t) => (
                <tr key={t.id}>
                  <td>{t.trader}</td>
                  <td>
                    <span className={`side-pill side-pill--${t.side}`}>
                      {t.side}
                    </span>
                  </td>
                  <td>${t.spend.toFixed(2)}</td>
                  <td>{t.shares.toFixed(2)}</td>
                  <td>{(t.priceAfter * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
