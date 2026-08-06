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
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            active === tab.id
              ? "bg-indigo text-chalk"
              : "text-slate-mist hover:text-chalk hover:bg-white/[0.04]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
