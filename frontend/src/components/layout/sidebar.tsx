"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronsLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Rows3,
  Settings,
  Zap,
} from "lucide-react";

import { WatchtowerWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/issues", label: "Issues", icon: FileText, badge: 7 },
  { href: "/dashboard/releases", label: "Releases", icon: Package },
  { href: "/dashboard/performance", label: "Performance", icon: Zap },
  { href: "/dashboard/traces", label: "Traces", icon: Rows3 },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-wt-border bg-wt-bg-1">
      <div className="flex h-14 items-center justify-between px-4">
        <WatchtowerWordmark />
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="rounded-md p-1 text-wt-text-dim hover:bg-wt-bg-2 hover:text-wt-text"
        >
          <ChevronsLeft strokeWidth={1.5} className="size-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                active
                  ? "bg-wt-accent-active text-wt-text"
                  : "text-wt-text-muted hover:bg-wt-bg-2 hover:text-wt-text",
              )}
            >
              <Icon
                strokeWidth={active ? 2 : 1.5}
                className={cn("size-4", active && "text-wt-text")}
              />
              <span className={cn("flex-1", active && "font-medium")}>
                {label}
              </span>
              {badge !== undefined && (
                <span className="num flex h-5 min-w-5 items-center justify-center rounded-full bg-wt-accent px-1.5 text-[11px] font-medium text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-wt-border px-3 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md bg-wt-bg-2 px-3 py-2 text-left transition-colors hover:bg-wt-bg-3"
        >
          <div className="flex-1 min-w-0">
            <div className="label-caps">Project</div>
            <div className="truncate text-sm text-wt-text">
              Web App – Production
            </div>
          </div>
          <ChevronDown strokeWidth={1.5} className="size-4 text-wt-text-dim" />
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md bg-wt-bg-2 px-3 py-2 text-left transition-colors hover:bg-wt-bg-3"
        >
          <div className="flex-1 min-w-0">
            <div className="label-caps">Team</div>
            <div className="truncate text-sm text-wt-text">Engineering</div>
          </div>
          <ChevronDown strokeWidth={1.5} className="size-4 text-wt-text-dim" />
        </button>
      </div>

      <div className="border-t border-wt-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-wt-accent-soft text-xs font-medium text-wt-text">
            {user?.name?.slice(0, 1).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-wt-text">
              {user?.name ?? "Unknown"}
            </div>
            <div className="truncate text-xs text-wt-text-dim">
              {user?.email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Sign out"
            className="rounded-md p-1.5 text-wt-text-dim hover:bg-wt-bg-3 hover:text-wt-text"
          >
            <LogOut strokeWidth={1.5} className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
