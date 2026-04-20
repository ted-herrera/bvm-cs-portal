import { getClient, updateClient } from "@/lib/mock-data";
import type { NextRequest } from "next/server";
import { sendEmailViaAppsScript, approvalConfirmationEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/tearsheet/approve/[id]">
) {
  const { id } = await ctx.params;
  const client = await getClient(id);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  let note: string | undefined;
  try {
    const body = await req.json().catch(() => null) as { note?: string } | null;
    note = body?.note;
  } catch {}

  const now = new Date().toISOString();
  const newNotes = [...client.buildNotes, "Campaign direction approved by client"];
  if (note) newNotes.push(`Client note: ${note}`);

  await updateClient(id, {
    stage: "building",
    approved_at: now,
    buildLog: [
      ...client.buildLog,
      { from: client.stage, to: "building", timestamp: now, triggeredBy: "client" },
    ],
    buildNotes: newNotes,
  });

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
