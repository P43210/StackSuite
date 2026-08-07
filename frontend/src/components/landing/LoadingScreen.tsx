"use client";

import { useEffect, useState } from "react";

const BARS = [
  { delay: 0, fill: "#F2994A" },
  { delay: 90, fill: "#7B70F5" },
  { delay: 180, fill: "#5546E8" },
  { delay: 270, fill: "#3A32A0" },
];

/**
 * Full-screen splash that mirrors the wordmark's four diagonally
 * staggered bars, scaling into place in sequence top to bottom - the
 * same "stacking" motif as the logo, just given a moment to breathe
 * before the page underneath it is revealed. Shown once per mount;
 * calls onDone when it's safe to unmount (after the fade-out
 * transition finishes).
 */
export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [risen, setRisen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Deferred a tick rather than called straight in the effect
      // body - still resolves before the next paint.
      queueMicrotask(() => setRisen(true));
      const t = setTimeout(() => {
        setLeaving(true);
        onDone();
      }, 120);
      return () => clearTimeout(t);
    }

    const riseTimer = setTimeout(() => setRisen(true), 60);
    const leaveTimer = setTimeout(() => setLeaving(true), 1100);
    const doneTimer = setTimeout(() => onDone(), 1550);
    return () => {
      clearTimeout(riseTimer);
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
    // onDone identity doesn't matter for scheduling this one-shot sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-ink transition-opacity duration-[450ms] ease-out ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col gap-2">
        {BARS.map((bar, i) => (
          <div
            key={i}
            className="h-4 w-24 rounded-full origin-left transition-transform ease-out"
            style={{
              marginLeft: i * 9,
              backgroundColor: bar.fill,
              transitionDuration: "520ms",
              transitionDelay: `${bar.delay}ms`,
              transform: risen ? "scaleX(1)" : "scaleX(0)",
            }}
          />
        ))}
      </div>
      <p
        className={`mt-5 font-display text-sm tracking-[0.2em] uppercase text-slate-mist transition-opacity duration-500 ${
          risen ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDelay: "420ms" }}
      >
        Stack<span className="text-chalk font-medium">Suite</span>
      </p>
    </div>
  );
}
