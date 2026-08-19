import { useState } from "react";
import { api } from "../api";

/**
 * CreateMarketForm
 * -----------------------------------------------------------------------
 * This is a "controlled form" — every input's value is driven by React
 * state (useState), and every keystroke updates that state via onChange.
 * React is the single source of truth for what's in each field, not the
 * DOM itself. That's the standard React way to handle forms, because it
 * means you can validate, transform, or react to changes as they happen.
 * -----------------------------------------------------------------------
 */
export function CreateMarketForm({ onCreated }) {
  const [question, setQuestion] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [liquidity, setLiquidity] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser's default full-page-reload form submit
    setError(null);

    const b = Number(liquidity);
    if (!question.trim()) {
      setError("Give the market a question.");
      return;
    }
    if (!b || b <= 0) {
      setError("Liquidity parameter must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const market = await api.createMarket({
        question: question.trim(),
        resolutionDate: resolutionDate || null,
        b,
      });
      setQuestion("");
      setResolutionDate("");
      setLiquidity("100");
      onCreated(market);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label htmlFor="question">Question</label>
        <input
          id="question"
          type="text"
          placeholder="Will the Fed cut rates in September?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="resolutionDate">Resolution date (optional)</label>
        <input
          id="resolutionDate"
          type="date"
          value={resolutionDate}
          onChange={(e) => setResolutionDate(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="liquidity">Liquidity parameter (b)</label>
        <input
          id="liquidity"
          type="number"
          min="1"
          step="1"
          value={liquidity}
          onChange={(e) => setLiquidity(e.target.value)}
        />
        <span className="field-hint">
          Higher b = deeper market, trades move price less. Max market-maker
          loss is b &times; ln(2) &asymp;{" "}
          {(Number(liquidity) * 0.6931).toFixed(2) || "0"}.
        </span>
      </div>

      <button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={submitting}>
        {submitting ? "Creating…" : "Create market"}
      </button>
    </form>
  );
}
