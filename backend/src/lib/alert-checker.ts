import type { Pool } from "pg";
import type Redis from "ioredis";
import { getSimplePrices } from "./market-data-client";
import { getForexRate } from "./forex-client";
import { getMetalPrice, MetalsNotConfiguredError } from "./metals-client";
import { evaluateAlert, formatAlertMessage, AlertComparator } from "./alert-logic";
import { NOTIFICATIONS_CHANNEL } from "./notify";
import { TelegramLink } from "../db/models/TelegramLink";

interface PriceAlertRow {
  id: number;
  stacks_address: string;
  asset_class: "crypto" | "forex" | "commodity";
  symbol: string;
  display_name: string;
  comparator: AlertComparator;
  target_price: string;
}

async function chatIdsForAddress(address: string): Promise<number[]> {
  const links = await TelegramLink.find({
    stacksAddress: address,
    subscriptions: "price-alert",
  });
  return links.map((link) => link.telegramChatId);
}

export interface AlertPriceFetchers {
  getSimplePrices: typeof getSimplePrices;
  getForexRate: typeof getForexRate;
  getMetalPrice: typeof getMetalPrice;
}

const defaultFetchers: AlertPriceFetchers = {
  getSimplePrices,
  getForexRate,
  getMetalPrice,
};

/**
 * Fetches current prices for every distinct symbol referenced by active
 * alerts, grouped by asset class to minimize API calls, then evaluates
 * and (if triggered) notifies and marks each alert. Errors fetching one
 * asset class don't prevent the others from being checked.
 *
 * `fetchers` defaults to the real network-backed implementations; tests
 * pass fakes here instead of monkey-patching module internals, which
 * doesn't work reliably under ESM's live-binding semantics anyway.
 */
export async function checkPriceAlerts(
  pool: Pool,
  redis: Redis,
  fetchers: AlertPriceFetchers = defaultFetchers,
): Promise<number> {
  const { rows: alerts } = await pool.query<PriceAlertRow>(
    `SELECT id, stacks_address, asset_class, symbol, display_name, comparator, target_price
     FROM price_alerts WHERE NOT triggered`,
  );

  if (alerts.length === 0) return 0;

  const prices = new Map<string, number>();

  const cryptoSymbols = [
    ...new Set(alerts.filter((a) => a.asset_class === "crypto").map((a) => a.symbol)),
  ];
  if (cryptoSymbols.length > 0) {
    try {
      const cryptoPrices = await fetchers.getSimplePrices(cryptoSymbols, "usd");
      for (const [id, price] of Object.entries(cryptoPrices)) {
        prices.set(`crypto:${id}`, price);
      }
    } catch (err) {
      console.error("[alert-checker] failed to fetch crypto prices", err);
    }
  }

  const forexSymbols = [
    ...new Set(alerts.filter((a) => a.asset_class === "forex").map((a) => a.symbol)),
  ];
  for (const symbol of forexSymbols) {
    const [base, quote] = symbol.split("_");
    if (!base || !quote) continue;
    try {
      const rate = await fetchers.getForexRate(base, quote);
      prices.set(`forex:${symbol}`, rate);
    } catch (err) {
      console.error(`[alert-checker] failed to fetch forex rate for ${symbol}`, err);
    }
  }

  const commoditySymbols = [
    ...new Set(alerts.filter((a) => a.asset_class === "commodity").map((a) => a.symbol)),
  ];
  for (const symbol of commoditySymbols) {
    try {
      const price = await fetchers.getMetalPrice(symbol, "USD");
      prices.set(`commodity:${symbol}`, price);
    } catch (err) {
      if (!(err instanceof MetalsNotConfiguredError)) {
        console.error(`[alert-checker] failed to fetch metal price for ${symbol}`, err);
      }
    }
  }

  let triggeredCount = 0;

  for (const alert of alerts) {
    const currentPrice = prices.get(`${alert.asset_class}:${alert.symbol}`);
    if (currentPrice === undefined) continue;

    const targetPrice = Number(alert.target_price);
    if (!evaluateAlert(currentPrice, alert.comparator, targetPrice)) continue;

    await pool.query(
      `UPDATE price_alerts SET triggered = true, triggered_at = now() WHERE id = $1`,
      [alert.id],
    );
    triggeredCount += 1;

    const chatIds = await chatIdsForAddress(alert.stacks_address);
    const message = formatAlertMessage({
      displayName: alert.display_name,
      comparator: alert.comparator,
      targetPrice,
      currentPrice,
    });
    for (const chatId of chatIds) {
      await redis.publish(NOTIFICATIONS_CHANNEL, JSON.stringify({ chatId, message }));
    }
  }

  return triggeredCount;
}
