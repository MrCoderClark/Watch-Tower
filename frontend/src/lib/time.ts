const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now.getTime() - then);
  if (diff < 45 * SECOND) return "just now";
  if (diff < HOUR) {
    const m = Math.round(diff / MINUTE);
    return `${m} min ago`;
  }
  if (diff < DAY) {
    const h = Math.round(diff / HOUR);
    return `${h}h ago`;
  }
  const d = Math.round(diff / DAY);
  return `${d}d ago`;
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
