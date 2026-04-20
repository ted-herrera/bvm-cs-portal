import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { type, note, value } = await request.json();

    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // If type is 'tagline', update the tagline field directly
    if (type === "tagline") {
      const { data, error } = await supabase
        .from("campaign_clients")
        .update({ tagline: value })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    // Otherwise, append to revisions array
    const { data: current, error: fetchError } = await supabase
      .from("campaign_clients")
      .select("revisions")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const revisions = Array.isArray(current?.revisions) ? current.revisions : [];
    revisions.push({ type, note, value, created_at: new Date().toISOString() });

    const { data, error } = await supabase
      .from("campaign_clients")
      .update({ revisions })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "Failed to submit revision" }, { status: 500 });
  }
}
