import { Router } from "express";
import { cached } from "../lib/cache";
import {
  getCoinMarkets,
  getFearGreedIndex,
  MarketDataError,
} from "../lib/market-data-client";

export const marketRouter = Router();

const SUPPORTED_VS_CURRENCIES = new Set(["usd", "eur", "gbp", "jpy", "btc"]);

function parsePerPage(raw: unknown, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, max);
}

marketRouter.get("/api/market/prices", async (req, res) => {
  const vsCurrency = String(req.query.vs_currency ?? "usd").toLowerCase();
  if (!SUPPORTED_VS_CURRENCIES.has(vsCurrency)) {
    return res.status(400).json({ error: "unsupported vs_currency" });
  }
  const perPage = parsePerPage(req.query.per_page, 50, 250);

  try {
    const markets = await cached(
      `market:prices:${vsCurrency}:${perPage}`,
      60,
      () => getCoinMarkets(vsCurrency, perPage),
    );
    res.json({ vsCurrency, markets });
  } catch (err) {
    if (err instanceof MarketDataError) {
      return res.status(err.status && err.status < 500 ? err.status : 502).json({
        error: err.message,
      });
    }
    res.status(500).json({ error: "internal error" });
  }
});

marketRouter.get("/api/market/movers", async (req, res) => {
  const vsCurrency = String(req.query.vs_currency ?? "usd").toLowerCase();
  if (!SUPPORTED_VS_CURRENCIES.has(vsCurrency)) {
    return res.status(400).json({ error: "unsupported vs_currency" });
  }
  const limit = parsePerPage(req.query.limit, 10, 50);

  try {
    // Ranked among the top 250 coins by market cap, so a thinly-traded
    // micro-cap swinging 300% doesn't drown out what's actually moving
    // among assets people have heard of.
    const markets = await cached(
      `market:movers-pool:${vsCurrency}`,
      60,
      () => getCoinMarkets(vsCurrency, 250),
    );

    const withChange = markets.filter(
      (m) => typeof m.price_change_percentage_24h === "number",
    );
    const sorted = [...withChange].sort(
      (a, b) => b.price_change_percentage_24h! - a.price_change_percentage_24h!,
    );

    res.json({
      vsCurrency,
      gainers: sorted.slice(0, limit),
      losers: sorted.slice(-limit).reverse(),
    });
  } catch (err) {
    if (err instanceof MarketDataError) {
      return res.status(err.status && err.status < 500 ? err.status : 502).json({
        error: err.message,
      });
    }
    res.status(500).json({ error: "internal error" });
  }
});

marketRouter.get("/api/market/fear-greed", async (_req, res) => {
  try {
    const reading = await cached(
      "market:fear-greed",
      600,
      getFearGreedIndex,
    );
    res.json(reading);
  } catch (err) {
    if (err instanceof MarketDataError) {
      return res.status(502).json({ error: err.message });
    }
    res.status(500).json({ error: "internal error" });
  }
});
