"use client";

// Same four bars as the Mark (equal size, diagonally staggered,
// orange top through navy bottom), just pulsing in sequence instead
// of static - so the loading state still reads as the same logo.
const BARS = [
  { color: "#F2994A", delay: "0ms" },
  { color: "#7B70F5", delay: "120ms" },
  { color: "#5546E8", delay: "240ms" },
  { color: "#3A32A0", delay: "360ms" },
];

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="flex flex-col gap-1.5">
        {BARS.map((bar, i) => (
          <div
            key={i}
            className="h-2.5 w-14 rounded-full animate-pulse"
            style={{
              backgroundColor: bar.color,
              animationDelay: bar.delay,
              animationDuration: "1.1s",
              marginLeft: `${i * 6}px`,
            }}
          />
        ))}
      </div>
      {label && <span className="text-xs font-mono text-slate-mist">{label}</span>}
    </div>
  );
}
