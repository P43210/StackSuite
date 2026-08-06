"use client";

import { useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { X, Plus, Scale } from "lucide-react";
import { fetchPortfolio, microStxToStx, ApiError } from "@/lib/api";
import { listTrackedWallets, TrackedWallet } from "@/lib/tracked-wallets";
import { useWallet } from "@/lib/wallet-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { PageHeading } from "@/components/ui/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

const MAX_COMPARE = 5;
const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function CompareWalletsTab() {
  const { address: connectedAddress } = useWallet();
  const [selected, setSelected] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<TrackedWallet[]>([]);

  useEffect(() => {
    setTracked(listTrackedWallets());
  }, []);

  const addAddress = (raw: string) => {
    const address = raw.trim();
    setInputError(null);
    if (!address) return;
    if (!STX_PRINCIPAL_PATTERN.test(address)) {
      setInputError("That doesn't look like a valid Stacks address.");
      return;
    }
    if (selected.includes(address)) {
      setInputError("Already added to the comparison.");
      return;
    }
    if (selected.length >= MAX_COMPARE) {
      setInputError(`You can compare up to ${MAX_COMPARE} wallets at a time.`);
      return;
    }
    setSelected((prev) => [...prev, address]);
    setManualInput("");
  };

  const removeAddress = (address: string) => {
    setSelected((prev) => prev.filter((a) => a !== address));
  };

  const results = useQueries({
    queries: selected.map((address) => ({
      queryKey: ["portfolio", address],
      queryFn: () => fetchPortfolio(address),
      staleTime: 30_000,
    })),
  });

  const quickAddOptions = [
    ...(connectedAddress && !selected.includes(connectedAddress)
      ? [{ address: connectedAddress, label: "Connected wallet" }]
      : []),
    ...tracked
      .filter((w) => w.address !== connectedAddress && !selected.includes(w.address))
      .map((w) => ({ address: w.address, label: w.label })),
  ];

  return (
    <div>
      <PageHeading
        title="Compare Wallets"
        description={`Compare STX balances and holdings across up to ${MAX_COMPARE} addresses side by side.`}
      />

      <Card className="p-6 mb-6 space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Field
              label="Add a Stacks address"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAddress(manualInput)}
              placeholder="SP2J6ZY48..."
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => addAddress(manualInput)}
            disabled={selected.length >= MAX_COMPARE}
          >
            <Plus size={15} />
            Add
          </Button>
        </div>
        {inputError && <p className="text-xs font-mono text-ember">{inputError}</p>}

        {quickAddOptions.length > 0 && selected.length < MAX_COMPARE && (
          <div>
            <span className="text-xs font-mono uppercase tracking-wide text-slate-mist">
              Quick add from your tracked wallets
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {quickAddOptions.map((opt) => (
                <button
                  key={opt.address}
                  onClick={() => addAddress(opt.address)}
                  className="flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs
                    text-slate-mist hover:text-chalk hover:border-indigo-light/60 transition-colors"
                >
                  <Plus size={11} />
                  {opt.label} ({truncate(opt.address)})
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {selected.length === 0 && (
        <EmptyState
          title="No wallets to compare yet"
          description="Add two or more Stacks addresses above to see their balances side by side."
        />
      )}

      {selected.length > 0 && (
        <div className="space-y-4">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}
          >
            {selected.map((address, i) => {
              const result = results[i];
              return (
                <Card key={address} className="p-4 relative">
                  <button
                    onClick={() => removeAddress(address)}
                    aria-label={`Remove ${address}`}
                    className="absolute top-2.5 right-2.5 text-slate-dim hover:text-ember transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="font-mono text-xs text-slate-mist truncate pr-5" title={address}>
                    {truncate(address)}
                  </div>
                  {address === connectedAddress && <Badge tone="positive">connected</Badge>}

                  {result?.isLoading && (
                    <div className="mt-3">
                      <Spinner />
                    </div>
                  )}

                  {result?.isError && (
                    <p className="mt-3 text-xs font-mono text-ember">
                      {result.error instanceof ApiError ? result.error.message : "Failed to load"}
                    </p>
                  )}

                  {result?.data && (
                    <div className="mt-3">
                      <div className="font-display text-xl font-bold text-chalk">
                        {microStxToStx(result.data.stx.balanceMicroStx)}
                      </div>
                      <div className="text-xs text-slate-mist mb-2">STX</div>
                      {BigInt(result.data.stx.lockedMicroStx) > 0n && (
                        <Badge tone="neutral">
                          {microStxToStx(result.data.stx.lockedMicroStx)} locked
                        </Badge>
                      )}
                      <div className="text-xs font-mono text-slate-mist mt-3 pt-3 border-t border-line">
                        {result.data.tokens.length} token
                        {result.data.tokens.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {selected.length >= 2 && results.every((r) => r.data) && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-slate-mist mb-3">
                <Scale size={13} />
                Highest STX balance
              </div>
              <p className="text-sm text-chalk font-mono">
                {(() => {
                  const withBalances = selected.map((address, i) => ({
                    address,
                    balance: BigInt(results[i].data!.stx.balanceMicroStx),
                  }));
                  const top = withBalances.reduce((a, b) => (b.balance > a.balance ? b : a));
                  return `${truncate(top.address)} - ${microStxToStx(top.balance.toString())} STX`;
                })()}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
