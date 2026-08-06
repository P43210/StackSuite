"use client";

import { Bitcoin, CircleDollarSign, Layers3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGas, ApiError, GasResult } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

function ChainCard({
  name,
  icon: Icon,
  result,
  unit,
  rows,
}: {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  result: GasResult<any>;
  unit: string;
  rows: { label: string; value: number | null }[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-indigo-light" />
        <span className="font-display font-bold text-sm text-chalk">{name}</span>
      </div>
      {result.error && (
        <p className={`text-xs font-mono ${result.error.configured ? "text-ember" : "text-slate-mist"}`}>
          {result.error.message}
        </p>
      )}
      {result.data && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="text-xs font-mono text-slate-mist">{row.label}</div>
              <div className="font-mono text-lg text-chalk">
                {row.value ?? "-"}
                {row.value !== null && <span className="text-xs text-slate-mist"> {unit}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function GasFeeTracker() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["gas"],
    queryFn: fetchGas,
    refetchInterval: 30_000,
  });

  if (isLoading) return <Spinner label="Loading gas fees" />;

  if (isError) {
    return (
      <Card accent className="p-6">
        <p className="text-sm text-chalk">
          Could not load gas fees:{" "}
          <span className="font-mono text-ember">
            {error instanceof ApiError ? error.message : "unknown error"}
          </span>
        </p>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      <ChainCard
        name="Bitcoin"
        icon={Bitcoin}
        result={data.bitcoin}
        unit="sat/vB"
        rows={[
          { label: "Economy", value: data.bitcoin.data?.economyFeeSatPerVb ?? null },
          { label: "30 min", value: data.bitcoin.data?.halfHourFeeSatPerVb ?? null },
          { label: "Fastest", value: data.bitcoin.data?.fastestFeeSatPerVb ?? null },
        ]}
      />
      <ChainCard
        name="Ethereum"
        icon={CircleDollarSign}
        result={data.ethereum}
        unit="Gwei"
        rows={[
          { label: "Safe", value: data.ethereum.data?.safeGwei ?? null },
          { label: "Propose", value: data.ethereum.data?.proposeGwei ?? null },
          { label: "Fast", value: data.ethereum.data?.fastGwei ?? null },
        ]}
      />
      <ChainCard
        name="Stacks"
        icon={Layers3}
        result={data.stacks}
        unit="uSTX"
        rows={[
          { label: "Low", value: data.stacks.data?.lowPriority ?? null },
          { label: "Medium", value: data.stacks.data?.mediumPriority ?? null },
          { label: "High", value: data.stacks.data?.highPriority ?? null },
        ]}
      />
    </div>
  );
}
