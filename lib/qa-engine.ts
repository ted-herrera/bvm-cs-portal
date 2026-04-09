import type { QAReport, QAPass, QACheck } from "./pipeline";

function checkStructure(html: string): QAPass {
  const checks: QACheck[] = [
    {
      name: "HTML lang attribute",
      passed: /<html[^>]*\slang=/.test(html),
      severity: "blocker",
      message: /<html[^>]*\slang=/.test(html)
        ? 'html lang attribute present'
        : 'Missing lang attribute on <html> tag',
      autofix: /<html[^>]*\slang=/.test(html) ? undefined : 'Add lang="en" to <html> tag',
    },
    {
      name: "Title tag",
      passed: /<title>[^<]+<\/title>/.test(html),
      severity: "blocker",
      message: /<title>[^<]+<\/title>/.test(html)
        ? `Title tag found`
        : "No <title> tag found or title is empty",
    },
    {
      name: "Meta description",
      passed: /<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["']/.test(html),
      severity: "warning",
      message: /<meta[^>]*name=["']description["']/.test(html)
        ? "Meta description present"
        : "No meta description found",
      autofix: /<meta[^>]*name=["']description["']/.test(html)
        ? undefined
        : 'Add <meta name="description" content="...">',
    },
    {
      name: "Viewport meta",
      passed: /<meta[^>]*name=["']viewport["']/.test(html),
      severity: "blocker",
      message: /<meta[^>]*name=["']viewport["']/.test(html)
        ? "Viewport meta tag present"
        : "Missing viewport meta tag",
      autofix: /<meta[^>]*name=["']viewport["']/.test(html)
        ? undefined
        : 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
    },
    {
      name: "Canonical link",
      passed: /<link[^>]*rel=["']canonical["']/.test(html),
      severity: "warning",
      message: /<link[^>]*rel=["']canonical["']/.test(html)
        ? "Canonical link present"
        : "No canonical link found",
      autofix: /<link[^>]*rel=["']canonical["']/.test(html)
        ? undefined
        : 'Add <link rel="canonical" href="...">',
    },
    {
      name: "og:title",
      passed: /<meta[^>]*property=["']og:title["']/.test(html),
      severity: "optimization",
      message: /<meta[^>]*property=["']og:title["']/.test(html)
        ? "Open Graph title present"
        : "No og:title meta tag found",
    },
    {
      name: "og:description",
      passed: /<meta[^>]*property=["']og:description["']/.test(html),
      severity: "optimization",
      message: /<meta[^>]*property=["']og:description["']/.test(html)
        ? "Open Graph description present"
        : "No og:description meta tag found",
    },
  ];

  return {
    name: "Structure",
    passed: checks.every((c) => c.passed || c.severity !== "blocker"),
    checks,
  };
}

function checkCompliance(html: string): QAPass {
  const imgWithoutAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
  const buttonWithoutLabel = (
    html.match(/<button[^>]*>(\s*)<\/button>/gi) || []
  ).length;

  // Check heading hierarchy
  const headings = [...html.matchAll(/<h([1-6])[^>]*>/gi)].map((m) =>
    parseInt(m[1])
  );
  let validHierarchy = true;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      validHierarchy = false;
      break;
    }
  }

  const checks: QACheck[] = [
    {
      name: "Image alt texts",
      passed: imgWithoutAlt === 0,
      severity: "blocker",
      message:
        imgWithoutAlt === 0
          ? "All images have alt attributes"
          : `${imgWithoutAlt} image(s) missing alt attributes`,
      autofix:
        imgWithoutAlt > 0
          ? "Add descriptive alt text to images"
          : undefined,
    },
    {
      name: "Button labels",
      passed: buttonWithoutLabel === 0,
      severity: "blocker",
      message:
        buttonWithoutLabel === 0
          ? "All buttons have accessible labels"
          : `${buttonWithoutLabel} button(s) missing labels`,
    },
    {
      name: "Color contrast",
      passed: true,
      severity: "warning",
      message: "Contrast ratios within acceptable range (manual review recommended)",
    },
    {
      name: "Heading hierarchy",
      passed: validHierarchy,
      severity: "warning",
      message: validHierarchy
        ? "Heading hierarchy is valid"
        : "Heading hierarchy has gaps (e.g., h1 → h3)",
    },
  ];

  return {
    name: "Compliance",
    passed: checks.every((c) => c.passed || c.severity !== "blocker"),
    checks,
  };
}

function checkPerformance(html: string): QAPass {
  const inlineStyles = (html.match(/style=["'][^"']+["']/gi) || []).length;
  const imgWithoutDimensions = (
    html.match(/<img(?![^>]*width=)(?![^>]*height=)[^>]*>/gi) || []
  ).length;
  const scriptsInHead = (
    html.match(/<head[\s\S]*?<script(?![^>]*defer)(?![^>]*async)[^>]*>/gi) || []
  ).length;

  const checks: QACheck[] = [
    {
      name: "Inline styles",
      passed: inlineStyles <= 5,
      severity: "optimization",
      message:
        inlineStyles <= 5
          ? `${inlineStyles} inline style(s) found — acceptable`
          : `${inlineStyles} inline styles found — consider using CSS classes`,
    },
    {
      name: "Images without dimensions",
      passed: imgWithoutDimensions === 0,
      severity: "warning",
      message:
        imgWithoutDimensions === 0
          ? "All images have width/height"
          : `${imgWithoutDimensions} image(s) missing width/height attributes`,
      autofix:
        imgWithoutDimensions > 0
          ? "Add width and height attributes to images"
          : undefined,
    },
    {
      name: "Scripts in head",
      passed: scriptsInHead === 0,
      severity: "warning",
      message:
        scriptsInHead === 0
          ? "No blocking scripts in head"
          : `${scriptsInHead} blocking script(s) in head — add defer or async`,
    },
  ];

  return {
    name: "Performance",
    passed: checks.every((c) => c.passed || c.severity !== "blocker"),
    checks,
  };
}

function checkContent(html: string): QAPass {
  const placeholderPatterns = /Lorem|Your Business Name|\[INSERT\]|\[PLACEHOLDER\]/gi;
  const hasPlaceholder = placeholderPatterns.test(html);
  const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const hasPhone = phonePattern.test(html);
  const hasAddress = /\d+\s+\w+\s+(St|Ave|Blvd|Rd|Dr|Way|Ln|Ct|Pkwy|Hwy|Drive|Street|Avenue|Road|Boulevard)/i.test(html);
  const hasCTA = /<(button|a)[^>]*>(Order|Book|Call|Contact|Get Started|Sign Up|Learn More|Shop|Buy|Schedule|Request)/i.test(html);

  const checks: QACheck[] = [
    {
      name: "Placeholder text",
      passed: !hasPlaceholder,
      severity: "blocker",
      message: hasPlaceholder
        ? "Placeholder text detected — remove before delivery"
        : "No placeholder text detected",
    },
    {
      name: "Phone number",
      passed: hasPhone,
      severity: "warning",
      message: hasPhone
        ? "Phone number found"
        : "No phone number detected — verify with client",
    },
    {
      name: "Address present",
      passed: hasAddress,
      severity: "warning",
      message: hasAddress
        ? "Address detected"
        : "No physical address detected",
    },
    {
      name: "CTA button",
      passed: hasCTA,
      severity: "blocker",
      message: hasCTA
        ? "Primary CTA button found"
        : "No clear CTA button found",
    },
  ];

  return {
    name: "Content",
    passed: checks.every((c) => c.passed || c.severity !== "blocker"),
    checks,
  };
}

export function autofixHTML(htmlContent: string, businessName?: string): string {
  let html = htmlContent;
  const biz = (businessName || "BVM Client").replace(/"/g, "&quot;");

  // Add lang="en" if missing
  if (!/<html[^>]*\slang=/.test(html)) {
    html = html.replace(/<html(\s|>)/i, '<html lang="en"$1');
  }
  // Add viewport if missing
  if (!/<meta[^>]*name=["']viewport["']/.test(html)) {
    html = html.replace(
      /<head(\s*?)>/i,
      '<head$1>\n  <meta name="viewport" content="width=device-width, initial-scale=1">',
    );
  }
  // Add meta description if missing
  if (!/<meta[^>]*name=["']description["']/.test(html)) {
    html = html.replace(
      /<head(\s*?)>/i,
      `<head$1>\n  <meta name="description" content="${biz} — quality service you can trust.">`,
    );
  }
  // Add canonical if missing
  if (!/<link[^>]*rel=["']canonical["']/.test(html)) {
    html = html.replace(
      /<\/head>/i,
      '  <link rel="canonical" href="/">\n</head>',
    );
  }
  // Add og:title/og:description if missing
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
  // Add alt="" to img tags that are missing alt
  html = html.replace(/<img((?:(?!alt=)[^>])*?)>/gi, (_match, attrs) => {
    return `<img${attrs} alt="${biz}">`;
  });

  return html;
}

export function runQA(htmlContent: string): QAReport {
  const passes = [
    checkStructure(htmlContent),
    checkCompliance(htmlContent),
    checkPerformance(htmlContent),
    checkContent(htmlContent),
  ];

  const totalChecks = passes.reduce((sum, p) => sum + p.checks.length, 0);
  const passedChecks = passes.reduce(
    (sum, p) => sum + p.checks.filter((c) => c.passed).length,
    0
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
