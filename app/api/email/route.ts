import { NextResponse } from "next/server";
import {
  sendEmailViaAppsScript,
  approvalConfirmationEmail,
  goLiveNotificationEmail,
} from "@/lib/email";

type EmailType = "approval" | "go-live" | "raw";

interface RequestBody {
  type: EmailType;
  // raw
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
  // template fields
  clientName?: string;
  repName?: string;
  liveUrl?: string;
  toEmail?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;

  if (!body.type) {
    return NextResponse.json({ error: "type required" }, { status: 400 });
  }

  let payload;
  if (body.type === "approval") {
    if (!body.clientName || !body.repName || !body.toEmail) {
      return NextResponse.json(
        { error: "clientName, repName, and toEmail required for approval" },
        { status: 400 },
      );
    }
    payload = approvalConfirmationEmail({
      clientName: body.clientName,
      repName: body.repName,
      toEmail: body.toEmail,
    });
  } else if (body.type === "go-live") {
    if (!body.clientName || !body.repName || !body.toEmail || !body.liveUrl) {
      return NextResponse.json(
        { error: "clientName, repName, toEmail, and liveUrl required for go-live" },
        { status: 400 },
      );
    }
    payload = goLiveNotificationEmail({
      clientName: body.clientName,
      repName: body.repName,
      liveUrl: body.liveUrl,
      toEmail: body.toEmail,
    });
  } else if (body.type === "raw") {
    if (!body.to || !body.subject || !body.body) {
      return NextResponse.json(
        { error: "to, subject, and body required for raw" },
        { status: 400 },
      );
    }
    payload = {
      to: body.to,
      subject: body.subject,
      body: body.body,
      cc: body.cc,
      bcc: body.bcc,
    };
  } else {
    return NextResponse.json({ error: `Unknown type: ${body.type}` }, { status: 400 });
  }

  const result = await sendEmailViaAppsScript(payload);
  if (!result.ok) {
    console.error("[email] Apps Script failed:", result.error);
    return NextResponse.json({ error: result.error || "Send failed" }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
