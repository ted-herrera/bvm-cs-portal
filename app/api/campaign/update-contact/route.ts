import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { id, client_email, client_phone, client_first_name, qr_url } =
    (await request.json()) as {
      id: string;
      client_email?: string;
      client_phone?: string;
      client_first_name?: string;
      qr_url?: string;
    };

  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Database not configured" }, { status: 500 });

  const update: Record<string, unknown> = {};
  if (client_email !== undefined) update.client_email = client_email;
  if (client_phone !== undefined) update.client_phone = client_phone;
  if (client_first_name !== undefined) update.client_first_name = client_first_name;
  if (qr_url !== undefined) update.qr_url = qr_url;

  if (Object.keys(update).length === 0) return Response.json({ error: "No fields to update" }, { status: 400 });

  const { error } = await sb.from("campaign_clients").update(update).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
