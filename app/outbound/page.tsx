import { promises as fs } from "fs";
import { DataBrowser } from "@/components/DataBrowser";

export default function OutboundPage() {
  const columns = [
    "email",
    "name",
    "company_domain",
    "outbound_campaign_id",
    "send_date",
    "opened",
    "clicked",
    "replied",
    "matched_account",
    "account_company_name",
    "account_region",
    "account_industry",
    "account_deal_stage",
    "account_deal_won",
    "account_employee_count",
    "account_arr",
  ];
  return (
    <main style={{ padding: "1rem" }}>
      <DataBrowser
        title="Outbound Engagement (Cleaned & Enriched)"
        endpoint="/api/outbound"
        columns={columns}
        pageSize={100}
      />
    </main>
  );
}
