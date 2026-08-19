import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

/**
 * main.jsx
 * -----------------------------------------------------------------------
 * The actual entry point — this is what index.html loads. BrowserRouter
 * wraps the whole app so that every component inside it (App, HomePage,
 * MarketPage, and anything using <Link> or useNavigate) can participate
 * in client-side routing.
 * -----------------------------------------------------------------------
 */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
