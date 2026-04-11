import { NextResponse } from "next/server";
import { getClient } from "@/lib/mock-data";
import { generateSiteHTML } from "@/lib/studio-engine";
import type { ClientProfile } from "@/lib/pipeline";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const lookKey = (searchParams.get("lookKey") || "professional") as "warm_bold" | "professional" | "bold_modern";

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const html = generateSiteHTML(client, lookKey);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { clientId, lookKey = "professional", profileData } = body as {
    clientId?: string;
    lookKey?: "warm_bold" | "professional" | "bold_modern";
    profileData?: Partial<ClientProfile>;
  };

  let profile: ClientProfile;

  if (clientId && clientId !== "preview") {
    const client = await getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    profile = client;
  } else {
    // Build preview profile from inline data
    profile = {
      id: "preview",
      business_name: profileData?.business_name || "Preview Business",
      contact_name: "",
      contact_email: "",
      phone: profileData?.phone || "",
      city: profileData?.city || "",
      zip: profileData?.zip || "",
      assigned_rep: "ted",
      stage: "tear-sheet",
      created_at: new Date().toISOString(),
      approved_at: null,
      qa_passed_at: null,
      delivered_at: null,
      published_url: null,
      sbrData: profileData?.sbrData || null,
      selectedLook: lookKey,
      intakeAnswers: profileData?.intakeAnswers || null,
      tearSheetUrl: null,
      buildNotes: [],
      qaReport: null,
      messages: [],
      internalNotes: [],
      buildLog: [],
      assignedDev: null,
      hasLogo: false,
      logoUrl: null,
    };
  }

  const html = generateSiteHTML(profile, lookKey);
  return NextResponse.json({ html, lookKey });
}
