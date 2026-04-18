export async function POST(request: Request) {
  const { query } = (await request.json()) as { query: string };

  const closeApiKey = process.env.CLOSE_API_KEY;
  if (!closeApiKey) {
    return Response.json({ error: "Close CRM not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.close.com/api/v1/lead/?query=${encodeURIComponent(query)}&_limit=5`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(closeApiKey + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return Response.json({ results: [] });
    }

    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        display_name?: string;
        status_label?: string;
        opportunities?: Array<{
          value?: number;
          status_label?: string;
          date_updated?: string;
        }>;
      }>;
    };

    const results = (data.data || []).map((lead) => {
      const opp = lead.opportunities?.[0];
      return {
        id: lead.id,
        name: lead.display_name || "Unknown",
        status: lead.status_label || "—",
        dealValue: opp?.value ? `$${(opp.value / 100).toLocaleString()}` : "—",
        dealStage: opp?.status_label || "—",
        lastActivity: opp?.date_updated || "—",
      };
    });

    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
