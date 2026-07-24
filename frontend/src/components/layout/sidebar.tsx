"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Boxes,
  Gauge,
  Home,
  ListTree,
  LogOut,
  ScrollText,
  Server,
  Settings,
  Timer,
} from "lucide-react";

import { WatchtowerWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/issues", label: "Issues", icon: AlertTriangle },
  { href: "/dashboard/performance", label: "Performance", icon: Gauge },
  { href: "/dashboard/traces", label: "Traces", icon: ListTree },
  { href: "/dashboard/uptime", label: "Uptime", icon: Timer },
  { href: "/dashboard/hosts", label: "Hosts", icon: Server },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText },
  { href: "/dashboard/releases", label: "Releases", icon: Boxes },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-wt-border bg-wt-bg-1">
      <div className="flex h-14 items-center px-4">
        <WatchtowerWordmark />
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                active
                  ? "bg-wt-accent-soft text-wt-text"
                  : "text-wt-text-muted hover:bg-wt-bg-2 hover:text-wt-text",
              )}
              style={
                active
                  ? { boxShadow: "inset 2px 0 0 0 var(--wt-accent)" }
                  : undefined
              }
            >
              <Icon strokeWidth={1.5} className="size-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-wt-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-wt-bg-3 text-xs font-medium text-wt-text">
            {user?.name?.slice(0, 1).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-wt-text">
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
