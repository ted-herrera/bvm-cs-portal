import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";
import type { BuildLogEntry } from "@/lib/pipeline";

export async function POST(request: Request) {
  const { clientId, devUsername } = (await request.json()) as {
    clientId: string;
    devUsername: string;
  };

  const client = getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const logEntry: BuildLogEntry = {
    from: client.stage,
    to: "building",
    timestamp: new Date().toISOString(),
    triggeredBy: devUsername,
  };

  const updated = updateClient(clientId, {
    assignedDev: devUsername,
    buildLog: [...client.buildLog, logEntry],
  });

  return NextResponse.json({ success: true, client: updated });
}
