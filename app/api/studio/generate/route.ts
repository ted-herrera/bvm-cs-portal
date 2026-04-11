import { NextResponse } from "next/server";
import type { BVMSiteVariables, BVMTemplate } from "@/lib/types/bvm-site-variables";
import { renderTemplate } from "@/lib/template-engine";
import { getClient } from "@/lib/mock-data";
import { getBuildByClientId } from "@/lib/store";
import {
  classifyBusinessType,
  detectSubType,
  getServiceSuggestions,
  getCTASuggestion,
} from "@/lib/business-classifier";

function getDefaultTemplate(subType: string, businessType: string): BVMTemplate {
  const lower = `${subType} ${businessType}`.toLowerCase();
  if (/restaurant|food|taco|burger|pizza|cafe|bar|grill|bakery/i.test(lower)) return "local";
  if (/roofing|construction|plumbing|hvac|electric|auto|repair|clean/i.test(lower)) return "premier";
  return "community";
}

// POST /api/studio/generate
// Accepts either full BVMSiteVariables or { clientId, template? }
// Returns: { html, variables }

async function buildVariablesFromClientId(
  clientId: string,
  override?: Partial<BVMSiteVariables>,
): Promise<Partial<BVMSiteVariables> | null> {
  const client = await getClient(clientId);
  if (!client) return null;

  const build = await getBuildByClientId(clientId);
  const sbr = (client.sbrData || null) as Record<string, unknown> | null;
  const q3 = client.intakeAnswers?.q3 || "";
  const q2 = client.intakeAnswers?.q2 || "";
  const businessType = classifyBusinessType(client.business_name, q2);
  const subType = detectSubType(client.business_name, q2);

  const services = q3
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const serviceList = services.length > 0 ? services : getServiceSuggestions(businessType, subType);

  const tagline =
    (sbr?.suggestedTagline as string) ||
    (sbr?.tagline as string) ||
    client.intakeAnswers?.q8 ||
    "";

  const defaultTemplate = getDefaultTemplate(subType, businessType);
  const templateKey: BVMTemplate =
    (override?.template as BVMTemplate) ||
    (client.selectedLook === "warm_bold"
      ? "local"
      : client.selectedLook === "bold_modern"
        ? "premier"
        : client.selectedLook === "professional"
          ? "community"
          : defaultTemplate);

  const base: Partial<BVMSiteVariables> = {
    businessName: client.business_name,
    ownerName: client.contact_name || "",
    phone: client.phone || "",
    email: client.contact_email || "",
    address: (client.intakeAnswers?.q7 || "").split(",")[1]?.trim() || "",
    city: client.city || "",
    state: "",
    zip: client.zip || "",
    yearsInBusiness: "15+",
    tagline,
    heroHeadline: tagline || `Welcome to ${client.business_name}`,
    cta: client.intakeAnswers?.q4 || getCTASuggestion(businessType, subType),
    primaryColor:
      templateKey === "premier" ? "#0a0a0a" : templateKey === "local" ? "#2d5a27" : "#1B2A4A",
    secondaryColor:
      templateKey === "premier"
        ? "#C9A84C"
        : templateKey === "local"
          ? "#f5f0e8"
          : "#c0392b",
    services: serviceList.slice(0, 3).map((name, i) => ({
      name,
      description: `${name} — delivered with the quality and care ${client.business_name} is known for.`,
      photoUrl: `https://images.unsplash.com/photo-${
        ["1497366216548-37526070297c", "1497366754035-f200968a6e72", "1560066984-138dadb4c035"][i % 3]
      }?w=800`,
    })),
    aboutText:
      q2 ||
      `${client.business_name} has served ${client.city || "our community"} with dedication and care.`,
    heroPhotoUrl:
      build?.generatedSiteHTML && build.generatedSiteHTML.includes("http")
        ? ""
        : "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600",
    template: templateKey,
    businessType,
    subType,
    domain: "",
    domainStatus: "pending",
    seoStatus: "not-submitted",
  };

  return { ...base, ...override };
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clientId?: string;
    template?: BVMTemplate;
    variables?: Partial<BVMSiteVariables>;
  };

  let input: Partial<BVMSiteVariables> | null = null;

  if (body.variables) {
    // Full variables provided
    input = body.variables;
    if (body.template) input.template = body.template;
  } else if (body.clientId) {
    input = await buildVariablesFromClientId(body.clientId, body.template ? { template: body.template } : undefined);
    if (!input) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  } else {
    return NextResponse.json(
      { error: "variables or clientId required" },
      { status: 400 },
    );
  }

  try {
    const { html, variables } = await renderTemplate(input);
    return NextResponse.json({ html, variables });
  } catch (err) {
    console.error("[studio/generate] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}

// GET /api/studio/generate?clientId=...&template=local
// Returns HTML directly (for iframe srcDoc, debugging, previews)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const template = searchParams.get("template") as BVMTemplate | null;

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const input = await buildVariablesFromClientId(
    clientId,
    template ? { template } : undefined,
  );
  if (!input) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const { html } = await renderTemplate(input);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[studio/generate GET] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
