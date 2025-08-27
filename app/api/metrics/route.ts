import type { NextRequest } from "next/server";
import { computeIndustryMetrics } from "@/lib/industryMetrics";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || undefined;
  const emp = searchParams.get("empBucket") || undefined;
  try {
    const result = await computeIndustryMetrics(region, emp);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
