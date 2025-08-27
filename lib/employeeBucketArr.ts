import { promises as fs } from "fs";
import path from "path";

interface AccountRow {
  domain: string;
  employee_count: number | null;
  arr: number | null;
}
interface OutboundRow {
  company_domain: string;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
  account_arr: number | null;
}

export interface EmployeeBucketRow {
  bucket: string;
  untouchedAvg: number | null;
  touchedBestAvg: number | null; // best (max) avg across engagement tiers
  touchedMinAvg: number | null; // min across tiers (if multiple)
  touchedMaxAvg: number | null; // max across tiers (same as best)
  touchedBestLabel: string | null; // which tier produced best
}

// Granular small-company buckets, then 1000-sized bands
const BUCKETS: { label: string; min: number; max: number | null }[] = [
  { label: "1–10", min: 1, max: 10 },
  { label: "11–25", min: 11, max: 25 },
  { label: "26–50", min: 26, max: 50 },
  { label: "51–100", min: 51, max: 100 },
  { label: "101–250", min: 101, max: 250 },
  { label: "251–500", min: 251, max: 500 },
  { label: "501–1000", min: 501, max: 1000 },
  { label: "1001–2000", min: 1001, max: 2000 },
  { label: "2001–3000", min: 2001, max: 3000 },
  { label: "3001–4000", min: 3001, max: 4000 },
  { label: "4001–5000", min: 4001, max: 5000 },
  { label: "5001+", min: 5001, max: null },
];

function bucketForEmployees(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  for (const b of BUCKETS) {
    if (b.max == null) {
      if (n >= b.min) return b.label;
    } else if (n >= b.min && n <= b.max) return b.label;
  }
  return null;
}

export interface EmployeeBucketResult {
  rows: EmployeeBucketRow[];
}

export async function computeEmployeeBucketArr(): Promise<EmployeeBucketResult> {
  const dataDir = path.join(process.cwd(), "data");
  const accounts: AccountRow[] = JSON.parse(
    await fs.readFile(
      path.join(dataDir, "cleaned_assessment_account_data.json"),
      "utf8",
    ),
  );
  const outbound: OutboundRow[] = JSON.parse(
    await fs.readFile(path.join(dataDir, "cleaned_outbound_data.json"), "utf8"),
  );

  // Build engagement classification per domain (deepest action)
  interface Agg {
    opened: boolean;
    clicked: boolean;
    replied: boolean;
    arr: number | null;
  }
  const agg: Record<string, Agg> = {};
  for (const r of outbound) {
    const d = (r.company_domain || "").toLowerCase();
    if (!d) continue;
    if (!agg[d])
      agg[d] = { opened: false, clicked: false, replied: false, arr: null };
    const a = agg[d];
    if (r.opened) a.opened = true;
    if (r.clicked) a.clicked = true;
    if (r.replied) a.replied = true;
    if (typeof r.account_arr === "number" && Number.isFinite(r.account_arr))
      a.arr = r.account_arr;
  }

  function tierForDomain(a: Agg | undefined): string | null {
    if (!a) return null;
    if (a.replied) return "Replied";
    if (a.clicked) return "Clicked";
    if (a.opened) return "Opened";
    if (a) return "Sent"; // had outbound but no opens
    return null;
  }

  // Organize accounts into buckets and compute per-tier ARR averages
  interface Collect {
    untouched: number[];
    tiers: Record<string, number[]>;
  }
  const byBucket: Record<string, Collect> = {};
  for (const b of BUCKETS) byBucket[b.label] = { untouched: [], tiers: {} };

  for (const acc of accounts) {
    const bucket = bucketForEmployees(acc.employee_count);
    if (!bucket) continue;
    const domain = (acc.domain || "").toLowerCase();
    const a = agg[domain];
    const col = byBucket[bucket];
    if (!a) {
      if (typeof acc.arr === "number") col.untouched.push(acc.arr);
    } else {
      const tierName = tierForDomain(a);
      if (tierName) {
        if (!col.tiers[tierName]) col.tiers[tierName] = [];
        if (typeof acc.arr === "number") col.tiers[tierName].push(acc.arr);
      }
    }
  }

  function avg(nums: number[]): number | null {
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  const rows: EmployeeBucketRow[] = BUCKETS.map((b) => {
    const col = byBucket[b.label];
    const untouchedAvg = avg(col.untouched);
    let touchedBestAvg: number | null = null;
    let touchedBestLabel: string | null = null;
    let touchedMinAvg: number | null = null;
    let touchedMaxAvg: number | null = null;
    const tierEntries = Object.entries(col.tiers);
    if (tierEntries.length) {
      const avgs = tierEntries
        .map(([tier, list]) => [tier, avg(list)] as const)
        .filter(([, v]) => v != null) as [string, number][];
      if (avgs.length) {
        touchedMinAvg = Math.min(...avgs.map(([, v]) => v));
        touchedMaxAvg = Math.max(...avgs.map(([, v]) => v));
        const best = avgs.reduce((p, c) => (c[1] > p[1] ? c : p), avgs[0]);
        touchedBestLabel = best[0] === "Sent" ? "Sent only" : best[0];
        touchedBestAvg = best[1];
      }
    }
    return {
      bucket: b.label,
      untouchedAvg,
      touchedBestAvg,
      touchedMinAvg,
      touchedMaxAvg,
      touchedBestLabel,
    };
  });

  return { rows };
}

export function formatK(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "(none)";
  const k = n / 1000;
  const val = k >= 100 ? k.toFixed(0) : k.toFixed(1); // fewer decimals for large numbers
  return `${val}K`;
}
