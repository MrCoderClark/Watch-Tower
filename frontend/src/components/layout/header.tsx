import Link from "next/link";
import { Bell, Settings } from "lucide-react";

export function Header({
  title,
  context,
}: {
  title: string;
  context?: string;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-wt-border bg-wt-bg-0 px-8">
      <div className="flex items-baseline gap-3">
        <h1 className="label-caps text-wt-text">{title}</h1>
        {context && (
          <>
            <span className="text-wt-text-dim">|</span>
            <span className="text-sm text-wt-text-muted">{context}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard/alerts"
          className="rounded-md p-2 text-wt-text-muted hover:bg-wt-bg-2 hover:text-wt-text"
          aria-label="Alerts"
        >
          <Bell strokeWidth={1.5} className="size-4" />
        </Link>
        <Link
          href="/dashboard/settings"
          className="rounded-md p-2 text-wt-text-muted hover:bg-wt-bg-2 hover:text-wt-text"
          aria-label="Settings"
        >
          <Settings strokeWidth={1.5} className="size-4" />
        </Link>
      </div>
    </header>
  );
}
