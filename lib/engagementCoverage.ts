import { promises as fs } from "fs";
import path from "path";

interface AccountRow {
  domain: string;
  arr: number | null;
  deal_won: string | null; // "True" | "False" | ""
}

interface OutboundRow {
  company_domain: string;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
  account_arr: number | null;
  account_deal_won: string | null; // from enrichment
}

export interface EngagementGroupStat {
  key: string; // internal key
  label: string; // display
  accounts: number; // distinct account count in this group
  avgArr: number | null; // average ARR for accounts w/ arr
  winRate: number | null; // % of accounts in group with deal_won True
}

export interface EngagementCoverageResult {
  groups: EngagementGroupStat[];
  totalAccounts: number; // for context
}

function computeAvg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function computeEngagementCoverage(): Promise<EngagementCoverageResult> {
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

  // Build maps keyed by domain -> engagement flags
  interface Agg {
    opened: boolean;
    clicked: boolean;
    replied: boolean;
    arr: number | null;
    won: boolean | null; // null if unknown
  }
  const agg: Record<string, Agg> = {};
  for (const row of outbound) {
    const d = (row.company_domain || "").toLowerCase();
    if (!d) continue;
    if (!agg[d]) {
      agg[d] = {
        opened: false,
        clicked: false,
        replied: false,
        arr: null,
        won: null,
      };
    }
    const a = agg[d];
    if (row.opened) a.opened = true;
    if (row.clicked) a.clicked = true;
    if (row.replied) a.replied = true;
    if (
      typeof row.account_arr === "number" &&
      Number.isFinite(row.account_arr)
    ) {
      a.arr = row.account_arr; // same across rows; fine to overwrite
    }
    if (row.account_deal_won === "True") a.won = true;
    else if (row.account_deal_won === "False" && a.won === null) a.won = false;
  }

  // Distinct domains (accounts) by engagement tier.
  // Order: Replied > Clicked > Opened > Sent only > Untouched
  const repliedDomains = new Set<string>();
  const clickedDomains = new Set<string>();
  const openedDomains = new Set<string>();
  const sentOnlyDomains = new Set<string>();

  for (const [domain, a] of Object.entries(agg)) {
    if (a.replied) repliedDomains.add(domain);
    else if (a.clicked) clickedDomains.add(domain);
    else if (a.opened) openedDomains.add(domain);
    else sentOnlyDomains.add(domain); // had a send, no engagement
  }

  const accountDomains = new Set(
    accounts.map((a) => (a.domain || "").toLowerCase()),
  );

  // Untouched = accounts with no outbound rows at all
  const touchedDomains = new Set([...Object.keys(agg)]);
  const untouchedDomains = new Set(
    [...accountDomains].filter((d) => !touchedDomains.has(d)),
  );

  function buildStat(label: string, set: Set<string>): EngagementGroupStat {
    const arrValues: (number | null)[] = [];
    let wins = 0;
    let winEligible = 0; // accounts where we know won true/false
    for (const d of set) {
      const a = agg[d];
      if (a && a.arr != null) arrValues.push(a.arr);
      if (a && a.won != null) {
        winEligible++;
        if (a.won) wins++;
      }
    }
    const avgArr = computeAvg(arrValues);
    const winRate = winEligible === 0 ? null : (wins / winEligible) * 100;
    return {
      key: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label,
      accounts: set.size,
      avgArr,
      winRate,
    };
  }

  const groups: EngagementGroupStat[] = [
    buildStat("Untouched", untouchedDomains),
    buildStat("Touched (all)", touchedDomains),
    buildStat("Replied", repliedDomains),
    buildStat("Clicked", clickedDomains),
    buildStat("Opened", openedDomains),
    buildStat("Sent only", sentOnlyDomains),
  ];

  return { groups, totalAccounts: accounts.length };
}

export function formatPercent(p: number | null): string {
  if (p === null || Number.isNaN(p)) return "-";
  return (
    new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(p) + "%"
  );
}

export function formatDollars(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "-";
  return (
    "$" +
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
  );
}
