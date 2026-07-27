"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { WorkspaceProvider } from "@/providers/workspace-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="label-caps">Loading…</div>
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </WorkspaceProvider>
  );
}
