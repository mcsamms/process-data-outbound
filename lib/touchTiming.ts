import { promises as fs } from "fs";
import path from "path";

interface AccountRow {
  domain: string;
  signup_date?: string;
  arr: number | null;
  deal_won?: string | null; // "True" | "False" | ""
}
interface OutboundRow {
  company_domain: string;
  send_date?: string;
}

export interface TouchTimingBucketStat {
  bucket: string; // Early, Medium, Late, Never touched
  count: number;
  pct: number; // % of total accounts
  avgArr: number | null;
  winRate: number | null; // % closed won among accounts with win flag
  avgDaysToTouch: number | null; // only for touched buckets
}

export interface TouchTimingResult {
  totalAccounts: number;
  buckets: TouchTimingBucketStat[];
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function computeTouchTiming(): Promise<TouchTimingResult> {
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

  // Earliest send date per domain
  const earliest: Record<string, string> = {};
  for (const o of outbound) {
    const d = (o.company_domain || "").toLowerCase();
    if (!d || !o.send_date) continue;
    if (!earliest[d] || o.send_date < earliest[d]) earliest[d] = o.send_date;
  }

  interface Collect {
    arr: number[];
    wins: number;
    winEligible: number;
    days: number[];
  }
  const buckets: Record<string, Collect> = {
    Early: { arr: [], wins: 0, winEligible: 0, days: [] },
    Medium: { arr: [], wins: 0, winEligible: 0, days: [] },
    Late: { arr: [], wins: 0, winEligible: 0, days: [] },
    "Never touched": { arr: [], wins: 0, winEligible: 0, days: [] },
  };

  for (const acc of accounts) {
    const domain = (acc.domain || "").toLowerCase();
    const signup = acc.signup_date;
    const firstTouch = earliest[domain];
    let bucket: keyof typeof buckets;
    let daysDiff: number | null = null;
    if (!firstTouch) {
      bucket = "Never touched";
    } else if (signup) {
      const s = Date.parse(signup);
      const f = Date.parse(firstTouch);
      if (Number.isFinite(s) && Number.isFinite(f)) {
        daysDiff = Math.floor((f - s) / 86400000); // ms per day
      }
      if (daysDiff == null)
        bucket = "Never touched"; // fallback
      else if (daysDiff <= 30) bucket = "Early";
      else if (daysDiff <= 90) bucket = "Medium";
      else bucket = "Late";
    } else {
      bucket = "Never touched";
    }
    const coll = buckets[bucket];
    if (typeof acc.arr === "number") coll.arr.push(acc.arr);
    if (acc.deal_won === "True") coll.wins++;
    if (acc.deal_won === "True" || acc.deal_won === "False") coll.winEligible++;
    if (daysDiff != null && bucket !== "Never touched")
      coll.days.push(daysDiff);
  }

  const totalAccounts = accounts.length;
  const order: (keyof typeof buckets)[] = [
    "Early",
    "Medium",
    "Late",
    "Never touched",
  ];
  // Recompute counts & stats accurately
  // Iterate again to assign bucket counts (simpler than storing in first pass)
  const counts: Record<string, number> = {
    Early: 0,
    Medium: 0,
    Late: 0,
    "Never touched": 0,
  };
  for (const acc of accounts) {
    const domain = (acc.domain || "").toLowerCase();
    const signup = acc.signup_date;
    const firstTouch = earliest[domain];
    let bucket: keyof typeof buckets;
    let daysDiff: number | null = null;
    if (!firstTouch) bucket = "Never touched";
    else if (signup) {
      const s = Date.parse(signup);
      const f = Date.parse(firstTouch);
      if (Number.isFinite(s) && Number.isFinite(f)) {
        daysDiff = Math.floor((f - s) / 86400000);
      }
      if (daysDiff == null) bucket = "Never touched";
      else if (daysDiff <= 30) bucket = "Early";
      else if (daysDiff <= 90) bucket = "Medium";
      else bucket = "Late";
    } else bucket = "Never touched";
    counts[bucket]++;
  }

  const finalBuckets: TouchTimingBucketStat[] = order.map((b) => {
    const coll = buckets[b];
    const count = counts[b];
    const pct = totalAccounts ? (count / totalAccounts) * 100 : 0;
    const avgArr = avg(coll.arr);
    const winRate = coll.winEligible
      ? (coll.wins / coll.winEligible) * 100
      : null;
    const avgDaysToTouch = b === "Never touched" ? null : avg(coll.days);
    return { bucket: b, count, pct, avgArr, winRate, avgDaysToTouch };
  });

  return { totalAccounts, buckets: finalBuckets };
}

export function formatPct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "-";
  return (
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n) +
    "%"
  );
}
export function formatDays(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "-";
  return `${Math.round(n)}`;
}
