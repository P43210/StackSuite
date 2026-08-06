"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFearGreed, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

function classificationColor(classification: string): string {
  const c = classification.toLowerCase();
  if (c.includes("fear")) return "text-ember";
  if (c.includes("greed")) return "text-indigo-light";
  return "text-slate-mist";
}

function needleRotation(value: number): number {
  // 0 -> -90deg, 100 -> 90deg
  return (value / 100) * 180 - 90;
}

export function FearGreedIndex() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["fear-greed"],
    queryFn: fetchFearGreed,
    refetchInterval: 10 * 60_000,
  });

  if (isLoading) return <Spinner label="Loading sentiment" />;

  if (isError) {
    return (
      <Card accent className="p-6 space-y-3">
        <p className="text-sm text-chalk">
          Could not load the index:{" "}
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

  const value = data?.value ?? 0;

  return (
    <Card className="p-10 text-center">
      <div className="text-xs font-mono uppercase tracking-wide text-slate-mist mb-6">
        Crypto Fear &amp; Greed Index
      </div>

      <div className="relative w-40 h-20 mx-auto mb-2 overflow-hidden">
        <div
          className="absolute inset-0 rounded-t-full"
          style={{
            background:
              "conic-gradient(from 180deg, #F2994A 0deg, #8A86A8 90deg, #7B70F5 180deg, transparent 180deg)",
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          }}
        />
        <div
          className="absolute left-1/2 bottom-0 w-0.5 h-16 bg-chalk origin-bottom transition-transform"
          style={{ transform: `translateX(-50%) rotate(${needleRotation(value)}deg)` }}
        />
        <div className="absolute left-1/2 bottom-0 w-2.5 h-2.5 rounded-full bg-chalk -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="font-display text-6xl font-bold text-chalk">{value}</div>
      <div className={`font-mono text-base mt-1 ${classificationColor(data?.classification ?? "")}`}>
        {data?.classification}
      </div>
      <div className="text-xs text-slate-dim mt-4">
        Updated {data ? new Date(data.timestamp * 1000).toLocaleString() : ""}
      </div>
    </Card>
  );
}
