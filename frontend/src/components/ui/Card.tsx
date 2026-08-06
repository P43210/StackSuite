import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  /** Ember-tinted border, for warnings/highlights - use sparingly. */
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border ${
        accent ? "border-ember/30 bg-ember/[0.04]" : "border-line bg-surface"
      } ${className}`}
    >
      {children}
    </div>
  );
}
