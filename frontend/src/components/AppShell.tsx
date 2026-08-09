"use client";

import { useEffect, useState } from "react";
import {
  Home,
  IdCard,
  Send,
  Wallet as WalletIcon,
  Sprout,
  LineChart,
  Calculator,
  Star,
  KeyRound,
  Scale,
  Sparkles,
  User,
  Settings as SettingsIcon,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "./ui/Mark";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./ThemeToggle";
import { HomeTab } from "./tabs/HomeTab";
import { BnsTab } from "./tabs/BnsTab";
import { TelegramBotTab } from "./tabs/TelegramBotTab";
import { PortfolioTab } from "./tabs/PortfolioTab";
import { CompareWalletsTab } from "./tabs/CompareWalletsTab";
import { StackingMonitorTab } from "./tabs/StackingMonitorTab";
import { WrappedTab } from "./tabs/WrappedTab";
import { MarketsTab } from "./tabs/MarketsTab";
import { ToolsTab } from "./tabs/ToolsTab";
import { TrackingTab } from "./tabs/TrackingTab";
import { WalletTab } from "./tabs/WalletTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { initTrackedWalletsSync } from "@/lib/tracked-wallets";
import { initBnsWatchlistSync } from "@/lib/bns-watchlist";

// Flat list drives routing/state exactly as before the redesign - the
// groups below are purely a presentational grouping over this same
// list (by id), so there's a single source of truth for each tab's
// id/label/icon and no risk of the two drifting apart.
const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "bns", label: "BNS Names", icon: IdCard },
  { id: "portfolio", label: "Portfolio", icon: WalletIcon },
  { id: "compare", label: "Compare Wallets", icon: Scale },
  { id: "stacking", label: "Stacking Monitor", icon: Sprout },
  { id: "wrapped", label: "Wrapped", icon: Sparkles },
  { id: "bot", label: "Telegram Bot", icon: Send },
  { id: "markets", label: "Markets", icon: LineChart },
  { id: "tools", label: "Tools", icon: Calculator },
  { id: "tracking", label: "Tracking", icon: Star },
  { id: "wallet", label: "Wallet", icon: KeyRound },
] as const;

// Grouping metadata for the sidebar - just labels + which ids belong
// under each heading. Rendered by looking each id up in TABS below,
// so this never needs its own id/label/icon literals (and can't type-
// error the way computing this by flatMap-ing separately-shaped
// tuples did).
const NAV_GROUPS = [
  { label: "Overview", ids: ["home"] },
  { label: "Stacks tools", ids: ["bns", "portfolio", "compare", "stacking", "wrapped"] },
  { label: "Markets & alerts", ids: ["bot", "markets", "tools", "tracking"] },
  { label: "Custody", ids: ["wallet"] },
] as const;

const ACCOUNT_TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;

type TabId = (typeof TABS)[number]["id"] | (typeof ACCOUNT_TABS)[number]["id"];

type NavItem = { id: TabId; label: string; icon: LucideIcon };

function NavLink({
  tab,
  active,
  onClick,
}: {
  tab: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 w-full text-left ${
        active
          ? "glass-surface text-chalk shadow-[0_0_0_1px_rgba(123,112,245,0.25)_inset]"
          : "text-slate-mist hover:text-chalk hover:bg-white/[0.03] hover:translate-x-0.5"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gradient-to-b from-ember to-indigo-light shadow-[0_0_8px_rgba(123,112,245,0.6)]" />
      )}
      <Icon
        size={17}
        strokeWidth={2}
        className={`transition-colors duration-200 ${active ? "text-indigo-light" : "group-hover:text-indigo-light/70"}`}
      />
      <span className="font-medium">{tab.label}</span>
    </button>
  );
}

function NavGroups({
  active,
  onSelect,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
}) {
  return (
    <nav className="flex flex-col gap-4 flex-1">
      {NAV_GROUPS.map((group) => {
        // Look each id up in TABS rather than embedding tab objects
        // directly in NAV_GROUPS - keeps a single source of truth for
        // id/label/icon and avoids combining differently-shaped const
        // tuples (which is what produced the earlier type error).
        const ids: readonly string[] = group.ids;
        const tabs = TABS.filter((tab) => ids.includes(tab.id));
        return (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-dim">
              {group.label}
            </p>
            <div className="flex flex-col gap-1">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.id}
                  tab={tab}
                  active={active === tab.id}
                  onClick={() => onSelect(tab.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell({ accountEmail }: { accountEmail: string | null }) {
  const [active, setActive] = useState<TabId>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Keeps the tracked-wallets and BNS watchlists in sync with the
  // signed-in account (see initTrackedWalletsSync/initBnsWatchlistSync)
  // so the same account sees the same lists on every device. Re-runs
  // whenever the signed-in account changes (including signing out).
  useEffect(() => {
    const signedIn = Boolean(accountEmail);
    initTrackedWalletsSync(signedIn);
    initBnsWatchlistSync(signedIn);
  }, [accountEmail]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const select = (id: TabId) => {
    setActive(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen">
      <div className="stack-atmosphere" />

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 glass-nav relative flex items-center justify-between px-4 py-3 border-b border-line">
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
          className="p-2 -ml-2 text-slate-mist hover:text-chalk transition-colors active:scale-95"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Mark size={20} />
          <span className="font-display font-bold text-lg">
            Stack<span className="font-medium text-slate-mist">Suite</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <WalletButton compact />
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 animate-fade-in"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav className="relative z-10 w-72 glass-nav border-r border-line p-4 flex flex-col gap-1 animate-slide-in-left overflow-y-auto">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Mark size={20} />
                <span className="font-display font-bold">
                  Stack<span className="font-medium text-slate-mist">Suite</span>
                </span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="p-1 text-slate-mist hover:text-chalk transition-colors active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
            <NavGroups active={active} onSelect={select} />
            <div className="h-px bg-line my-2" />
            <div className="flex flex-col gap-1">
              {ACCOUNT_TABS.map((tab) => (
                <NavLink
                  key={tab.id}
                  tab={tab}
                  active={active === tab.id}
                  onClick={() => select(tab.id)}
                />
              ))}
            </div>
          </nav>
        </div>
      )}

      <div className="relative z-10 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-line px-4 py-6 h-screen sticky top-0 overflow-y-auto">
          <div className="flex items-center gap-2 px-2 mb-8">
            <Mark size={24} />
            <span className="font-display font-bold text-lg">
              Stack<span className="font-medium text-slate-mist">Suite</span>
            </span>
          </div>

          <NavGroups active={active} onSelect={select} />

          <nav className="flex flex-col gap-1 pt-3 mt-3 border-t border-line">
            {ACCOUNT_TABS.map((tab) => (
              <NavLink
                key={tab.id}
                tab={tab}
                active={active === tab.id}
                onClick={() => select(tab.id)}
              />
            ))}
          </nav>

          <div className="mt-4 rounded-xl glass-surface p-2.5">
            <p className="px-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-dim">
              Wallet
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <WalletButton />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-5 py-8 md:px-10 md:py-10">
          <div key={active} className="max-w-3xl animate-fade-in-up">
            {active === "home" && <HomeTab onNavigate={(id) => select(id as TabId)} />}
            {active === "bns" && <BnsTab />}
            {active === "bot" && <TelegramBotTab />}
            {active === "portfolio" && <PortfolioTab />}
            {active === "compare" && <CompareWalletsTab />}
            {active === "stacking" && <StackingMonitorTab />}
            {active === "wrapped" && <WrappedTab />}
            {active === "markets" && <MarketsTab />}
            {active === "tools" && <ToolsTab />}
            {active === "tracking" && <TrackingTab />}
            {active === "wallet" && <WalletTab />}
            {active === "profile" && <ProfileTab accountEmail={accountEmail} />}
            {active === "settings" && <SettingsTab accountEmail={accountEmail} />}
          </div>
        </main>
      </div>
    </div>
  );
}
