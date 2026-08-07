"use client";

import {
  IdCard,
  Send,
  Wallet as WalletIcon,
  Scale,
  Sprout,
  Sparkles,
  LineChart,
  Calculator,
  Star,
  ShieldCheck,
  Radio,
  Blocks,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Mark } from "@/components/ui/Mark";

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Non-custodial by default",
    body: "Connect a wallet you already control, or open a StackSuite Wallet in-app. Either way, keys never touch our servers.",
  },
  {
    icon: Radio,
    title: "Live, not cached",
    body: "Prices, gas, and stacking status come straight from Hiro, mempool.space, and exchange feeds each time you look.",
  },
  {
    icon: Blocks,
    title: "Built for Stacks, natively",
    body: "BNS, PoX stacking, and Bitcoin finality are first-class here, not an afterthought bolted onto an EVM dashboard.",
  },
];

const FEATURES = [
  {
    id: "bns",
    icon: IdCard,
    title: "BNS Names",
    body: "Resolve names, see what a wallet owns, and watch names before they expire.",
  },
  {
    id: "bot",
    icon: Send,
    title: "Telegram Bot",
    body: "Get stacking, price, and expiry alerts delivered straight to Telegram.",
  },
  {
    id: "portfolio",
    icon: WalletIcon,
    title: "Portfolio",
    body: "Track STX balances, locked stacking positions, and token holdings in one view.",
  },
  {
    id: "compare",
    icon: Scale,
    title: "Compare Wallets",
    body: "Line up two or more addresses side by side across balances and activity.",
  },
  {
    id: "stacking",
    icon: Sprout,
    title: "Stacking Monitor",
    body: "Watch PoX cycles, lock status, and unlock heights without lifting a finger.",
  },
  {
    id: "wrapped",
    icon: Sparkles,
    title: "Wrapped",
    body: "A yearly look back at your on-chain activity, StackSuite's own take on the format.",
  },
  {
    id: "markets",
    icon: LineChart,
    title: "Markets",
    body: "Live prices, top movers, fear & greed, and gas fees across BTC, ETH, and STX.",
  },
  {
    id: "tools",
    icon: Calculator,
    title: "Tools",
    body: "Stacking yield and reward calculators for planning a cycle ahead of time.",
  },
  {
    id: "tracking",
    icon: Star,
    title: "Tracking",
    body: "Keep a personal watchlist of wallets and get notified when they move.",
  },
];

export function HomeTab({ onNavigate }: { onNavigate: (tabId: string) => void }) {
  return (
    <div>
      {/* Hero */}
      <section className="pt-2 pb-10 md:pb-14">
        <div className="mb-6" aria-hidden="true">
          <Mark size={48} />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl leading-[1.1] text-chalk max-w-lg">
          Bitcoin-secured tools.
          <br />
          Full market intel.
          <br />
          <span className="text-indigo-light">One app.</span>
        </h1>
        <p className="mt-4 max-w-md text-sm md:text-base text-slate-mist leading-relaxed">
          BNS names, stacking monitoring, live markets, and real-time alerts for Stacks and
          beyond, all in a single dashboard your wallet never has to leave your control for.
        </p>
      </section>

      {/* Value proposition */}
      <section className="py-8 md:py-10 border-t border-line">
        <div className="grid sm:grid-cols-3 gap-4">
          {VALUE_PROPS.map((v) => (
            <Card key={v.title} className="p-5">
              <v.icon size={18} className="text-indigo-light" />
              <h3 className="mt-3 font-display font-semibold text-sm text-chalk">{v.title}</h3>
              <p className="mt-1.5 text-xs text-slate-mist leading-relaxed">{v.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features / quick jump */}
      <section className="py-8 md:py-10 border-t border-line">
        <p className="text-xs font-mono uppercase tracking-wider text-ember">
          Everything, one tab away
        </p>
        <h2 className="mt-2 font-display font-bold text-xl text-chalk">
          Jump straight to a tool.
        </h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              onClick={() => onNavigate(f.id)}
              className="text-left h-full rounded-xl border border-line hover:border-indigo-light/60 bg-surface/40 hover:bg-surface p-4 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <f.icon size={17} className="text-indigo-light" strokeWidth={2} />
                <ArrowRight
                  size={14}
                  className="text-slate-dim group-hover:text-indigo-light group-hover:translate-x-0.5 transition-all"
                />
              </div>
              <h3 className="mt-2.5 font-medium text-chalk text-sm">{f.title}</h3>
              <p className="mt-1 text-xs text-slate-mist leading-relaxed">{f.body}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
