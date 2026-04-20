import { NextRequest, NextResponse } from "next/server";
import { CLOSE_USER_IDS } from "@/lib/campaign";

interface CloseCustomField {
  [key: string]: unknown;
}

interface CloseLead {
  id: string;
  display_name: string;
  status_label: string;
  contacts: Array<{
    name?: string;
    emails?: Array<{ email: string }>;
    phones?: Array<{ phone: string }>;
  }>;
  custom: CloseCustomField;
}

interface CloseApiResponse {
  has_more: boolean;
  data: CloseLead[];
}

export async function POST(request: NextRequest) {
  try {
    const { repName } = await request.json();

    if (!repName) {
      return NextResponse.json({ error: "repName is required" }, { status: 400 });
    }

    const userId = CLOSE_USER_IDS[repName];
    if (!userId) {
      return NextResponse.json(
        { error: `Unknown rep: ${repName}. Valid reps: ${Object.keys(CLOSE_USER_IDS).join(", ")}` },
        { status: 400 },
      );
    }

    const apiKey = process.env.CLOSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Close API key not configured" }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
    const allLeads: Array<Record<string, unknown>> = [];
    let hasMore = true;
    let cursor: string | null = null;
    let pageCount = 0;

    while (hasMore && pageCount < 50) {
      let url = `https://api.close.com/api/v1/lead/?query=custom.CSS%3A%22${userId}%22&_fields=id,display_name,status_label,contacts,custom,opportunities,html_url&_limit=100`;
      if (cursor) url += `&_cursor=${encodeURIComponent(cursor)}`;

      const res = await fetch(url, {
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[close-leads] API error:", res.status, err);
        break;
      }

      const body = await res.json();
      const data = body.data || [];

      // Filter out cancelled/lost leads
      const filtered = data.filter(
        (lead: CloseLead) =>
          lead.status_label?.toLowerCase() !== "cancelled" &&
          lead.status_label?.toLowerCase() !== "lost",
      );

      for (const lead of filtered) {
        const custom = (lead as Record<string, unknown>).custom as Record<string, unknown> || {};
        allLeads.push({
          id: lead.id,
          businessName: lead.display_name,
          status: lead.status_label,
          contactName: lead.contacts?.[0]?.name || "",
          phone: lead.contacts?.[0]?.phones?.[0]?.phone || "",
          email: lead.contacts?.[0]?.emails?.[0]?.email || "",
          agreementNumber: custom["Agreement #"] ?? "",
          adType: custom["Ad Type(s)"] ?? "",
          cadence: custom["Cadence"] ?? "",
          monthly: custom["Monthly"] ?? "",
          firstEdition: custom["First Edition"] ?? "",
          lastEdition: custom["Last Edition"] ?? "",
          renewStatus: custom["Renew Status"] ?? "",
          publications: custom["Publications"] ?? "",
          region: custom["Region"] ?? "",
          dvl: custom["DVL"] ?? "",
          saleItems: custom["Sale Items"] ?? "",
          saleDate: custom["Sale Date"] ?? "",
          soldBy: custom["Sold By"] ?? "",
          closeUrl: (lead as Record<string, unknown>).html_url ?? "",
        });
      }

      hasMore = body.has_more === true;
      cursor = body.cursor || null;
      pageCount++;
      if (!hasMore || !cursor) break;
    }

    return NextResponse.json({ leads: allLeads, total: allLeads.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch leads: ${message}` }, { status: 500 });
  }
}
