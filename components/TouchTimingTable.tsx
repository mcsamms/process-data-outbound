import { formatNumber } from "@/lib/coverage";
import { computeTouchTiming, formatDays, formatPct } from "@/lib/touchTiming";

export default async function TouchTimingTable() {
  const data = await computeTouchTiming();
  const highlight =
    "font-semibold ring-2 ring-indigo-500/60 dark:ring-indigo-400/60 rounded px-2 bg-indigo-50 dark:bg-indigo-900/30";
  // Determine maxes for highlighting
  const maxArr = Math.max(...data.buckets.map((b) => b.avgArr ?? -Infinity));
  const maxWin = Math.max(...data.buckets.map((b) => b.winRate ?? -Infinity));
  const maxCount = Math.max(...data.buckets.map((b) => b.count));

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">
        Touch Timing (Signup → First Outbound)
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-prose">
        Accounts bucketed by days from signup to first outbound email send.
        Early ≤30d, Medium 31–90d, Late &gt;90d, Never touched = no outbound.
      </p>
      <div className="overflow-auto border border-slate-300 dark:border-slate-600 rounded">
        <table className="min-w-[680px] text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800">
              <th className="text-left font-semibold p-2">Bucket</th>
              <th className="text-left font-semibold p-2">Accounts</th>
              <th className="text-left font-semibold p-2">% of Total</th>
              <th className="text-left font-semibold p-2">Avg Days to Touch</th>
              <th className="text-left font-semibold p-2">Avg ARR</th>
              <th className="text-left font-semibold p-2">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.buckets.map((b) => {
              return (
                <tr key={b.bucket}>
                  <th className="text-left font-medium py-2 px-3">
                    {b.bucket}
                  </th>
                  <td
                    className={`py-2 px-3 ${b.count === maxCount ? highlight : ""}`}
                  >
                    {b.count.toLocaleString()}
                  </td>
                  <td className="py-2 px-3">{formatPct(b.pct)}</td>
                  <td className="py-2 px-3">
                    {b.bucket === "Never touched"
                      ? "-"
                      : formatDays(b.avgDaysToTouch)}
                  </td>
                  <td
                    className={`py-2 px-3 ${b.avgArr === maxArr ? highlight : ""}`}
                  >
                    {formatNumber(b.avgArr)}
                  </td>
                  <td
                    className={`py-2 px-3 ${b.winRate === maxWin ? highlight : ""}`}
                  >
                    {formatPct(b.winRate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
