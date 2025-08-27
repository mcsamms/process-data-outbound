/**
 * Data Cleaning & Normalization Script
 *
 * Responsibilities:
 * 1. Read the raw account CSV dataset.
 * 2. Normalize company name & domain (trim, lowercase domain, remove www.).
 * 3. Normalize country & derive region bucket.
 * 4. Consolidate industry into a SMALL set of broad buckets (goal: fewer, wider buckets).
 * 5. Derive deal_won column from deal_stage (Closed Won => True, Closed Lost => False, others blank) and collapse both Closed Won/Lost to deal_stage = "Closed".
 * 6. Output cleaned JSON file plus a brief summary of transformations to console.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ------------ Types ------------
interface RawRow {
  company_name: string;
  domain: string;
  employee_count: string; // keep as string in raw
  location: string;
  industry: string;
  logins_last_30d: string;
  "contacts in account": string;
  feature_event_count: string;
  deal_stage: string;
  arr: string;
  signup_date: string;
  [key: string]: string; // fallback for any unexpected columns
}

interface CleanRow {
  company_name: string;
  domain: string;
  employee_count: number | null;
  location: string; // canonical country name
  region: string;
  industry: string; // bucketed industry
  logins_last_30d: number | null;
  contacts_in_account: number | null;
  feature_event_count: number | null;
  deal_stage: string; // normalized stage (Closed, Proposal, Qualified, etc.)
  deal_won: "True" | "False" | "";
  arr: number | null;
  signup_date: string; // keep original ISO-ish string
}

// ------------ Country & Region Normalization ------------

type CountryInfo = { name: string; region: string };

// Canonical country to region mapping (not exhaustive but covers dataset + common variants)
const canonicalCountryRegion: Record<string, CountryInfo> = {
  "united states": { name: "United States", region: "North America" },
  usa: { name: "United States", region: "North America" },
  "u.s.a.": { name: "United States", region: "North America" },
  "united states of america": {
    name: "United States",
    region: "North America",
  },
  canada: { name: "Canada", region: "North America" },
  mexico: { name: "Mexico", region: "North America" },
  "united kingdom": { name: "United Kingdom", region: "Europe" },
  uk: { name: "United Kingdom", region: "Europe" },
  england: { name: "United Kingdom", region: "Europe" },
  britain: { name: "United Kingdom", region: "Europe" },
  "great britain": { name: "United Kingdom", region: "Europe" },
  australia: { name: "Australia", region: "Oceania" },
  chile: { name: "Chile", region: "South America" },
  qatar: { name: "Qatar", region: "Middle East" },
  "south africa": { name: "South Africa", region: "Africa" },
  czechia: { name: "Czechia", region: "Europe" },
  "czech republic": { name: "Czechia", region: "Europe" },
  germany: { name: "Germany", region: "Europe" },
  france: { name: "France", region: "Europe" },
  spain: { name: "Spain", region: "Europe" },
  italy: { name: "Italy", region: "Europe" },
  netherlands: { name: "Netherlands", region: "Europe" },
  belgium: { name: "Belgium", region: "Europe" },
  sweden: { name: "Sweden", region: "Europe" },
  norway: { name: "Norway", region: "Europe" },
  finland: { name: "Finland", region: "Europe" },
  denmark: { name: "Denmark", region: "Europe" },
  brazil: { name: "Brazil", region: "South America" },
  argentina: { name: "Argentina", region: "South America" },
  colombia: { name: "Colombia", region: "South America" },
  peru: { name: "Peru", region: "South America" },
  nigeria: { name: "Nigeria", region: "Africa" },
  kenya: { name: "Kenya", region: "Africa" },
  egypt: { name: "Egypt", region: "Africa" },
  india: { name: "India", region: "Asia" },
  china: { name: "China", region: "Asia" },
  japan: { name: "Japan", region: "Asia" },
  singapore: { name: "Singapore", region: "Asia" },
  indonesia: { name: "Indonesia", region: "Asia" },
  thailand: { name: "Thailand", region: "Asia" },
  vietnam: { name: "Vietnam", region: "Asia" },
  philippines: { name: "Philippines", region: "Asia" },
};

function normalizeCountry(raw: string): CountryInfo {
  const key = raw.trim().toLowerCase();
  if (canonicalCountryRegion[key]) return canonicalCountryRegion[key];
  // Fallback: Title Case original trimmed country, Unknown region
  const name = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return { name, region: "Unknown" };
}

// ------------ Industry Bucketing ------------

// Broad buckets (explicit list to keep them stable and documented)
const INDUSTRY_BUCKETS = [
  "Software & Technology",
  "Financial Services",
  "Manufacturing & Industrial",
  "Retail & Consumer",
  "Media & Entertainment",
  "Healthcare & Life Sciences",
  "Energy & Utilities",
  "Transportation & Mobility",
  "Professional & Business Services",
  "Public / Nonprofit / Education",
  "Real Estate & Facilities",
  "Other / Unknown",
];

function bucketIndustry(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "Other / Unknown";
  const lc = value.toLowerCase();

  const hasAny = (terms: string[]) => terms.some((t) => lc.includes(t));

  if (
    hasAny([
      "tech",
      "software",
      "cloud",
      "data",
      "platform",
      "automation",
      "ai",
      "ml",
      "analytics",
      "it ",
      " it",
      "labs",
      "digital",
      "cyber",
      "security",
      "devops",
      "robot",
      "drone",
      "quantum",
      "monitoring",
      "cpq",
      "xr",
      "telematics",
    ])
  ) {
    return "Software & Technology";
  }
  if (
    hasAny([
      "bank",
      "lending",
      "finance",
      "financial",
      "capital",
      "equity",
      "investment",
      "venture",
      "crowdfunding",
      "payments",
      "insur",
      "credit",
      "fintech",
      "private equity",
    ])
  ) {
    return "Financial Services";
  }
  if (
    hasAny([
      "manufacturing",
      "industrial",
      "engineering",
      "fabrication",
      "plant",
      "factory",
      "hardware",
    ])
  ) {
    return "Manufacturing & Industrial";
  }
  if (
    hasAny([
      "retail",
      "e-commerce",
      "commerce",
      "consumer",
      "fashion",
      "apparel",
      "marketplace",
      "restaurant",
      "food",
      "hospitality",
      "ticket",
      "gaming",
    ])
  ) {
    return "Retail & Consumer";
  }
  if (hasAny(["media", "entertain", "stream", "content", "gaming network"])) {
    return "Media & Entertainment";
  }
  if (
    hasAny(["health", "medical", "pharma", "bio", "life science", "fitness"])
  ) {
    return "Healthcare & Life Sciences";
  }
  if (hasAny(["energy", "solar", "power", "utility", "oil", "gas"])) {
    return "Energy & Utilities";
  }
  if (
    hasAny([
      "transport",
      "fleet",
      "mobility",
      "logistic",
      "supply chain",
      "warehous",
    ])
  ) {
    return "Transportation & Mobility";
  }
  if (
    hasAny([
      "consult",
      "professional",
      "services",
      "agency",
      "studio",
      "partners",
      "group",
      "holdings",
      "solutions",
      "collective",
      "network",
    ])
  ) {
    return "Professional & Business Services";
  }
  if (
    hasAny([
      "government",
      "public",
      "ngo",
      "nonprofit",
      "education",
      "university",
      "research",
    ])
  ) {
    return "Public / Nonprofit / Education";
  }
  if (
    hasAny([
      "real estate",
      "property",
      "facilities",
      "facility",
      "construction",
    ])
  ) {
    return "Real Estate & Facilities";
  }
  return "Other / Unknown";
}

// ------------ Deal Stage Normalization ------------

function normalizeDealStage(stage: string): {
  stage: string;
  won: "True" | "False" | "";
} {
  const raw = (stage || "").trim();
  if (/closed won/i.test(raw)) return { stage: "Closed", won: "True" };
  if (/closed lost/i.test(raw)) return { stage: "Closed", won: "False" };
  return { stage: raw, won: "" };
}

// ------------ Simple CSV Parsing ------------

function parseCsv(text: string): RawRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row as RawRow;
  });
}

// ------------ Normalization Helpers ------------

function cleanCompanyName(name: string): string {
  return (name || "").trim().replace(/\s+/g, " ");
}

function cleanDomain(domain: string): string {
  const d = (domain || "").trim().toLowerCase();
  return d.startsWith("www.") ? d.slice(4) : d;
}

function toNumber(val: string): number | null {
  if (!val || !val.trim()) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

// ------------ Main Execution ------------

function run() {
  const inputPath = join(
    process.cwd(),
    "data",
    "assessment_account_dataset.csv",
  );
  const outputPath = join(
    process.cwd(),
    "data",
    "cleaned_assessment_data.json",
  );

  const csv = readFileSync(inputPath, "utf8");
  const rawRows = parseCsv(csv);

  const cleaned: CleanRow[] = rawRows.map((r) => {
    const company_name = cleanCompanyName(r.company_name);
    const domain = cleanDomain(r.domain);
    const { name: location, region } = normalizeCountry(r.location || "");
    const industry = bucketIndustry(r.industry || "");
    const { stage: deal_stage, won: deal_won } = normalizeDealStage(
      r.deal_stage || "",
    );
    return {
      company_name,
      domain,
      employee_count: toNumber(r.employee_count),
      location,
      region,
      industry,
      logins_last_30d:
        toNumber(
          r.logins_last_30d ?? r["logins_last_30d"] ?? r["logins_last_30d"],
        ) ?? toNumber(r["logins_last_30d"]),
      contacts_in_account: toNumber(r["contacts in account"]),
      feature_event_count: toNumber(r.feature_event_count),
      deal_stage,
      deal_won,
      arr: toNumber(r.arr),
      signup_date: r.signup_date,
    };
  });

  writeFileSync(outputPath, JSON.stringify(cleaned, null, 2), "utf8");

  // Summary stats
  const rawIndustrySet = new Set(
    rawRows.map((r) => (r.industry || "").trim() || "<blank>"),
  );
  const bucketCounts: Record<string, number> = {};
  cleaned.forEach((c) => {
    bucketCounts[c.industry] = (bucketCounts[c.industry] || 0) + 1;
  });

  const summary = {
    total_rows: cleaned.length,
    distinct_raw_industries: rawIndustrySet.size,
    industry_buckets: bucketCounts,
    buckets_defined: INDUSTRY_BUCKETS,
  };

  // eslint-disable-next-line no-console
  console.log(
    "Data cleaning complete. Summary:\n",
    JSON.stringify(summary, null, 2),
  );
  // eslint-disable-next-line no-console
  console.log(`Cleaned data written to ${outputPath}`);
}

run();
