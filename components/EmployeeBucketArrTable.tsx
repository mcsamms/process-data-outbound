import { computeEmployeeBucketArr, formatK } from "@/lib/employeeBucketArr";

export default async function EmployeeBucketArrTable() {
  const data = await computeEmployeeBucketArr();
  const baseCell = "py-2 px-3 align-top text-sm";
  const highlight =
    "font-semibold ring-2 ring-indigo-500/60 dark:ring-indigo-400/60 rounded px-2 bg-indigo-600/30 dark:bg-indigo-500/30 text-white"; // unified white text on colored translucent background
  // Thresholds (assumption): only highlight winner if percent diff >= 5% or absolute diff >= 2K.
  const MIN_PCT_FOR_HIGHLIGHT = 5; // %
  const MIN_ABS_FOR_HIGHLIGHT = 2000; // dollars

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">
        ARR by Employee Bucket & Touch Status
      </h2>
      <p className="text-sm text-slate-300 max-w-prose">
        Average ARR per employee band comparing untouched vs. touched accounts.
        Touched value shows the best-performing engagement tier (or a range when
        lower than untouched).
      </p>
      <div className="overflow-auto border border-slate-300 dark:border-slate-600 rounded">
        <table className="min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900">
              <th className="text-left font-semibold p-2">Employee Bucket</th>
              <th className="text-left font-semibold p-2">Untouched ARR</th>
              <th className="text-left font-semibold p-2">Touched ARR</th>
              <th className="text-left font-semibold p-2">ARR Lift</th>
              <th className="text-left font-semibold p-2">Best Value</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const rangeSpreadPct = (() => {
                if (
                  r.touchedMinAvg == null ||
                  r.touchedMaxAvg == null ||
                  r.touchedMaxAvg === 0
                )
                  return 0;
                return (
                  ((r.touchedMaxAvg - r.touchedMinAvg) / r.touchedMaxAvg) * 100
                );
              })();
              const showRangeSubtext = rangeSpreadPct > 15;

              const untouchedDisplay =
                r.untouchedAvg == null ? "(none)" : formatK(r.untouchedAvg);

              const touchedBestDisplay = (() => {
                if (r.touchedBestAvg == null) return "(none)";
                const label = r.touchedBestLabel
                  ? ` (${r.touchedBestLabel})`
                  : "";
                return `${formatK(r.touchedBestAvg)}${label}`;
              })();

              // Winner highlight logic with thresholds
              let highlightUntouched = false;
              let highlightTouched = false;
              if (r.untouchedAvg != null && r.touchedBestAvg != null) {
                const delta = r.touchedBestAvg - r.untouchedAvg;
                const pct = r.untouchedAvg
                  ? (Math.abs(delta) / r.untouchedAvg) * 100
                  : 0;
                const absOK = Math.abs(delta) >= MIN_ABS_FOR_HIGHLIGHT;
                const pctOK = pct >= MIN_PCT_FOR_HIGHLIGHT;
                if (absOK || pctOK) {
                  if (delta > 0) highlightTouched = true;
                  else if (delta < 0) highlightUntouched = true;
                }
              } else if (r.untouchedAvg != null && r.touchedBestAvg == null) {
                highlightUntouched = true;
              } else if (r.touchedBestAvg != null && r.untouchedAvg == null) {
                highlightTouched = true;
              }

              // Lift (absolute + percent)
              let liftDisplay: string = "—";
              let liftClass = "text-slate-500";
              if (r.untouchedAvg != null && r.touchedBestAvg != null) {
                const delta = r.touchedBestAvg - r.untouchedAvg;
                const pct = r.untouchedAvg
                  ? (delta / r.untouchedAvg) * 100
                  : null;
                if (delta === 0) {
                  liftDisplay = "+0";
                } else {
                  const absFmt = formatK(Math.abs(delta));
                  const pctFmt =
                    pct == null
                      ? ""
                      : ` (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%)`;
                  liftDisplay = `${delta > 0 ? "+" : "-"}${absFmt}${pctFmt}`;
                  liftClass = delta > 0 ? "text-emerald-600" : "text-rose-600";
                }
              }

              // Best Value = larger of untouched vs touchedBest
              const bestValueNum = Math.max(
                r.untouchedAvg ?? -Infinity,
                r.touchedBestAvg ?? -Infinity,
              );
              const bestValue =
                bestValueNum === -Infinity ? "-" : formatK(bestValueNum);

              return (
                <tr key={r.bucket}>
                  <th className="text-left font-medium py-2 px-3">
                    {r.bucket}
                  </th>
                  <td
                    className={`${baseCell} ${highlightUntouched ? highlight : ""}`}
                  >
                    {untouchedDisplay}
                  </td>
                  <td
                    className={`${baseCell} ${highlightTouched ? highlight : ""}`}
                  >
                    <div className="flex flex-col">
                      <span>{touchedBestDisplay}</span>
                      {showRangeSubtext &&
                        r.touchedMinAvg != null &&
                        r.touchedMaxAvg != null && (
                          <span className="text-[10px] text-slate-500 mt-0.5">{`${formatK(r.touchedMinAvg)}–${formatK(r.touchedMaxAvg)} range`}</span>
                        )}
                    </div>
                  </td>
                  <td className={`${baseCell} ${liftClass}`}>{liftDisplay}</td>
                  <td className={baseCell}>{bestValue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
