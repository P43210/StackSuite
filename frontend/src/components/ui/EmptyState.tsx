import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex gap-1 justify-center opacity-40">
        <div className="w-6 h-2 rounded-full bg-indigo-deep" />
        <div className="w-4 h-2 rounded-full bg-indigo mt-0" />
      </div>
      <p className="font-display font-medium text-chalk">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-mist">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
