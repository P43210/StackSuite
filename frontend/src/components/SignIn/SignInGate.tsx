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
} from "lucide-react";
import { signInWithGoogle } from "@/lib/auth-actions";
import { Mark } from "@/components/ui/Mark";
import { EmailSignInField } from "./EmailSignInField";
import { CustomCursor } from "../landing/CustomCursor";
import { LoadingScreen } from "../landing/LoadingScreen";
import { FadeIn } from "../landing/FadeIn";

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
  { icon: IdCard, title: "BNS Names", body: "Resolve names, see what a wallet owns, and watch names before they expire." },
  { icon: Send, title: "Telegram Bot", body: "Get stacking, price, and expiry alerts delivered straight to Telegram." },
  { icon: WalletIcon, title: "Portfolio", body: "Track STX balances, locked stacking positions, and token holdings in one view." },
  { icon: Scale, title: "Compare Wallets", body: "Line up two or more addresses side by side across balances and activity." },
  { icon: Sprout, title: "Stacking Monitor", body: "Watch PoX cycles, lock status, and unlock heights without lifting a finger." },
  { icon: Sparkles, title: "Wrapped", body: "A yearly look back at your on-chain activity, StackSuite's own take on the format." },
  { icon: LineChart, title: "Markets", body: "Live prices, top movers, fear & greed, and gas fees across BTC, ETH, and STX." },
  { icon: Calculator, title: "Tools", body: "Stacking yield and reward calculators for planning a cycle ahead of time." },
  { icon: Star, title: "Tracking", body: "Keep a personal watchlist of wallets and get notified when they move." },
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
        <header className="sticky top-0 z-30 border-b border-line bg-ink/70 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mark size={22} />
              <span className="font-display font-bold text-lg">
                Stack<span className="font-medium text-slate-mist">Suite</span>
              </span>
            </div>
            <nav className="hidden sm:flex items-center gap-7 text-sm text-slate-mist">
              <button onClick={scrollToFeatures} className="hover:text-chalk transition-colors">
                Features
              </button>
              <a
                href="#get-started"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSignIn();
                }}
                className="hover:text-chalk transition-colors"
              >
                Sign in
              </a>
            </nav>
            <button
              onClick={scrollToSignIn}
              className="rounded-lg bg-indigo hover:bg-indigo-light transition-colors text-chalk text-sm font-medium px-4 py-2"
            >
              Get started
            </button>
          </div>
        </header>

        <main className="relative z-10 max-w-6xl mx-auto px-5 md:px-8">
          {/* Hero */}
          <section className="pt-20 pb-16 md:pt-28 md:pb-24 flex flex-col items-center text-center">
            <FadeIn>
              <div className="flex justify-center mb-7" aria-hidden="true">
                <Mark size={64} />
              </div>
            </FadeIn>
            <FadeIn delay={80}>
              <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl leading-[1.08] max-w-3xl text-chalk">
                Bitcoin-secured tools.
                <br />
                Full market intel.
                <br />
                <span className="text-indigo-light">One app.</span>
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
                  className="group flex items-center gap-2 rounded-lg bg-indigo hover:bg-indigo-light transition-colors text-chalk font-medium px-6 py-3 text-sm"
                >
                  Get started
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={scrollToFeatures}
                  className="rounded-lg border border-line-strong hover:border-indigo-light/60 transition-colors text-chalk font-medium px-6 py-3 text-sm"
                >
                  See what&apos;s inside
                </button>
              </div>
            </FadeIn>
          </section>

          {/* Value proposition */}
          <section className="py-14 md:py-20 border-t border-line">
            <div className="grid sm:grid-cols-3 gap-6 md:gap-8">
              {VALUE_PROPS.map((v, i) => (
                <FadeIn key={v.title} delay={i * 100}>
                  <div className="h-full rounded-xl border border-line bg-surface/60 p-6">
                    <v.icon size={20} className="text-indigo-light" />
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
                  <div className="h-full rounded-xl border border-line hover:border-line-strong bg-surface/40 p-5 transition-colors">
                    <f.icon size={18} className="text-indigo-light" strokeWidth={2} />
                    <h3 className="mt-3 font-medium text-chalk text-sm">{f.title}</h3>
                    <p className="mt-1.5 text-[13px] text-slate-mist leading-relaxed">{f.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Get started / sign in */}
          <section
            id="get-started"
            className="py-16 md:py-24 border-t border-line flex flex-col items-center scroll-mt-16"
          >
            <FadeIn className="w-full max-w-sm">
              <div className="rounded-2xl border border-line bg-surface p-7 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
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
                      className="w-full flex items-center justify-center gap-3 rounded-lg bg-chalk text-ink font-medium px-5 py-3 text-sm hover:bg-white transition-colors"
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
