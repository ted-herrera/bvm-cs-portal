const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwP7an51A5YzMDy2lhVWD7deWRMEuY8W9Q12tc6pXNJfCJDNXqSWP9h7_BhChezKg/exec";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    type?: string;
    repName?: string;
    clientName?: string;
    clientStatus?: string;
    note?: string;
    to?: string;
    subject?: string;
    body?: string;
  };

  const type = body.type || "escalation";

  let payload: { to: string; subject: string; body: string };

  if (type === "email") {
    payload = {
      to: body.to || "",
      subject: body.subject || "",
      body: body.body || "",
    };
  } else if (type === "card-email") {
    payload = {
      to: body.to || "",
      subject: body.subject || `A personal note from ${body.repName || "your rep"} at BVM`,
      body: body.body || "",
    };
  } else if (type === "card-snail") {
    payload = {
      to: "therrera@bestversionmedia.com",
      subject: `SNAIL MAIL CARD REQUEST — ${body.clientName || "Client"}`,
      body: `Hi Ted,\n\nRep: ${body.repName || "Rep"} wants to send a physical card to:\n\nClient: ${body.clientName || ""}\nMessage: ${body.note || ""}\nTemplate: ${body.body || ""}\n\nPlease handle manually.\n\nSent from BVM Campaign Portal`,
    };
  } else {
    // escalation
    payload = {
      to: "therrera@bestversionmedia.com",
      subject: `CAMPAIGN ESCALATION — ${body.clientName || "Client"}`,
      body: `Hi Ted,\n\nRep: ${body.repName || "Rep"}\nClient: ${body.clientName || ""}\nStatus: ${body.clientStatus || ""}\n\nNote:\n${body.note || ""}\n\nSent from BVM Campaign Portal`,
    };
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      return Response.json({ error: text || `HTTP ${res.status}` }, { status: 502 });
    }
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
