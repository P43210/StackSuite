"use client";

import { useState } from "react";
import { calculatePositionSize, CalculatorInputError } from "@/lib/calculators";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

export function PositionSizeCalculator() {
  const [accountBalance, setAccountBalance] = useState("");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");

  let result: ReturnType<typeof calculatePositionSize> | null = null;
  let errorMessage: string | null = null;

  if (accountBalance !== "" && entryPrice !== "" && stopLossPrice !== "") {
    try {
      result = calculatePositionSize({
        accountBalance: Number(accountBalance),
        riskPercent: Number(riskPercent),
        entryPrice: Number(entryPrice),
        stopLossPrice: Number(stopLossPrice),
      });
    } catch (e) {
      errorMessage = e instanceof CalculatorInputError ? e.message : "invalid input";
    }
  }

  return (
    <Card className="p-6 space-y-5">
      <p className="text-xs text-slate-dim">
        Sizes a position so a stop-loss hit only costs the risk percentage
        you choose, regardless of how far away the stop is.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Account balance" value={accountBalance} onChange={(e) => setAccountBalance(e.target.value)} type="number" min="0" placeholder="10000" />
        <Field label="Risk % per trade" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} type="number" min="0" max="100" step="0.1" />
        <Field label="Entry price" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} type="number" min="0" placeholder="50" />
        <Field label="Stop-loss price" value={stopLossPrice} onChange={(e) => setStopLossPrice(e.target.value)} type="number" min="0" placeholder="45" />
      </div>

      <div className="pt-4 border-t border-line">
        {errorMessage && <p className="text-xs font-mono text-ember">{errorMessage}</p>}
        {result && !errorMessage && (
          <div className="space-y-3">
            <div className="font-display text-3xl font-bold text-chalk">
              {result.positionSizeUnits.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
              <span className="text-base font-normal text-slate-mist">units</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs font-mono text-slate-mist">
              <span>Position value</span>
              <span className="text-right text-chalk">
                {result.positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                ({result.positionValuePercentOfAccount.toFixed(1)}%)
              </span>
              <span>Risking</span>
              <span className="text-right text-chalk">
                {result.riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
