import { getClient, updateClient } from "@/lib/mock-data";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/profile/revision/[id]">
) {
  const { id } = await ctx.params;
  const client = getClient(id);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const body = (await req.json()) as { note: string };
  const now = new Date().toISOString();

  updateClient(id, {
    stage: "revision-requested",
    messages: [
      ...client.messages,
      { from: "client", text: body.note, timestamp: now },
    ],
    buildLog: [
      ...client.buildLog,
      {
        from: client.stage,
        to: "revision-requested",
        timestamp: now,
        triggeredBy: "client",
      },
    ],
    buildNotes: [...client.buildNotes, "Revision requested by client"],
  });

  return Response.json({ success: true });
}
