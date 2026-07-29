"use client";

import { useEffect } from "react";

import { init } from "@watchtower/browser";

export function WatchtowerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_WATCHTOWER_DSN;
    if (dsn) init({ dsn, environment: process.env.NODE_ENV });
  }, []);
  return <>{children}</>;
}
