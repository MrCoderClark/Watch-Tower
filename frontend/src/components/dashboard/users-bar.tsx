"use client";

export function UsersBar() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-wt-border bg-wt-bg-2 p-6">
      <span className="label-caps">Most Affected Users (Top 5)</span>
      <div className="mt-4 flex flex-1 items-center justify-center px-2 text-center text-sm text-wt-text-muted">
        Populates once events include a{" "}
        <code className="mx-1 rounded bg-wt-bg-3 px-1.5 py-0.5 text-xs text-wt-text">
          user.id
        </code>{" "}
        and per-issue user counting lands.
      </div>
    </div>
  );
}
