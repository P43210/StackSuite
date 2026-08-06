"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, CheckCircle2, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import {
  fetchTelegramStatus,
  requestLinkCode,
  disconnectTelegram,
  ApiError,
} from "@/lib/api";
import { isTelegramWebApp } from "@/lib/telegram-webapp";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeading } from "@/components/ui/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "your_bot";

export function TelegramBotTab() {
  const { connected, address, connectWallet } = useWallet();
  const queryClient = useQueryClient();
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ["telegram-status", address],
    queryFn: () => fetchTelegramStatus(address as string),
    enabled: connected && !!address,
  });

  const linkMutation = useMutation({
    mutationFn: () => requestLinkCode(address as string),
    onSuccess: (data) => setActiveCode(data.code),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectTelegram(address as string),
    onSuccess: () => {
      setActiveCode(null);
      queryClient.invalidateQueries({ queryKey: ["telegram-status", address] });
    },
  });

  const handleRefreshStatus = () => {
    setActiveCode(null);
    queryClient.invalidateQueries({ queryKey: ["telegram-status", address] });
  };

  const deepLink = activeCode
    ? `https://t.me/${BOT_USERNAME}?startapp=${activeCode}`
    : null;

  return (
    <div>
      <PageHeading
        title="Telegram Event Bot"
        description="Get notified in Telegram the moment something happens on chain, and use it to sign into the Telegram Mini App with no reconnect needed there."
      />

      {!connected && (
        <EmptyState
          title="No wallet connected"
          description="Connect a wallet to link Telegram alerts."
          action={<Button onClick={connectWallet}>Connect wallet</Button>}
        />
      )}

      {connected && statusQuery.isLoading && <Spinner label="Checking link status" />}

      {connected && statusQuery.data?.linked && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-indigo-light" />
            <span className="text-sm text-chalk">Telegram is linked to this wallet</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(statusQuery.data.subscriptions ?? []).length > 0 ? (
              statusQuery.data.subscriptions!.map((s) => (
                <Badge key={s} tone="neutral">
                  {s}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-mist font-mono">No subscriptions yet</span>
            )}
          </div>
          <div className="pt-1 border-t border-line">
            <Button
              variant="danger"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="text-xs px-3 py-1.5 mt-4"
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Telegram"}
            </Button>
            <p className="text-xs text-slate-mist mt-2">
              To reset (link a different Telegram account), disconnect then
              generate a new code below.
            </p>
          </div>
          {disconnectMutation.isError && (
            <p className="text-xs text-ember">
              {disconnectMutation.error instanceof ApiError
                ? disconnectMutation.error.message
                : "Could not disconnect."}
            </p>
          )}
        </Card>
      )}

      {connected && statusQuery.data && !statusQuery.data.linked && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-slate-mist">
            Not linked yet. Generate a code, then open{" "}
            <span className="text-chalk font-mono">@{BOT_USERNAME}</span> on Telegram
            and send <span className="text-chalk font-mono">/link &lt;code&gt;</span>,
            or use the one-tap link below.
          </p>

          {!activeCode ? (
            <Button onClick={() => linkMutation.mutate()} disabled={linkMutation.isPending}>
              <Send size={14} />
              {linkMutation.isPending ? "Generating..." : "Generate link code"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="text-3xl font-display font-bold tracking-widest text-ember">
                {activeCode}
              </div>
              <p className="text-xs text-slate-mist font-mono">Expires in 10 minutes.</p>
              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo hover:bg-indigo-light transition-colors text-sm font-medium"
                >
                  Open in Telegram to link automatically
                  <ExternalLink size={14} />
                </a>
              )}
              <div>
                <Button variant="secondary" onClick={handleRefreshStatus} className="text-xs px-3 py-1.5">
                  I&apos;ve linked it, refresh status
                </Button>
              </div>
            </div>
          )}

          {linkMutation.isError && (
            <p className="text-sm text-ember font-mono">
              {linkMutation.error instanceof ApiError
                ? linkMutation.error.message
                : "Could not generate a code."}
            </p>
          )}
        </Card>
      )}

      {connected && statusQuery.isError && (
        <Card accent className="p-6">
          <p className="text-sm text-chalk">
            Could not check link status:{" "}
            <span className="font-mono text-ember">
              {statusQuery.error instanceof ApiError
                ? statusQuery.error.message
                : "unknown error"}
            </span>
          </p>
        </Card>
      )}

      {isTelegramWebApp() && (
        <p className="mt-4 text-xs font-mono text-slate-dim">
          Running inside the Telegram Mini App.
        </p>
      )}
    </div>
  );
}
