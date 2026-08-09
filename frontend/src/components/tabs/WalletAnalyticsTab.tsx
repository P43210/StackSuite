"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Coins, IdCard, Lock, LockOpen, Search, Clock, type LucideIcon } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import {
  fetchPortfolio,
  fetchStackingStatus,
  fetchWrappedStats,
  fetchOwnedBnsNames,
  fetchCoinPrices,
  microStxToStx,
  ApiError,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { PageHeading } from "@/components/ui/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

/** Loose sanity check for a Stacks address - same pattern used in the
 * BNS "by address" and Stacking Monitor panels. The API calls
 * themselves are the real source of truth. */
function looksLikeStacksAddress(value: string) {
  return /^S[PT][0-9A-Z]{20,40}$/i.test(value.trim());
}

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function truncateContract(contract: string) {
  const [principal, name] = contract.split(".");
  const shortPrincipal = `${principal.slice(0, 5)}...${principal.slice(-4)}`;
  return name ? `${shortPrincipal}.${name}` : shortPrincipal;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <Card glass className="p-4">
      <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-slate-mist mb-2">
        <Icon size={13} />
        {label}
      </div>
      <div className="font-display text-xl font-bold text-chalk truncate">{value}</div>
      {sub && <div className="text-xs font-mono text-slate-mist mt-1">{sub}</div>}
    </Card>
  );
}

export function WalletAnalyticsTab() {
  const { connected, address, connectWallet } = useWallet();
  const [viewingAddress, setViewingAddress] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewingAddress && connected && address) {
      setViewingAddress(address);
    }
  }, [connected, address, viewingAddress]);

  const submitAddress = () => {
    const trimmed = addressInput.trim();
    if (!looksLikeStacksAddress(trimmed)) {
      setAddressError("That doesn't look like a valid Stacks address");
      return;
    }
    setAddressError(null);
    setViewingAddress(trimmed);
    setSearching(false);
    setAddressInput("");
  };

  const portfolioQuery = useQuery({
    queryKey: ["analytics-portfolio", viewingAddress],
    queryFn: () => fetchPortfolio(viewingAddress as string),
    enabled: !!viewingAddress,
  });
  const stackingQuery = useQuery({
    queryKey: ["analytics-stacking", viewingAddress],
    queryFn: () => fetchStackingStatus(viewingAddress as string),
    enabled: !!viewingAddress,
  });
  const wrappedQuery = useQuery({
    queryKey: ["analytics-wrapped", viewingAddress],
    queryFn: () => fetchWrappedStats(viewingAddress as string),
    enabled: !!viewingAddress,
  });
  const bnsQuery = useQuery({
    queryKey: ["analytics-bns", viewingAddress],
    queryFn: () => fetchOwnedBnsNames(viewingAddress as string),
    enabled: !!viewingAddress,
  });
  // STX/USD reference price - a nice-to-have context number, not the
  // point of the page, so a failure here just hides the USD line
  // rather than blocking the rest of the dashboard.
  const priceQuery = useQuery({
    queryKey: ["analytics-stx-price"],
    queryFn: () => fetchCoinPrices("usd", 100),
    staleTime: 5 * 60_000,
    enabled: !!viewingAddress,
    retry: false,
  });

  const stxPrice = priceQuery.data?.markets.find((m) => m.symbol.toLowerCase() === "stx")
    ?.current_price;

  const loading =
    portfolioQuery.isLoading || stackingQuery.isLoading || wrappedQuery.isLoading || bnsQuery.isLoading;
  const anyError = portfolioQuery.isError || stackingQuery.isError;

  if (!viewingAddress) {
    return (
      <div>
        <PageHeading
          title="Wallet Analytics"
          description="Balances, holdings, stacking, and transaction history for any Stacks address, all in one view."
        />
        {!connected && (
          <EmptyState
            title="No wallet connected"
            description="Connect a wallet to see its analytics, or search any address below."
            action={<Button onClick={connectWallet}>Connect wallet</Button>}
          />
        )}
        <Card className="p-6 space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Field
                label="Wallet address"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAddress()}
                placeholder="SP3DYSKV87G6X8VXQ1E2C2TBED5NBK89K1NYAF3PS"
              />
            </div>
            <Button onClick={submitAddress} disabled={!addressInput.trim()}>
              <Search size={15} />
              Analyze
            </Button>
          </div>
          {addressError && <p className="text-xs font-mono text-ember">{addressError}</p>}
        </Card>
      </div>
    );
  }

  const stxBalance = portfolioQuery.data ? microStxToStx(portfolioQuery.data.stx.balanceMicroStx) : null;
  const stxLocked = portfolioQuery.data ? microStxToStx(portfolioQuery.data.stx.lockedMicroStx) : null;
  const balanceMicro = portfolioQuery.data ? BigInt(portfolioQuery.data.stx.balanceMicroStx) : 0n;
  const lockedMicro = portfolioQuery.data ? BigInt(portfolioQuery.data.stx.lockedMicroStx) : 0n;
  const totalMicro = balanceMicro + lockedMicro;
  const lockedPct = totalMicro > 0n ? Number((lockedMicro * 1000n) / totalMicro) / 10 : 0;

  return (
    <div>
      <PageHeading
        title="Wallet Analytics"
        description="Balances, holdings, stacking, and transaction history for any Stacks address, all in one view."
      />

      {/* Header bar - same "showing / search a different address" pattern
          used on the BNS "By Address" panel, for a consistent feel. */}
      <div className="rounded-xl border border-line bg-surface/60 px-4 py-3.5 mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-mono text-slate-mist uppercase tracking-wide">
          Showing{" "}
          <span className="text-chalk normal-case">{truncate(viewingAddress)}</span>
          {viewingAddress === address && <span className="text-indigo-light"> · connected</span>}
        </p>
        {!searching && (
          <Button
            variant="secondary"
            onClick={() => {
              setSearching(true);
              setAddressError(null);
            }}
            className="!px-3.5 !py-1.5 text-xs shrink-0"
          >
            Search a different address
          </Button>
        )}
      </div>

      {searching && (
        <div className="flex gap-2 items-center mb-6">
          <input
            autoFocus
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitAddress();
              if (e.key === "Escape") setSearching(false);
            }}
            placeholder="Paste a Stacks address"
            className="flex-1 rounded-lg bg-black/20 border border-line px-3 py-2 font-mono text-xs text-chalk placeholder:text-slate-dim focus:outline-none focus:border-indigo-light transition-colors"
          />
          <Button onClick={submitAddress} className="!px-4 !py-2 text-xs shrink-0">
            Go
          </Button>
        </div>
      )}
      {addressError && <p className="text-xs font-mono text-ember mb-4">{addressError}</p>}

      {loading && <Spinner label="Crunching wallet data" />}

      {anyError && (
        <Card accent className="p-6 mb-6">
          <p className="text-sm font-mono text-ember">
            {portfolioQuery.error instanceof ApiError
              ? portfolioQuery.error.message
              : stackingQuery.error instanceof ApiError
              ? stackingQuery.error.message
              : "Could not load analytics for this address"}
          </p>
        </Card>
      )}

      {!loading && portfolioQuery.data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Coins}
              label="STX balance"
              value={`${stxBalance} STX`}
              sub={
                stxPrice && stxBalance
                  ? `~$${(parseFloat(stxBalance) * stxPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : undefined
              }
            />
            <StatCard
              icon={stackingQuery.data?.isStacking ? Lock : LockOpen}
              label="Stacking"
              value={
                <Badge tone={stackingQuery.data?.isStacking ? "success" : "neutral"}>
                  {stackingQuery.data?.isStacking ? "Active" : "Not stacking"}
                </Badge>
              }
              sub={stackingQuery.data?.isStacking ? `${stxLocked} STX locked` : undefined}
            />
            <StatCard
              icon={IdCard}
              label="BNS names"
              value={bnsQuery.data?.names.length ?? (bnsQuery.isLoading ? "..." : 0)}
            />
            <StatCard
              icon={BarChart3}
              label="All-time transactions"
              value={wrappedQuery.data?.transactionCount ?? (wrappedQuery.isLoading ? "..." : "0")}
              sub={
                wrappedQuery.data?.firstTransaction.timeIso
                  ? `Since ${timeAgo(wrappedQuery.data.firstTransaction.timeIso)}`
                  : undefined
              }
            />
          </div>

          {totalMicro > 0n && (
            <Card className="p-5">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-slate-mist mb-3">
                <Lock size={13} />
                Liquid vs. locked STX
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-indigo to-indigo-light transition-all duration-500"
                  style={{ width: `${lockedPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs font-mono text-slate-mist">
                <span>{lockedPct.toFixed(1)}% locked ({stxLocked} STX)</span>
                <span>{(100 - lockedPct).toFixed(1)}% liquid ({stxBalance} STX)</span>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-slate-mist mb-4">
              <Coins size={13} />
              Token holdings ({portfolioQuery.data.tokens.length})
            </div>
            {portfolioQuery.data.tokens.length === 0 ? (
              <p className="text-sm text-slate-mist">No fungible tokens held by this address.</p>
            ) : (
              <ul className="space-y-3">
                {portfolioQuery.data.tokens.map((token) => (
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

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-dim px-1">
            <Clock size={12} />
            Updated {new Date(portfolioQuery.data.fetchedAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
