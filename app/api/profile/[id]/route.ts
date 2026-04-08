import { getClient } from "@/lib/mock-data";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/profile/[id]">
) {
  const { id } = await ctx.params;
  console.log("GET /api/profile:", id);
  const client = getClient(id);
  console.log("GET /api/profile:", id, "found:", !!client);
  if (!client) {
    return Response.json({ error: `Client not found: ${id}` }, { status: 404 });
  }
  return Response.json({ client });
}
