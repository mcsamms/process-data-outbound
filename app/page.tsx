// Home dashboard simplified; detailed metrics moved to /outbound-metrics

export default function Home() {
  return (
    <main className="min-h-screen p-8 flex flex-col gap-10 font-sans text-slate-900 dark:text-slate-100 max-w-5xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Data Coverage Dashboard</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-prose">
          Overview of account coverage by outbound engagement plus ARR
          distribution statistics.
        </p>
      </header>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Explore</h2>
        <ul className="list-disc ml-5 space-y-2">
          <li>
            <a className="underline" href="/outbound-metrics">
              Outbound Touch Metrics
            </a>{" "}
            – coverage & engagement ARR tables
          </li>
          <li>
            <a className="underline" href="/accounts">
              Accounts Data Browser
            </a>
          </li>
          <li>
            <a className="underline" href="/outbound">
              Outbound Engagement Browser
            </a>
          </li>
          <li>
            <a className="underline" href="/charts">
              Interactive Charts
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
