import { getSupabase } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { stage } = (await request.json()) as { stage: string };

  const validStages = ["intake", "tearsheet", "approved", "production", "delivered"];
  if (!validStages.includes(stage)) {
    return Response.json({ error: "Invalid stage" }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { error } = await sb
    .from("campaign_clients")
    .update({ stage })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
