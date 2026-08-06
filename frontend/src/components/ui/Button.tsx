import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-indigo text-chalk hover:bg-indigo-light shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset]",
  secondary:
    "border border-line-strong text-chalk hover:border-indigo-light/60 hover:bg-white/[0.03]",
  ghost: "text-slate-mist hover:text-chalk",
  danger: "border border-ember/40 text-ember hover:bg-ember/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
