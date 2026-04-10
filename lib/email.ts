// Shared Apps Script email transport.
//
// All transactional emails (escalations, approvals, go-live) flow through
// the Google Apps Script webhook below. The script forwards to Gmail with
// the from address bound to the workspace account.

export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwP7an51A5YzMDy2lhVWD7deWRMEuY8W9Q12tc6pXNJfCJDNXqSWP9h7_BhChezKg/exec";

export interface EmailPayload {
  to: string; // comma-separated list
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export interface EmailResult {
  ok: boolean;
  status?: number;
  error?: string;
  raw?: string;
}

export async function sendEmailViaAppsScript(payload: EmailPayload): Promise<EmailResult> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Apps Script returns text/plain even on success — accept anything
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, error: text || `HTTP ${res.status}`, raw: text };
    }
    return { ok: true, status: res.status, raw: text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Pre-built templates for common transactional emails ──────────────

export function approvalConfirmationEmail(args: {
  clientName: string;
  repName: string;
  toEmail: string;
}): EmailPayload {
  return {
    to: args.toEmail,
    subject: `Your BVM campaign is approved — ${args.clientName}`,
    body:
      `Hi ${args.clientName},\n\n` +
      `Your tear sheet is approved and your build has started. Bruno is working on your site now.\n\n` +
      `You'll get another note from us the moment it's live.\n\n` +
      `If you need anything in the meantime, just reply to this email.\n\n` +
      `— ${args.repName}\n` +
      `Sent from BVM Design Center`,
  };
}

export function goLiveNotificationEmail(args: {
  clientName: string;
  repName: string;
  liveUrl: string;
  toEmail: string;
}): EmailPayload {
  return {
    to: args.toEmail,
    subject: `🎉 Your site is live — ${args.clientName}`,
    body:
      `Hi ${args.clientName},\n\n` +
      `Big day — your site is live!\n\n` +
      `View it here: ${args.liveUrl}\n\n` +
      `Take a look, share it with your customers, and let us know what you think.\n\n` +
      `Welcome to the BVM family.\n\n` +
      `— ${args.repName}\n` +
      `Sent from BVM Design Center`,
  };
}
