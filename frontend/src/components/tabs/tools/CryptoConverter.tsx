"use client";

import { useMemo, useState } from "react";
import { ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCoinPrices, ApiError } from "@/lib/api";
import { convertByUsdPivot, CalculatorInputError } from "@/lib/calculators";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

const USD_OPTION = { id: "usd", symbol: "usd", name: "US Dollar", current_price: 1 };
const SELECT_CLASS =
  "rounded-lg bg-black/20 border border-line px-3 py-2.5 font-mono text-sm text-chalk focus:outline-none focus:border-indigo-light transition-colors";

export function CryptoConverter() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["market-prices-converter"],
    queryFn: () => fetchCoinPrices("usd", 100),
  });

  const options = useMemo(() => [USD_OPTION, ...(data?.markets ?? [])], [data]);

  const [fromId, setFromId] = useState("usd");
  const [toId, setToId] = useState("bitcoin");
  const [amount, setAmount] = useState("1");

  const fromAsset = options.find((o) => o.id === fromId);
  const toAsset = options.find((o) => o.id === toId);

  let result: number | null = null;
  let errorMessage: string | null = null;

  if (fromAsset && toAsset && amount !== "") {
    try {
      result = convertByUsdPivot(Number(amount), fromAsset.current_price, toAsset.current_price);
    } catch (e) {
      errorMessage = e instanceof CalculatorInputError ? e.message : "invalid input";
    }
  }

  if (isLoading) return <Spinner label="Loading prices" />;

  if (isError) {
    return (
      <Card accent className="p-6">
        <p className="text-sm text-chalk">
          Could not load prices:{" "}
          <span className="font-mono text-ember">
            {error instanceof ApiError ? error.message : "unknown error"}
          </span>
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-dim px-1">
        Converts via each asset&apos;s USD price. Converting to a non-USD fiat
        currency isn&apos;t supported yet.
      </p>

      <Card className="p-6 space-y-1">
        <div className="rounded-lg border border-line bg-black/20 p-4">
          <span className="text-xs font-mono uppercase tracking-wide text-slate-mist">From</span>
          <div className="flex items-center gap-3 mt-1.5">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              className="flex-1 bg-transparent font-display text-2xl font-bold text-chalk focus:outline-none min-w-0"
            />
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={SELECT_CLASS}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.symbol.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-center -my-1 relative z-10">
          <div className="rounded-full bg-surface border border-line p-1.5">
            <ArrowDown size={14} className="text-slate-mist" />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-black/20 p-4">
          <span className="text-xs font-mono uppercase tracking-wide text-slate-mist">To</span>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 font-display text-2xl font-bold text-chalk min-w-0 truncate">
              {errorMessage ? (
                <span className="text-sm text-ember font-body font-normal">{errorMessage}</span>
              ) : (
                result?.toLocaleString(undefined, { maximumFractionDigits: 8 }) ?? "-"
              )}
            </div>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className={SELECT_CLASS}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.symbol.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}
