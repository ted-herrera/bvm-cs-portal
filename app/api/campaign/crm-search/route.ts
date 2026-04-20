import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const apiKey = process.env.CLOSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Close API key not configured" }, { status: 500 });
    }

    const url = new URL("https://api.close.com/api/v1/lead/");
    url.searchParams.set("query", `name:"${query}"`);
    url.searchParams.set("_limit", "5");

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

    const body = await res.json();

    const results = (body.data || []).map(
      (lead: { id: string; display_name: string; status_label: string; contacts: unknown[] }) => ({
        id: lead.id,
        name: lead.display_name,
        status: lead.status_label,
        contacts: lead.contacts,
      }),
    );

    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `CRM search failed: ${message}` }, { status: 500 });
  }
}
