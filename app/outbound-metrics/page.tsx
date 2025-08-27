import CoverageSummary from "@/components/CoverageSummary";
import EmployeeBucketArrTable from "@/components/EmployeeBucketArrTable";
import EngagementCoverageTable from "@/components/EngagementCoverageTable";

export default function OutboundTouchMetricsPage() {
  return (
    <main className="min-h-screen p-8 flex flex-col gap-10 font-sans text-slate-900 dark:text-slate-100 max-w-6xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Outbound Touch Metrics</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-prose">
          Account coverage, engagement tier performance, and ARR by employee
          size buckets.
        </p>
        <nav className="flex gap-4 text-sm">
          <a className="underline hover:no-underline" href="/">
            Dashboard
          </a>
          <a className="underline hover:no-underline" href="/accounts">
            Accounts
          </a>
          <a className="underline hover:no-underline" href="/outbound">
            Outbound
          </a>
        </nav>
      </header>
      <CoverageSummary />
      <EngagementCoverageTable />
      <EmployeeBucketArrTable />
      <section>
        <a
          href="/outbound-metrics/charts"
          className="underline text-sm hover:no-underline"
        >
          View Interactive Charts →
        </a>
      </section>
    </main>
  );
}
