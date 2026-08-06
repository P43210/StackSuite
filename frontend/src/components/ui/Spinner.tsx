"use client";

const BARS = [
  { color: "#3A32A0", delay: "0ms" },
  { color: "#5546E8", delay: "120ms" },
  { color: "#7B70F5", delay: "240ms" },
  { color: "#F2994A", delay: "360ms" },
];

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="flex flex-col gap-1.5 w-14">
        {BARS.map((bar, i) => (
          <div
            key={i}
            className="h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: bar.color,
              animationDelay: bar.delay,
              animationDuration: "1.1s",
              marginLeft: `${(BARS.length - 1 - i) * 6}px`,
              width: `${100 - (BARS.length - 1 - i) * 12}%`,
            }}
          />
        ))}
      </div>
      {label && <span className="text-xs font-mono text-slate-mist">{label}</span>}
    </div>
  );
}
