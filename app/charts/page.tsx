"use client";
import OutboundMetricsCharts from "@/components/OutboundMetricsCharts";

export default function ChartsPage() {
  return (
    <main className="p-8 flex flex-col gap-8 font-sans text-slate-100 max-w-6xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Outbound Charts</h1>
        <p className="text-sm text-slate-300 max-w-prose">
          Interactive engagement impact visualizations by industry, region, and
          employee size.
        </p>
      </header>
      <OutboundMetricsCharts />
    </main>
  );
}
