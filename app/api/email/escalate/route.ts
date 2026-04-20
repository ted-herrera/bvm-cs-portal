import { NextResponse } from "next/server";
import { sendEmailViaAppsScript } from "@/lib/email";

export async function POST(request: Request) {
  const { clientName, repName, stage } = (await request.json()) as {
    clientName?: string;
    repName?: string;
    stage?: string;
  };

  if (!clientName) {
    return NextResponse.json({ error: "clientName required" }, { status: 400 });
  }

  const subject = `PRINT ISSUE – ${clientName}`;
  const body =
    `Hi Ted,\n\n` +
    `Date of next client call: [rep to fill]\n\n` +
    `Issue / delay / escalation:\n[rep to fill]\n\n` +
    `What I need to move it forward:\n[rep to fill]\n\n` +
    `Client: ${clientName}\n` +
    `Rep: ${repName || "—"}\n` +
    `Stage: ${stage || "—"}\n\n` +
    `Sent from BVM Client Success Portal`;

  const result = await sendEmailViaAppsScript({
    to: "therrera@bestversionmedia.com",
    subject,
    body,
  });

  if (!result.ok) {
    console.error("[email/escalate] Apps Script failed:", result.error);
    return NextResponse.json({ error: result.error || "Send failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
