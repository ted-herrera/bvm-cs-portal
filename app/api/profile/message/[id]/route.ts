import { NextRequest, NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { message, from, repName } = body;

  if (!message || !from) {
    return NextResponse.json({ error: "message and from are required" }, { status: 400 });
  }

  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const newMessage = {
    from: from as string,
    text: message as string,
    timestamp: new Date().toISOString(),
  };

  const logSnippet = message.length > 50 ? message.slice(0, 50) + "..." : message;

  await updateClient(id, {
    messages: [...client.messages, newMessage],
    buildLog: [
      ...client.buildLog,
      {
        from: client.stage,
        to: client.stage,
        timestamp: new Date().toISOString(),
        triggeredBy: `Rep sent client message: "${logSnippet}"`,
      },
    ],
  });

  return NextResponse.json({ success: true, message: newMessage });
}
