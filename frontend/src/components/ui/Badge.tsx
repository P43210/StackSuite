import { ReactNode } from "react";

type Tone = "positive" | "success" | "negative" | "neutral" | "warning";

const TONE_CLASSES: Record<Tone, string> = {
  positive: "bg-indigo-light/15 text-indigo-light",
  success: "bg-emerald-400/15 text-emerald-400",
  negative: "bg-ember/15 text-ember",
  neutral: "bg-white/[0.06] text-slate-mist",
  warning: "bg-ember/15 text-ember",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
