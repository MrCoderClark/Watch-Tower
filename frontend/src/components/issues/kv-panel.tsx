import { cn } from "@/lib/utils";

export function KvPanel({
  label,
  data,
  className,
  empty = "None recorded.",
}: {
  label: string;
  data: Record<string, unknown> | null | undefined;
  className?: string;
  empty?: string;
}) {
  const entries = data
    ? Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "")
    : [];

  return (
    <div className={cn("rounded-xl border border-wt-border bg-wt-bg-2", className)}>
      <div className="border-b border-wt-border-soft px-5 py-3">
        <span className="label-caps">{label}</span>
      </div>
      {entries.length === 0 ? (
        <div className="px-5 py-4 text-sm text-wt-text-muted">{empty}</div>
      ) : (
        <dl className="divide-y divide-wt-border-soft text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[minmax(80px,auto)_1fr] gap-4 px-5 py-2">
              <dt className="font-mono text-xs text-wt-text-muted">{k}</dt>
              <dd className="min-w-0 truncate font-mono text-xs text-wt-text">
                {typeof v === "string" ? v : JSON.stringify(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
