import { promises as fs } from "fs";
import path from "path";

// Types matching existing cleaned JSON structures (partial fields we use)
interface AccountRow {
  domain: string;
  arr: number | null;
}
interface OutboundRow {
  company_domain: string;
}

export interface ArrStats {
  count: number; // number of accounts with a non-null ARR value
  avg: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
}

export interface CoverageResult {
  totalAccounts: number;
  touchedCount: number;
  untouchedCount: number;
  coveragePct: number; // 0-100
  touchedArr: ArrStats;
  untouchedArr: ArrStats;
}

function computeArrStats(values: (number | null | undefined)[]): ArrStats {
  const nums = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (nums.length === 0) {
    return { count: 0, avg: null, min: null, max: null, median: null };
  }
  nums.sort((a, b) => a - b);
  const count = nums.length;
  const sum = nums.reduce((a, b) => a + b, 0);
  const avg = sum / count;
  const min = nums[0];
  const max = nums[nums.length - 1];
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
  return { count, avg, min, max, median };
}

export async function computeCoverage(): Promise<CoverageResult> {
  const dataDir = path.join(process.cwd(), "data");
  const accountsRaw = await fs.readFile(
    path.join(dataDir, "cleaned_assessment_account_data.json"),
    "utf8",
  );
  const outboundRaw = await fs.readFile(
    path.join(dataDir, "cleaned_outbound_data.json"),
    "utf8",
  );
  const accounts: AccountRow[] = JSON.parse(accountsRaw);
  const outbound: OutboundRow[] = JSON.parse(outboundRaw);

  const outboundDomains = new Set(
    outbound.map((o) => (o.company_domain || "").toLowerCase()),
  );

  const touched: AccountRow[] = [];
  const untouched: AccountRow[] = [];
  for (const a of accounts) {
    const domain = (a.domain || "").toLowerCase();
    if (outboundDomains.has(domain)) touched.push(a);
    else untouched.push(a);
  }

  const totalAccounts = accounts.length;
  const touchedCount = touched.length;
  const untouchedCount = untouched.length;
  const coveragePct =
    totalAccounts === 0 ? 0 : (touchedCount / totalAccounts) * 100;

  const touchedArr = computeArrStats(touched.map((a) => a.arr));
  const untouchedArr = computeArrStats(untouched.map((a) => a.arr));

  return {
    totalAccounts,
    touchedCount,
    untouchedCount,
    coveragePct,
    touchedArr,
    untouchedArr,
  };
}

export function formatNumber(
  n: number | null,
  opts: Intl.NumberFormatOptions = { maximumFractionDigits: 2 },
): string {
  if (n === null || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat(undefined, opts).format(n);
}
