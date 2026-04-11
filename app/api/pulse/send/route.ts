import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";
import { getPulseTimer, updatePulseTimer, setPulseTimer } from "@/lib/store";

export async function POST(request: Request) {
  const { clientId } = (await request.json()) as { clientId: string };
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const nowMs = Date.now();

  // Ensure a pulse timer exists
  let timer = await getPulseTimer(clientId);
  if (!timer) {
    timer = await setPulseTimer(clientId, nowMs);
  }
  await updatePulseTimer(clientId, { lastSentAt: nowMs });

  // Log send to client record
  await updateClient(clientId, {
    internalNotes: [
      ...client.internalNotes,
      { from: "system", text: "Pulse survey sent to client", timestamp: now },
    ],
  });

  return NextResponse.json({ success: true, timer });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }
  return NextResponse.json({ timer: await getPulseTimer(clientId) || null });
}
