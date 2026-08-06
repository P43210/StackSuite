"use client";

import { useEffect, useRef } from "react";

interface TradingViewWidgetProps {
  scriptSrc: string;
  config: Record<string, unknown>;
  height?: number;
}

/**
 * Injects a TradingView embed widget (the official free, keyless
 * embed-widget scripts under s3.tradingview.com/external-embedding/).
 * This is display-only - it can't be read from server-side code, which
 * is why price alerts use a separate real data feed instead.
 */
export function TradingViewWidget({ scriptSrc, config, height = 400 }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
    // Re-run whenever the config changes (e.g. user edits their watchlist)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptSrc, JSON.stringify(config)]);

  return (
    <div className="tradingview-widget-container rounded-lg overflow-hidden border border-line" style={{ height }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
