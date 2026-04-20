const REP_USER_IDS: Record<string, string> = {
  "Alex Polivka": "user_ZDhdlcanHiDZj6QoOTReknHGifsEhZpV03hDhQEutis",
  "April Dippolito": "user_thprS88WhvHcnElDBzhcz2CvY4BeGgKMYFwuHQEeLhR",
  "Genele Ekinde": "user_sVfp8aLaBkWMNs4NzYUrJ45nPl9twtpvpI75cQTtMLS",
  "Kala McNeely": "user_2garXAc19Evv9pYyMHr6cVgDJdCkERbZTUlx6vs7JkC",
  "Karen Guirguis": "user_bco3BJa2xPHHmrT570fuH3jBBWG4MKjBX0SZYKdL5k4",
  "Samantha Marcus": "user_rOPMIjFq1Fh1kGRljVkkyAPDnt61OSloJ1x0nX5UKWI",
  "Ted Herrera": "user_GGLCIENjMBktSidCBK16Fny5CIWno7rIMd55QhHBKtD",
};

interface CloseLead {
  id: string;
  display_name?: string;
  status_label?: string;
  contacts?: Array<{
    name?: string;
    phones?: Array<{ phone_formatted?: string }>;
    emails?: Array<{ email?: string }>;
  }>;
  custom?: Record<string, unknown>;
  opportunities?: Array<{
    value?: number;
    status_label?: string;
  }>;
  html_url?: string;
}

export async function POST(request: Request) {
  const { repName } = (await request.json()) as { repName: string };

  const closeApiKey = process.env.CLOSE_API_KEY;
  if (!closeApiKey) {
    return Response.json({ leads: [], error: "Close API key not configured" }, { status: 500 });
  }

  // Look up user ID — try exact match first, then case-insensitive
  let userId = REP_USER_IDS[repName];
  if (!userId) {
    const lower = repName.toLowerCase();
    for (const [name, id] of Object.entries(REP_USER_IDS)) {
      if (name.toLowerCase() === lower) {
        userId = id;
        break;
      }
    }
  }

  if (!userId) {
    return Response.json({ leads: [], error: "Rep not found in user ID lookup" });
  }

  const authHeader = "Basic " + Buffer.from(closeApiKey + ":").toString("base64");
  const allLeads: CloseLead[] = [];
  let cursor: string | undefined;
  let page = 0;
  const MAX_PAGES = 50;

  try {
    while (page < MAX_PAGES) {
      const params = new URLSearchParams({
        query: `custom.CSS:"${userId}"`,
        _fields: "id,display_name,status_label,contacts,custom,opportunities,html_url",
        _limit: "100",
      });
      if (cursor) params.set("_cursor", cursor);

      const res = await fetch(`https://api.close.com/api/v1/lead/?${params.toString()}`, {
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[close-leads] Close API error:", res.status, err);
        return Response.json({ leads: allLeads, error: `Close API error: ${res.status}`, total: allLeads.length });
      }

      const data = (await res.json()) as {
        data: CloseLead[];
        has_more: boolean;
        cursor?: string;
      };

      allLeads.push(...data.data);
      page++;

      if (!data.has_more || !data.cursor) break;
      cursor = data.cursor;
    }

    // Filter out Cancelled and Lost leads
    const activLeads = allLeads.filter((lead) => {
      const s = (lead.status_label || "").toLowerCase();
      return s !== "cancelled" && s !== "lost";
    });

    const leads = activLeads.map((lead) => ({
      id: lead.id || "",
      businessName: lead.display_name || "",
      status: lead.status_label || "",
      contactName: lead.contacts?.[0]?.name || "",
      phone: lead.contacts?.[0]?.phones?.[0]?.phone_formatted || "",
      email: lead.contacts?.[0]?.emails?.[0]?.email || "",
      agreementNumber: (lead.custom?.["Agreement #"] as string) || "",
      adType: (lead.custom?.["Ad Type(s)"] as string) || "",
      cadence: (lead.custom?.["Cadence"] as string) || "",
      monthly: (lead.custom?.["Monthly"] as string) || "",
      firstEdition: (lead.custom?.["First Edition"] as string) || "",
      lastEdition: (lead.custom?.["Last Edition"] as string) || "",
      renewStatus: (lead.custom?.["Renew Status"] as string) || "",
      publications: (lead.custom?.["Publications"] as string) || "",
      region: (lead.custom?.["Region"] as string) || "",
      dvl: (lead.custom?.["DVL"] as string) || "",
      saleItems: (lead.custom?.["Sale Items"] as string) || "",
      closeUrl: lead.html_url || "",
      dealValue: lead.opportunities?.[0]?.value || 0,
      dealStatus: lead.opportunities?.[0]?.status_label || "",
    }));

    return Response.json({ leads, total: leads.length });
  } catch (e) {
    console.error("[close-leads] Error:", e);
    return Response.json({ leads: [], error: "Failed to fetch Close leads" }, { status: 500 });
  }
}
