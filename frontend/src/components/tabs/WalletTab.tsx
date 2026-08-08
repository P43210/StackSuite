"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  KeyRound,
  ShieldAlert,
  Bitcoin,
  Layers3,
  CircleDollarSign,
  Settings,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { walletManager, MultiChainAccounts } from "@/lib/wallet/wallet-instance";
import {
  WalletAlreadyExistsError,
  InvalidMnemonicError,
  NoWalletFoundError,
} from "@/lib/wallet/wallet-manager";
import { fetchPortfolio, fetchCoinPrices, microStxToStx } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DangerAction } from "@/components/ui/DangerAction";
import { Field, TextAreaField } from "@/components/ui/Field";
import { PageHeading } from "@/components/ui/PageHeading";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { trackWallet, untrackWallet } from "@/lib/tracked-wallets";
import { TipJar } from "@/components/TipJar";
import { SendModal } from "@/components/tabs/wallet/SendModal";

type Screen = "loading" | "choice" | "create-show" | "create-confirm" | "import" | "unlock" | "unlocked";
type WalletTabId = "tokens" | "earn" | "nfts" | "activity";

const CHAIN_META = {
  stacks: { label: "Stacks", symbol: "STX", icon: Layers3, bg: "#F2994A" },
  bitcoin: { label: "Bitcoin", symbol: "BTC", icon: Bitcoin, bg: "#F7931A" },
  ethereum: { label: "Ethereum", symbol: "ETH", icon: CircleDollarSign, bg: "#627EEA" },
} as const;

function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "usd",
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  });
}

/** A single Send/Receive circular action button, screenshot-style. */
function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ArrowUp;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-chalk text-ink group-hover:bg-white transition-colors">
        <Icon size={20} strokeWidth={2.25} />
      </span>
      <span className="text-xs text-slate-mist group-hover:text-chalk transition-colors">
        {label}
      </span>
    </button>
  );
}

/**
 * Receive panel: a chain switcher above a scannable QR code for
 * whichever chain is selected, with the raw address underneath as a
 * fallback for copy/paste. Encodes the bare address (no URI scheme
 * prefix like "bitcoin:") since the app only supports plain transfers
 * to a chain's default address today, not payment-request params -
 * every wallet scanner handles a bare address fine, but a prefixed
 * URI would be misleading if we're not also encoding amount/label.
 */
function ReceivePanel({ accounts }: { accounts: MultiChainAccounts }) {
  const [chain, setChain] = useState<keyof typeof CHAIN_META>("stacks");
  const [copied, setCopied] = useState(false);
  const address = accounts[chain].address;
  const { label, icon: Icon, bg } = CHAIN_META[chain];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail - non-fatal, address is still visible.
    }
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-5 p-1 rounded-lg bg-white/[0.03]">
        {(Object.keys(CHAIN_META) as Array<keyof typeof CHAIN_META>).map((c) => {
          const meta = CHAIN_META[c];
          const active = c === chain;
          return (
            <button
              key={c}
              onClick={() => {
                setChain(c);
                setCopied(false);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-white/[0.08] text-chalk" : "text-slate-mist hover:text-chalk"
              }`}
            >
              <meta.icon size={13} style={{ color: active ? meta.bg : undefined }} />
              {meta.symbol}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center">
        <div className="p-4 rounded-xl bg-white">
          <QRCodeSVG value={address} size={192} level="M" marginSize={0} />
        </div>
        <p className="mt-4 text-xs text-slate-mist flex items-center gap-1.5">
          <Icon size={13} style={{ color: bg }} />
          Your {label} address
        </p>
        <button
          onClick={handleCopy}
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors max-w-full"
        >
          <span className="font-mono text-xs text-chalk truncate">{address}</span>
          {copied ? (
            <Check size={14} className="text-indigo-light shrink-0" />
          ) : (
            <Copy size={14} className="text-slate-dim shrink-0" />
          )}
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({
  onClose,
  onRemoveWallet,
  removing,
}: {
  onClose: () => void;
  onRemoveWallet: () => void;
  removing: boolean;
}) {
  return (
    <Modal title="Wallet settings" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wide text-slate-mist mb-2">
            This device
          </h3>
          <Card className="p-1">
            <DangerAction
              label={
                <span className="flex items-center gap-2">
                  <Trash2 size={15} />
                  Remove wallet from this device
                </span>
              }
              confirmLabel="Remove wallet"
              description="This clears the encrypted wallet from this device only. If you have your 12-word recovery phrase written down, you can restore it anytime by importing it again. Without the phrase, any funds are unrecoverable."
              onConfirm={onRemoveWallet}
              busy={removing}
            />
          </Card>
        </div>

        <p className="text-xs text-slate-mist px-1">
          Looking for logout or account deletion? Those moved to{" "}
          <span className="text-chalk">Settings</span> in the main sidebar.
        </p>
      </div>
    </Modal>
  );
}

function TokenRow({
  chain,
  amount,
  usdValue,
  changePct,
}: {
  chain: keyof typeof CHAIN_META;
  amount: string | null;
  usdValue: string | null;
  changePct: number | null;
}) {
  const { label, symbol, icon: Icon, bg } = CHAIN_META[chain];
  const positive = (changePct ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between px-1 py-3.5 border-b border-line last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
          style={{ backgroundColor: `${bg}22` }}
        >
          <Icon size={17} style={{ color: bg }} />
        </span>
        <div>
          <div className="text-sm font-medium text-chalk">{label}</div>
          <div className="text-xs text-slate-mist font-mono">
            {amount !== null ? `${amount} ${symbol}` : "Not tracked yet"}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-chalk">{usdValue ?? "—"}</div>
        {changePct !== null && (
          <div className={`text-xs ${positive ? "text-indigo-light" : "text-ember"}`}>
            {positive ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );
}

function UnlockedWallet({
  accounts,
  onRemoveWallet,
  removingWallet,
}: {
  accounts: MultiChainAccounts;
  onRemoveWallet: () => void;
  removingWallet: boolean;
}) {
  const [tab, setTab] = useState<WalletTabId>("tokens");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const { data: portfolio } = useQuery({
    queryKey: ["portfolio", accounts.stacks.address],
    queryFn: () => fetchPortfolio(accounts.stacks.address),
  });
  const { data: prices } = useQuery({
    queryKey: ["market-prices"],
    queryFn: () => fetchCoinPrices("usd", 50),
    refetchInterval: 60_000,
  });

  const stxPrice = prices?.markets.find((m) => m.symbol.toLowerCase() === "stx");
  const stxAmount = portfolio ? microStxToStx(portfolio.stx.balanceMicroStx) : null;
  const stxUsd = portfolio && stxPrice ? Number(stxAmount) * stxPrice.current_price : null;

  return (
    <div>
      {/* Account bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo/20">
            <KeyRound size={16} className="text-indigo-light" />
          </span>
          <span className="font-medium text-chalk">StackSuite Wallet</span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Wallet settings"
          className="p-2 -m-2 text-slate-mist hover:text-chalk transition-colors"
        >
          <Settings size={19} />
        </button>
      </div>

      {/* Balance */}
      <div className="mb-7">
        <div className="font-display text-5xl font-bold text-chalk tracking-tight">
          {stxUsd !== null ? formatUsd(stxUsd) : portfolio ? formatUsd(0) : <Spinner />}
        </div>
        {stxPrice?.price_change_percentage_24h != null && (
          <div
            className={`mt-1.5 text-sm ${
              stxPrice.price_change_percentage_24h >= 0 ? "text-indigo-light" : "text-ember"
            }`}
          >
            {stxPrice.price_change_percentage_24h >= 0 ? "▲" : "▼"}{" "}
            {Math.abs(stxPrice.price_change_percentage_24h).toFixed(2)}%{" "}
            <span className="text-slate-dim">· STX, 24h</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-8">
        <ActionButton icon={ArrowUp} label="Send" onClick={() => setSendOpen(true)} />
        <ActionButton icon={ArrowDown} label="Receive" onClick={() => setReceiveOpen(true)} />
      </div>

      {/* Tab strip */}
      <div className="flex gap-5 border-b border-line mb-1">
        {(["tokens", "earn", "nfts", "activity"] as WalletTabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 text-xs font-mono uppercase tracking-wide transition-colors border-b-2 -mb-px ${
              tab === t
                ? "text-chalk border-indigo-light"
                : "text-slate-dim border-transparent hover:text-slate-mist"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "tokens" && (
        <div>
          <TokenRow
            chain="stacks"
            amount={stxAmount}
            usdValue={stxUsd !== null ? formatUsd(stxUsd) : null}
            changePct={stxPrice?.price_change_percentage_24h ?? null}
          />
          <TokenRow chain="bitcoin" amount={null} usdValue={null} changePct={null} />
          <TokenRow chain="ethereum" amount={null} usdValue={null} changePct={null} />
          {portfolio && BigInt(portfolio.stx.lockedMicroStx) > 0n && (
            <p className="text-xs font-mono text-slate-mist mt-3">
              {microStxToStx(portfolio.stx.lockedMicroStx)} STX locked until burn height{" "}
              {portfolio.stx.burnchainUnlockHeight}
            </p>
          )}
        </div>
      )}

      {tab === "earn" && (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-mist">
            Stack your STX to earn Bitcoin rewards - head to the Stacking Monitor tab to
            track an active position.
          </p>
        </div>
      )}

      {tab === "nfts" && (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-mist">No NFTs to show yet.</p>
        </div>
      )}

      {tab === "activity" && (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-mist">No activity to show yet.</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-line">
        <h3 className="text-xs font-mono uppercase tracking-wide text-slate-mist mb-2">
          Your tip jar
        </h3>
        <TipJar address={accounts.stacks.address} compact />
      </div>

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onRemoveWallet={onRemoveWallet}
          removing={removingWallet}
        />
      )}

      {receiveOpen && (
        <Modal title="Receive" onClose={() => setReceiveOpen(false)}>
          <ReceivePanel accounts={accounts} />
        </Modal>
      )}

      {sendOpen && (
        <SendModal accounts={accounts} initialChain="stacks" onClose={() => setSendOpen(false)} />
      )}
    </div>
  );
}

export function WalletTab() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [pendingMnemonic, setPendingMnemonic] = useState<string | null>(null);
  const [confirmWord, setConfirmWord] = useState("");
  const [confirmIndex, setConfirmIndex] = useState(0);
  const [importText, setImportText] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<MultiChainAccounts | null>(null);

  useEffect(() => {
    walletManager.hasStoredWallet().then((exists) => {
      setScreen(exists ? "unlock" : "choice");
    });
  }, []);

  // Only the Stacks address is registered for tracking - it's the only
  // chain the rest of the app (Portfolio, Compare) actually has a data
  // pipeline for. Nothing sensitive here: a public address, not the
  // mnemonic or any key.
  useEffect(() => {
    if (accounts) {
      trackWallet(accounts.stacks.address, "StackSuite Wallet", "stacksuite-wallet");
    }
  }, [accounts]);

  const startCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      const { mnemonic } = await walletManager.createNew();
      setPendingMnemonic(mnemonic);
      setConfirmIndex(Math.floor(Math.random() * 12));
      setScreen("create-show");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create wallet.");
    } finally {
      setBusy(false);
    }
  };

  const confirmBackupAndSetPassword = async () => {
    if (!pendingMnemonic) return;
    const words = pendingMnemonic.split(" ");
    if (confirmWord.trim().toLowerCase() !== words[confirmIndex]) {
      setError(`That's not word #${confirmIndex + 1}. Check your backup and try again.`);
      return;
    }
    if (password.length < 8 || password !== password2) {
      setError("Passwords must match and be at least 8 characters.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await walletManager.persist(pendingMnemonic, password);
      const unlocked = await walletManager.unlock(password);
      setAccounts(unlocked);
      setPendingMnemonic(null);
      setPassword("");
      setPassword2("");
      setScreen("unlocked");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save wallet.");
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    setError(null);
    if (password.length < 8 || password !== password2) {
      setError("Passwords must match and be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await walletManager.importExisting(importText);
      await walletManager.persist(importText, password);
      const unlocked = await walletManager.unlock(password);
      setAccounts(unlocked);
      setImportText("");
      setPassword("");
      setPassword2("");
      setScreen("unlocked");
    } catch (e) {
      if (e instanceof InvalidMnemonicError || e instanceof WalletAlreadyExistsError) {
        setError(e.message);
      } else {
        setError("Could not import wallet.");
      }
    } finally {
      setBusy(false);
    }
  };

  const doUnlock = async () => {
    setError(null);
    setBusy(true);
    try {
      const unlocked = await walletManager.unlock(password);
      setAccounts(unlocked);
      setPassword("");
      setScreen("unlocked");
    } catch (e) {
      if (e instanceof NoWalletFoundError) {
        setScreen("choice");
      } else {
        setError(e instanceof Error ? e.message : "Incorrect password.");
      }
    } finally {
      setBusy(false);
    }
  };

  const removeWallet = async () => {
    setBusy(true);
    try {
      if (accounts) untrackWallet(accounts.stacks.address);
      await walletManager.removeFromDevice();
      setAccounts(null);
      setScreen("choice");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeading
        title="StackSuite Wallet"
        description="A non-custodial wallet built into the app. Your recovery phrase is generated and encrypted on this device only - it is never sent anywhere, including to StackSuite's own servers."
      />

      {screen === "loading" && <Spinner />}

      {screen === "choice" && (
        <Card className="p-6 space-y-3">
          <Button onClick={startCreate} disabled={busy} className="w-full">
            <KeyRound size={15} />
            Create a new wallet
          </Button>
          <Button variant="secondary" onClick={() => setScreen("import")} className="w-full">
            Import an existing wallet
          </Button>
          {error && <p className="text-xs text-ember font-mono">{error}</p>}
        </Card>
      )}

      {screen === "create-show" && pendingMnemonic && (
        <Card accent className="p-6 space-y-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-ember shrink-0 mt-0.5" />
            <p className="text-sm text-chalk leading-relaxed">
              Write these 12 words down, in order, somewhere safe and offline.
              Anyone with this phrase can take everything it controls, on
              every chain. StackSuite cannot recover it for you.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-sm">
            {pendingMnemonic.split(" ").map((word, i) => (
              <div key={i} className="rounded-lg bg-black/30 px-2.5 py-2 border border-line">
                <span className="text-slate-dim mr-1.5">{i + 1}</span>
                <span className="text-chalk">{word}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => setScreen("create-confirm")}>I&apos;ve written it down</Button>
        </Card>
      )}

      {screen === "create-confirm" && (
        <Card className="p-6 space-y-4">
          <Field
            label={`Enter word #${confirmIndex + 1} from your backup`}
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
          />
          <Field
            label="Set an encryption password for this device"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
          <Field
            label="Confirm password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            type="password"
          />
          <Button onClick={confirmBackupAndSetPassword} disabled={busy}>
            {busy ? "Saving..." : "Confirm and save"}
          </Button>
          {error && <p className="text-xs text-ember font-mono">{error}</p>}
        </Card>
      )}

      {screen === "import" && (
        <Card className="p-6 space-y-4">
          <TextAreaField
            label="Recovery phrase"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={3}
            placeholder="word1 word2 word3 ..."
          />
          <Field
            label="Set an encryption password for this device"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
          <Field
            label="Confirm password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            type="password"
          />
          <Button onClick={doImport} disabled={busy}>
            {busy ? "Importing..." : "Import wallet"}
          </Button>
          {error && <p className="text-xs text-ember font-mono">{error}</p>}
        </Card>
      )}

      {screen === "unlock" && (
        <Card className="p-6 space-y-4">
          <Field
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            onKeyDown={(e) => e.key === "Enter" && doUnlock()}
          />
          <Button onClick={doUnlock} disabled={busy}>
            {busy ? "Unlocking..." : "Unlock"}
          </Button>
          {error && <p className="text-xs text-ember font-mono">{error}</p>}
        </Card>
      )}

      {screen === "unlocked" && accounts && (
        <UnlockedWallet accounts={accounts} onRemoveWallet={removeWallet} removingWallet={busy} />
      )}
    </div>
  );
}
