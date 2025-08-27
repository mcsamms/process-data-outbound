import { DataBrowser } from "@/components/DataBrowser";

export default function AccountsPage() {
  // Provide explicit column order (omit some high-cardinality if desired)
  const columns = [
    "company_name",
    "domain",
    "location",
    "region",
    "industry",
    "deal_stage",
    "deal_won",
    "employee_count",
    "arr",
    "signup_date",
  ];
  return (
    <main style={{ padding: "1rem" }}>
      <DataBrowser
        title="Accounts (Cleaned)"
        endpoint="/api/accounts"
        columns={columns}
        pageSize={100}
      />
    </main>
  );
}

