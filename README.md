## Getting Started

Install Packages:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3077](http://localhost:3077) with your browser to see the result.

## Data Cleaning Step

This project includes a repeatable data cleaning script that processes `data/assessment_account_dataset.csv` and generates `data/cleaned_assessment_data.json`.

### Transformations Applied

1. Company & Domain Normalization
	- Trim extra whitespace in `company_name`.
	- Lowercase domains and strip a leading `www.` if present.
2. Country Normalization & Region Derivation
	- Map known variants (e.g., `USA`, `United States of America`, `UK`, `England`) to a canonical country name.
	- Assign a broad `region` bucket (e.g., North America, Europe, Asia, Oceania, Africa, South America, Middle East). Unknowns fall back to `"Unknown"`.
3. Industry Consolidation (Intentionally Wide Buckets)
	- Raw industry strings are noisy / inconsistent (suffixes like *Labs*, *Network*, *Group*, descriptive phrases, blanks).
	- Reduced to a SMALL fixed set of broad buckets (e.g., Software & Technology, Financial Services, Manufacturing & Industrial, Retail & Consumer, etc.).
	- Classification is keyword-based (case-insensitive) and defaults to `Other / Unknown` if no rule matches.
4. Deal Stage Split
	- New column `deal_won`: `True` for `Closed Won`, `False` for `Closed Lost`, blank otherwise.
	- Original `Closed Won` / `Closed Lost` stages collapsed to unified `deal_stage = "Closed"`.
5. Numeric Parsing
	- Numeric-like fields converted to numbers when possible; invalid / blank values set to `null`.
6. Output
	- Writes a prettified JSON array to `data/cleaned_assessment_data.json`.
	- Prints a summary (row count, distinct raw industries, bucket distribution) to the console.

### Run the Cleaning Script

```bash
bun run process:data
```

This will (re)generate the cleaned JSON file. Adjust or extend bucket logic in `scripts/processData.ts` as needed.

## Outbound Data Cleaning & Enrichment

The outbound engagement dataset (`data/assessment_outbound_dataset.csv`) is cleaned and enriched against the cleaned account dataset.

### Transformations & Enrichment

1. Email & Domain Normalization
	- Lowercase email.
	- Lowercase company domain & strip leading `www.` if present.
2. Boolean Conversion
	- `opened`, `clicked`, `replied` converted from `TRUE`/`FALSE` strings to booleans.
3. Account Matching
	- Loads `data/cleaned_assessment_account_data.json`.
	- Exact domain match lookup (after normalization).
	- Adds `matched_account` flag (`True`/`False`).
4. Enrichment Fields (null when no match)
	- `account_company_name`, `account_region`, `account_industry`, `account_deal_stage`, `account_deal_won`, `account_employee_count`, `account_arr`.
5. Output
	- Writes `data/cleaned_outbound_data.json` with enriched rows.
	- Prints summary: total rows, matched rows, match rate, unique domains matched.

### Run the Outbound Cleaning Script

```bash
bun run process:outbound
```

Re-run after regenerating account data to update enrichments.



