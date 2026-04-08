import { addClient } from "@/lib/mock-data";
import type { ClientProfile } from "@/lib/pipeline";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    intakeAnswers: Record<string, string>;
    sbrData: Record<string, unknown>;
    rep: string;
  };

  const { intakeAnswers, sbrData, rep } = body;

  const id = `client-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  // Parse Q1 for city/zip
  const q1 = intakeAnswers.q1 || "";
  const cityMatch = q1.match(/,\s*(.+?)(?:\s+\w{2})?\s+(\d{5})/);
  const city = cityMatch?.[1]?.trim() || "";
  const zip = cityMatch?.[2] || "";

  // Parse business name from Q1
  const businessName = q1.split(",")[0]?.trim() || "New Client";

  // Parse phone from Q7
  const phoneMatch = (intakeAnswers.q7 || "").match(
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  );
  const phone = phoneMatch?.[0] || "";

  const profile: ClientProfile = {
    id,
    business_name: businessName,
    contact_name: "",
    contact_email: "",
    phone,
    city,
    zip,
    assigned_rep: rep || "ted",
    stage: "tear-sheet",
    created_at: now,
    approved_at: null,
    qa_passed_at: null,
    delivered_at: null,
    published_url: null,
    sbrData,
    selectedLook: intakeAnswers.q5 || null,
    intakeAnswers,
    tearSheetUrl: `/tearsheet/${id}`,
    buildNotes: ["Intake completed", "SBR analysis complete"],
    qaReport: null,
    messages: [],
    internalNotes: [],
    buildLog: [
      {
        from: "intake",
        to: "tear-sheet",
        timestamp: now,
        triggeredBy: "system",
      },
    ],
    assignedDev: null,
    hasLogo: intakeAnswers.q6?.toLowerCase().includes("yes") || false,
    logoUrl: null,
  };

  addClient(profile);

  return Response.json({ success: true, profile });
}
