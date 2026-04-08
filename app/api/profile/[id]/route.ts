import { getClient } from "@/lib/mock-data";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/profile/[id]">
) {
  const { id } = await ctx.params;
  const client = getClient(id);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }
  return Response.json({ client });
}
