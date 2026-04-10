import type { QAReport, QAPass, QACheck } from "./pipeline";
import type { BVMSiteVariables } from "./types/bvm-site-variables";

// ─── Expected section order by template ──────────────────────────────
const EXPECTED_SECTIONS: Record<string, string[]> = {
  local: [
    "nav.main",
    ".ticker",
    ".hero",
    ".about",
    ".why",
    ".services",
    ".reviews",
    ".faq",
    ".cta-banner",
    ".contact",
    "footer",
  ],
  community: [
    "nav.main",
    ".ticker",
    ".hero",
    ".about",
    ".why",
    ".services",
    ".reviews",
    ".faq",
    ".cta-banner",
    ".contact",
    "footer",
  ],
  premier: [
    "nav.main",
    ".ticker",
    ".hero",
    ".about",
    ".why",
    ".services",
    ".reviews",
    ".faq",
    ".cta-banner",
    ".contact",
    "footer",
  ],
};

function findSectionIndex(html: string, selector: string): number {
  // Match CSS class selectors as "class=...selector..." and element selectors
  // by tag name at position.
  if (selector.startsWith(".")) {
    const cls = selector.slice(1);
    const re = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`);
    const m = re.exec(html);
    return m ? m.index : -1;
  }
  const re = new RegExp(`<${selector}\\b`, "i");
  const m = re.exec(html);
  return m ? m.index : -1;
}

// ─── Pass 1: Template structure ──────────────────────────────────────
function checkTemplateStructure(html: string, template: string): QAPass {
  const expected = EXPECTED_SECTIONS[template] || EXPECTED_SECTIONS.community;
  const checks: QACheck[] = [];
  let lastIdx = -1;
  let lastName = "start";
  for (const sel of expected) {
    const idx = findSectionIndex(html, sel);
    if (idx === -1) {
      checks.push({
        name: `Section: ${sel}`,
        passed: false,
        severity: "blocker",
        message: `Missing ${sel} section — expected after ${lastName} section`,
        autofix: `Add the ${sel} section to the template output.`,
      });
      continue;
    }
    if (idx < lastIdx) {
      checks.push({
        name: `Section: ${sel}`,
        passed: false,
        severity: "blocker",
        message: `${sel} section out of order — found before ${lastName}`,
        autofix: `Move ${sel} to appear after ${lastName}.`,
      });
    } else {
      checks.push({
        name: `Section: ${sel}`,
        passed: true,
        severity: "blocker",
        message: `${sel} present and in order`,
      });
    }
    lastIdx = idx;
    lastName = sel;
  }
  return {
    name: "Template Structure",
    passed: checks.every((c) => c.passed),
    checks,
  };
}

// ─── Pass 2: Variable completeness ───────────────────────────────────
function checkVariableCompleteness(
  html: string,
  variables: BVMSiteVariables | null,
): QAPass {
  const checks: QACheck[] = [];

  // Any leftover {{...}} slots are a critical issue
  const leftover = html.match(/\{\{[^}]+\}\}/g);
  if (leftover && leftover.length > 0) {
    const sample = leftover.slice(0, 5).join(", ");
    checks.push({
      name: "Placeholder slots",
      passed: false,
      severity: "blocker",
      message: `${leftover.length} unresolved {{variable}} slot(s) found: ${sample}${leftover.length > 5 ? "…" : ""}`,
      autofix: "Re-render the template with full variables via /api/studio/generate.",
    });
  } else {
    checks.push({
      name: "Placeholder slots",
      passed: true,
      severity: "blocker",
      message: "No unresolved {{variable}} slots remain",
    });
  }

  if (variables) {
    // Required field presence checks
    const requiredFields: Array<{ key: keyof BVMSiteVariables; label: string }> = [
      { key: "businessName", label: "Business name" },
      { key: "phone", label: "Phone number" },
      { key: "city", label: "City" },
      { key: "tagline", label: "Tagline" },
      { key: "heroHeadline", label: "Hero headline" },
      { key: "cta", label: "Primary CTA" },
      { key: "aboutText", label: "About text" },
      { key: "heroPhotoUrl", label: "Hero photo URL" },
    ];
    for (const f of requiredFields) {
      const value = (variables[f.key] as string) || "";
      const present = value.trim().length > 0;
      checks.push({
        name: f.label,
        passed: present,
        severity: "blocker",
        message: present
          ? `${f.label}: ${value.slice(0, 60)}`
          : `${f.label} is empty — brief required`,
        autofix: present ? undefined : `Set ${String(f.key)} in variables.json.`,
      });
    }

    // Phone format check
    const phoneOk = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(variables.phone);
    checks.push({
      name: "Phone format",
      passed: phoneOk,
      severity: "warning",
      message: phoneOk
        ? "Phone number has valid format (XXX) XXX-XXXX"
        : `phone number missing — expected format (XXX) XXX-XXXX (got: "${variables.phone}")`,
      autofix: phoneOk ? undefined : "Update phone to (XXX) XXX-XXXX format.",
    });

    // Exactly 3 services with names, descriptions
    for (let i = 0; i < 3; i++) {
      const s = variables.services[i];
      if (!s) {
        checks.push({
          name: `Service ${i + 1}`,
          passed: false,
          severity: "blocker",
          message: `service[${i}] missing — templates require exactly 3 services`,
          autofix: `Add a service to variables.json services[${i}].`,
        });
        continue;
      }
      if (!s.name || !s.name.trim()) {
        checks.push({
          name: `Service ${i + 1} name`,
          passed: false,
          severity: "blocker",
          message: `service[${i}].name is empty`,
          autofix: `Set services[${i}].name in variables.json.`,
        });
      }
      if (!s.description || s.description.length < 20) {
        checks.push({
          name: `Service ${i + 1} description`,
          passed: false,
          severity: "warning",
          message: `service[${i}].description is empty or too short — brief shows '${s.name}'`,
          autofix: `Write a 20+ char description for services[${i}].`,
        });
      }
      if (!s.photoUrl || !s.photoUrl.startsWith("http")) {
        checks.push({
          name: `Service ${i + 1} photo`,
          passed: false,
          severity: "blocker",
          message: `service[${i}].photoUrl is empty or invalid`,
          autofix: `Set a valid https URL for services[${i}].photoUrl.`,
        });
      }
    }

    // Exactly 5 FAQs
    if (variables.faqs.length !== 5) {
      checks.push({
        name: "FAQ count",
        passed: false,
        severity: "warning",
        message: `Expected exactly 5 FAQs, found ${variables.faqs.length}`,
        autofix: "Pad or trim faqs[] to exactly 5 entries.",
      });
    }
  }

  return {
    name: "Variable Completeness",
    passed: checks.every((c) => c.passed || c.severity !== "blocker"),
    checks,
  };
}

// ─── Pass 3: Asset validation (sync format checks) ──────────────────
function checkAssets(html: string, variables: BVMSiteVariables | null): QAPass {
  const checks: QACheck[] = [];

  // Hero photo
  if (variables) {
    const hero = variables.heroPhotoUrl;
    const heroOk = !!hero && /^https?:\/\//.test(hero);
    checks.push({
      name: "heroPhotoUrl",
      passed: heroOk,
      severity: "blocker",
      message: heroOk
        ? "heroPhotoUrl is a valid URL"
        : "heroPhotoUrl returning 404 — replace with valid URL",
      autofix: heroOk ? undefined : "Set heroPhotoUrl to a working https URL.",
    });

    // Service photos
    for (let i = 0; i < variables.services.length; i++) {
      const s = variables.services[i];
      const ok = !!s.photoUrl && /^https?:\/\//.test(s.photoUrl);
      checks.push({
        name: `service[${i}].photoUrl`,
        passed: ok,
        severity: "warning",
        message: ok
          ? `service[${i}].photoUrl loads`
          : `service[${i}].photoUrl not loading`,
        autofix: ok ? undefined : `Update services[${i}].photoUrl to a valid URL.`,
      });
    }
  }

  // All img tags should have src
  const imgs = html.match(/<img[^>]*>/gi) || [];
  const brokenImgs = imgs.filter((tag) => !/src=["']https?:\/\//.test(tag));
  checks.push({
    name: "Image src URLs",
    passed: brokenImgs.length === 0,
    severity: "warning",
    message:
      brokenImgs.length === 0
        ? `All ${imgs.length} img tags have absolute src URLs`
        : `${brokenImgs.length} img tag(s) missing or using relative src`,
    autofix:
      brokenImgs.length === 0
        ? undefined
        : "Use absolute https URLs for all images.",
  });

  // Google Maps iframe
  const hasValidMap = /<iframe[^>]*src=["']https:\/\/www\.google\.com\/maps/.test(html);
  checks.push({
    name: "Google Maps iframe",
    passed: hasValidMap,
    severity: "warning",
    message: hasValidMap
      ? "Google Maps iframe src is valid"
      : "Google Maps iframe missing or invalid src",
    autofix: hasValidMap ? undefined : "Add <iframe src=\"https://www.google.com/maps?...\">.",
  });

  return {
    name: "Asset Validation",
    passed: checks.every((c) => c.passed || c.severity !== "blocker"),
    checks,
  };
}

// ─── Pass 4: BVM compliance ─────────────────────────────────────────
function checkBvmCompliance(
  html: string,
  variables: BVMSiteVariables | null,
): QAPass {
  const checks: QACheck[] = [];

  const poweredBy = html.includes("Powered by BVM Digital");
  checks.push({
    name: "Powered by BVM footer",
    passed: poweredBy,
    severity: "blocker",
    message: poweredBy
      ? `"Powered by BVM Digital" footer line present`
      : `Missing "Powered by BVM Digital · Bruno AI · © 2026" footer`,
    autofix: poweredBy ? undefined : "Add the Powered by line to the footer bottom bar.",
  });

  const hasSeoBadge = /SEO\s+(Pending|Submitted|Indexed)|Google\s+(Submitted|Indexed)/i.test(html);
  checks.push({
    name: "SEO status badge",
    passed: hasSeoBadge,
    severity: "warning",
    message: hasSeoBadge
      ? "SEO status badge present in footer"
      : "SEO status badge missing — expected ⚪/🟡/🟢 pill",
    autofix: hasSeoBadge ? undefined : "Add {{seoStatusBadge}} slot to the footer bottom.",
  });

  if (variables && variables.domainStatus === "pending") {
    const hasDomainNote =
      html.includes("Domain pending") ||
      html.includes("domainStatusNote") ||
      html.includes("Live at");
    checks.push({
      name: "Domain status note",
      passed: hasDomainNote,
      severity: "warning",
      message: hasDomainNote
        ? "Domain status note present"
        : "Domain status is pending but no note shown",
      autofix: hasDomainNote ? undefined : "Add a domain status note near the footer.",
    });
  }

  const viewport = /<meta[^>]*name=["']viewport["']/.test(html);
  checks.push({
    name: "Mobile viewport meta",
    passed: viewport,
    severity: "blocker",
    message: viewport ? "Viewport meta tag present" : "Missing viewport meta tag",
    autofix: viewport
      ? undefined
      : 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
  });

  const ogTitle = /<meta[^>]*property=["']og:title["']/.test(html);
  const ogDesc = /<meta[^>]*property=["']og:description["']/.test(html);
  checks.push({
    name: "Open Graph tags",
    passed: ogTitle && ogDesc,
    severity: "warning",
    message:
      ogTitle && ogDesc
        ? "og:title and og:description present"
        : "Missing Open Graph tags (og:title and/or og:description)",
    autofix:
      ogTitle && ogDesc
        ? undefined
        : "Add og:title and og:description meta tags to <head>.",
  });

  const schemaLocal = /"@type"\s*:\s*"LocalBusiness"/.test(html);
  checks.push({
    name: "LocalBusiness schema",
    passed: schemaLocal,
    severity: "warning",
    message: schemaLocal
      ? "LocalBusiness schema markup present"
      : "Missing LocalBusiness schema markup",
    autofix: schemaLocal
      ? undefined
      : 'Add <script type="application/ld+json"> with LocalBusiness schema.',
  });

  return {
    name: "BVM Compliance",
    passed: checks.every((c) => c.passed || c.severity !== "blocker"),
    checks,
  };
}

// ─── Exports ─────────────────────────────────────────────────────────

export function autofixHTML(htmlContent: string, businessName?: string): string {
  let html = htmlContent;
  const biz = (businessName || "BVM Client").replace(/"/g, "&quot;");

  if (!/<html[^>]*\slang=/.test(html)) {
    html = html.replace(/<html(\s|>)/i, '<html lang="en"$1');
  }
  if (!/<meta[^>]*name=["']viewport["']/.test(html)) {
    html = html.replace(
      /<head(\s*?)>/i,
      '<head$1>\n  <meta name="viewport" content="width=device-width, initial-scale=1">',
    );
  }
  if (!/<meta[^>]*name=["']description["']/.test(html)) {
    html = html.replace(
      /<head(\s*?)>/i,
      `<head$1>\n  <meta name="description" content="${biz} — quality service you can trust.">`,
    );
  }
  if (!/<link[^>]*rel=["']canonical["']/.test(html)) {
    html = html.replace(
      /<\/head>/i,
      '  <link rel="canonical" href="/">\n</head>',
    );
  }
  if (!/<meta[^>]*property=["']og:title["']/.test(html)) {
    html = html.replace(
      /<\/head>/i,
      `  <meta property="og:title" content="${biz}">\n</head>`,
    );
  }
  if (!/<meta[^>]*property=["']og:description["']/.test(html)) {
    html = html.replace(
      /<\/head>/i,
      `  <meta property="og:description" content="${biz} — proudly serving the community.">\n</head>`,
    );
  }
  html = html.replace(/<img((?:(?!alt=)[^>])*?)>/gi, (_match, attrs) => {
    return `<img${attrs} alt="${biz}">`;
  });

  return html;
}

export function runQA(
  htmlContent: string,
  variables?: BVMSiteVariables | null,
): QAReport {
  const template = variables?.template || detectTemplateFromHtml(htmlContent);
  const passes = [
    checkTemplateStructure(htmlContent, template),
    checkVariableCompleteness(htmlContent, variables || null),
    checkAssets(htmlContent, variables || null),
    checkBvmCompliance(htmlContent, variables || null),
  ];

  const totalChecks = passes.reduce((sum, p) => sum + p.checks.length, 0);
  const passedChecks = passes.reduce(
    (sum, p) => sum + p.checks.filter((c) => c.passed).length,
    0,
  );
  const score = Math.round((passedChecks / totalChecks) * 100);
  const passed = passes.every((p) => p.passed);

  return {
    passed,
    score,
    passes,
    runAt: new Date().toISOString(),
  };
}

function detectTemplateFromHtml(html: string): string {
  if (html.includes("Playfair Display") || html.includes("#C9A84C")) return "premier";
  if (html.includes("Montserrat") || html.includes("#1B2A4A")) return "community";
  if (html.includes("Lora") || html.includes("#2d5a27")) return "local";
  return "community";
}
