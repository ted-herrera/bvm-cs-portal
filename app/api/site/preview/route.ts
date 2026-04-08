import { NextResponse } from "next/server";
import { generateSiteHTML } from "@/lib/studio-engine";
import type { ClientProfile } from "@/lib/pipeline";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    businessName = "Preview Business",
    city = "",
    zip = "",
    services = "",
    cta = "Get Started",
    selectedLook = "warm_bold",
    description = "",
    phone = "",
    address = "",
    sbrData = null,
  } = body as Record<string, string | null>;

  const profile: ClientProfile = {
    id: "preview",
    business_name: businessName || "Preview",
    contact_name: "",
    contact_email: "",
    phone: phone || "",
    city: city || "",
    zip: zip || "",
    assigned_rep: "ted",
    stage: "tear-sheet",
    created_at: new Date().toISOString(),
    approved_at: null,
    qa_passed_at: null,
    delivered_at: null,
    published_url: null,
    sbrData: sbrData ? (typeof sbrData === "string" ? JSON.parse(sbrData) : sbrData) : null,
    selectedLook: selectedLook || "warm_bold",
    intakeAnswers: {
      q1: `${businessName}, ${city} ${zip}`,
      q2: description || "",
      q3: services || "",
      q4: cta || "Get Started",
      q5: selectedLook || "warm_bold",
      q6: "no",
      q7: `${phone}${address ? `, ${address}` : ""}`,
      q8: "",
    },
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

  const lookKey = (selectedLook || "warm_bold") as "warm_bold" | "professional" | "bold_modern";
  const html = generateSiteHTML(profile, lookKey);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
