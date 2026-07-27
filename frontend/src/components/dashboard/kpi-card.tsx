import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "danger" | "warn";

const TONE_BG: Record<KpiTone, string> = {
  neutral: "bg-wt-bg-2",
  danger: "bg-[color:var(--wt-danger-soft)]",
  warn: "bg-[color:var(--wt-warn-soft)]",
};

const TONE_VALUE: Record<KpiTone, string> = {
  neutral: "text-wt-text",
  danger: "text-wt-danger",
  warn: "text-wt-warn",
};

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
  tone?: KpiTone;
  icon?: LucideIcon;
}) {
  return (
    <div className={cn("rounded-xl border border-wt-border p-5", TONE_BG[tone])}>
      <div className="flex items-start justify-between">
        <span className="label-caps">{label}</span>
        {Icon && (
          <Icon
            strokeWidth={1.5}
            className={cn(
              "size-5",
              tone === "danger"
                ? "text-wt-danger"
                : tone === "warn"
                  ? "text-wt-warn"
                  : "text-wt-text-dim",
            )}
          />
        )}
      </div>
      <div
        className={cn(
          "num mt-4 text-[44px] font-semibold leading-none tracking-tight",
          TONE_VALUE[tone],
        )}
      >
        {value}
      </div>
      {(delta || deltaLabel) && (
        <div className="mt-3 text-xs text-wt-text-muted">
          {delta && <span className="font-medium text-wt-success">{delta}</span>}
          {delta && deltaLabel && " "}
          {deltaLabel}
        </div>
      )}
    </div>
  );
}
