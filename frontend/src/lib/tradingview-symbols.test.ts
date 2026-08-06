import { describe, expect, it } from "vitest";
import { toTradingViewSymbol } from "./tradingview-symbols";

describe("toTradingViewSymbol", () => {
  it("maps a known crypto id to its Binance ticker pair", () => {
    expect(toTradingViewSymbol("crypto", "bitcoin")).toBe("BINANCE:BTCUSDT");
    expect(toTradingViewSymbol("crypto", "ethereum")).toBe("BINANCE:ETHUSDT");
  });

  it("falls back to uppercasing an unknown crypto id", () => {
    expect(toTradingViewSymbol("crypto", "some-obscure-coin")).toBe(
      "BINANCE:SOME-OBSCURE-COINUSDT",
    );
  });

  it("maps a forex pair from BASE_QUOTE to FX:BASEQUOTE", () => {
    expect(toTradingViewSymbol("forex", "EUR_USD")).toBe("FX:EURUSD");
  });

  it("maps known metal codes to their TradingView commodity ticker", () => {
    expect(toTradingViewSymbol("commodity", "XAU")).toBe("TVC:GOLD");
    expect(toTradingViewSymbol("commodity", "XAG")).toBe("TVC:SILVER");
  });

  it("falls back to a TVC: prefix for an unknown commodity code", () => {
    expect(toTradingViewSymbol("commodity", "XYZ")).toBe("TVC:XYZ");
  });
});
