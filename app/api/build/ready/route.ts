import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";
import type { BuildLogEntry } from "@/lib/pipeline";

export async function POST(request: Request) {
  const { clientId } = (await request.json()) as { clientId: string };

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const logEntry: BuildLogEntry = {
    from: "building",
    to: "qa",
    timestamp: new Date().toISOString(),
    triggeredBy: "dev",
  };

  const updated = await updateClient(clientId, {
    stage: "qa",
    buildLog: [...client.buildLog, logEntry],
  });

  return NextResponse.json({ success: true, client: updated });
}
