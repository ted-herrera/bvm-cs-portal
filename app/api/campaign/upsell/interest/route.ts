import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { clientId, product, notes } = (await req.json()) as {
      clientId: string;
      product: string;
      notes?: string;
    };

    if (!clientId || !product) {
      return NextResponse.json({ error: "clientId and product required" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ success: true, stored: false });

    const sb = createClient(url, key);

    // Read current revisions, append an interest entry, patch back
    const { data, error } = await sb
      .from("campaign_clients")
      .select("revisions")
      .eq("id", clientId)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const existing = Array.isArray(data?.revisions) ? data.revisions : [];
    const entry = {
      type: "interest",
      product,
      note: notes || `Client expressed interest in ${product}`,
      created_at: new Date().toISOString(),
    };
    const next = [...existing, entry];

    await sb.from("campaign_clients").update({ revisions: next }).eq("id", clientId);

    return NextResponse.json({ success: true, stored: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upsell failed" },
      { status: 500 },
    );
  }
}
