"use client";

import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCoinPrices, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

function formatUsd(value: number): string {
  if (value >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

export function LivePrices() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["market-prices"],
    queryFn: () => fetchCoinPrices("usd", 50),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Spinner label="Loading prices" />;

  if (isError) {
    return (
      <Card accent className="p-6 space-y-3">
        <p className="text-sm text-chalk">
          Could not load prices:{" "}
          <span className="font-mono text-ember">
            {error instanceof ApiError ? error.message : "unknown error"}
          </span>
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-mono uppercase tracking-wide text-slate-mist">
          Top {data?.markets.length ?? 0} by market cap, USD
        </span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-slate-mist hover:text-chalk transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          {isFetching ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <Card className="divide-y divide-line overflow-hidden">
        {data?.markets.map((coin) => (
          <div
            key={coin.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-mono text-slate-dim w-5 shrink-0 text-right">
                {coin.market_cap_rank}
              </span>
              <span className="text-sm text-chalk truncate">{coin.name}</span>
              <span className="text-xs font-mono text-slate-mist uppercase">
                {coin.symbol}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="font-mono text-sm text-chalk">
                ${formatUsd(coin.current_price)}
              </span>
              <span
                className={`font-mono text-xs w-16 text-right ${
                  (coin.price_change_percentage_24h ?? 0) >= 0
                    ? "text-indigo-light"
                    : "text-ember"
                }`}
              >
                {coin.price_change_percentage_24h?.toFixed(2) ?? "-"}%
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
