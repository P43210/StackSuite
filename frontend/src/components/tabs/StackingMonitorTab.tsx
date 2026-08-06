"use client";

import { useEffect, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Sprout, Lock, LockOpen, Plus } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { fetchPoxInfo, fetchStackingStatus, microStxToStx, ApiError } from "@/lib/api";
import { listTrackedWallets, trackWallet, TrackedWallet } from "@/lib/tracked-wallets";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { PageHeading } from "@/components/ui/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function StackingMonitorTab() {
  const { address: connectedAddress, connected, connectWallet } = useWallet();
  const [tracked, setTracked] = useState<TrackedWallet[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    setTracked(listTrackedWallets());
  }, []);

  const poxQuery = useQuery({
    queryKey: ["pox-info"],
    queryFn: fetchPoxInfo,
    staleTime: 5 * 60_000,
  });

  const watchedAddresses = Array.from(
    new Set([...(connectedAddress ? [connectedAddress] : []), ...tracked.map((w) => w.address)]),
  );

  const statusQueries = useQueries({
    queries: watchedAddresses.map((address) => ({
      queryKey: ["stacking-status", address],
      queryFn: () => fetchStackingStatus(address),
      staleTime: 60_000,
    })),
  });

  const addWatchAddress = () => {
    const address = manualInput.trim();
    setInputError(null);
    if (!address) return;
    if (!STX_PRINCIPAL_PATTERN.test(address)) {
      setInputError("That doesn't look like a valid Stacks address.");
      return;
    }
    const next = trackWallet(address, "Watched address", "watched");
    setTracked(next);
    setManualInput("");
  };

  return (
    <div>
      <PageHeading
        title="Stacking Monitor"
        description="Read-only view of active PoX stacking across your tracked wallets - no funds pass through StackSuite."
      />

      {poxQuery.data && (
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-slate-mist mb-4">
            <Sprout size={13} />
            Current PoX cycle
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-sm font-mono">
            <span className="text-slate-mist">Cycle</span>
            <span className="text-chalk">#{poxQuery.data.currentCycle}</span>
            <span className="text-slate-mist">Total stacked</span>
            <span className="text-chalk">
              {microStxToStx(poxQuery.data.totalStackedMicroStx)} STX
            </span>
            <span className="text-slate-mist">Min. threshold</span>
            <span className="text-chalk">
              {microStxToStx(poxQuery.data.minThresholdMicroStx)} STX
            </span>
            <span className="text-slate-mist">Reward cycle length</span>
            <span className="text-chalk">{poxQuery.data.rewardCycleLength} blocks</span>
          </div>
        </Card>
      )}

      {poxQuery.isError && (
        <Card accent className="p-4 mb-6">
          <p className="text-xs font-mono text-ember">
            {poxQuery.error instanceof ApiError ? poxQuery.error.message : "Could not load PoX cycle info"}
          </p>
        </Card>
      )}

      <Card className="p-6 mb-6 space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Field
              label="Watch a Stacks address"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWatchAddress()}
              placeholder="SP2J6ZY48..."
            />
          </div>
          <Button variant="secondary" onClick={addWatchAddress}>
            <Plus size={15} />
            Watch
          </Button>
        </div>
        {inputError && <p className="text-xs font-mono text-ember">{inputError}</p>}
        {!connected && (
          <button
            onClick={connectWallet}
            className="text-xs font-mono text-indigo-light hover:text-chalk transition-colors"
          >
            Or connect a wallet to monitor it automatically
          </button>
        )}
      </Card>

      {watchedAddresses.length === 0 && (
        <EmptyState
          title="No wallets being monitored yet"
          description="Connect a wallet or watch an address above to see its stacking status."
        />
      )}

      {watchedAddresses.length > 0 && (
        <div className="space-y-3">
          {watchedAddresses.map((address, i) => {
            const result = statusQueries[i];
            const label = tracked.find((w) => w.address === address)?.label ??
              (address === connectedAddress ? "Connected wallet" : address);
            return (
              <Card key={address} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm text-chalk font-medium">{label}</div>
                    <div className="font-mono text-xs text-slate-mist">{truncate(address)}</div>
                  </div>
                  {result?.isLoading && <Spinner />}
                  {result?.data && (
                    <Badge tone={result.data.isStacking ? "positive" : "neutral"}>
                      {result.data.isStacking ? (
                        <span className="flex items-center gap-1">
                          <Lock size={11} /> Stacking
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <LockOpen size={11} /> Not stacking
                        </span>
                      )}
                    </Badge>
                  )}
                </div>
                {result?.isError && (
                  <p className="text-xs font-mono text-ember">
                    {result.error instanceof ApiError ? result.error.message : "Failed to load"}
                  </p>
                )}
                {result?.data?.isStacking && (
                  <div className="grid grid-cols-2 gap-y-1 text-xs font-mono mt-2 pt-2 border-t border-line">
                    <span className="text-slate-mist">Locked</span>
                    <span className="text-chalk">
                      {microStxToStx(result.data.lockedMicroStx)} STX
                    </span>
                    <span className="text-slate-mist">Unlocks at burn height</span>
                    <span className="text-chalk">{result.data.burnchainUnlockHeight}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
