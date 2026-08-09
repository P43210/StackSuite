import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  accent = false,
  glass = false,
}: {
  children: ReactNode;
  className?: string;
  /** Ember-tinted border, for warnings/highlights - use sparingly. */
  accent?: boolean;
  /** Frosted, translucent surface for feature/stat cards. Data-heavy
   * surfaces (tables, lists of figures) should stay solid for legibility. */
  glass?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border transition-colors duration-200 ${
        accent
          ? "border-ember/30 bg-ember/[0.04]"
          : glass
            ? "glass-surface"
            : "border-line bg-surface"
      } ${className}`}
    >
      {children}
    </div>
  );
}
