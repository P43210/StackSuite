export function PageHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-[1.75rem] leading-tight font-bold text-chalk">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 text-sm text-slate-mist max-w-lg">{description}</p>
      )}
    </div>
  );
}
