"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchMovers, ApiError, CoinMarket } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

function MoverRow({ coin }: { coin: CoinMarket }) {
  const change = coin.price_change_percentage_24h ?? 0;
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-chalk truncate">{coin.name}</span>
        <span className="text-xs font-mono text-slate-mist uppercase">{coin.symbol}</span>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className="font-mono text-sm text-chalk">
          ${coin.current_price.toLocaleString(undefined, {
            maximumFractionDigits: coin.current_price >= 1 ? 2 : 6,
          })}
        </span>
        <span
          className={`font-mono text-xs w-16 text-right ${
            change >= 0 ? "text-indigo-light" : "text-ember"
          }`}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export function TopMovers() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["market-movers"],
    queryFn: () => fetchMovers("usd", 10),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Spinner label="Loading movers" />;

  if (isError) {
    return (
      <Card accent className="p-6 space-y-3">
        <p className="text-sm text-chalk">
          Could not load movers:{" "}
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
    <div className="space-y-6">
      <p className="text-xs text-slate-dim px-1">
        Ranked among the top 250 coins by market cap, so a thinly-traded
        micro-cap swinging wildly doesn&apos;t drown out what&apos;s actually moving.
      </p>

      <div>
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <TrendingUp size={14} className="text-indigo-light" />
          <h3 className="text-sm font-medium text-indigo-light">Top gainers (24h)</h3>
        </div>
        <Card className="divide-y divide-line overflow-hidden">
          {data?.gainers.map((coin) => (
            <MoverRow key={coin.id} coin={coin} />
          ))}
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <TrendingDown size={14} className="text-ember" />
          <h3 className="text-sm font-medium text-ember">Top losers (24h)</h3>
        </div>
        <Card className="divide-y divide-line overflow-hidden">
          {data?.losers.map((coin) => (
            <MoverRow key={coin.id} coin={coin} />
          ))}
        </Card>
      </div>
    </div>
  );
}
