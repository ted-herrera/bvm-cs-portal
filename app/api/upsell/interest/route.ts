import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";

export async function POST(request: Request) {
  const { clientId, product } = (await request.json()) as {
    clientId: string;
    product: string;
  };

  const client = getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const note = {
    from: "system",
    text: `Client expressed interest in ${product}`,
    timestamp: new Date().toISOString(),
  };

  updateClient(clientId, {
    internalNotes: [...client.internalNotes, note],
  });

  return NextResponse.json({ success: true });
}
