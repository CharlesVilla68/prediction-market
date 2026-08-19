import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { MarketCard } from "../components/MarketCard";
import { CreateMarketForm } from "../components/CreateMarketForm";

/**
 * HomePage
 * -----------------------------------------------------------------------
 * Lists all markets, and hosts the create-market form. This is a
 * "container" component — it owns the data (fetches markets, holds them
 * in state) and hands that data down to the purely presentational
 * MarketCard components.
 *
 * useEffect here runs once when the page first mounts (empty dependency
 * array `[]`) to fetch the market list. If you haven't used useEffect
 * before: it's React's way of running code in response to a component
 * appearing on screen (or specific values changing) — here, "when this
 * page first loads, go fetch the markets."
 * -----------------------------------------------------------------------
 */
export function HomePage() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMarkets();
  }, []);

  async function loadMarkets() {
    try {
      const data = await api.getMarkets();
      setMarkets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(market) {
    // Jump straight into the new market's trading page — nicer flow
    // than staying on the list after creating one.
    navigate(`/markets/${market.id}`);
  }

  return (
    <>
      <h1 className="page-title">Markets</h1>
      <p className="page-subtitle">
        A sandbox prediction market. Create a question, trade Yes/No, and watch
        the price move.
      </p>

      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card__title">Create a market</div>
        <CreateMarketForm onCreated={handleCreated} />
      </div>

      {loading && <div className="empty-state">Loading markets…</div>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && !error && markets.length === 0 && (
        <div className="empty-state">
          No markets yet — create the first one above.
        </div>
      )}

      <div className="market-list">
        {markets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </>
  );
}
