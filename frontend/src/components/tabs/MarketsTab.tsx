"use client";

import { useState } from "react";
import { LivePrices } from "./market/LivePrices";
import { TopMovers } from "./market/TopMovers";
import { FearGreedIndex } from "./market/FearGreedIndex";
import { GasFeeTracker } from "./market/GasFeeTracker";
import { PageHeading } from "@/components/ui/PageHeading";
import { SubTabBar } from "@/components/ui/SubTabBar";

const SUB_TABS = [
  { id: "prices", label: "Live Prices" },
  { id: "movers", label: "Top Movers" },
  { id: "fear-greed", label: "Fear & Greed" },
  { id: "gas", label: "Gas Fees" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

export function MarketsTab() {
  const [active, setActive] = useState<SubTabId>("prices");

  return (
    <div>
      <PageHeading
        title="Markets"
        description="Live prices, movers, and sentiment across the crypto market."
      />
      <SubTabBar tabs={SUB_TABS} active={active} onChange={setActive} />

      {active === "prices" && <LivePrices />}
      {active === "movers" && <TopMovers />}
      {active === "fear-greed" && <FearGreedIndex />}
      {active === "gas" && <GasFeeTracker />}
    </div>
  );
}
