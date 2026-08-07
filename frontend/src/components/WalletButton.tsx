"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet2, Copy, Check, LogOut, ChevronDown } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";

function truncate(address: string) {
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

const SOURCE_LABEL: Record<string, string> = {
  wallet: "Connected wallet",
  telegram: "Connected via Telegram",
  account: "Connected via account",
};

/**
 * Only ever mounted while connected (see WalletButton below), so its
 * own open/copied state naturally starts fresh each time - no effect
 * needed to reset it if the wallet disconnects out from under us
 * (another tab, revoked access), since this whole component unmounts
 * in that case.
 */
function ConnectedWalletMenu({
  address,
  sourceNote,
  onDisconnect,
  compact,
}: {
  address: string;
  sourceNote: string;
  onDisconnect: () => void;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) -
      // non-fatal, the address is still visible to copy manually.
    }
  };

  return (
    <div ref={rootRef} className={`relative ${compact ? "" : "w-full"}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={sourceNote}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`group flex items-center gap-2 rounded-lg border border-line-strong hover:border-indigo-light/50
          font-mono text-xs text-chalk transition-colors
          ${compact ? "px-2.5 py-1.5" : "w-full px-3 py-2.5 mt-2"}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-light shrink-0" />
        <span className="truncate flex-1 text-left">{truncate(address)}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-slate-dim transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-20 rounded-lg border border-line-strong bg-surface-raised shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]
            py-1 ${compact ? "right-0 top-full mt-1.5 w-56" : "left-0 bottom-full mb-1.5 w-full"}`}
        >
          <div className="px-3 py-2 border-b border-line">
            <p className="text-[10px] uppercase tracking-wider text-slate-dim">{sourceNote}</p>
            <p className="font-mono text-xs text-chalk mt-0.5 truncate">{address}</p>
          </div>
          <button
            role="menuitem"
            onClick={handleCopy}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-mist hover:text-chalk hover:bg-white/[0.04] transition-colors"
          >
            {copied ? <Check size={14} className="text-indigo-light" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy address"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onDisconnect();
              setOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-mist hover:text-ember hover:bg-white/[0.04] transition-colors"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const {
    connected,
    address,
    connecting,
    connectError,
    identitySource,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  if (connected && address) {
    const sourceNote = identitySource ? SOURCE_LABEL[identitySource] : "Connected";
    return (
      <ConnectedWalletMenu
        // Keying by address (re)mounts a fresh menu instance whenever
        // the connected address changes - including a reconnect after
        // an external disconnect - so `open` always starts closed.
        key={address}
        address={address}
        sourceNote={sourceNote}
        onDisconnect={disconnectWallet}
        compact={compact}
      />
    );
  }

  const walletConnectConfigured = Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);

  return (
    <div className={compact ? "" : "w-full"}>
      <button
        onClick={connectWallet}
        disabled={connecting}
        className={`flex items-center justify-center gap-2 rounded-lg bg-indigo hover:bg-indigo-light
          transition-colors disabled:opacity-60 text-sm font-medium text-chalk
          ${compact ? "px-3 py-1.5" : "w-full px-4 py-2.5 mt-2"}`}
      >
        <Wallet2 size={15} />
        {connecting ? "Connecting..." : "Connect wallet"}
      </button>
      {connectError && (
        <p className="mt-1.5 text-[11px] leading-snug text-ember">{connectError}</p>
      )}
      {!compact && !connectError && !walletConnectConfigured && (
        <p className="mt-1.5 text-[11px] leading-snug text-slate-dim">
          On mobile, this only detects a wallet&apos;s own in-app browser.
          To connect an installed wallet app from any browser, set{" "}
          <code className="font-mono">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>.
        </p>
      )}
    </div>
  );
}
