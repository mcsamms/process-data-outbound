"use client";
import OutboundMetricsCharts from "@/components/OutboundMetricsCharts";

export default function OutboundChartsPage() {
  return (
    <main className="min-h-screen p-8 flex flex-col gap-8 font-sans text-slate-100 max-w-6xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Outbound Touch Charts</h1>
        <p className="text-sm text-slate-300 max-w-prose">
          Interactive visualizations of engagement impact by industry, region,
          and employee size.
        </p>
        <nav className="flex gap-4 text-sm">
          <a
            className="underline text-slate-100 hover:text-white hover:no-underline"
            href="/outbound-metrics"
          >
            ← Metrics Tables
          </a>
          <a
            className="underline text-slate-100 hover:text-white hover:no-underline"
            href="/"
          >
            Dashboard
          </a>
          <a
            className="underline text-slate-100 hover:text-white hover:no-underline"
            href="/accounts"
          >
            Accounts
          </a>
          <a
            className="underline text-slate-100 hover:text-white hover:no-underline"
            href="/outbound"
          >
            Outbound
          </a>
        </nav>
      </header>
      <OutboundMetricsCharts />
    </main>
  );
}
