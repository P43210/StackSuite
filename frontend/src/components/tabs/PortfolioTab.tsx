"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Coins, Star, Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet-context";
import { fetchPortfolio, microStxToStx, ApiError } from "@/lib/api";
import { listTrackedWallets, TrackedWallet } from "@/lib/tracked-wallets";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeading } from "@/components/ui/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { TipJar } from "@/components/TipJar";

function truncateContract(contract: string) {
  const [principal, name] = contract.split(".");
  const shortPrincipal = `${principal.slice(0, 5)}...${principal.slice(-4)}`;
  return name ? `${shortPrincipal}.${name}` : shortPrincipal;
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PortfolioTab() {
  const { connected, address, connectWallet } = useWallet();
  const [tracked, setTracked] = useState<TrackedWallet[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);
  const [showTipJar, setShowTipJar] = useState(false);

  useEffect(() => {
    setTracked(listTrackedWallets());
  }, []);

  // Default to the connected wallet the first time one becomes available;
  // after that, whichever wallet the person picked from the switcher wins.
  useEffect(() => {
    if (address && viewing === null) setViewing(address);
  }, [address, viewing]);

  const viewingAddress = viewing ?? address;
  const hasAnyWallet = connected || tracked.length > 0;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["portfolio", viewingAddress],
    queryFn: () => fetchPortfolio(viewingAddress as string),
    enabled: !!viewingAddress,
  });

  return (
    <div>
      <PageHeading
        title="Portfolio"
        description="Live STX and token balances, read only and with no funds at risk."
      />

      {tracked.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tracked.map((w) => (
            <button
              key={w.address}
              onClick={() => setViewing(w.address)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono transition-colors ${
                viewingAddress === w.address
                  ? "bg-indigo text-chalk"
                  : "border border-line-strong text-slate-mist hover:text-chalk hover:border-indigo-light/60"
              }`}
            >
              <Star size={11} />
              {w.label} ({truncateAddress(w.address)})
            </button>
          ))}
        </div>
      )}

      {!hasAnyWallet && (
        <EmptyState
          title="No wallet connected"
          description="Connect a wallet to see your balances."
          action={<Button onClick={connectWallet}>Connect wallet</Button>}
        />
      )}

      {hasAnyWallet && isLoading && <Spinner label="Loading balances" />}

      {hasAnyWallet && isError && (
        <Card accent className="p-6 space-y-3">
          <p className="text-sm text-chalk">
            Could not load balances:{" "}
            <span className="font-mono text-ember">
              {error instanceof ApiError ? error.message : "unknown error"}
            </span>
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      )}

      {hasAnyWallet && data && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="text-xs font-mono uppercase tracking-wide text-slate-mist mb-1">
              STX balance
            </div>
            <div className="font-display text-4xl font-bold text-chalk">
              {microStxToStx(data.stx.balanceMicroStx)}{" "}
              <span className="text-slate-mist text-xl font-normal">STX</span>
            </div>
            {BigInt(data.stx.lockedMicroStx) > 0n && (
              <div className="text-xs font-mono text-slate-mist mt-3 pt-3 border-t border-line">
                {microStxToStx(data.stx.lockedMicroStx)} STX locked until burn
                height {data.stx.burnchainUnlockHeight}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-slate-mist mb-4">
              <Coins size={13} />
              Tokens ({data.tokens.length})
            </div>
            {data.tokens.length === 0 ? (
              <p className="text-sm text-slate-mist">
                No fungible tokens held by this address.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.tokens.map((token) => (
                  <li
                    key={token.contract}
                    className="flex justify-between items-center font-mono text-sm"
                  >
                    <span className="text-slate-mist">{truncateContract(token.contract)}</span>
                    <span className="text-chalk">{token.balance}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex items-center justify-between text-xs font-mono text-slate-dim px-1">
            <span>Updated {new Date(data.fetchedAt).toLocaleTimeString()}</span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 hover:text-chalk transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
              {isFetching ? "Refreshing" : "Refresh"}
            </button>
          </div>

          <button
            onClick={() => setShowTipJar((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-mono text-indigo-light hover:text-chalk transition-colors"
          >
            <Gift size={13} />
            {showTipJar ? "Hide tip jar" : "Show tip jar for this address"}
          </button>
          {showTipJar && viewingAddress && <TipJar address={viewingAddress} compact />}
        </div>
      )}
    </div>
  );
}
