import { cn } from "@/lib/utils";

export function WatchtowerLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-6", className)}
      aria-hidden
    >
      <path
        d="M16 2 L28 8 L28 18 C28 24 22 29 16 30 C10 29 4 24 4 18 L4 8 Z"
        fill="var(--wt-accent)"
        opacity="0.15"
      />
      <path
        d="M16 2 L28 8 L28 18 C28 24 22 29 16 30 C10 29 4 24 4 18 L4 8 Z"
        stroke="var(--wt-accent)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M11 13 L16 10 L21 13 L21 19 L16 22 L11 19 Z"
        fill="var(--wt-accent)"
      />
    </svg>
  );
}

export function WatchtowerWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <WatchtowerLogo />
      <span
        className="text-sm font-semibold text-wt-text"
        style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.08em" }}
      >
        WATCHTOWER
      </span>
    </div>
  );
}
