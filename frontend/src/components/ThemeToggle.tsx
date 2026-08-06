"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
      className={`flex items-center justify-center rounded-lg border border-line-strong text-slate-mist
        hover:text-chalk hover:border-indigo-light/60 transition-colors
        ${compact ? "p-2" : "p-2.5"}`}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
