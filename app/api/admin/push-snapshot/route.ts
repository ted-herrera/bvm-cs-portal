import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      pushedBy?: string;
      weekOf?: string;
      payload?: unknown;
    };
    const now = new Date().toISOString();
    const weekOf = body.weekOf || now.slice(0, 10);
    const id = `snap-${Date.now().toString(36)}`;

    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from("admin_snapshots")
        .insert({
          id,
          pushed_at: now,
          pushed_by: body.pushedBy || "ted",
          week_of: weekOf,
          payload: body.payload ?? null,
        })
        .then(
          () => undefined,
          () => undefined,
        );
    }

    return NextResponse.json({ success: true, id, pushedAt: now, weekOf });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  // Lets rep dashboards poll for the most recent snapshot.
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ snapshot: null });
  const { data } = await supabase
    .from("admin_snapshots")
    .select("id, pushed_at, pushed_by, week_of")
    .order("pushed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ snapshot: data || null });
}
