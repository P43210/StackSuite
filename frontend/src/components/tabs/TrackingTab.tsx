"use client";

import { useState } from "react";
import { WatchlistView } from "./tracking/WatchlistView";
import { PriceAlertsView } from "./tracking/PriceAlertsView";
import { PageHeading } from "@/components/ui/PageHeading";
import { SubTabBar } from "@/components/ui/SubTabBar";

const SUB_TABS = [
  { id: "watchlist", label: "Watchlist" },
  { id: "alerts", label: "Price Alerts" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

export function TrackingTab() {
  const [active, setActive] = useState<SubTabId>("watchlist");

  return (
    <div>
      <PageHeading
        title="Tracking"
        description="Build a watchlist across crypto, forex, and metals, and get notified when a price crosses a level you care about."
      />
      <SubTabBar tabs={SUB_TABS} active={active} onChange={setActive} />

      {active === "watchlist" && <WatchlistView />}
      {active === "alerts" && <PriceAlertsView />}
    </div>
  );
}
