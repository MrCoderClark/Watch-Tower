"use client";

import { AlertTriangle, Gauge, Layers, Users } from "lucide-react";

import { ErrorChart } from "@/components/dashboard/error-chart";
import { IssuesTable } from "@/components/dashboard/issues-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ServicesDonut } from "@/components/dashboard/services-donut";
import { UsersBar } from "@/components/dashboard/users-bar";
import { Header } from "@/components/layout/header";

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Error Tracking Dashboard"
        context="Project: Web App (Prod)"
      />
      <main className="space-y-6 px-8 py-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Unresolved Issues"
            value="32"
            delta="+12%"
            deltaLabel="since last hour"
            tone="danger"
            icon={AlertTriangle}
          />
          <KpiCard
            label="Total Events"
            value="12.4k"
            delta="-2%"
            deltaLabel="since last hour"
            tone="neutral"
            icon={Gauge}
          />
          <KpiCard
            label="Affected Users"
            value="419"
            delta="+5%"
            deltaLabel="since last hour"
            tone="warn"
            icon={Users}
          />
          <KpiCard
            label="Unique Issues"
            value="18"
            tone="neutral"
            icon={Layers}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ErrorChart />
          </div>
          <div className="lg:col-span-4">
            <ServicesDonut />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <IssuesTable />
          </div>
          <div className="lg:col-span-4">
            <UsersBar />
          </div>
        </section>
      </main>
    </>
  );
}
