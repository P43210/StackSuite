// The StackSuite mark: four equal-size horizontal bars, staggered
// diagonally, orange (top) through navy (bottom). This is the single
// source of truth for the shape - every place the mark appears
// (header, hero sections, spinner, loading screen) should reuse this
// instead of redrawing its own variant, so they can never drift out
// of sync with each other.
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="shrink-0">
      <rect x="26" y="146" width="100" height="28" rx="14" fill="#3A32A0" />
      <rect x="42" y="106" width="100" height="28" rx="14" fill="#5546E8" />
      <rect x="58" y="66" width="100" height="28" rx="14" fill="#7B70F5" />
      <rect x="74" y="26" width="100" height="28" rx="14" fill="#F2994A" />
    </svg>
  );
}
