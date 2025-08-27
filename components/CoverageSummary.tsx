import { computeCoverage, formatNumber } from "@/lib/coverage";

export default async function CoverageSummary() {
  const data = await computeCoverage();
  const pctFmt = (v: number) =>
    formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const statRow = (
    label: string,
    touched: number | null,
    untouched: number | null,
  ) => {
    const leftVal = touched ?? -Infinity;
    const rightVal = untouched ?? -Infinity;
    const leftWins = leftVal > rightVal;
    const rightWins = rightVal > leftVal;
    const baseCell = "py-2 px-3 align-top transition";
    const highlight =
      "font-semibold ring-2 ring-indigo-500/60 dark:ring-indigo-400/60 rounded px-2 bg-indigo-600/30 dark:bg-indigo-500/30 text-white";
    return (
      <tr key={label}>
        <th className="text-left font-medium py-2 px-3">{label}</th>
        <td className={`${baseCell} ${leftWins ? highlight : ""}`}>
          {formatNumber(touched)}
        </td>
        <td className={`py-2 px-3 ${rightWins ? highlight : ""}`}>
          {formatNumber(untouched)}
        </td>
      </tr>
    );
  };
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Account Coverage</h2>
      <div className="text-sm text-slate-300">
        <p className="mb-2">
          Touched accounts are those with at least one outbound engagement
          (domain match in the outbound dataset).
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Total accounts: {data.totalAccounts.toLocaleString()}</li>
          <li>Touched: {data.touchedCount.toLocaleString()}</li>
          <li>Untouched: {data.untouchedCount.toLocaleString()}</li>
          <li>Coverage: {pctFmt(data.coveragePct)}%</li>
        </ul>
      </div>
      <div className="overflow-auto border border-slate-300 dark:border-slate-600 rounded">
        <table className="min-w-[480px] text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900">
              <th className="text-left font-semibold p-2">ARR Stat</th>
              <th className="text-left font-semibold p-2">Touched</th>
              <th className="text-left font-semibold p-2">Untouched</th>
            </tr>
          </thead>
          <tbody>
            {statRow(
              "Count (non-null)",
              data.touchedArr.count,
              data.untouchedArr.count,
            )}
            {statRow("Average", data.touchedArr.avg, data.untouchedArr.avg)}
            {statRow(
              "Median",
              data.touchedArr.median,
              data.untouchedArr.median,
            )}
            {statRow("Min", data.touchedArr.min, data.untouchedArr.min)}
            {statRow("Max", data.touchedArr.max, data.untouchedArr.max)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
