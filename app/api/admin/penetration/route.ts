import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Upsert a cs_penetration row when the admin toggles the "Contacted" checkbox
// on a Print Only agreement. Keyed by agreement_number + week_of.
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      agreementNumber: string;
      rep: string;
      contacted: boolean;
      weekOf?: string;
    };
    if (!body.agreementNumber) {
      return NextResponse.json({ error: "agreementNumber required" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const weekOf = body.weekOf || now.slice(0, 10);

    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from("cs_penetration")
        .upsert(
          {
            agreement_number: body.agreementNumber,
            rep: body.rep || null,
            contacted: !!body.contacted,
            contacted_at: body.contacted ? now : null,
            week_of: weekOf,
          },
          { onConflict: "agreement_number,week_of" },
        )
        .then(
          () => undefined,
          () => undefined,
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekOf = searchParams.get("weekOf") || new Date().toISOString().slice(0, 10);
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ rows: [] });
  const { data } = await supabase
    .from("cs_penetration")
    .select("agreement_number, rep, contacted, contacted_at, week_of")
    .eq("week_of", weekOf);
  return NextResponse.json({ rows: data || [] });
}
