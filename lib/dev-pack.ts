import type { ClientProfile } from "./pipeline";
import { classifyBusinessType } from "./business-classifier";

export function generateDevPack(profile: ClientProfile, siteHTML: string): string {
  const sbr = profile.sbrData as Record<string, unknown> | null;
  const services = profile.intakeAnswers?.q3?.split(",").map((s) => s.trim()) || [];

  const pack = {
    meta: {
      generatedAt: new Date().toISOString(),
      clientId: profile.id,
      businessName: profile.business_name,
      assignedRep: profile.assigned_rep,
      assignedDev: profile.assignedDev,
    },
    client: {
      businessName: profile.business_name,
      contactName: profile.contact_name,
      contactEmail: profile.contact_email,
      phone: profile.phone,
      city: profile.city,
      zip: profile.zip,
      address: profile.intakeAnswers?.q7 || "",
    },
    campaign: {
      selectedLook: profile.selectedLook,
      campaignHeadline: (sbr?.campaignHeadline as string) || "",
      tagline: Array.isArray(sbr?.taglineSuggestions)
        ? (sbr.taglineSuggestions as string[])[0] || ""
        : (sbr?.suggestedTagline as string) || "",
      cta: profile.intakeAnswers?.q4 || "",
      occasion: profile.intakeAnswers?.q8 || null,
    },
    services,
    sbrData: profile.sbrData,
    buildInstructions: {
      lookKey: profile.selectedLook,
      photoCategory: classifyBusinessType(profile.business_name, profile.intakeAnswers?.q2 || ""),
      notes: "Use generateSiteHTML from lib/studio-engine.ts with this profile data",
    },
    siteHTML,
  };

  return JSON.stringify(pack, null, 2);
}

export function generateDevPackFilename(profile: ClientProfile): string {
  const slug = profile.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  const date = new Date().toISOString().split("T")[0];
  return `BVM_DevPack_${slug}_${date}.json`;
}
