import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { id, client_email, client_phone, client_first_name, qr_url } =
      await request.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const updates: Record<string, string> = {};
    if (client_email !== undefined) updates.client_email = client_email;
    if (client_phone !== undefined) updates.client_phone = client_phone;
    if (client_first_name !== undefined) updates.client_first_name = client_first_name;
    if (qr_url !== undefined) updates.qr_url = qr_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("campaign_clients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}
