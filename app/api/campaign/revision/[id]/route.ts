import { getSupabase } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { note } = (await request.json()) as { note: string };

  const sb = getSupabase();
  if (!sb) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  // Get current revisions
  const { data: current } = await sb
    .from("campaign_clients")
    .select("revisions")
    .eq("id", id)
    .single();

  const revisions = Array.isArray(current?.revisions) ? current.revisions : [];
  revisions.push({ note, created_at: new Date().toISOString() });

  const { error } = await sb
    .from("campaign_clients")
    .update({ revisions })
    .eq("id", id);

  if (error) {
    console.error("[campaign/revision] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
