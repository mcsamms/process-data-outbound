import CoverageSummary from "@/components/CoverageSummary";

export default function Home() {
  return (
    <main className="min-h-screen p-8 flex flex-col gap-10 font-sans text-slate-900 dark:text-slate-100 max-w-5xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Data Coverage Dashboard</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-prose">
          Overview of account coverage by outbound engagement plus ARR
          distribution statistics.
        </p>
        <nav className="flex gap-4 text-sm">
          <a className="underline hover:no-underline" href="/accounts">
            Accounts
          </a>
          <a className="underline hover:no-underline" href="/outbound">
            Outbound
          </a>
        </nav>
      </header>
      <CoverageSummary />
    </main>
  );
}
