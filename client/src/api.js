/**
 * api.js
 * -----------------------------------------------------------------------
 * Every call to our Express backend goes through here. Centralizing this
 * means: one place to change the base URL (e.g. when deploying), one
 * place to handle errors consistently, and components stay simple —
 * they just call `api.getMarkets()` instead of writing fetch() calls
 * with URLs and headers scattered everywhere.
 * -----------------------------------------------------------------------
 */

const BASE_URL = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

export const api = {
  getMarkets: () => request("/markets"),

  getMarket: (id) => request(`/markets/${id}`),

  createMarket: ({ question, resolutionDate, b }) =>
    request("/markets", {
      method: "POST",
      body: JSON.stringify({ question, resolutionDate, b }),
    }),

  placeTrade: (marketId, { trader, side, spend }) =>
    request(`/markets/${marketId}/trades`, {
      method: "POST",
      body: JSON.stringify({ trader, side, spend }),
    }),

  resolveMarket: (marketId, outcome) =>
    request(`/markets/${marketId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    }),
};
