import { promises as fs } from "fs";
import path from "path";

interface AccountRow {
  domain: string;
  region: string;
  industry: string;
  employee_count: number | null;
  arr: number | null;
  logins_last_30d?: number | null;
  feature_event_count?: number | null;
  deal_won?: string | null;
  deal_stage?: string | null;
}
interface OutboundRow {
  company_domain: string;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
}

export interface IndustryEngagementStats {
  industry: string;
  touchLevel: string; // Untouched | Sent | Opened | Clicked | Replied
  accountCount: number;
  avgArr: number | null;
  winRate: number | null;
  avgLogins: number | null;
  avgFeatureEvents: number | null;
}

export interface AggregatedMetricsResult {
  industryStats: IndustryEngagementStats[];
  regions: string[];
  employeeBuckets: string[];
}

// Buckets already defined in app (employeeBucketArr.ts). We'll replicate to avoid cross import complexity for now.
const EMP_BUCKETS = [
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
  { label: "5001+", min: 5001, max: Infinity },
];
function bucketForEmployees(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  for (const b of EMP_BUCKETS) if (n >= b.min && n <= b.max) return b.label;
  return null;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function computeIndustryMetrics(
  filterRegion?: string,
  filterEmpBucket?: string,
): Promise<AggregatedMetricsResult> {
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

  // Build engagement map
  interface Eng {
    opened: boolean;
    clicked: boolean;
    replied: boolean;
  }
  const engMap: Record<string, Eng> = {};
  outbound.forEach((o) => {
    const d = (o.company_domain || "").toLowerCase();
    if (!d) return;
    if (!engMap[d])
      engMap[d] = { opened: false, clicked: false, replied: false };
    if (o.opened) engMap[d].opened = true;
    if (o.clicked) engMap[d].clicked = true;
    if (o.replied) engMap[d].replied = true;
  });

  function touchLevel(domain: string): string {
    const d = domain.toLowerCase();
    const e = engMap[d];
    if (!e) return "Untouched";
    if (e.replied) return "Replied";
    if (e.clicked) return "Clicked";
    if (e.opened) return "Opened";
    return "Sent";
  }

  const regionSet = new Set<string>();
  const industrySet = new Set<string>();
  const rows: IndustryEngagementStats[] = [];

  // Pre-collect account arrays grouped by industry + touchLevel
  const byKey: Record<string, AccountRow[]> = {};
  for (const acc of accounts) {
    if (acc.region) regionSet.add(acc.region);
    if (acc.industry) industrySet.add(acc.industry);
    if (filterRegion && acc.region !== filterRegion) continue;
    const bucket = bucketForEmployees(acc.employee_count);
    if (filterEmpBucket && bucket !== filterEmpBucket) continue;
    const level = touchLevel(acc.domain || "");
    const key = acc.industry + "||" + level;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(acc);
  }

  for (const [key, list] of Object.entries(byKey)) {
    const [industry, level] = key.split("||");
    const arrVals = list
      .filter((a) => typeof a.arr === "number")
      .map((a) => a.arr as number);
    const loginsVals = list
      .filter((a) => typeof a.logins_last_30d === "number")
      .map((a) => a.logins_last_30d as number);
    const featVals = list
      .filter((a) => typeof a.feature_event_count === "number")
      .map((a) => a.feature_event_count as number);
    const wins = list.filter((a) => a.deal_won === "True").length;
    const winEligible = list.filter(
      (a) => a.deal_won === "True" || a.deal_won === "False",
    ).length;
    rows.push({
      industry,
      touchLevel: level,
      accountCount: list.length,
      avgArr: avg(arrVals),
      winRate: winEligible ? (wins / winEligible) * 100 : null,
      avgLogins: avg(loginsVals),
      avgFeatureEvents: avg(featVals),
    });
  }

  return {
    industryStats: rows,
    regions: Array.from(regionSet).sort(),
    employeeBuckets: EMP_BUCKETS.map((b) => b.label),
  };
}
