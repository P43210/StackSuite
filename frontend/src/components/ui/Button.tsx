import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "glass";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-indigo text-chalk hover:bg-indigo-light shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_8px_24px_-8px_rgba(85,70,232,0.55)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_10px_30px_-6px_rgba(85,70,232,0.65)]",
  secondary:
    "border border-line-strong text-chalk hover:border-indigo-light/60 hover:bg-white/[0.03]",
  ghost: "text-slate-mist hover:text-chalk hover:bg-white/[0.03]",
  danger: "border border-ember/40 text-ember hover:bg-ember/10",
  glass: "glass-surface text-chalk hover:border-indigo-light/50 hover:bg-white/[0.06]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
        transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
