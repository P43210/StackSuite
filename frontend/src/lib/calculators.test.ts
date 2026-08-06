import { describe, expect, it } from "vitest";
import {
  convertByUsdPivot,
  calculateProfit,
  calculatePositionSize,
  CalculatorInputError,
} from "./calculators";

describe("convertByUsdPivot", () => {
  it("converts between two assets via their USD prices", () => {
    // 1 BTC at $60,000 -> how much ETH at $3,000?
    const result = convertByUsdPivot(1, 60_000, 3_000);
    expect(result).toBeCloseTo(20, 10);
  });

  it("converts crypto to USD when the target price is 1", () => {
    const result = convertByUsdPivot(2.5, 60_000, 1);
    expect(result).toBeCloseTo(150_000, 10);
  });

  it("treats zero amount as zero output, not an error", () => {
    expect(convertByUsdPivot(0, 60_000, 3_000)).toBe(0);
  });

  it("rejects a negative amount", () => {
    expect(() => convertByUsdPivot(-1, 60_000, 3_000)).toThrow(CalculatorInputError);
  });

  it("rejects a non-positive source price", () => {
    expect(() => convertByUsdPivot(1, 0, 3_000)).toThrow(CalculatorInputError);
  });

  it("rejects a non-positive target price", () => {
    expect(() => convertByUsdPivot(1, 60_000, -5)).toThrow(CalculatorInputError);
  });
});

describe("calculateProfit", () => {
  it("computes a simple profit with no fees", () => {
    const result = calculateProfit({ entryPrice: 100, exitPrice: 150, quantity: 2 });
    expect(result.costBasis).toBe(200);
    expect(result.exitValue).toBe(300);
    expect(result.netProfit).toBe(100);
    expect(result.netProfitPercent).toBeCloseTo(50, 10);
  });

  it("computes a loss correctly", () => {
    const result = calculateProfit({ entryPrice: 100, exitPrice: 80, quantity: 1 });
    expect(result.netProfit).toBe(-20);
    expect(result.netProfitPercent).toBeCloseTo(-20, 10);
  });

  it("applies entry and exit fees symmetrically", () => {
    // 1% fee, buy at 100, sell at 100 (flat) - should be a net loss from fees alone
    const result = calculateProfit({
      entryPrice: 100,
      exitPrice: 100,
      quantity: 1,
      feePercent: 1,
    });
    expect(result.entryFee).toBeCloseTo(1, 10);
    expect(result.exitFee).toBeCloseTo(1, 10);
    // paid 101 in, got 99 out
    expect(result.netProfit).toBeCloseTo(-2, 10);
  });

  it("handles exit price of zero (total loss) without throwing", () => {
    const result = calculateProfit({ entryPrice: 50, exitPrice: 0, quantity: 4 });
    expect(result.exitValue).toBe(0);
    expect(result.netProfit).toBe(-200);
    expect(result.netProfitPercent).toBeCloseTo(-100, 10);
  });

  it("rejects a non-positive entry price", () => {
    expect(() => calculateProfit({ entryPrice: 0, exitPrice: 10, quantity: 1 })).toThrow(
      CalculatorInputError,
    );
  });

  it("rejects a non-positive quantity", () => {
    expect(() =>
      calculateProfit({ entryPrice: 10, exitPrice: 10, quantity: 0 }),
    ).toThrow(CalculatorInputError);
  });

  it("rejects a negative fee percent", () => {
    expect(() =>
      calculateProfit({ entryPrice: 10, exitPrice: 10, quantity: 1, feePercent: -1 }),
    ).toThrow(CalculatorInputError);
  });
});

describe("calculatePositionSize", () => {
  it("computes position size for a long trade with a stop below entry", () => {
    // $10,000 account, risking 1% = $100. Entry 50, stop 45 -> risk/unit = 5
    const result = calculatePositionSize({
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 50,
      stopLossPrice: 45,
    });
    expect(result.riskAmount).toBe(100);
    expect(result.riskPerUnit).toBe(5);
    expect(result.positionSizeUnits).toBe(20);
    expect(result.positionValue).toBe(1_000);
    expect(result.positionValuePercentOfAccount).toBe(10);
  });

  it("works the same way for a short trade with a stop above entry", () => {
    // stop above entry (short position) - risk per unit should still be positive
    const result = calculatePositionSize({
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 50,
      stopLossPrice: 55,
    });
    expect(result.riskPerUnit).toBe(5);
    expect(result.positionSizeUnits).toBe(20);
  });

  it("rejects a non-positive account balance", () => {
    expect(() =>
      calculatePositionSize({
        accountBalance: 0,
        riskPercent: 1,
        entryPrice: 50,
        stopLossPrice: 45,
      }),
    ).toThrow(CalculatorInputError);
  });

  it("rejects a risk percent of zero or above 100", () => {
    expect(() =>
      calculatePositionSize({
        accountBalance: 10_000,
        riskPercent: 0,
        entryPrice: 50,
        stopLossPrice: 45,
      }),
    ).toThrow(CalculatorInputError);
    expect(() =>
      calculatePositionSize({
        accountBalance: 10_000,
        riskPercent: 101,
        entryPrice: 50,
        stopLossPrice: 45,
      }),
    ).toThrow(CalculatorInputError);
  });

  it("rejects entry price equal to stop loss price (division by zero guard)", () => {
    expect(() =>
      calculatePositionSize({
        accountBalance: 10_000,
        riskPercent: 1,
        entryPrice: 50,
        stopLossPrice: 50,
      }),
    ).toThrow(CalculatorInputError);
  });
});
