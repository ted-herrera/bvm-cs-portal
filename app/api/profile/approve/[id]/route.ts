import { getClient, updateClient } from "@/lib/mock-data";
import type { NextRequest } from "next/server";
import { sendEmailViaAppsScript, approvalConfirmationEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/profile/approve/[id]">
) {
  const { id } = await ctx.params;
  const client = await getClient(id);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  await updateClient(id, {
    stage: "building",
    approved_at: now,
    buildLog: [
      ...client.buildLog,
      { from: client.stage, to: "building", timestamp: now, triggeredBy: "client" },
    ],
    buildNotes: [...client.buildNotes, "Tear sheet approved by client"],
  });

  // Fire approval confirmation email (best-effort, don't block on failure)
  if (client.contact_email) {
    sendEmailViaAppsScript(
      approvalConfirmationEmail({
        clientName: client.business_name,
        repName: client.assigned_rep || "your BVM rep",
        toEmail: client.contact_email,
      }),
    ).catch((err) => console.error("[approve] email failed:", err));
  }

  return Response.json({ success: true });
}
