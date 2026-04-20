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

    const allLeads: Array<Record<string, unknown>> = [];
    let hasMore = true;
    let skip = 0;
    const limit = 100;
    const maxPages = 50;
    let page = 0;

    while (hasMore && page < maxPages) {
      const url = new URL("https://api.close.com/api/v1/lead/");
      url.searchParams.set("query", `user_id:${userId}`);
      url.searchParams.set("_skip", String(skip));
      url.searchParams.set("_limit", String(limit));

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Close API error: ${err}` }, { status: 502 });
      }

      const body: CloseApiResponse = await res.json();

      // Filter out cancelled/lost leads
      const filtered = body.data.filter(
        (lead) =>
          lead.status_label?.toLowerCase() !== "cancelled" &&
          lead.status_label?.toLowerCase() !== "lost",
      );

      for (const lead of filtered) {
        const custom = lead.custom || {};
        allLeads.push({
          id: lead.id,
          name: lead.display_name,
          status: lead.status_label,
          contacts: lead.contacts,
          agreementNumber: custom["Agreement #"] ?? null,
          adTypes: custom["Ad Type(s)"] ?? null,
          cadence: custom["Cadence"] ?? null,
          monthly: custom["Monthly"] ?? null,
          firstEdition: custom["First Edition"] ?? null,
          lastEdition: custom["Last Edition"] ?? null,
          renewStatus: custom["Renew Status"] ?? null,
          publications: custom["Publications"] ?? null,
          region: custom["Region"] ?? null,
          dvl: custom["DVL"] ?? null,
          saleItems: custom["Sale Items"] ?? null,
          saleDate: custom["Sale Date"] ?? null,
          soldBy: custom["Sold By"] ?? null,
        });
      }

      hasMore = body.has_more;
      skip += limit;
      page++;
    }

    return NextResponse.json({ leads: allLeads, total: allLeads.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch leads: ${message}` }, { status: 500 });
  }
}
