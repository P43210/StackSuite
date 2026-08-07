"use client";

import { ReactNode, useState } from "react";
import { Button } from "./Button";

/** Two-step "click to arm, click again to confirm" destructive action -
    no separate modal needed for lower-stakes destructive actions. */
export function DangerAction({
  label,
  confirmLabel,
  description,
  onConfirm,
  busy,
}: {
  label: ReactNode;
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <div className="rounded-lg border border-ember/30 bg-ember/[0.04] p-3">
        <p className="text-xs text-chalk leading-relaxed">{description}</p>
        <div className="flex gap-2 mt-3">
          <Button variant="danger" onClick={onConfirm} disabled={busy} className="flex-1">
            {busy ? "Working..." : confirmLabel}
          </Button>
          <Button variant="secondary" onClick={() => setArmed(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setArmed(true)}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-slate-mist hover:text-ember hover:bg-ember/[0.06] transition-colors text-left"
    >
      {label}
    </button>
  );
}
