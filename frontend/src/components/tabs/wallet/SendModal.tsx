"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MultiChainAccounts } from "@/lib/wallet/wallet-instance";
import { stxToMicroStx } from "@/lib/api";
import { sendStx, pollStxTransaction } from "@/lib/wallet/send-stacks";
import { sendBitcoin, pollBitcoinTransaction } from "@/lib/wallet/send-bitcoin";
import { sendEthereum, pollEthereumTransaction, ethToWei } from "@/lib/wallet/send-ethereum";
import { STX_SEND_NETWORK, BTC_SEND_NETWORK, ETH_SEND_NETWORK, isMainnet } from "@/lib/wallet/network-config";
import { acquireSendLock, DuplicateSendError, SendInProgressError } from "@/lib/wallet/send-lock";
import { API_BASE_URL } from "@/lib/api";

type Chain = "stacks" | "bitcoin" | "ethereum";
type Step = "form" | "confirm" | "sending" | "pending" | "success" | "error";

const CHAIN_LABEL: Record<Chain, string> = { stacks: "Stacks (STX)", bitcoin: "Bitcoin (BTC)", ethereum: "Ethereum (ETH)" };
const CHAIN_NETWORK: Record<Chain, "mainnet" | "testnet"> = {
  stacks: STX_SEND_NETWORK,
  bitcoin: BTC_SEND_NETWORK,
  ethereum: ETH_SEND_NETWORK,
};

interface GasResponse {
  bitcoin: { data: { halfHourFeeSatPerVb: number } | null; error: unknown };
}

export function SendModal({
  accounts,
  initialChain,
  onClose,
}: {
  accounts: MultiChainAccounts;
  initialChain: Chain;
  onClose: () => void;
}) {
  const [chain, setChain] = useState<Chain>(initialChain);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [btcFeeRate, setBtcFeeRate] = useState<number | null>(null);
  const [result, setResult] = useState<{ id: string; explorerUrl: string } | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string>("Broadcasting…");

  const network = CHAIN_NETWORK[chain];
  const mainnet = isMainnet(network);

  useEffect(() => {
    if (chain !== "bitcoin") return;
    fetch(`${API_BASE_URL}/api/gas`)
      .then((r) => r.json())
      .then((body: GasResponse) => setBtcFeeRate(body.bitcoin.data?.halfHourFeeSatPerVb ?? null))
      .catch(() => setBtcFeeRate(null));
  }, [chain]);

  function goToConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!recipient.trim()) {
      setError("Enter a recipient address.");
      return;
    }
    if (!amount.trim() || Number(amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (chain === "bitcoin" && !btcFeeRate) {
      setError("Couldn't load a current network fee rate for Bitcoin - try again in a moment.");
      return;
    }
    setStep("confirm");
  }

  async function handleSend() {
    setStep("sending");
    setError(null);
    let release: (() => void) | null = null;
    try {
      release = acquireSendLock(chain, recipient.trim(), amount.trim());

      if (chain === "stacks") {
        const micro = stxToMicroStx(amount);
        if (!micro) throw new Error("Invalid STX amount.");
        const res = await sendStx({
          senderKey: accounts.stacks.privateKey,
          recipient: recipient.trim(),
          amountMicroStx: BigInt(micro),
        });
        setResult({ id: res.txid, explorerUrl: res.explorerUrl });
        setStep("pending");
        pollUntilDone(() => pollStxTransaction(res.txid), (s) => s.status !== "pending", (s) =>
          s.status === "success" ? "Confirmed" : s.status === "pending" ? "Pending…" : `Failed (${s.status})`,
        );
      } else if (chain === "bitcoin") {
        const sats = BigInt(Math.round(Number(amount) * 1e8));
        const res = await sendBitcoin({
          privateKey: accounts.bitcoin.privateKey,
          publicKey: accounts.bitcoin.publicKey,
          fromAddress: accounts.bitcoin.address,
          recipient: recipient.trim(),
          amountSats: sats,
          feeRateSatPerVb: btcFeeRate!,
        });
        setResult({ id: res.txid, explorerUrl: res.explorerUrl });
        setStep("pending");
        pollUntilDone(() => pollBitcoinTransaction(res.txid), (s) => s !== "pending", (s) =>
          s === "confirmed" ? "Confirmed" : "Pending…",
        );
      } else {
        const wei = ethToWei(amount);
        const res = await sendEthereum({
          privateKey: accounts.ethereum.privateKey,
          recipient: recipient.trim(),
          amountWei: wei,
        });
        setResult({ id: res.txHash, explorerUrl: res.explorerUrl });
        setStep("pending");
        pollUntilDone(() => pollEthereumTransaction(res.txHash), (s) => s !== "pending", (s) =>
          s === "confirmed" ? "Confirmed" : s === "failed" ? "Failed" : "Pending…",
        );
      }
    } catch (err) {
      if (err instanceof DuplicateSendError || err instanceof SendInProgressError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Send failed.");
      }
      setStep("error");
    } finally {
      release?.();
    }
  }

  // Generic poll loop - checks every 15s, stops once `isDone` is true or after 20 attempts (~5min).
  function pollUntilDone<T>(check: () => Promise<T>, isDone: (v: T) => boolean, label: (v: T) => string) {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const v = await check();
        setConfirmStatus(label(v));
        if (isDone(v)) {
          clearInterval(interval);
          setStep(label(v) === "Confirmed" ? "success" : "success"); // still show result screen either way; status text carries detail
        } else if (attempts >= 20) {
          clearInterval(interval);
          setConfirmStatus("Still pending after 5 minutes - check the explorer link for latest status.");
          setStep("success");
        }
      } catch {
        // transient poll failure - keep trying, don't surface as a send error
      }
    }, 15_000);
  }

  return (
    <Modal title="Send" onClose={onClose}>
      {!mainnet && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle size={14} className="shrink-0" />
          Testnet — no real funds are at risk.
        </div>
      )}

      {step === "form" && (
        <form onSubmit={goToConfirm} className="space-y-4">
          <SelectField label="Chain" value={chain} onChange={(e) => setChain(e.target.value as Chain)}>
            <option value="stacks">{CHAIN_LABEL.stacks}</option>
            <option value="bitcoin">{CHAIN_LABEL.bitcoin}</option>
            <option value="ethereum">{CHAIN_LABEL.ethereum}</option>
          </SelectField>
          <Field
            label="Recipient address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={chain === "stacks" ? "SP… / ST…" : chain === "bitcoin" ? "bc1… / tb1…" : "0x…"}
          />
          <Field
            label={`Amount (${chain === "stacks" ? "STX" : chain === "bitcoin" ? "BTC" : "ETH"})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.0"
          />
          {chain === "bitcoin" && (
            <p className="text-xs text-slate-mist">
              Network fee rate: {btcFeeRate ? `${btcFeeRate} sat/vB` : "loading…"}
            </p>
          )}
          {error && <p className="text-xs text-ember">{error}</p>}
          <Button type="submit" className="w-full">
            Review
          </Button>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-line-strong bg-black/20 p-4 space-y-2 text-sm">
            <Row label="Sending" value={`${amount} ${chain === "stacks" ? "STX" : chain === "bitcoin" ? "BTC" : "ETH"}`} />
            <Row label="To" value={recipient} mono />
            <Row label="Network" value={mainnet ? "Mainnet" : "Testnet"} />
            {chain === "bitcoin" && <Row label="Fee rate" value={`${btcFeeRate} sat/vB`} />}
            {chain !== "bitcoin" && (
              <Row label="Fee" value={chain === "stacks" ? "Estimated automatically at broadcast" : "Estimated automatically (EIP-1559)"} />
            )}
          </div>
          <p className="text-xs text-slate-mist">
            Double-check the address above — sends on {CHAIN_LABEL[chain]} cannot be reversed once broadcast.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep("form")}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleSend}>
              Confirm &amp; sign
            </Button>
          </div>
        </div>
      )}

      {step === "sending" && (
        <div className="flex flex-col items-center gap-3 py-8 text-slate-mist">
          <Loader2 className="animate-spin" size={24} />
          <p className="text-sm">Signing and broadcasting…</p>
        </div>
      )}

      {(step === "pending" || step === "success") && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-line-strong bg-black/20 p-4 space-y-2 text-sm">
            <Row label="Status" value={confirmStatus} />
            <Row label="Tx ID" value={result.id} mono />
          </div>
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-indigo-light hover:underline"
          >
            View on explorer <ExternalLink size={12} />
          </a>
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      )}

      {step === "error" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-ember/40 bg-ember/10 p-4 text-sm text-ember">{error}</div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => setStep("form")}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-mist">{label}</span>
      <span className={`text-right text-chalk ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</span>
    </div>
  );
}
