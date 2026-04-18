import { getSupabase } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { direction } = (await request.json()) as { direction: string };

  const sb = getSupabase();
  if (!sb) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { error } = await sb
    .from("campaign_clients")
    .update({
      stage: "approved",
      approved_at: new Date().toISOString(),
      selected_direction: direction,
    })
    .eq("id", id);

  if (error) {
    console.error("[campaign/approve] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
