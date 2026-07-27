"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Frame } from "@/types/issues";

export function StackTrace({ frames }: { frames: Frame[] }) {
  // Innermost frame first (closest to the throw site).
  const ordered = [...frames].reverse();

  return (
    <div className="rounded-xl border border-wt-border bg-wt-bg-2">
      <div className="border-b border-wt-border-soft px-6 py-4">
        <span className="label-caps">Stack trace</span>
      </div>
      <div className="divide-y divide-wt-border-soft">
        {ordered.map((frame, i) => (
          <FrameRow key={i} frame={frame} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}

function FrameRow({
  frame,
  defaultOpen,
}: {
  frame: Frame;
  defaultOpen: boolean;
}) {
  const hasContext =
    frame.context_line !== null ||
    frame.pre_context.length > 0 ||
    frame.post_context.length > 0;
  const [open, setOpen] = useState(defaultOpen && hasContext);

  const location = [frame.filename, frame.lineno].filter(Boolean).join(":");

  return (
    <div className={cn("px-6 py-3", frame.in_app === false && "opacity-70")}>
      <button
        type="button"
        onClick={() => hasContext && setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 text-left",
          hasContext ? "cursor-pointer" : "cursor-default",
        )}
      >
        {hasContext ? (
          open ? (
            <ChevronDown strokeWidth={1.5} className="size-4 text-wt-text-dim" />
          ) : (
            <ChevronRight strokeWidth={1.5} className="size-4 text-wt-text-dim" />
          )
        ) : (
          <span className="size-4" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 font-mono text-sm">
            <span className="text-wt-accent-2">{frame.function ?? "?"}</span>
            {frame.module && (
              <span className="text-wt-text-muted">in {frame.module}</span>
            )}
          </div>
          {location && (
            <div className="mt-0.5 font-mono text-xs text-wt-text-dim">
              {location}
            </div>
          )}
        </div>
        {frame.in_app && (
          <span className="rounded bg-wt-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-wt-accent-2">
            App
          </span>
        )}
      </button>

      {open && hasContext && (
        <div className="mt-3 overflow-hidden rounded-md border border-wt-border-soft bg-wt-bg-1 font-mono text-xs">
          {frame.pre_context.map((line, i) => (
            <ContextLine
              key={`pre-${i}`}
              lineno={frame.lineno ? frame.lineno - frame.pre_context.length + i : null}
              text={line}
            />
          ))}
          {frame.context_line !== null && (
            <ContextLine
              lineno={frame.lineno}
              text={frame.context_line}
              highlight
            />
          )}
          {frame.post_context.map((line, i) => (
            <ContextLine
              key={`post-${i}`}
              lineno={frame.lineno ? frame.lineno + i + 1 : null}
              text={line}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContextLine({
  lineno,
  text,
  highlight,
}: {
  lineno: number | null;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[48px_1fr] whitespace-pre px-3 py-1",
        highlight && "bg-wt-danger/10",
      )}
    >
      <span className="pr-3 text-right text-wt-text-dim">{lineno ?? " "}</span>
      <span className={cn(highlight ? "text-wt-text" : "text-wt-text-muted")}>
        {text}
      </span>
    </div>
  );
}
