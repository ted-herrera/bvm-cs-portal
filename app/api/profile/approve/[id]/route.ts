import { getClient, updateClient } from "@/lib/mock-data";
import type { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/profile/approve/[id]">
) {
  const { id } = await ctx.params;
  const client = getClient(id);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  updateClient(id, {
    stage: "building",
    approved_at: now,
    buildLog: [
      ...client.buildLog,
      { from: client.stage, to: "building", timestamp: now, triggeredBy: "client" },
    ],
    buildNotes: [...client.buildNotes, "Tear sheet approved by client"],
  });

  return Response.json({ success: true });
}
