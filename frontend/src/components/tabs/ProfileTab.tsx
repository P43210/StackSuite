"use client";

import { useState } from "react";
import { Mail, Wallet as WalletIcon, Send, Copy, Check, LinkIcon } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeading } from "@/components/ui/PageHeading";

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const SOURCE_LABEL: Record<string, string> = {
  wallet: "Connected wallet",
  telegram: "Telegram Mini App",
  account: "Linked to this account",
};

export function ProfileTab({ accountEmail }: { accountEmail: string | null }) {
  const { connected, address, identitySource, connectWallet, disconnectWallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeading
        title="Profile"
        description="Your StackSuite account and the wallet identity currently linked to it."
      />

      <div className="space-y-5">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wide text-slate-mist mb-2">
            Account
          </h3>
          <Card className="p-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo/20 shrink-0">
              <Mail size={16} className="text-indigo-light" />
            </span>
            {accountEmail ? (
              <div className="min-w-0">
                <div className="text-sm text-chalk truncate">{accountEmail}</div>
                <div className="text-xs text-slate-mist font-mono">Signed in with Google</div>
              </div>
            ) : (
              <div className="text-sm text-slate-mist">
                Not signed into a StackSuite account this session.
              </div>
            )}
          </Card>
        </div>

        <div>
          <h3 className="text-xs font-mono uppercase tracking-wide text-slate-mist mb-2">
            Wallet identity
          </h3>
          <Card className="p-4">
            {connected && address ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo/20 shrink-0">
                  <WalletIcon size={16} className="text-indigo-light" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-chalk">{truncate(address)}</span>
                    <Badge tone="positive">
                      {identitySource ? SOURCE_LABEL[identitySource] ?? "Connected" : "Connected"}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={copyAddress}
                  aria-label="Copy address"
                  className="p-2 -m-2 text-slate-mist hover:text-chalk transition-colors shrink-0"
                >
                  {copied ? <Check size={15} className="text-indigo-light" /> : <Copy size={15} />}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] shrink-0">
                    <LinkIcon size={16} className="text-slate-mist" />
                  </span>
                  <div className="text-sm text-slate-mist">No wallet connected yet.</div>
                </div>
                <Button variant="secondary" onClick={connectWallet}>
                  Connect
                </Button>
              </div>
            )}
          </Card>
          {connected && (
            <button
              onClick={disconnectWallet}
              className="mt-2 flex items-center gap-1.5 text-xs font-mono text-slate-mist hover:text-ember transition-colors px-1"
            >
              Disconnect wallet
            </button>
          )}
        </div>

        <div>
          <h3 className="text-xs font-mono uppercase tracking-wide text-slate-mist mb-2">
            Telegram
          </h3>
          <Card className="p-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] shrink-0">
              <Send size={16} className="text-slate-mist" />
            </span>
            <p className="text-sm text-slate-mist">
              Link your Telegram account from the{" "}
              <span className="text-chalk">Telegram Bot</span> tab to get alerts and open
              StackSuite as a Mini App.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
