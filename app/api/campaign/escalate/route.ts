import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwP7an51A5YzMDy2lhVWD7deWRMEuY8W9Q12tc6pXNJfCJDNXqSWP9h7_BhChezKg/exec";

type EscalationType = "escalation" | "email" | "card-email" | "card-snail";

interface EscalationPayload {
  type: EscalationType;
  subject?: string;
  body?: string;
  to?: string;
  html?: string;
  clientName?: string;
  repName?: string;
  note?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: EscalationPayload = await request.json();
    const { type } = payload;

    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const validTypes: EscalationType[] = ["escalation", "email", "card-email", "card-snail"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Build the payload for Apps Script
    const scriptPayload: Record<string, unknown> = { ...payload };

    // Set default recipients based on type
    if (type === "escalation") {
      scriptPayload.to = "therrera@bestversionmedia.com";
    } else if (type === "card-snail") {
      scriptPayload.to = "therrera@bestversionmedia.com";
      scriptPayload.note = payload.note || "Physical card request — please coordinate with Ted.";
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scriptPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Apps Script error: ${err}` }, { status: 502 });
    }

    let result: unknown;
    try {
      result = await res.json();
    } catch {
      result = { status: "sent" };
    }

    return NextResponse.json({ success: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Escalation failed: ${message}` }, { status: 500 });
  }
}
