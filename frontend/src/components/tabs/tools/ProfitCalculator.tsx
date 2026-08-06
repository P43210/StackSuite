"use client";

import { useState } from "react";
import { calculateProfit, CalculatorInputError } from "@/lib/calculators";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

export function ProfitCalculator() {
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [feePercent, setFeePercent] = useState("");

  let result: ReturnType<typeof calculateProfit> | null = null;
  let errorMessage: string | null = null;

  if (entryPrice !== "" && exitPrice !== "" && quantity !== "") {
    try {
      result = calculateProfit({
        entryPrice: Number(entryPrice),
        exitPrice: Number(exitPrice),
        quantity: Number(quantity),
        feePercent: feePercent === "" ? 0 : Number(feePercent),
      });
    } catch (e) {
      errorMessage = e instanceof CalculatorInputError ? e.message : "invalid input";
    }
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Entry price" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} type="number" min="0" placeholder="100" />
        <Field label="Exit price" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} type="number" min="0" placeholder="150" />
        <Field label="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="0" placeholder="1" />
        <Field label="Fee % (round trip)" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} type="number" min="0" placeholder="0" />
      </div>

      <div className="pt-4 border-t border-line">
        {errorMessage && <p className="text-xs font-mono text-ember">{errorMessage}</p>}
        {result && !errorMessage && (
          <div className="space-y-3">
            <div
              className={`font-display text-3xl font-bold ${
                result.netProfit >= 0 ? "text-indigo-light" : "text-ember"
              }`}
            >
              {result.netProfit >= 0 ? "+" : ""}
              {result.netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              <span className="text-base font-normal text-slate-mist">
                ({result.netProfitPercent >= 0 ? "+" : ""}
                {result.netProfitPercent.toFixed(2)}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs font-mono text-slate-mist pt-1">
              <span>Cost basis</span>
              <span className="text-right text-chalk">
                {result.costBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span>Exit value</span>
              <span className="text-right text-chalk">
                {result.exitValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              {(result.entryFee > 0 || result.exitFee > 0) && (
                <>
                  <span>Fees paid</span>
                  <span className="text-right text-chalk">
                    {(result.entryFee + result.exitFee).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
