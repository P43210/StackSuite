"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet-context";
import {
  fetchWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  fetchCoinPrices,
  ApiError,
  AssetClass,
} from "@/lib/api";
import { toTradingViewSymbol } from "@/lib/tradingview-symbols";
import { TradingViewWidget } from "./TradingViewWidget";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "NZD"];
const METALS = [
  { code: "XAU", name: "Gold" },
  { code: "XAG", name: "Silver" },
  { code: "XPT", name: "Platinum" },
  { code: "XPD", name: "Palladium" },
];

function AddItemForm({ address }: { address: string }) {
  const queryClient = useQueryClient();
  const [assetClass, setAssetClass] = useState<AssetClass>("crypto");
  const [cryptoId, setCryptoId] = useState("");
  const [forexBase, setForexBase] = useState("EUR");
  const [forexQuote, setForexQuote] = useState("USD");
  const [metalCode, setMetalCode] = useState("XAU");

  const coinsQuery = useQuery({
    queryKey: ["watchlist-coin-options"],
    queryFn: () => fetchCoinPrices("usd", 100),
    enabled: assetClass === "crypto",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (assetClass === "crypto") {
        const coin = coinsQuery.data?.markets.find((c) => c.id === cryptoId);
        if (!coin) throw new Error("pick a coin first");
        return addWatchlistItem({
          address,
          assetClass: "crypto",
          symbol: coin.id,
          displayName: coin.name,
        });
      }
      if (assetClass === "forex") {
        if (forexBase === forexQuote) throw new Error("base and quote must differ");
        return addWatchlistItem({
          address,
          assetClass: "forex",
          symbol: `${forexBase}_${forexQuote}`,
          displayName: `${forexBase}/${forexQuote}`,
        });
      }
      const metal = METALS.find((m) => m.code === metalCode)!;
      return addWatchlistItem({
        address,
        assetClass: "commodity",
        symbol: metal.code,
        displayName: metal.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", address] });
    },
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex gap-1">
        {(["crypto", "forex", "commodity"] as AssetClass[]).map((cls) => (
          <button
            key={cls}
            onClick={() => setAssetClass(cls)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-colors ${
              assetClass === cls
                ? "bg-indigo text-chalk"
                : "border border-line text-slate-mist hover:text-chalk"
            }`}
          >
            {cls}
          </button>
        ))}
      </div>

      {assetClass === "crypto" && (
        <select
          value={cryptoId}
          onChange={(e) => setCryptoId(e.target.value)}
          className="w-full rounded-lg bg-black/20 border border-line px-3 py-2 font-mono text-sm focus:outline-none focus:border-indigo-light"
        >
          <option value="">Select a coin...</option>
          {coinsQuery.data?.markets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.symbol.toUpperCase()})
            </option>
          ))}
        </select>
      )}

      {assetClass === "forex" && (
        <div className="flex gap-2 items-center">
          <select
            value={forexBase}
            onChange={(e) => setForexBase(e.target.value)}
            className="flex-1 rounded-lg bg-black/20 border border-line px-3 py-2 font-mono text-sm focus:outline-none focus:border-indigo-light"
          >
            {MAJOR_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="text-slate-mist font-mono text-sm">/</span>
          <select
            value={forexQuote}
            onChange={(e) => setForexQuote(e.target.value)}
            className="flex-1 rounded-lg bg-black/20 border border-line px-3 py-2 font-mono text-sm focus:outline-none focus:border-indigo-light"
          >
            {MAJOR_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {assetClass === "commodity" && (
        <select
          value={metalCode}
          onChange={(e) => setMetalCode(e.target.value)}
          className="w-full rounded-lg bg-black/20 border border-line px-3 py-2 font-mono text-sm focus:outline-none focus:border-indigo-light"
        >
          {METALS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
            </option>
          ))}
        </select>
      )}

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || (assetClass === "crypto" && !cryptoId)}>
        {mutation.isPending ? "Adding..." : "Add to watchlist"}
      </Button>

      {mutation.isError && (
        <div className="text-xs font-mono text-ember">
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : mutation.error instanceof Error
              ? mutation.error.message
              : "Could not add item."}
        </div>
      )}
    </Card>
  );
}

export function WatchlistView() {
  const { connected, address, connectWallet } = useWallet();
  const queryClient = useQueryClient();

  const watchlistQuery = useQuery({
    queryKey: ["watchlist", address],
    queryFn: () => fetchWatchlist(address as string),
    enabled: connected && !!address,
  });

  const removeMutation = useMutation({
    mutationFn: removeWatchlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", address] });
    },
  });

  const widgetConfig = useMemo(() => {
    const items = watchlistQuery.data?.items ?? [];
    const grouped: Record<AssetClass, typeof items> = {
      crypto: [],
      forex: [],
      commodity: [],
    };
    for (const item of items) grouped[item.asset_class].push(item);

    const tabs = (["crypto", "forex", "commodity"] as AssetClass[])
      .filter((cls) => grouped[cls].length > 0)
      .map((cls) => ({
        title: cls === "crypto" ? "Crypto" : cls === "forex" ? "Forex" : "Commodities",
        symbols: grouped[cls].map((item) => ({
          s: toTradingViewSymbol(item.asset_class, item.symbol),
          d: item.display_name,
        })),
      }));

    return {
      colorTheme: "dark",
      locale: "en",
      width: "100%",
      height: 400,
      showChart: false,
      tabs,
    };
  }, [watchlistQuery.data]);

  if (!connected) {
    return (
      <EmptyState
        title="No wallet connected"
        description="Connect a wallet to build your watchlist."
        action={<Button onClick={connectWallet}>Connect wallet</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AddItemForm address={address as string} />

      {watchlistQuery.isLoading && <Spinner label="Loading watchlist" />}

      {watchlistQuery.data && watchlistQuery.data.items.length === 0 && (
        <EmptyState
          title="Nothing on your watchlist yet"
          description="Add a crypto, forex, or metals pair above to start tracking it."
        />
      )}

      {watchlistQuery.data && watchlistQuery.data.items.length > 0 && (
        <>
          <TradingViewWidget
            scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js"
            config={widgetConfig}
            height={400}
          />

          <Card className="divide-y divide-line overflow-hidden">
            {watchlistQuery.data.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <span className="text-sm text-chalk">
                  {item.display_name}{" "}
                  <span className="text-xs font-mono text-slate-mist capitalize">
                    ({item.asset_class})
                  </span>
                </span>
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  className="text-xs font-mono text-slate-mist hover:text-ember transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
