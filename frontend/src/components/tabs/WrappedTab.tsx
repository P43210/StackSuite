"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Sparkles } from "lucide-react";
import { fetchWrappedStats, microStxToStx, ApiError, WrappedStats } from "@/lib/api";
import { useWallet } from "@/lib/wallet-context";
import { listTrackedWallets } from "@/lib/tracked-wallets";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PageHeading } from "@/components/ui/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

const CARD_SIZE = 1080;

// Fixed brand palette for the exported card - this is a shareable poster,
// so it always renders in StackSuite's dark brand colors regardless of
// the viewer's own light/dark theme preference.
const COLORS = {
  ink: "#0f0d17",
  indigoDeep: "#3a32a0",
  indigo: "#5546e8",
  indigoLight: "#7b70f5",
  ember: "#f2994a",
  chalk: "#f5f3ff",
  slateMist: "#8a86a8",
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function drawWrappedCard(canvas: HTMLCanvasElement, address: string, stats: WrappedStats) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const S = CARD_SIZE;
  canvas.width = S;
  canvas.height = S;

  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, S, S);

  const glow1 = ctx.createRadialGradient(S * 0.85, 0, 0, S * 0.85, 0, S * 0.7);
  glow1.addColorStop(0, "rgba(85,70,232,0.28)");
  glow1.addColorStop(1, "rgba(85,70,232,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, S, S);

  const glow2 = ctx.createRadialGradient(0, S, 0, 0, S, S * 0.6);
  glow2.addColorStop(0, "rgba(242,153,74,0.16)");
  glow2.addColorStop(1, "rgba(242,153,74,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, S, S);

  const markX = 80;
  const markTop = 80;
  const barW = 130,
    barH = 34,
    gap = 16,
    step = 16;
  const barColors = [COLORS.indigoDeep, COLORS.indigo, COLORS.indigoLight, COLORS.ember];
  for (let i = 0; i < 4; i++) {
    const y = markTop + (3 - i) * (barH + gap);
    const x = markX + i * step;
    ctx.fillStyle = barColors[i];
    roundRect(ctx, x, y, barW, barH, barH / 2);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.chalk;
  ctx.font = "600 40px Arial, sans-serif";
  ctx.fillText("StackSuite", markX + 200, markTop + 100);

  ctx.fillStyle = COLORS.slateMist;
  ctx.font = "600 32px Arial, sans-serif";
  ctx.fillText("WRAPPED", markX, markTop + 210);

  ctx.fillStyle = COLORS.chalk;
  ctx.font = "700 56px Arial, sans-serif";
  ctx.fillText(truncateAddress(address), markX, markTop + 285);

  type Row = { label: string; value: string; accent?: boolean };
  const rows: Row[] = [
    { label: "STX BALANCE", value: `${microStxToStx(stats.balanceMicroStx)} STX` },
    { label: "TRANSACTIONS", value: stats.transactionCount.toLocaleString() },
    { label: "TOKENS HELD", value: String(stats.tokenCount) },
    {
      label: "STACKING",
      value: stats.isStacking ? "Active" : "Not stacking",
      accent: stats.isStacking,
    },
  ];

  const rowsTop = 480;
  const rowH = 130;
  rows.forEach((row, i) => {
    const y = rowsTop + i * rowH;
    ctx.fillStyle = "rgba(245,243,255,0.06)";
    roundRect(ctx, markX, y, S - markX * 2, rowH - 24, 20);
    ctx.fill();

    ctx.fillStyle = COLORS.slateMist;
    ctx.font = "600 24px Arial, sans-serif";
    ctx.fillText(row.label, markX + 36, y + 44);

    ctx.fillStyle = row.accent ? COLORS.ember : COLORS.chalk;
    ctx.font = "700 48px Arial, sans-serif";
    ctx.fillText(row.value, markX + 36, y + 92);
  });

  if (stats.firstTransaction.timeIso) {
    const date = new Date(stats.firstTransaction.timeIso);
    const label = `On-chain since ${date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
    })}`;
    ctx.fillStyle = COLORS.slateMist;
    ctx.font = "500 26px Arial, sans-serif";
    ctx.fillText(label, markX, S - 60);
  }
}

export function WrappedTab() {
  const { address: connectedAddress, connectWallet, connected } = useWallet();
  const [manualInput, setManualInput] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (connectedAddress && target === null) setTarget(connectedAddress);
  }, [connectedAddress, target]);

  const address = target ?? connectedAddress;

  const query = useQuery({
    queryKey: ["wrapped", address],
    queryFn: () => fetchWrappedStats(address as string),
    enabled: !!address,
  });

  useEffect(() => {
    if (canvasRef.current && query.data && address) {
      drawWrappedCard(canvasRef.current, address, query.data);
    }
  }, [query.data, address]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stacksuite-wrapped-${address?.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const tracked = listTrackedWallets();

  return (
    <div>
      <PageHeading
        title="Wallet Wrapped"
        description="A shareable stat card for any Stacks address - balance, activity, and stacking status at a glance."
      />

      <Card className="p-6 mb-6 space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Field
              label="Wrap an address"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setTarget(manualInput.trim())}
              placeholder="SP2J6ZY48..."
            />
          </div>
          <Button variant="secondary" onClick={() => setTarget(manualInput.trim())}>
            <Sparkles size={15} />
            Wrap it
          </Button>
        </div>
        {(connectedAddress || tracked.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {connectedAddress && (
              <button
                onClick={() => setTarget(connectedAddress)}
                className="text-xs font-mono rounded-full border border-line-strong px-3 py-1.5 text-slate-mist hover:text-chalk hover:border-indigo-light/60 transition-colors"
              >
                Connected wallet
              </button>
            )}
            {tracked
              .filter((w) => w.address !== connectedAddress)
              .map((w) => (
                <button
                  key={w.address}
                  onClick={() => setTarget(w.address)}
                  className="text-xs font-mono rounded-full border border-line-strong px-3 py-1.5 text-slate-mist hover:text-chalk hover:border-indigo-light/60 transition-colors"
                >
                  {w.label}
                </button>
              ))}
          </div>
        )}
        {!connected && !address && (
          <button
            onClick={connectWallet}
            className="text-xs font-mono text-indigo-light hover:text-chalk transition-colors"
          >
            Or connect your wallet
          </button>
        )}
      </Card>

      {!address && (
        <EmptyState
          title="No address chosen yet"
          description="Connect a wallet or paste an address above to generate its Wrapped card."
        />
      )}

      {address && query.isLoading && <Spinner label="Crunching on-chain stats" />}

      {address && query.isError && (
        <Card accent className="p-6">
          <p className="text-sm font-mono text-ember">
            {query.error instanceof ApiError ? query.error.message : "Could not load stats"}
          </p>
        </Card>
      )}

      {address && query.data && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-line-strong">
            <canvas ref={canvasRef} className="w-full h-auto block" />
          </div>
          <Button onClick={download} className="w-full">
            <Download size={15} />
            Download PNG
          </Button>
          <p className="text-xs text-slate-mist text-center">
            Renders entirely in your browser - nothing here is uploaded anywhere.
          </p>
        </div>
      )}
    </div>
  );
}
