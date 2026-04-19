export async function POST(request: Request) {
  const { action, leadId, data } = (await request.json()) as {
    action: "change-status" | "log-email" | "log-call" | "log-note";
    leadId: string;
    data: Record<string, string>;
  };

  const apiKey = process.env.CLOSE_API_KEY;
  if (!apiKey) return Response.json({ error: "Close API not configured" }, { status: 500 });

  const auth = "Basic " + Buffer.from(apiKey + ":").toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  try {
    if (action === "change-status") {
      const res = await fetch(`https://api.close.com/api/v1/lead/${leadId}/`, {
        method: "PUT", headers,
        body: JSON.stringify({ status_label: data.status }),
      });
      if (!res.ok) return Response.json({ error: await res.text() }, { status: res.status });
      return Response.json({ success: true });
    }

    if (action === "log-email") {
      const res = await fetch("https://api.close.com/api/v1/activity/email/", {
        method: "POST", headers,
        body: JSON.stringify({ lead_id: leadId, direction: "outbound", subject: data.subject || "", body_text: data.body || "", status: "sent" }),
      });
      if (!res.ok) return Response.json({ error: await res.text() }, { status: res.status });
      return Response.json({ success: true });
    }

    if (action === "log-call") {
      const res = await fetch("https://api.close.com/api/v1/activity/call/", {
        method: "POST", headers,
        body: JSON.stringify({ lead_id: leadId, direction: "outbound", duration: 0, status: "completed", note: data.note || "" }),
      });
      if (!res.ok) return Response.json({ error: await res.text() }, { status: res.status });
      return Response.json({ success: true });
    }

    if (action === "log-note") {
      const res = await fetch("https://api.close.com/api/v1/activity/note/", {
        method: "POST", headers,
        body: JSON.stringify({ lead_id: leadId, note: data.note || "" }),
      });
      if (!res.ok) return Response.json({ error: await res.text() }, { status: res.status });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[close-action] Error:", e);
    return Response.json({ error: "Action failed" }, { status: 500 });
  }
}
