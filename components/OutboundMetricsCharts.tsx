"use client";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
);

interface IndustryEngagementStats {
  industry: string;
  touchLevel: string;
  accountCount: number;
  avgArr: number | null;
  winRate: number | null;
  avgLogins: number | null;
  avgFeatureEvents: number | null;
}

export default function OutboundMetricsCharts() {
  const [region, setRegion] = useState<string>("");
  const [empBucket, setEmpBucket] = useState<string>("");
  const [data, setData] = useState<IndustryEngagementStats[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [empBuckets, setEmpBuckets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (region) params.set("region", region);
        if (empBucket) params.set("empBucket", empBucket);
        const res = await fetch(`/api/metrics?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json.industryStats);
          setRegions(json.regions);
          setEmpBuckets(json.employeeBuckets);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region, empBucket]);

  const industries = useMemo(
    () => Array.from(new Set(data.map((d) => d.industry))).sort(),
    [data],
  );
  const touchLevels = ["Untouched", "Sent", "Opened", "Clicked", "Replied"];

  // Bar chart: Avg ARR by industry & touch level
  const barData = useMemo(() => {
    const datasets = touchLevels.map((level, idx) => {
      return {
        label: level,
        data: industries.map((ind) => {
          const row = data.find(
            (r) => r.industry === ind && r.touchLevel === level,
          );
          return row?.avgArr ?? null;
        }),
        backgroundColor: [
          "#94a3b8", // Untouched
          "#6366f1", // Sent
          "#3b82f6", // Opened
          "#f59e0b", // Clicked
          "#10b981", // Replied
        ][idx],
      };
    });
    return { labels: industries, datasets };
  }, [data, industries]);

  // Line chart: Win rate by engagement level (aggregated across industries)
  const lineData = useMemo(() => {
    const agg = touchLevels.map((level) => {
      const rows = data.filter((r) => r.touchLevel === level);
      const winRates = rows
        .filter((r) => r.winRate != null)
        .map((r) => r.winRate as number);
      return winRates.length
        ? winRates.reduce((a, b) => a + b, 0) / winRates.length
        : null;
    });
    return {
      labels: touchLevels,
      datasets: [
        {
          label: "Win Rate %",
          data: agg,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.3)",
          tension: 0.25,
          spanGaps: true,
        },
      ],
    };
  }, [data]);

  // KPIs
  const kpis = useMemo(() => {
    // Aggregate touched vs untouched
    const untouched = data.filter((d) => d.touchLevel === "Untouched");
    const touched = data.filter((d) => d.touchLevel !== "Untouched");
    function weightedAvg(
      rows: IndustryEngagementStats[],
      field: "avgArr" | "winRate" | "avgLogins" | "avgFeatureEvents",
    ) {
      const valid = rows.filter((r) => r[field] != null);
      const totalCount = valid.reduce((a, b) => a + b.accountCount, 0);
      if (!totalCount) return null;
      const sum = valid.reduce(
        (acc, r) => acc + (Number(r[field]) || 0) * r.accountCount,
        0,
      );
      return sum / totalCount;
    }
    const touchedCount = touched.reduce((a, b) => a + b.accountCount, 0);
    const untouchedCount = untouched.reduce((a, b) => a + b.accountCount, 0);
    const coveragePct =
      touchedCount + untouchedCount
        ? (touchedCount / (touchedCount + untouchedCount)) * 100
        : 0;
    const avgArrTouched = weightedAvg(touched, "avgArr");
    const avgArrUntouched = weightedAvg(untouched, "avgArr");
    const winTouched = weightedAvg(touched, "winRate");
    const winUntouched = weightedAvg(untouched, "winRate");
    const usageTouched = weightedAvg(touched, "avgLogins");
    const usageUntouched = weightedAvg(untouched, "avgLogins");
    return {
      coveragePct,
      avgArrTouched,
      avgArrUntouched,
      winTouched,
      winUntouched,
      usageTouched,
      usageUntouched,
    };
  }, [data]);

  const insights = useMemo(() => {
    const list: string[] = [];
    // Example heuristic insights
    if (kpis.avgArrTouched && kpis.avgArrUntouched) {
      const lift = kpis.avgArrTouched - kpis.avgArrUntouched;
      const pct = kpis.avgArrUntouched
        ? (lift / kpis.avgArrUntouched) * 100
        : 0;
      if (pct > 10)
        list.push(
          `Touched accounts show +${pct.toFixed(0)}% higher ARR than untouched.`,
        );
    }
    if (kpis.winTouched && kpis.winUntouched) {
      const lift = kpis.winTouched - kpis.winUntouched;
      if (lift > 5)
        list.push(
          `Win rate lift of +${lift.toFixed(1)} pts for touched vs untouched.`,
        );
    }
    // Industry best by replied win rate
    const replied = data.filter(
      (d) => d.touchLevel === "Replied" && d.winRate != null,
    );
    if (replied.length) {
      const top = [...replied].sort(
        (a, b) => (b.winRate ?? 0) - (a.winRate ?? 0),
      )[0];
      if (top && top.winRate != null) {
        list.push(
          `${top.industry} shows strongest replied win rate (${top.winRate.toFixed(0)}%).`,
        );
      }
    }
    return list.slice(0, 3);
  }, [data, kpis]);

  function fmt(
    n: number | null | undefined,
    opts: Intl.NumberFormatOptions = { maximumFractionDigits: 1 },
  ) {
    if (n == null || Number.isNaN(n)) return "-";
    return new Intl.NumberFormat(undefined, opts).format(n);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex flex-col text-xs font-medium">
          <span>Region</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">(All)</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium">
          <span>Employee Bucket</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={empBucket}
            onChange={(e) => setEmpBucket(e.target.value)}
          >
            <option value="">(All)</option>
            {empBuckets.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        {loading && <span className="text-sm">Loading...</span>}
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="border border-slate-600/60 rounded p-4 bg-slate-900/70 backdrop-blur-sm text-white">
          <h3 className="font-semibold mb-1 text-white">Coverage</h3>
          <p className="text-white">
            {fmt(kpis.coveragePct, { maximumFractionDigits: 0 })}% accounts
            touched
          </p>
        </div>
        <div className="border border-slate-600/60 rounded p-4 bg-slate-900/70 backdrop-blur-sm text-white">
          <h3 className="font-semibold mb-1 text-white">
            Avg ARR (Touched vs Untouched)
          </h3>
          <p className="text-white">
            {fmt(kpis.avgArrTouched)}K vs {fmt(kpis.avgArrUntouched)}K
            {kpis.avgArrTouched && kpis.avgArrUntouched && (
              <span className="ml-2 text-xs text-emerald-600">
                +{fmt(kpis.avgArrTouched - kpis.avgArrUntouched)}K
              </span>
            )}
          </p>
        </div>
        <div className="border border-slate-600/60 rounded p-4 bg-slate-900/70 backdrop-blur-sm text-white">
          <h3 className="font-semibold mb-1 text-white">
            Win Rate (Touched vs Untouched)
          </h3>
          <p className="text-white">
            {fmt(kpis.winTouched)}% vs {fmt(kpis.winUntouched)}%
            {kpis.winTouched && kpis.winUntouched && (
              <span className="ml-2 text-xs text-emerald-600">
                +{fmt(kpis.winTouched - kpis.winUntouched)} pts
              </span>
            )}
          </p>
        </div>
        <div className="border border-slate-600/60 rounded p-4 bg-slate-900/70 backdrop-blur-sm text-white">
          <h3 className="font-semibold mb-1 text-white">
            Avg Logins (Touched vs Untouched)
          </h3>
          <p className="text-white">
            {fmt(kpis.usageTouched)} vs {fmt(kpis.usageUntouched)}
            {kpis.usageTouched && kpis.usageUntouched && (
              <span className="ml-2 text-xs text-emerald-600">
                +{fmt(kpis.usageTouched - kpis.usageUntouched)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">
          Avg ARR by Industry & Engagement
        </h3>
        <Bar
          data={barData}
          options={{
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: { y: { title: { display: true, text: "Avg ARR" } } },
          }}
        />
      </div>

      {/* Line Chart */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Win Rate by Engagement Level</h3>
        <Line
          data={lineData}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { title: { display: true, text: "Win Rate %" } } },
          }}
        />
      </div>

      {/* Insights */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Insights</h3>
        <ul className="list-disc ml-5 text-sm space-y-1">
          {insights.map((i) => (
            <li key={i}>{i}</li>
          ))}
          {!insights.length && (
            <li>No strong patterns surfaced (adjust filters).</li>
          )}
        </ul>
      </div>
    </div>
  );
}
