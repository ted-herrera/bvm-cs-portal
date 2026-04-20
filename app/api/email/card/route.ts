import { NextResponse } from "next/server";
import { sendEmailViaAppsScript } from "@/lib/email";

type CardTemplate = "welcome" | "congrats" | "thankyou" | "renewal";

const TEMPLATES: Record<CardTemplate, { subject: string; title: string; accent: string }> = {
  welcome: { subject: "Welcome to BVM", title: "Welcome Aboard", accent: "#F5C842" },
  congrats: { subject: "Congratulations", title: "You did it!", accent: "#16A34A" },
  thankyou: { subject: "Thank You", title: "Thank You", accent: "#DC2626" },
  renewal: { subject: "Let's Renew", title: "Time to Renew", accent: "#185FA5" },
};

function htmlCard(template: CardTemplate, clientName: string, repName: string, message: string): string {
  const t = TEMPLATES[template];
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:${t.accent};height:6px;"></td></tr>
      <tr><td style="padding:40px 40px 20px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.15em;color:#64748b;text-transform:uppercase;margin:0 0 8px;">BVM Client Success</p>
        <h1 style="font-family:Georgia,serif;font-size:32px;color:#0C2340;margin:0 0 24px;">${t.title}, ${clientName}</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155;white-space:pre-wrap;margin:0 0 24px;">${message.replace(/</g, "&lt;")}</p>
        <p style="font-size:13px;color:#64748b;margin:24px 0 0;">— ${repName}<br/>BVM Client Success</p>
      </td></tr>
      <tr><td style="padding:24px 40px;background:#0C2340;color:#94a3b8;font-size:11px;text-align:center;">Best Version Media · Print + Digital Campaigns</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export async function POST(request: Request) {
  const { template, message, clientEmail, clientName, repName } = (await request.json()) as {
    template: CardTemplate;
    message: string;
    clientEmail: string;
    clientName?: string;
    repName?: string;
  };

  if (!template || !clientEmail) {
    return NextResponse.json({ error: "template and clientEmail required" }, { status: 400 });
  }

  const tmpl = TEMPLATES[template];
  if (!tmpl) {
    return NextResponse.json({ error: "invalid template" }, { status: 400 });
  }

  const html = htmlCard(template, clientName || "there", repName || "Your BVM Rep", message || "");
  const result = await sendEmailViaAppsScript({
    to: clientEmail,
    subject: tmpl.subject,
    body: html,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Send failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
