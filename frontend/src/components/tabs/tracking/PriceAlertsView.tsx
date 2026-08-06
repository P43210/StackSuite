"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet-context";
import {
  fetchAlerts,
  createAlert,
  removeAlert,
  fetchCoinPrices,
  ApiError,
  AssetClass,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "NZD"];
const METALS = [
  { code: "XAU", name: "Gold" },
  { code: "XAG", name: "Silver" },
  { code: "XPT", name: "Platinum" },
  { code: "XPD", name: "Palladium" },
];
const SELECT_CLASS =
  "rounded-lg bg-black/20 border border-line px-3 py-2 font-mono text-sm text-chalk focus:outline-none focus:border-indigo-light transition-colors";

function AssetClassPicker({
  value,
  onChange,
}: {
  value: AssetClass;
  onChange: (cls: AssetClass) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {(["crypto", "forex", "commodity"] as AssetClass[]).map((cls) => (
        <button
          key={cls}
          onClick={() => onChange(cls)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
            value === cls
              ? "bg-indigo text-chalk"
              : "border border-line text-slate-mist hover:text-chalk"
          }`}
        >
          {cls}
        </button>
      ))}
    </div>
  );
}

function CreateAlertForm({ address }: { address: string }) {
  const queryClient = useQueryClient();
  const [assetClass, setAssetClass] = useState<AssetClass>("crypto");
  const [cryptoId, setCryptoId] = useState("");
  const [forexBase, setForexBase] = useState("EUR");
  const [forexQuote, setForexQuote] = useState("USD");
  const [metalCode, setMetalCode] = useState("XAU");
  const [comparator, setComparator] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");

  const coinsQuery = useQuery({
    queryKey: ["alerts-coin-options"],
    queryFn: () => fetchCoinPrices("usd", 100),
    enabled: assetClass === "crypto",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const price = Number(targetPrice);
      if (assetClass === "crypto") {
        const coin = coinsQuery.data?.markets.find((c) => c.id === cryptoId);
        if (!coin) throw new Error("pick a coin first");
        return createAlert({ address, assetClass: "crypto", symbol: coin.id, displayName: coin.name, comparator, targetPrice: price });
      }
      if (assetClass === "forex") {
        if (forexBase === forexQuote) throw new Error("base and quote must differ");
        return createAlert({ address, assetClass: "forex", symbol: `${forexBase}_${forexQuote}`, displayName: `${forexBase}/${forexQuote}`, comparator, targetPrice: price });
      }
      const metal = METALS.find((m) => m.code === metalCode)!;
      return createAlert({ address, assetClass: "commodity", symbol: metal.code, displayName: metal.name, comparator, targetPrice: price });
    },
    onSuccess: () => {
      setTargetPrice("");
      queryClient.invalidateQueries({ queryKey: ["alerts", address] });
    },
  });

  return (
    <Card className="p-4 space-y-3">
      <AssetClassPicker value={assetClass} onChange={setAssetClass} />

      {assetClass === "crypto" && (
        <select value={cryptoId} onChange={(e) => setCryptoId(e.target.value)} className={`w-full ${SELECT_CLASS}`}>
          <option value="">Select a coin...</option>
          {coinsQuery.data?.markets.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>
          ))}
        </select>
      )}

      {assetClass === "forex" && (
        <div className="flex gap-2 items-center">
          <select value={forexBase} onChange={(e) => setForexBase(e.target.value)} className={`flex-1 ${SELECT_CLASS}`}>
            {MAJOR_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-slate-mist font-mono text-sm">/</span>
          <select value={forexQuote} onChange={(e) => setForexQuote(e.target.value)} className={`flex-1 ${SELECT_CLASS}`}>
            {MAJOR_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {assetClass === "commodity" && (
        <select value={metalCode} onChange={(e) => setMetalCode(e.target.value)} className={`w-full ${SELECT_CLASS}`}>
          {METALS.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
        </select>
      )}

      <div className="flex gap-2">
        <select value={comparator} onChange={(e) => setComparator(e.target.value as "above" | "below")} className={SELECT_CLASS}>
          <option value="above">Goes above</option>
          <option value="below">Goes below</option>
        </select>
        <input
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          type="number"
          min="0"
          placeholder="Target price"
          className={`flex-1 ${SELECT_CLASS}`}
        />
      </div>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !targetPrice || (assetClass === "crypto" && !cryptoId)}
      >
        {mutation.isPending ? "Creating..." : "Create alert"}
      </Button>

      <p className="text-xs text-slate-dim">
        Alerts are checked about once a minute and notify through your
        linked Telegram bot. Link it on the Telegram Bot tab first.
      </p>

      {mutation.isError && (
        <p className="text-xs font-mono text-ember">
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : mutation.error instanceof Error
              ? mutation.error.message
              : "Could not create alert."}
        </p>
      )}
    </Card>
  );
}

export function PriceAlertsView() {
  const { connected, address, connectWallet } = useWallet();
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ["alerts", address],
    queryFn: () => fetchAlerts(address as string),
    enabled: connected && !!address,
    refetchInterval: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: removeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", address] });
    },
  });

  if (!connected) {
    return (
      <EmptyState
        title="No wallet connected"
        description="Connect a wallet to set price alerts."
        action={<Button onClick={connectWallet}>Connect wallet</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <CreateAlertForm address={address as string} />

      {alertsQuery.isLoading && <Spinner label="Loading alerts" />}

      {alertsQuery.data && alertsQuery.data.alerts.length === 0 && (
        <EmptyState title="No alerts set" description="Create one above to get notified in Telegram." />
      )}

      {alertsQuery.data && alertsQuery.data.alerts.length > 0 && (
        <Card className="divide-y divide-line overflow-hidden">
          {alertsQuery.data.alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="text-sm text-chalk flex items-center gap-2 flex-wrap">
                <span>{alert.display_name}</span>
                <span className="text-slate-mist font-mono text-xs">
                  {alert.comparator} {alert.target_price}
                </span>
                {alert.triggered && <Badge tone="warning">triggered</Badge>}
              </div>
              <button
                onClick={() => removeMutation.mutate(alert.id)}
                className="text-xs font-mono text-slate-mist hover:text-ember transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
