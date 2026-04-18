import { getSupabase } from "@/lib/supabase";
import { sendCampaignLink } from "@/lib/campaign-email";

export async function POST(request: Request) {
  const { clientId } = (await request.json()) as { clientId: string };

  const sb = getSupabase();
  if (!sb) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data: client } = await sb
    .from("campaign_clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const sbr = (client.sbr_data || {}) as Record<string, unknown>;

  const result = await sendCampaignLink({
    clientEmail: client.client_email || "",
    firstName: client.client_first_name || client.business_name.split(" ")[0],
    businessName: client.business_name,
    city: client.city,
    opportunityScore: (sbr.opportunityScore as number) || 0,
    households: (sbr.households as string) || "N/A",
    medianIncome: (sbr.medianIncome as string) || "N/A",
    clientId,
  });

  if (!result.ok) {
    return Response.json({ error: result.error || "Send failed" }, { status: 502 });
  }

  return Response.json({ success: true });
}
