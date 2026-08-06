"use client";

import { useState } from "react";
import { Copy, Check, Send, ExternalLink } from "lucide-react";
import { sendTip, TipTransferError } from "@/lib/tip-transfer";
import { stxToMicroStx } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

function useCopied() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - nothing to
      // fall back to gracefully; the text is still visible on screen.
    }
  };
  return { copied, copy };
}

/**
 * QR code is rendered via a public, keyless image endpoint (qrserver.com)
 * rather than a bundled QR library, to avoid adding a new dependency.
 * The only data encoded is a public Stacks address - the same thing
 * that's already visible on-chain to anyone, so there's no privacy loss
 * in it passing through a third-party image request.
 */
function qrCodeUrl(data: string, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    data,
  )}`;
}

export function TipJar({
  address,
  name,
  compact = false,
}: {
  address: string;
  name?: string;
  compact?: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ txId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addressCopy = useCopied();
  const linkCopy = useCopied();

  const shareLink =
    typeof window !== "undefined" ? `${window.location.origin}/tip/${address}` : `/tip/${address}`;

  const pay = async () => {
    setError(null);
    setResult(null);
    const microStx = stxToMicroStx(amount || "0");
    if (!microStx || BigInt(microStx) <= 0n) {
      setError("Enter a valid STX amount greater than 0.");
      return;
    }
    setSending(true);
    try {
      const res = await sendTip(address, microStx, memo || undefined);
      setResult(res);
    } catch (err) {
      setError(err instanceof TipTransferError ? err.message : "Transfer failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className={compact ? "p-4" : "p-6"}>
      <div className="flex flex-col sm:flex-row gap-5">
        <img
          src={qrCodeUrl(address, compact ? 160 : 220)}
          alt={`QR code for ${name ?? address}`}
          width={compact ? 160 : 220}
          height={compact ? 160 : 220}
          className="rounded-xl border border-line-strong shrink-0 self-center sm:self-start"
        />
        <div className="flex-1 min-w-0 space-y-3">
          {name && <div className="font-display text-lg font-bold text-chalk">{name}</div>}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-mist truncate">{address}</span>
            <button
              onClick={() => addressCopy.copy(address)}
              className="shrink-0 text-slate-mist hover:text-chalk transition-colors"
              aria-label="Copy address"
            >
              {addressCopy.copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-indigo-light truncate">{shareLink}</span>
            <button
              onClick={() => linkCopy.copy(shareLink)}
              className="shrink-0 text-slate-mist hover:text-chalk transition-colors"
              aria-label="Copy shareable link"
            >
              {linkCopy.copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Field
              label="Amount (STX)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1.5"
              inputMode="decimal"
            />
            <Field
              label="Memo (optional)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Thanks!"
            />
          </div>

          <Button onClick={pay} disabled={sending} className="w-full">
            <Send size={15} />
            {sending ? "Waiting for wallet..." : "Send tip from wallet"}
          </Button>

          {error && <p className="text-xs font-mono text-ember">{error}</p>}
          {result && (
            <p className="text-xs font-mono text-indigo-light flex items-center gap-1">
              Sent
              <a
                href={`https://explorer.hiro.so/txid/${result.txId}`}
                target="_blank"
                rel="noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                view transaction <ExternalLink size={11} />
              </a>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
