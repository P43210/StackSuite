export function SubTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
            active === tab.id
              ? "bg-indigo text-chalk shadow-[0_4px_14px_-4px_rgba(85,70,232,0.6)]"
              : "text-slate-mist hover:text-chalk hover:bg-white/[0.04]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
