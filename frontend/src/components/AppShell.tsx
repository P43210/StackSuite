"use client";

import { useState } from "react";
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

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "bns", label: "BNS Names", icon: IdCard },
  { id: "bot", label: "Telegram Bot", icon: Send },
  { id: "portfolio", label: "Portfolio", icon: WalletIcon },
  { id: "compare", label: "Compare Wallets", icon: Scale },
  { id: "stacking", label: "Stacking Monitor", icon: Sprout },
  { id: "wrapped", label: "Wrapped", icon: Sparkles },
  { id: "markets", label: "Markets", icon: LineChart },
  { id: "tools", label: "Tools", icon: Calculator },
  { id: "tracking", label: "Tracking", icon: Star },
  { id: "wallet", label: "Wallet", icon: KeyRound },
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
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors w-full text-left ${
        active
          ? "bg-white/[0.06] text-chalk"
          : "text-slate-mist hover:text-chalk hover:bg-white/[0.03]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-ember" />
      )}
      <Icon size={17} strokeWidth={2} className={active ? "text-indigo-light" : ""} />
      <span className="font-medium">{tab.label}</span>
    </button>
  );
}

export function AppShell({ accountEmail }: { accountEmail: string | null }) {
  const [active, setActive] = useState<TabId>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const select = (id: TabId) => {
    setActive(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen">
      <div className="stack-atmosphere" />

      {/* Mobile top bar */}
      <header className="md:hidden relative z-10 flex items-center justify-between px-4 py-3 border-b border-line">
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
          className="p-2 -ml-2 text-slate-mist hover:text-chalk"
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
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav className="relative z-10 w-72 bg-surface border-r border-line p-4 flex flex-col gap-1">
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
                className="p-1 text-slate-mist hover:text-chalk"
              >
                <X size={20} />
              </button>
            </div>
            {TABS.map((tab) => (
              <NavLink
                key={tab.id}
                tab={tab}
                active={active === tab.id}
                onClick={() => select(tab.id)}
              />
            ))}
            <div className="h-px bg-line my-2" />
            {ACCOUNT_TABS.map((tab) => (
              <NavLink
                key={tab.id}
                tab={tab}
                active={active === tab.id}
                onClick={() => select(tab.id)}
              />
            ))}
          </nav>
        </div>
      )}

      <div className="relative z-10 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-line px-4 py-6 h-screen sticky top-0">
          <div className="flex items-center gap-2 px-2 mb-8">
            <Mark size={24} />
            <span className="font-display font-bold text-lg">
              Stack<span className="font-medium text-slate-mist">Suite</span>
            </span>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.id}
                tab={tab}
                active={active === tab.id}
                onClick={() => select(tab.id)}
              />
            ))}
          </nav>

          <nav className="flex flex-col gap-1 pt-2 mt-2 border-t border-line">
            {ACCOUNT_TABS.map((tab) => (
              <NavLink
                key={tab.id}
                tab={tab}
                active={active === tab.id}
                onClick={() => select(tab.id)}
              />
            ))}
          </nav>

          <div className="px-2 mt-4 flex items-center gap-2">
            <div className="flex-1">
              <WalletButton />
            </div>
            <ThemeToggle />
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-5 py-8 md:px-10 md:py-10">
          <div className="max-w-3xl">
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
