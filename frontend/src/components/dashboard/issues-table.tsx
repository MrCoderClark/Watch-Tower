const ROWS = [
  {
    title: "TypeError: undefined is not an object",
    events: "1.2k",
    users: 210,
    lastSeen: "5 min ago",
  },
  {
    title: "ZeroDivisionError: division by zero",
    events: "950",
    users: 185,
    lastSeen: "12 min ago",
  },
  {
    title: "Failed to connect to microservice",
    events: "412",
    users: 95,
    lastSeen: "18 min ago",
  },
  {
    title: "UnauthorizedAccessException",
    events: "105",
    users: 20,
    lastSeen: "25 min ago",
  },
];

const GRID = "grid-cols-[52px_minmax(0,1fr)_90px_90px_140px_180px] gap-x-6";

export function IssuesTable() {
  return (
    <div className="rounded-xl border border-wt-border bg-wt-bg-2">
      <div className="px-6 pt-5">
        <span className="label-caps">Latest Unresolved Issues</span>
      </div>
      <div className="mt-4">
        <div className={`grid ${GRID} px-6 pb-3 label-caps`}>
          <span>Status</span>
          <span>Title</span>
          <span>Events</span>
          <span>Users</span>
          <span>Last Seen</span>
          <span>Actions</span>
        </div>
        <div className="border-t border-wt-border-soft">
          {ROWS.map((row) => (
            <div
              key={row.title}
              className={`grid ${GRID} items-center border-b border-wt-border-soft px-6 py-4 text-sm transition-colors last:border-b-0 hover:bg-wt-bg-3/40`}
            >
              <span>
                <span
                  className="inline-block size-2.5 rounded-full bg-wt-danger"
                  aria-label="unresolved"
                />
              </span>
              <span className="truncate text-wt-text">{row.title}</span>
              <span className="num text-wt-text">{row.events}</span>
              <span className="num text-wt-text">{row.users}</span>
              <span className="text-wt-text-muted">{row.lastSeen}</span>
              <span className="space-x-4 text-wt-accent-2">
                <button type="button" className="hover:underline">
                  View Details
                </button>
                <button type="button" className="hover:underline">
                  Assign
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
