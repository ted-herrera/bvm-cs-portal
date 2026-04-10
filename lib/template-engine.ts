// Template engine — loads a locked template from public/templates/ and
// injects BVMSiteVariables into every {{slot}}.

import fs from "fs/promises";
import path from "path";
import type { BVMSiteVariables, BVMTemplate } from "./types/bvm-site-variables";
import { mergeWithDefaults, seoStatusBadge, domainStatusNote } from "./types/bvm-site-variables";

const TEMPLATE_FILES: Record<Exclude<BVMTemplate, "custom">, string> = {
  local: "template-local.html",
  community: "template-community.html",
  premier: "template-premier.html",
};

const templateCache: Map<string, string> = new Map();

async function loadTemplate(template: BVMTemplate): Promise<string> {
  if (template === "custom") {
    // Custom template fallback uses community as a base
    return loadTemplate("community");
  }
  const cached = templateCache.get(template);
  if (cached) return cached;

  const fileName = TEMPLATE_FILES[template];
  const filePath = path.join(process.cwd(), "public", "templates", fileName);
  const raw = await fs.readFile(filePath, "utf-8");
  templateCache.set(template, raw);
  return raw;
}

// Replace all {{key}}, {{services[n].field}}, and {{faqs[n].field}} slots.
export function injectVariables(template: string, vars: BVMSiteVariables): string {
  let out = template;

  // Arrays — services and faqs (must run before simple replacements to
  // avoid eating the outer slot before we get to the nested one).
  for (let i = 0; i < vars.services.length; i++) {
    const s = vars.services[i];
    out = out
      .replaceAll(`{{services[${i}].name}}`, s.name)
      .replaceAll(`{{services[${i}].description}}`, s.description)
      .replaceAll(`{{services[${i}].photoUrl}}`, s.photoUrl);
  }
  for (let i = 0; i < vars.faqs.length; i++) {
    const f = vars.faqs[i];
    out = out
      .replaceAll(`{{faqs[${i}].question}}`, f.question)
      .replaceAll(`{{faqs[${i}].answer}}`, f.answer);
  }

  // Scalar fields
  const scalars: Record<string, string> = {
    businessName: vars.businessName,
    ownerName: vars.ownerName,
    phone: vars.phone,
    email: vars.email,
    address: vars.address,
    city: vars.city,
    state: vars.state,
    zip: vars.zip,
    yearsInBusiness: vars.yearsInBusiness,
    tagline: vars.tagline,
    heroHeadline: vars.heroHeadline,
    cta: vars.cta,
    primaryColor: vars.primaryColor,
    secondaryColor: vars.secondaryColor,
    accentColor: vars.accentColor,
    aboutText: vars.aboutText,
    heroPhotoUrl: vars.heroPhotoUrl,
    template: vars.template,
    businessType: vars.businessType,
    subType: vars.subType,
    domain: vars.domain,
    domainStatus: vars.domainStatus,
    seoStatus: vars.seoStatus,
    seoStatusBadge: seoStatusBadge(vars.seoStatus),
    domainStatusNote: domainStatusNote(vars.domainStatus, vars.domain),
  };

  for (const [key, value] of Object.entries(scalars)) {
    out = out.replaceAll(`{{${key}}}`, value || "");
  }

  return out;
}

export async function renderTemplate(
  input: Partial<BVMSiteVariables>,
): Promise<{ html: string; variables: BVMSiteVariables }> {
  const variables = mergeWithDefaults(input);
  const template = await loadTemplate(variables.template);
  const html = injectVariables(template, variables);
  return { html, variables };
}
