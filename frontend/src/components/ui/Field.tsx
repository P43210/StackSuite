import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg bg-black/20 border border-line px-3.5 py-2.5 font-mono text-sm text-chalk placeholder:text-slate-dim focus:outline-none focus:border-indigo-light transition-colors";

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-wide text-slate-mist">
        {label}
      </span>
      <input className={FIELD_CLASS} {...props} />
    </label>
  );
}

export function TextAreaField({
  label,
  ...props
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-wide text-slate-mist">
        {label}
      </span>
      <textarea className={FIELD_CLASS} {...props} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-wide text-slate-mist">
        {label}
      </span>
      <select className={FIELD_CLASS} {...props}>
        {children}
      </select>
    </label>
  );
}
