import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { MarketPage } from "./pages/MarketPage";

/**
 * App
 * -----------------------------------------------------------------------
 * The top-level shell: a header, plus <Routes> which swaps between page
 * components based on the URL — "/" shows HomePage, "/markets/:id" shows
 * MarketPage. This is React Router's core job: single-page-app navigation
 * without a full browser page reload.
 * -----------------------------------------------------------------------
 */
export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__brand-mark">📈</span>
          Prediction Market
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/markets/:id" element={<MarketPage />} />
        </Routes>
      </main>
    </div>
  );
}
