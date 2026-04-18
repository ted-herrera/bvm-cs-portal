import { getSupabase } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { role, content } = (await request.json()) as {
    role: "rep" | "client";
    content: string;
  };

  const sb = getSupabase();
  if (!sb) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data: current } = await sb
    .from("campaign_clients")
    .select("messages")
    .eq("id", id)
    .single();

  const messages = Array.isArray(current?.messages) ? current.messages : [];
  messages.push({ role, content, timestamp: new Date().toISOString() });

  const { error } = await sb
    .from("campaign_clients")
    .update({ messages })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, messages });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sb = getSupabase();
  if (!sb) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data } = await sb
    .from("campaign_clients")
    .select("messages")
    .eq("id", id)
    .single();

  return Response.json({ messages: data?.messages || [] });
}
