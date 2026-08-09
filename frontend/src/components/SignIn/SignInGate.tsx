"use client";

import { useEffect, useState } from "react";
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
  Wallet2,
  Compass,
  BellRing,
} from "lucide-react";
import { signInWithGoogle } from "@/lib/auth-actions";
import { Mark } from "@/components/ui/Mark";
import { EmailSignInField } from "./EmailSignInField";
import { CustomCursor } from "../landing/CustomCursor";
import { LoadingScreen } from "../landing/LoadingScreen";
import { FadeIn } from "../landing/FadeIn";

const CAPABILITIES = [
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
  { icon: IdCard, title: "BNS Names", body: "Resolve names, look up any wallet address, and watch names before they expire." },
  { icon: Send, title: "Telegram Bot", body: "Get stacking, price, and expiry alerts delivered straight to Telegram." },
  { icon: WalletIcon, title: "Portfolio", body: "Track STX balances, locked stacking positions, and token holdings in one view." },
  { icon: Scale, title: "Compare Wallets", body: "Line up two or more addresses side by side across balances and activity." },
  { icon: Sprout, title: "Stacking Monitor", body: "Watch PoX cycles, lock status, and unlock heights without lifting a finger." },
  { icon: Sparkles, title: "Wrapped", body: "A yearly look back at your on-chain activity, StackSuite's own take on the format." },
  { icon: LineChart, title: "Markets", body: "Live prices, top movers, fear & greed, and gas fees across BTC, ETH, and STX." },
  { icon: Calculator, title: "Tools", body: "Stacking yield and reward calculators for planning a cycle ahead of time." },
  { icon: Star, title: "Tracking", body: "Keep a personal watchlist of wallets and get notified when they move." },
];

const STEPS = [
  {
    icon: Wallet2,
    step: "01",
    title: "Connect or create a wallet",
    body: "Bring a wallet you already use, or spin up a StackSuite Wallet in seconds. Your keys stay yours.",
  },
  {
    icon: Compass,
    step: "02",
    title: "Explore your on-chain footprint",
    body: "BNS names, balances, stacking status, and portfolio history resolve live the moment you land.",
  },
  {
    icon: BellRing,
    step: "03",
    title: "Set it and get alerted",
    body: "Watch names, wallets, and price levels, then let Telegram alerts do the watching for you.",
  },
];

export function SignInGate() {
  const [showLoading, setShowLoading] = useState(true);
  const [formPending, setFormPending] = useState(false);
  const [cursorEnabled, setCursorEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Deferred a tick rather than called straight in the effect body -
    // still resolves before the next paint.
    queueMicrotask(() => setCursorEnabled(fine && !reduced));
  }, []);

  const scrollToSignIn = () => {
    document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {showLoading && <LoadingScreen onDone={() => setShowLoading(false)} />}
      {cursorEnabled && <CustomCursor loading={showLoading || formPending} />}

      <div className={`min-h-screen relative overflow-x-hidden ${cursorEnabled ? "landing-no-cursor" : ""}`}>
        <div className="stack-atmosphere" />

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-line glass-nav">
          <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mark size={22} />
              <span className="font-display font-bold text-lg">
                Stack<span className="font-medium text-slate-mist">Suite</span>
              </span>
            </div>
            <nav className="hidden sm:flex items-center gap-7 text-sm text-slate-mist">
              <button onClick={scrollToFeatures} className="hover:text-chalk transition-colors duration-200">
                Features
              </button>
              <a
                href="#get-started"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSignIn();
                }}
                className="hover:text-chalk transition-colors duration-200"
              >
                Sign in
              </a>
            </nav>
            <button
              onClick={scrollToSignIn}
              className="rounded-lg bg-indigo hover:bg-indigo-light transition-all duration-200 active:scale-[0.98] text-chalk text-sm font-medium px-4 py-2 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset]"
            >
              Get started
            </button>
          </div>
        </header>

        <main className="relative z-10 max-w-6xl mx-auto px-5 md:px-8">
          {/* Hero */}
          <section className="relative pt-20 pb-16 md:pt-32 md:pb-28 flex flex-col items-center text-center overflow-hidden">
            <div
              className="glow-orb w-[36rem] h-[36rem] -top-40 left-1/2 -translate-x-1/2 bg-indigo/30"
              aria-hidden="true"
            />
            <div
              className="glow-orb w-80 h-80 top-24 right-0 bg-ember/20"
              aria-hidden="true"
            />
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full glass-surface px-3.5 py-1.5 mb-7 text-xs font-mono text-slate-mist">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-light animate-pulse" />
                Live on Stacks &amp; secured by Bitcoin
              </div>
            </FadeIn>
            <FadeIn delay={80}>
              <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl leading-[1.08] max-w-3xl text-chalk">
                Bitcoin-secured tools.
                <br />
                Full market intel.
                <br />
                <span className="text-gradient">One app.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={160}>
              <p className="mt-6 max-w-xl text-base md:text-lg text-slate-mist leading-relaxed">
                BNS names, stacking monitoring, live markets, and real-time alerts for
                Stacks and beyond, all in a single dashboard your wallet never has to
                leave your control for.
              </p>
            </FadeIn>
            <FadeIn delay={240}>
              <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={scrollToSignIn}
                  className="group flex items-center gap-2 rounded-lg bg-indigo hover:bg-indigo-light transition-all duration-200 active:scale-[0.98] text-chalk font-medium px-6 py-3 text-sm shadow-[0_10px_30px_-8px_rgba(85,70,232,0.6)]"
                >
                  Launch StackSuite
                  <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={scrollToFeatures}
                  className="rounded-lg glass-surface hover:border-indigo-light/60 transition-all duration-200 active:scale-[0.98] text-chalk font-medium px-6 py-3 text-sm"
                >
                  Explore Features
                </button>
              </div>
            </FadeIn>

            {/* Floating stat cards */}
            <FadeIn delay={320} className="w-full">
              <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {[
                  { label: "Tools in one app", value: "10+" },
                  { label: "Chains covered", value: "BTC / STX / ETH" },
                  { label: "Data freshness", value: "Live" },
                  { label: "Custody model", value: "Non-custodial" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-surface rounded-xl px-3 py-4 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <p className="font-display font-bold text-sm sm:text-base text-chalk">{stat.value}</p>
                    <p className="mt-1 text-[11px] text-slate-mist leading-snug">{stat.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </section>

          {/* Capabilities */}
          <section className="py-14 md:py-20 border-t border-line">
            <FadeIn>
              <div className="max-w-xl mb-10">
                <p className="text-xs font-mono uppercase tracking-wider text-ember">Capabilities</p>
                <h2 className="mt-3 font-display font-bold text-2xl md:text-3xl text-chalk">
                  Why StackSuite over a spreadsheet of tabs
                </h2>
              </div>
            </FadeIn>
            <div className="grid sm:grid-cols-3 gap-6 md:gap-8">
              {CAPABILITIES.map((v, i) => (
                <FadeIn key={v.title} delay={i * 100}>
                  <div className="h-full rounded-xl glass-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-light/30">
                    <div className="w-9 h-9 rounded-lg bg-indigo/15 flex items-center justify-center">
                      <v.icon size={18} className="text-indigo-light" />
                    </div>
                    <h3 className="mt-4 font-display font-semibold text-chalk">{v.title}</h3>
                    <p className="mt-2 text-sm text-slate-mist leading-relaxed">{v.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Features */}
          <section id="features" className="py-14 md:py-20 border-t border-line scroll-mt-16">
            <FadeIn>
              <div className="max-w-xl mb-10">
                <p className="text-xs font-mono uppercase tracking-wider text-ember">
                  Everything, one tab away
                </p>
                <h2 className="mt-3 font-display font-bold text-2xl md:text-3xl text-chalk">
                  Ten tools. No context switching.
                </h2>
              </div>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {FEATURES.map((f, i) => (
                <FadeIn key={f.title} delay={(i % 3) * 90}>
                  <div className="h-full rounded-xl glass-surface p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-light/30">
                    <f.icon size={18} className="text-indigo-light" strokeWidth={2} />
                    <h3 className="mt-3 font-medium text-chalk text-sm">{f.title}</h3>
                    <p className="mt-1.5 text-[13px] text-slate-mist leading-relaxed">{f.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="py-14 md:py-20 border-t border-line">
            <FadeIn>
              <div className="max-w-xl mb-10">
                <p className="text-xs font-mono uppercase tracking-wider text-ember">How it works</p>
                <h2 className="mt-3 font-display font-bold text-2xl md:text-3xl text-chalk">
                  From zero to on-chain visibility in three steps
                </h2>
              </div>
            </FadeIn>
            <div className="grid sm:grid-cols-3 gap-6 md:gap-8">
              {STEPS.map((s, i) => (
                <FadeIn key={s.title} delay={i * 110}>
                  <div className="relative h-full rounded-xl border border-line bg-surface/50 p-6">
                    <span className="font-display text-4xl font-bold text-indigo-deep/40">{s.step}</span>
                    <div className="mt-4 w-9 h-9 rounded-lg bg-indigo/15 flex items-center justify-center">
                      <s.icon size={18} className="text-indigo-light" />
                    </div>
                    <h3 className="mt-4 font-display font-semibold text-chalk">{s.title}</h3>
                    <p className="mt-2 text-sm text-slate-mist leading-relaxed">{s.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Get started / sign in (CTA) */}
          <section
            id="get-started"
            className="py-16 md:py-24 border-t border-line flex flex-col items-center scroll-mt-16"
          >
            <FadeIn className="w-full max-w-sm">
              <div className="rounded-2xl glass-surface p-7 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
                <div className="text-center mb-6">
                  <h2 className="font-display text-xl font-bold text-chalk leading-snug">
                    Get started
                  </h2>
                  <p className="mt-2 text-sm text-slate-mist">
                    Sign in to sync your linked wallet and preferences across
                    devices.
                  </p>
                </div>

                <div className="space-y-4">
                  <form action={signInWithGoogle}>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-3 rounded-lg bg-chalk text-ink font-medium px-5 py-3 text-sm hover:bg-white transition-all duration-200 active:scale-[0.98]"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path
                          fill="#FFC107"
                          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
                        />
                        <path
                          fill="#FF3D00"
                          d="m6.3 14.7 6.6 4.8C14.7 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 7.1 29.5 5 24 5c-7.7 0-14.4 4.4-17.7 10.7z"
                        />
                        <path
                          fill="#4CAF50"
                          d="M24 45c5.4 0 10.3-1.8 14.1-5.1l-6.5-5.5C29.6 35.9 26.9 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 40.5 16.3 45 24 45z"
                        />
                        <path
                          fill="#1976D2"
                          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C40.9 36.4 44 30.9 44 24c0-1.2-.1-2.4-.4-3.5z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </form>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-line" />
                    <span className="text-[11px] font-mono text-slate-dim tracking-wider">OR</span>
                    <div className="h-px flex-1 bg-line" />
                  </div>

                  <EmailSignInField onPendingChange={setFormPending} />
                </div>
              </div>

              <p className="mt-6 text-xs text-slate-dim text-center leading-relaxed px-2">
                The StackSuite Wallet involves real fund custody once you create
                or import one inside the app. Stacking Monitor is read-only and
                never takes custody of your funds.
              </p>
            </FadeIn>
          </section>
        </main>

        <footer className="relative z-10 border-t border-line">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-dim">
            <div className="flex items-center gap-2">
              <Mark size={16} />
              <span>StackSuite</span>
            </div>
            <p>Built on Stacks, secured by Bitcoin.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
