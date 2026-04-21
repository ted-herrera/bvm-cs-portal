import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";
import { getSupabase } from "@/lib/supabase";

const VALID_CODES = new Set(["BVM2026", "CONTENT1"]);

export async function POST(request: Request) {
  try {
    const { clientId, code } = (await request.json()) as {
      clientId?: string;
      code?: string;
    };

    if (!clientId || !code) {
      return NextResponse.json({ success: false }, { status: 200 });
    }

    if (!VALID_CODES.has(code.trim().toUpperCase())) {
      return NextResponse.json({ success: false }, { status: 200 });
    }

    const client = await getClient(clientId);
    if (!client) {
      return NextResponse.json({ success: false }, { status: 200 });
    }

    const marker = "content-unlocked";
    const alreadyUnlocked = (client.buildNotes || []).includes(marker);
    if (!alreadyUnlocked) {
      await updateClient(clientId, {
        buildNotes: [...(client.buildNotes || []), marker],
      });
    }

    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from("clients")
        .update({ content_unlocked: true })
        .eq("id", clientId)
        .then(
          () => undefined,
          () => undefined,
        );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
