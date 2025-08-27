import {
  computeEngagementCoverage,
  formatDollars,
  formatPercent,
} from "@/lib/engagementCoverage";

export default async function EngagementCoverageTable() {
  const data = await computeEngagementCoverage();

  // Find max values per numeric column for highlighting
  const maxAccounts = Math.max(...data.groups.map((g) => g.accounts));
  const maxAvgArr = Math.max(...data.groups.map((g) => g.avgArr ?? -Infinity));
  const maxWinRate = Math.max(
    ...data.groups.map((g) => g.winRate ?? -Infinity),
  );

  const cellBase = "py-2 px-3 align-top text-sm";
  const highlight =
    "font-semibold ring-2 ring-indigo-500/60 dark:ring-indigo-400/60 rounded px-2 bg-indigo-50 dark:bg-indigo-900/30";

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Engagement Coverage & ARR</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-prose">
        Distinct account coverage by deepest outbound engagement action plus
        average ARR and win rate (Closed Won % where available).
      </p>
      <div className="overflow-auto border border-slate-300 dark:border-slate-600 rounded">
        <table className="min-w-[560px] text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800">
              <th className="text-left font-semibold p-2">Group</th>
              <th className="text-left font-semibold p-2">Accounts</th>
              <th className="text-left font-semibold p-2">Avg ARR</th>
              <th className="text-left font-semibold p-2">
                Win Rate (Closed Won %)
              </th>
            </tr>
          </thead>
          <tbody>
            {data.groups.map((g) => {
              const accountsHighlight = g.accounts === maxAccounts;
              const arrHighlight = (g.avgArr ?? -Infinity) === maxAvgArr;
              const winHighlight = (g.winRate ?? -Infinity) === maxWinRate;
              return (
                <tr key={g.key}>
                  <th className="text-left font-medium py-2 px-3">{g.label}</th>
                  <td
                    className={`${cellBase} ${accountsHighlight ? highlight : ""}`}
                  >
                    {g.accounts.toLocaleString()}
                  </td>
                  <td
                    className={`${cellBase} ${arrHighlight ? highlight : ""}`}
                  >
                    {formatDollars(g.avgArr)}
                  </td>
                  <td
                    className={`${cellBase} ${winHighlight ? highlight : ""}`}
                  >
                    {formatPercent(g.winRate)}
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
