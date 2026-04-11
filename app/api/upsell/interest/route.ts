import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";

export async function POST(request: Request) {
  const { clientId, product, type } = (await request.json()) as {
    clientId: string;
    product?: string;
    type?: string;
  };

  const interestType = type || product || "unknown";

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  const note = {
    from: "system",
    text: `Client expressed interest in ${interestType} upgrade`,
    timestamp: now,
  };

  const interests = { ...(client.interests || {}) };
  interests[interestType] = true;
  interests[`${interestType}_at`] = now;

  const logEntry = {
    from: client.stage,
    to: client.stage,
    timestamp: now,
    triggeredBy: "client",
  };

  await updateClient(clientId, {
    internalNotes: [...client.internalNotes, note],
    interests,
    buildLog: [...client.buildLog, logEntry],
  });

  return NextResponse.json({ success: true });
}
