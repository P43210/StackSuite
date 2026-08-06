"use client";

import { useState } from "react";
import { CryptoConverter } from "./tools/CryptoConverter";
import { ProfitCalculator } from "./tools/ProfitCalculator";
import { PositionSizeCalculator } from "./tools/PositionSizeCalculator";
import { PageHeading } from "@/components/ui/PageHeading";
import { SubTabBar } from "@/components/ui/SubTabBar";

const SUB_TABS = [
  { id: "converter", label: "Converter" },
  { id: "profit", label: "Profit Calculator" },
  { id: "position", label: "Position Size" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

export function ToolsTab() {
  const [active, setActive] = useState<SubTabId>("converter");

  return (
    <div>
      <PageHeading
        title="Tools"
        description="Quick calculators for conversions, trade profit, and position sizing."
      />
      <SubTabBar tabs={SUB_TABS} active={active} onChange={setActive} />

      {active === "converter" && <CryptoConverter />}
      {active === "profit" && <ProfitCalculator />}
      {active === "position" && <PositionSizeCalculator />}
    </div>
  );
}
