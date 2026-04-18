import { sendEmailViaAppsScript } from "@/lib/email";
import type { EmailResult } from "@/lib/email";

export async function sendCampaignLink(opts: {
  clientEmail: string;
  firstName: string;
  businessName: string;
  city: string;
  opportunityScore: number;
  households: string;
  medianIncome: string;
  clientId: string;
}): Promise<EmailResult> {
  const portalUrl =
    (process.env.NEXT_PUBLIC_SITE_URL || "https://bvm-design-center.vercel.app") +
    "/campaign/client/" +
    opts.clientId;

  const body = `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1B2A4A; color: #ffffff; padding: 40px; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="font-size: 28px; font-weight: 700; color: #F5C842; letter-spacing: 0.05em;">BVM</div>
    <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.15em;">Best Version Media</div>
  </div>
  <h1 style="font-family: Georgia, serif; font-size: 28px; color: #ffffff; margin-bottom: 8px;">Your campaign is ready, ${opts.firstName}.</h1>
  <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6; margin-bottom: 32px;">We've built your campaign direction based on your market in ${opts.city}. Your opportunity score came in at ${opts.opportunityScore}/100 — here's what we found.</p>
  <div style="background: rgba(245,200,66,0.1); border: 1px solid rgba(245,200,66,0.3); border-radius: 8px; padding: 20px; margin-bottom: 32px;">
    <div style="font-size: 12px; color: #F5C842; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Your Market</div>
    <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${opts.city} · ${opts.opportunityScore}/100 Opportunity Score</div>
    <div style="font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 4px;">${opts.households} households · ${opts.medianIncome} median income</div>
  </div>
  <a href="${portalUrl}" style="display: block; background: #F5C842; color: #1B2A4A; text-align: center; padding: 16px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; text-decoration: none; margin-bottom: 24px;">View Your Campaign →</a>
  <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">Best Version Media · Your neighborhood. Your campaign.</p>
</div>`;

  return sendEmailViaAppsScript({
    to: opts.clientEmail,
    subject: `Your BVM Campaign Is Ready — ${opts.businessName}`,
    body,
  });
}
