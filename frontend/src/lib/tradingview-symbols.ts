/**
 * TradingView's widgets need their own ticker format (e.g. "BINANCE:BTCUSDT"),
 * which is different from the identifiers we store for our own price-alert
 * checking (CoinGecko ids for crypto, "BASE_QUOTE" for forex, metal codes
 * for commodities). This maps between the two for display purposes only -
 * it never affects alert-checking, which uses the stored symbol directly.
 */

// Common coins only. An id missing from this map still gets a best-effort
// guess (see the fallback below), which may not resolve on a real
// TradingView exchange pair for less common coins - a known limitation,
// not a silent failure, since the widget itself will just show "invalid
// symbol" rather than wrong data.
const CRYPTO_TICKER_MAP: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  tether: "USDT",
  "binancecoin": "BNB",
  solana: "SOL",
  ripple: "XRP",
  "usd-coin": "USDC",
  cardano: "ADA",
  dogecoin: "DOGE",
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  polkadot: "DOT",
  tron: "TRX",
  "matic-network": "MATIC",
  litecoin: "LTC",
  "shiba-inu": "SHIB",
  "bitcoin-cash": "BCH",
  stellar: "XLM",
  uniswap: "UNI",
  near: "NEAR",
  aptos: "APT",
  "internet-computer": "ICP",
  filecoin: "FIL",
  cosmos: "ATOM",
  monero: "XMR",
  "ethereum-classic": "ETC",
  "hedera-hashgraph": "HBAR",
  vechain: "VET",
  algorand: "ALGO",
  "the-graph": "GRT",
  aave: "AAVE",
  blockstack: "STX",
  maker: "MKR",
  "the-sandbox": "SAND",
  decentraland: "MANA",
  tezos: "XTZ",
  "theta-token": "THETA",
  flow: "FLOW",
  eos: "EOS",
  kava: "KAVA",
  zcash: "ZEC",
  dash: "DASH",
};

const COMMODITY_TICKER_MAP: Record<string, string> = {
  XAU: "TVC:GOLD",
  XAG: "TVC:SILVER",
  XPT: "TVC:PLATINUM",
  XPD: "TVC:PALLADIUM",
};

export function toTradingViewSymbol(
  assetClass: "crypto" | "forex" | "commodity",
  symbol: string,
): string {
  if (assetClass === "forex") {
    const [base, quote] = symbol.split("_");
    return `FX:${(base ?? "").toUpperCase()}${(quote ?? "").toUpperCase()}`;
  }

  if (assetClass === "commodity") {
    return COMMODITY_TICKER_MAP[symbol] ?? `TVC:${symbol}`;
  }

  // crypto
  const ticker = CRYPTO_TICKER_MAP[symbol] ?? symbol.toUpperCase();
  return `BINANCE:${ticker}USDT`;
}
