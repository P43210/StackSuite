"use client";

import { useEffect, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Search, Star, StarOff, IdCard, Gift } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { resolveBnsName, fetchOwnedBnsNames, ApiError } from "@/lib/api";
import {
  addToBnsWatchlist,
  listWatchedBnsNames,
  removeFromBnsWatchlist,
} from "@/lib/bns-watchlist";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { PageHeading } from "@/components/ui/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { SubTabBar } from "@/components/ui/SubTabBar";
import { TipJar } from "@/components/TipJar";

const SUB_TABS = [
  { id: "resolve", label: "Resolve" },
  { id: "mine", label: "By Address" },
  { id: "watchlist", label: "Watchlist" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function ResolvePanel() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [watched, setWatched] = useState<string[]>([]);
  const [showTipJar, setShowTipJar] = useState(false);

  useEffect(() => {
    setWatched(listWatchedBnsNames());
  }, []);

  const result = useQuery({
    queryKey: ["bns-resolve", submitted],
    queryFn: () => resolveBnsName(submitted as string),
    enabled: !!submitted,
    retry: false,
  });

  const isWatched = submitted ? watched.includes(submitted.toLowerCase()) : false;

  const toggleWatch = () => {
    if (!submitted) return;
    const next = isWatched
      ? removeFromBnsWatchlist(submitted.toLowerCase())
      : addToBnsWatchlist(submitted.toLowerCase());
    setWatched(next);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Field
              label="BNS name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSubmitted(query.trim().toLowerCase())}
              placeholder="muneeb.btc"
            />
          </div>
          <Button onClick={() => setSubmitted(query.trim().toLowerCase())} disabled={!query.trim()}>
            <Search size={15} />
            Resolve
          </Button>
        </div>
      </Card>

      {result.isLoading && <Spinner label="Resolving" />}

      {result.isError && (
        <Card accent className="p-6">
          <p className="text-sm text-chalk">
            <span className="font-mono text-ember">
              {result.error instanceof ApiError ? result.error.message : "Could not resolve that name"}
            </span>
          </p>
        </Card>
      )}

      {result.data && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-chalk">{result.data.name}</span>
            <Badge tone={result.data.status === "registered" ? "positive" : "neutral"}>
              {result.data.status}
            </Badge>
          </div>
          <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm font-mono">
            <span className="text-slate-mist">Owner</span>
            <span className="text-chalk truncate">{result.data.address ?? "unknown"}</span>
            {result.data.expireBlock !== null && (
              <>
                <span className="text-slate-mist">Expires at block</span>
                <span className="text-chalk">{result.data.expireBlock}</span>
              </>
            )}
            {result.data.gracePeriod !== null && (
              <>
                <span className="text-slate-mist">Grace period</span>
                <span className="text-chalk">{result.data.gracePeriod} blocks</span>
              </>
            )}
          </div>
          <Button variant="secondary" onClick={toggleWatch} className="w-full">
            {isWatched ? <StarOff size={15} /> : <Star size={15} />}
            {isWatched ? "Remove from watchlist" : "Add to watchlist"}
          </Button>
          {result.data.address && (
            <button
              onClick={() => setShowTipJar((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-mono text-indigo-light hover:text-chalk transition-colors"
            >
              <Gift size={13} />
              {showTipJar ? "Hide tip jar" : `Tip ${result.data.name}`}
            </button>
          )}
        </Card>
      )}

      {result.data?.address && showTipJar && (
        <TipJar address={result.data.address} name={result.data.name} compact />
      )}
    </div>
  );
}

/** Loose sanity check for a Stacks address (mainnet SP.../testnet ST...),
 * just enough to avoid firing a lookup on obvious garbage input. The API
 * call itself is the real source of truth. */
function looksLikeStacksAddress(value: string) {
  return /^S[PT][0-9A-Z]{20,40}$/i.test(value.trim());
}

function MyNamesPanel() {
  const { connected, address, connectWallet } = useWallet();

  // The address currently being looked up - defaults to the connected
  // wallet once one is available, but can be overridden by typing any
  // other address in, so names can be looked up for wallets you don't
  // control too.
  const [lookupAddress, setLookupAddress] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (!lookupAddress && connected && address) {
      setLookupAddress(address);
    }
  }, [connected, address, lookupAddress]);

  const namesQuery = useQuery({
    queryKey: ["bns-owned", lookupAddress],
    queryFn: () => fetchOwnedBnsNames(lookupAddress as string),
    enabled: !!lookupAddress,
  });

  const submitAddress = () => {
    const trimmed = addressInput.trim();
    if (!looksLikeStacksAddress(trimmed)) {
      setAddressError("That doesn't look like a valid Stacks address");
      return;
    }
    setAddressError(null);
    setLookupAddress(trimmed);
    setSearching(false);
    setAddressInput("");
  };

  if (!lookupAddress) {
    return (
      <div className="space-y-4">
        {!connected && (
          <EmptyState
            title="No wallet connected"
            description="Connect a wallet to see which BNS names it owns, or search any address below."
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
              Look up
            </Button>
          </div>
          {addressError && <p className="text-xs font-mono text-ember">{addressError}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs font-mono text-slate-mist uppercase tracking-wide">
          Showing{" "}
          <span className="text-chalk normal-case">{truncate(lookupAddress)}</span>
          {lookupAddress === address && <span className="text-indigo-light"> (connected)</span>}
        </p>
        {searching ? (
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <input
              autoFocus
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAddress();
                if (e.key === "Escape") setSearching(false);
              }}
              placeholder="Paste a Stacks address"
              className="flex-1 sm:w-72 rounded-lg bg-black/20 border border-line px-3 py-1.5 font-mono text-xs text-chalk placeholder:text-slate-dim focus:outline-none focus:border-indigo-light transition-colors"
            />
            <Button variant="secondary" onClick={submitAddress} className="!px-3 !py-1.5 text-xs">
              Go
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              setSearching(true);
              setAddressError(null);
            }}
            className="text-xs font-mono text-indigo-light hover:text-chalk transition-colors"
          >
            Search a different address
          </button>
        )}
      </div>
      {addressError && <p className="text-xs font-mono text-ember px-1">{addressError}</p>}

      {namesQuery.isLoading && <Spinner label="Looking up names" />}
      {namesQuery.isError && (
        <Card accent className="p-6">
          <p className="text-sm font-mono text-ember">
            {namesQuery.error instanceof ApiError ? namesQuery.error.message : "Could not load names"}
          </p>
        </Card>
      )}
      {namesQuery.data && namesQuery.data.names.length === 0 && (
        <EmptyState
          title="No BNS names owned"
          description={`${truncate(lookupAddress)} doesn't own any registered BNS names.`}
        />
      )}
      {namesQuery.data && namesQuery.data.names.length > 0 && (
        <Card glass className="divide-y divide-line overflow-hidden">
          {namesQuery.data.names.map((name) => (
            <div key={name} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex items-center gap-2 min-w-0">
                <IdCard size={15} className="text-indigo-light shrink-0" />
                <span className="text-sm text-chalk font-mono truncate">{name}</span>
              </div>
              <Badge tone="positive">active</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function WatchlistPanel() {
  const [watched, setWatched] = useState<string[]>([]);

  useEffect(() => {
    setWatched(listWatchedBnsNames());
  }, []);

  const results = useQueries({
    queries: watched.map((name) => ({
      queryKey: ["bns-resolve", name],
      queryFn: () => resolveBnsName(name),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });

  const remove = (name: string) => setWatched(removeFromBnsWatchlist(name));

  if (watched.length === 0) {
    return (
      <EmptyState
        title="Your BNS watchlist is empty"
        description="Resolve a name and add it to your watchlist to track its owner and expiration here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {watched.map((name, i) => {
        const result = results[i];
        return (
          <Card key={name} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-mono text-chalk">{name}</div>
              {result?.data && (
                <div className="text-xs text-slate-mist mt-1 truncate">
                  {result.data.address ? truncate(result.data.address) : "unowned"}
                  {result.data.expireBlock !== null &&
                    ` \u00b7 expires at block ${result.data.expireBlock}`}
                </div>
              )}
              {result?.isError && (
                <div className="text-xs font-mono text-ember mt-1">
                  {result.error instanceof ApiError ? result.error.message : "Could not resolve"}
                </div>
              )}
              {result?.isLoading && <div className="text-xs text-slate-mist mt-1">Loading...</div>}
            </div>
            <button
              onClick={() => remove(name)}
              className="text-xs font-mono text-slate-mist hover:text-ember transition-colors shrink-0"
            >
              Remove
            </button>
          </Card>
        );
      })}
    </div>
  );
}

export function BnsTab() {
  const [active, setActive] = useState<SubTabId>("resolve");

  return (
    <div>
      <PageHeading
        title="BNS Names"
        description="Look up Bitcoin Name System names on Stacks, see what your wallet owns, and watch names for expiration."
      />
      <SubTabBar tabs={SUB_TABS} active={active} onChange={setActive} />

      {active === "resolve" && <ResolvePanel />}
      {active === "mine" && <MyNamesPanel />}
      {active === "watchlist" && <WatchlistPanel />}
    </div>
  );
}
