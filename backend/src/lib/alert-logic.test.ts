import { describe, expect, it } from "vitest";
import { evaluateAlert, formatAlertMessage } from "./alert-logic";

describe("evaluateAlert", () => {
  it("triggers an 'above' alert when price is at or above target", () => {
    expect(evaluateAlert(101, "above", 100)).toBe(true);
    expect(evaluateAlert(100, "above", 100)).toBe(true);
  });

  it("does not trigger an 'above' alert when price is below target", () => {
    expect(evaluateAlert(99, "above", 100)).toBe(false);
  });

  it("triggers a 'below' alert when price is at or below target", () => {
    expect(evaluateAlert(99, "below", 100)).toBe(true);
    expect(evaluateAlert(100, "below", 100)).toBe(true);
  });

  it("does not trigger a 'below' alert when price is above target", () => {
    expect(evaluateAlert(101, "below", 100)).toBe(false);
  });

  it("handles zero and negative prices without special-casing", () => {
    expect(evaluateAlert(0, "below", 1)).toBe(true);
    expect(evaluateAlert(-5, "below", -1)).toBe(true);
  });
});

describe("formatAlertMessage", () => {
  it("describes an 'above' trigger", () => {
    const message = formatAlertMessage({
      displayName: "Bitcoin",
      comparator: "above",
      targetPrice: 60000,
      currentPrice: 61000,
    });
    expect(message).toBe("Bitcoin rose above 60000 (now 61000)");
  });

  it("describes a 'below' trigger", () => {
    const message = formatAlertMessage({
      displayName: "EUR/USD",
      comparator: "below",
      targetPrice: 1.05,
      currentPrice: 1.04,
    });
    expect(message).toBe("EUR/USD fell below 1.05 (now 1.04)");
  });
});
