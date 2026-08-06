import { config } from "../config";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

function coingeckoHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.coingeckoApiKey) headers["x-cg-demo-api-key"] = config.coingeckoApiKey;
  return headers;
}

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
}

export class MarketDataError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

export async function getCoinMarkets(
  vsCurrency: string,
  perPage: number,
  page = 1,
): Promise<CoinMarket[]> {
  const url =
    `${COINGECKO_BASE_URL}/coins/markets` +
    `?vs_currency=${encodeURIComponent(vsCurrency)}` +
    `&order=market_cap_desc&per_page=${perPage}&page=${page}` +
    `&sparkline=false&price_change_percentage=24h`;

  let response: Response;
  try {
    response = await fetch(url, { headers: coingeckoHeaders() });
  } catch (err) {
    throw new MarketDataError(
      `Could not reach CoinGecko: ${(err as Error).message}`,
    );
  }

  if (!response.ok) {
    throw new MarketDataError(
      `CoinGecko returned ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as CoinMarket[];
}

export async function getSimplePrices(
  ids: string[],
  vsCurrency = "usd",
): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const url =
    `${COINGECKO_BASE_URL}/simple/price?ids=${encodeURIComponent(ids.join(","))}` +
    `&vs_currencies=${encodeURIComponent(vsCurrency)}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: coingeckoHeaders() });
  } catch (err) {
    throw new MarketDataError(
      `Could not reach CoinGecko: ${(err as Error).message}`,
    );
  }

  if (!response.ok) {
    throw new MarketDataError(
      `CoinGecko returned ${response.status}`,
      response.status,
    );
  }

  const body = (await response.json()) as Record<string, Record<string, number>>;
  const result: Record<string, number> = {};
  for (const [id, prices] of Object.entries(body)) {
    if (typeof prices[vsCurrency] === "number") {
      result[id] = prices[vsCurrency];
    }
  }
  return result;
}

export interface FearGreedReading {
  value: number;
  classification: string;
  timestamp: number;
}

export async function getFearGreedIndex(): Promise<FearGreedReading> {
  const url = "https://api.alternative.me/fng/?limit=1";

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new MarketDataError(
      `Could not reach Alternative.me: ${(err as Error).message}`,
    );
  }

  if (!response.ok) {
    throw new MarketDataError(
      `Alternative.me returned ${response.status}`,
      response.status,
    );
  }

  const body = (await response.json()) as {
    data: { value: string; value_classification: string; timestamp: string }[];
  };

  const latest = body.data?.[0];
  if (!latest) {
    throw new MarketDataError("Alternative.me returned no data");
  }

  return {
    value: Number(latest.value),
    classification: latest.value_classification,
    timestamp: Number(latest.timestamp),
  };
}
