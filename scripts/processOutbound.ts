/**
 * Outbound Engagement Data Cleaning & Enrichment
 *
 * Steps:
 * 1. Read outbound CSV (email events / sends) `assessment_outbound_dataset.csv`.
 * 2. Normalize casing & whitespace (email lowercased, domain extracted & lowercased).
 * 3. Convert opened/clicked/replied from TRUE/FALSE strings to booleans.
 * 4. Look up matching account (by company domain) in the cleaned account dataset
 *    produced previously (`cleaned_assessment_account_data.json`).
 * 5. Add enrichment fields when a match exists (account_company_name, region, industry, deal_stage, deal_won, employee_count, arr).
 * 6. Add matched_account flag (True/False) for easy filtering.
 * 7. Emit `cleaned_outbound_data.json` plus a summary.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// -------- Types --------
interface OutboundRawRow {
  email: string;
  name: string;
  company_domain: string;
  outbound_campaign_id: string;
  send_date: string;
  opened: string; // TRUE/FALSE
  clicked: string; // TRUE/FALSE
  replied: string; // TRUE/FALSE
  [key: string]: string;
}

interface AccountRow {
  company_name: string;
  domain: string;
  employee_count: number | null;
  location: string;
  region: string;
  industry: string;
  logins_last_30d: number | null;
  contacts_in_account: number | null;
  feature_event_count: number | null;
  deal_stage: string;
  deal_won: "True" | "False" | "";
  arr: number | null;
  signup_date: string;
}

interface OutboundCleanRow {
  email: string;
  name: string;
  company_domain: string; // normalized
  outbound_campaign_id: string;
  send_date: string;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
  matched_account: "True" | "False";
  // enrichment (null when no match)
  account_company_name: string | null;
  account_region: string | null;
  account_industry: string | null;
  account_deal_stage: string | null;
  account_deal_won: "True" | "False" | "" | null;
  account_employee_count: number | null;
  account_arr: number | null;
}

// -------- CSV Parsing (simple) --------
function parseCsv(text: string): OutboundRawRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row as OutboundRawRow;
  });
}

// -------- Helpers --------
function normalizeDomain(d: string): string {
  const val = (d || "").trim().toLowerCase();
  return val.startsWith("www.") ? val.slice(4) : val;
}

function parseBool(val: string): boolean {
  return /^true$/i.test(val.trim());
}

// -------- Main --------
function run() {
  const outboundPath = join(
    process.cwd(),
    "data",
    "assessment_outbound_dataset.csv",
  );
  const accountsPath = join(
    process.cwd(),
    "data",
    "cleaned_assessment_account_data.json",
  );
  const outputPath = join(process.cwd(), "data", "cleaned_outbound_data.json");

  const outboundCsv = readFileSync(outboundPath, "utf8");
  const rawOutbound = parseCsv(outboundCsv);

  const accountJson = JSON.parse(
    readFileSync(accountsPath, "utf8"),
  ) as AccountRow[];
  const accountByDomain = new Map<string, AccountRow>();
  accountJson.forEach((a) => {
    if (a.domain) accountByDomain.set(normalizeDomain(a.domain), a);
  });

  const cleaned: OutboundCleanRow[] = rawOutbound.map((r) => {
    const normalizedDomain = normalizeDomain(r.company_domain);
    const acct = accountByDomain.get(normalizeDomain(normalizedDomain));
    return {
      email: r.email.toLowerCase(),
      name: (r.name || "").trim().replace(/\s+/g, " "),
      company_domain: normalizedDomain,
      outbound_campaign_id: r.outbound_campaign_id,
      send_date: r.send_date,
      opened: parseBool(r.opened),
      clicked: parseBool(r.clicked),
      replied: parseBool(r.replied),
      matched_account: acct ? "True" : "False",
      account_company_name: acct ? acct.company_name : null,
      account_region: acct ? acct.region : null,
      account_industry: acct ? acct.industry : null,
      account_deal_stage: acct ? acct.deal_stage : null,
      account_deal_won: acct ? acct.deal_won : null,
      account_employee_count: acct ? acct.employee_count : null,
      account_arr: acct ? acct.arr : null,
    };
  });

  writeFileSync(outputPath, JSON.stringify(cleaned, null, 2), "utf8");

  // Summary
  const total = cleaned.length;
  let matched = 0;
  cleaned.forEach((c) => {
    if (c.matched_account === "True") matched++;
  });
  const summary = {
    total_rows: total,
    matched_rows: matched,
    match_rate: total ? +((matched / total) * 100).toFixed(2) : 0,
    unique_domains: new Set(cleaned.map((c) => c.company_domain)).size,
    matched_unique_domains: new Set(
      cleaned
        .filter((c) => c.matched_account === "True")
        .map((c) => c.company_domain),
    ).size,
  };
  // eslint-disable-next-line no-console
  console.log(
    "Outbound data cleaned & enriched. Summary:\n",
    JSON.stringify(summary, null, 2),
  );
  // eslint-disable-next-line no-console
  console.log(`Cleaned outbound data written to ${outputPath}`);
}

run();
