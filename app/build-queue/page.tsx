"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import type { QAReport } from "@/lib/pipeline";

// ─── HubSpot palette (exact) ──────────────────────────────────────────
const COLORS = {
  pageBg: "#f5f8fa",
  headerBar: "#2d3e50",
  headerText: "#ffffff",
  cardBg: "#ffffff",
  cardBorder: "#e7edf3",
  sectionHeader: "#2d3e50",
  accent: "#0091ae",
  action: "#ff7a59",
  success: "#00bda5",
  body: "#1f2937",
  secondary: "#516f90",
  sidebarBg: "#f5f8fa",
  danger: "#ff5c77",
  warn: "#f59e0b",
};

const DEV_USERNAME = "dev";

// ─── Line-numbered HTML editor ──────────────────────────────────────────
function HtmlEditor({
  value,
  onChange,
  placeholder,
  minHeight = 260,
  errorLines = [] as number[],
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  errorLines?: number[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  const lines = value.split("\n");
  const lineCount = Math.max(lines.length, 1);

  function syncScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function jumpToLine(lineNum: number) {
    const ta = textareaRef.current;
    if (!ta) return;
    setHighlightedLine(lineNum);
    // Calculate character offset for the target line
    let offset = 0;
    for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for \n
    }
    ta.focus();
    ta.setSelectionRange(offset, offset + (lines[lineNum - 1]?.length || 0));
    // Scroll the line into view
    const lineHeight = 18;
    ta.scrollTop = Math.max(0, (lineNum - 5) * lineHeight);
    setTimeout(() => setHighlightedLine(null), 2000);
  }

  const errorLineSet = new Set(errorLines);

  return (
    <div
      style={{
        display: "flex",
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 8,
        overflow: "hidden",
        minHeight,
        background: "#fff",
      }}
    >
      {/* Gutter */}
      <div
        ref={gutterRef}
        style={{
          width: 48,
          background: COLORS.pageBg,
          borderRight: `1px solid ${COLORS.cardBorder}`,
          overflow: "hidden",
          paddingTop: 14,
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => {
          const ln = i + 1;
          const isError = errorLineSet.has(ln);
          const isHighlighted = highlightedLine === ln;
          return (
            <div
              key={ln}
              onClick={isError ? () => jumpToLine(ln) : undefined}
              style={{
                height: 18,
                lineHeight: "18px",
                fontSize: 11,
                fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                textAlign: "right",
                paddingRight: 8,
                color: isError ? COLORS.danger : COLORS.secondary,
                fontWeight: isError ? 700 : 400,
                cursor: isError ? "pointer" : "default",
                background: isHighlighted
                  ? "rgba(245, 200, 66, 0.35)"
                  : isError
                    ? "rgba(255, 92, 119, 0.08)"
                    : "transparent",
                transition: "background 0.3s",
              }}
            >
              {ln}
            </div>
          );
        })}
      </div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        style={{
          flex: 1,
          minHeight,
          background: "#fff",
          border: "none",
          padding: "14px 16px",
          fontSize: 12,
          fontFamily: 'Menlo, Consolas, "Courier New", monospace',
          lineHeight: "18px",
          color: COLORS.body,
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
          whiteSpace: "pre",
          overflowWrap: "normal",
          overflowX: "auto",
        }}
      />
    </div>
  );
}

interface BuildRecord {
  id: string;
  clientId: string;
  businessName: string;
  city: string;
  zip: string;
  services: string[];
  look: string;
  tagline: string;
  cta: string;
  sbrData: Record<string, unknown> | null;
  generatedSiteHTML: string;
  status: "unassigned" | "claimed" | "ready-for-qa" | "live";
  assignedDev: string | null;
  createdAt: string;
  claimedAt: string | null;
  readyAt: string | null;
  liveAt: string | null;
  liveUrl: string | null;
  qaReport: QAReport | null;
}

interface BuildMessage {
  id: string;
  buildId: string;
  from: "rep" | "dev";
  text: string;
  timestamp: string;
}

type StepKey = 1 | 2 | 3 | 4;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function hoursSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
}

function severityStyle(sev: string): { bg: string; color: string; label: string } {
  if (sev === "blocker")
    return { bg: "#ffe5e5", color: COLORS.danger, label: "CRITICAL" };
  if (sev === "warning")
    return { bg: "#fef3e0", color: COLORS.warn, label: "WARNING" };
  return { bg: "#e0f4f8", color: COLORS.accent, label: "INFO" };
}

function scoreColor(score: number): string {
  if (score === 100) return "#F5C842";
  if (score >= 90) return COLORS.accent;
  if (score >= 70) return COLORS.success;
  if (score >= 50) return COLORS.warn;
  return COLORS.danger;
}

// ─── Dev pack fallback builders (used client-side when API 404s) ──────
interface BuildLike {
  id: string;
  clientId: string;
  businessName: string;
  city: string;
  zip: string;
  services: string[];
  look: string;
  tagline: string;
  cta: string;
}

function buildFallbackIndexHtml(b: BuildLike): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(b.businessName)}</title>
  <meta name="description" content="${esc(b.businessName)} — ${esc(b.tagline || "")}" />
  <link rel="canonical" href="/" />
  <meta property="og:title" content="${esc(b.businessName)}" />
  <meta property="og:description" content="${esc(b.tagline || "")}" />
  <style>
    body { font-family: -apple-system, sans-serif; margin: 0; color: #1f2937; background: #f5f8fa; }
    .hero { background: #1B2A4A; color: #fff; padding: 80px 24px; text-align: center; }
    .hero h1 { font-size: 40px; margin: 0 0 12px; }
    .hero p { font-size: 18px; opacity: 0.85; margin: 0 0 24px; }
    .cta { display: inline-block; background: #F5C842; color: #1B2A4A; padding: 14px 32px; text-decoration: none; font-weight: 700; border-radius: 8px; }
    .services { max-width: 1100px; margin: 0 auto; padding: 60px 24px; }
    .services h2 { text-align: center; margin: 0 0 32px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .card { background: #fff; border: 1px solid #e7edf3; padding: 24px; border-radius: 10px; }
    .card h3 { margin: 0 0 8px; color: #1B2A4A; }
    footer { text-align: center; padding: 30px 24px; background: #1B2A4A; color: rgba(255,255,255,0.7); font-size: 12px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <section class="hero">
    <h1>${esc(b.businessName)}</h1>
    <p>${esc(b.tagline || "")}</p>
    <a href="#contact" class="cta">${esc(b.cta || "Contact Us")}</a>
  </section>
  <section class="services">
    <h2>Our Services</h2>
    <div class="grid">
      ${b.services.map((s) => `<div class="card"><h3>${esc(s)}</h3><p>Quality ${esc(s.toLowerCase())} proudly served in ${esc(b.city)}.</p></div>`).join("\n      ")}
    </div>
  </section>
  <footer>
    ${esc(b.businessName)} · ${esc(b.city)} ${esc(b.zip)} · Powered by BVM Digital
  </footer>
</body>
</html>
`;
}

function buildFallbackBriefMd(b: BuildLike): string {
  return `# ${b.businessName} — Build Brief

## Business
- **Name:** ${b.businessName}
- **Location:** ${b.city}${b.zip ? `, ${b.zip}` : ""}
- **Look:** ${b.look}
- **Tagline:** ${b.tagline || "—"}
- **CTA:** ${b.cta}

## Services
${b.services.length > 0 ? b.services.map((s) => `- ${s}`).join("\n") : "- (none)"}

---
Generated by BVM Design Center (client-side fallback — real build record not yet in store).
`;
}

function buildFallbackQaChecklistMd(b: BuildLike): string {
  return `# QA Checklist — ${b.businessName}

Run through every item before re-uploading to the QA tool.

## Structure
- [ ] HTML has \`lang="en"\` on the \`<html>\` tag
- [ ] \`<title>\` tag is populated with business name
- [ ] Meta description is present
- [ ] Viewport meta tag is present
- [ ] Canonical link tag added
- [ ] Open Graph og:title and og:description present

## Compliance
- [ ] Every \`<img>\` has a descriptive \`alt=\` attribute
- [ ] All buttons have visible or \`aria-label\` text
- [ ] Heading hierarchy is valid (h1 → h2 → h3)
- [ ] Color contrast meets WCAG AA

## Content
- [ ] Business name "${b.businessName}" appears prominently in hero
- [ ] CTA button matches the brief ("${b.cta}")
- [ ] No placeholder text (Lorem, [INSERT], etc.)
- [ ] All listed services are represented: ${b.services.join(", ") || "(none)"}

## Performance
- [ ] Images have width/height attributes
- [ ] No blocking scripts in \`<head>\`
- [ ] Inline styles kept under 5

---
Once every box is checked, re-upload \`index.html\` to the QA engine, confirm the score is ≥70, then mark the build ready.
`;
}

function buildFallbackReadmeMd(b: BuildLike): string {
  return `# ${b.businessName} — BVM Dev Pack

## Files
- \`index.html\` — starter HTML for this build (use as a reference, not the final output)
- \`brief.md\` — client brief
- \`qa-checklist.md\` — pre-build QA checklist
- \`README.md\` — this file

## Workflow
1. Review \`brief.md\` and confirm all business details match.
2. Use \`index.html\` as a starting point — customize to match the brief's look (${b.look}).
3. Run through \`qa-checklist.md\` before uploading to the QA engine.
4. Upload the finished \`index.html\` to the QA engine in the build queue.
5. When QA score is ≥ 70, click **MARK READY FOR QA**.
6. Deploy to Vercel or Netlify, paste the live URL, and click **MARK BUILD COMPLETE**.

Happy shipping.
`;
}

// ─── Mock builds shown immediately on load ────────────────────────────
// These populate the left column without waiting for the API so the dev
// always sees something to click. Real builds from /api/build/list are
// merged in on top, with mock IDs preserved.
function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

const MOCK_BUILDS: BuildRecord[] = [
  {
    id: "mock-rosalinda",
    clientId: "client-001",
    businessName: "Rosalinda's Tacos",
    city: "Tulsa, OK",
    zip: "74103",
    services: ["Dine-In", "Takeout", "Catering"],
    look: "warm_bold",
    tagline: "Tulsa's Favorite Street Tacos",
    cta: "Order Now",
    sbrData: null,
    generatedSiteHTML: "",
    status: "unassigned",
    assignedDev: null,
    createdAt: daysAgoIso(2),
    claimedAt: null,
    readyAt: null,
    liveAt: null,
    liveUrl: null,
    qaReport: null,
  },
  {
    id: "mock-peak-dental",
    clientId: "client-002",
    businessName: "Peak Dental",
    city: "Denver, CO",
    zip: "80202",
    services: ["Cleanings", "Whitening", "Implants"],
    look: "professional",
    tagline: "Denver's Trusted Family Dentist",
    cta: "Book Now",
    sbrData: { featured_placement: true },
    generatedSiteHTML: "",
    status: "unassigned",
    assignedDev: null,
    createdAt: daysAgoIso(4),
    claimedAt: null,
    readyAt: null,
    liveAt: null,
    liveUrl: null,
    qaReport: null,
  },
  {
    id: "mock-iron-ridge",
    clientId: "client-003",
    businessName: "Iron Ridge Roofing",
    city: "Nashville, TN",
    zip: "37201",
    services: ["Roof Repair", "New Roofs", "Storm Damage"],
    look: "bold_modern",
    tagline: "Nashville's Storm-Ready Roofers",
    cta: "Get Free Estimate",
    sbrData: null,
    generatedSiteHTML: "",
    status: "unassigned",
    assignedDev: null,
    createdAt: daysAgoIso(1),
    claimedAt: null,
    readyAt: null,
    liveAt: null,
    liveUrl: null,
    qaReport: {
      passed: true,
      score: 94,
      runAt: new Date().toISOString(),
      passes: [],
    },
  },
  {
    id: "mock-hanks",
    clientId: "client-mock-hanks",
    businessName: "Hanks Hamburgers",
    city: "Tulsa, OK",
    zip: "74104",
    services: ["Burgers", "Shakes", "Catering"],
    look: "professional",
    tagline: "The Burger Tulsa Grew Up On",
    cta: "Order Now",
    sbrData: { featured_placement: true },
    generatedSiteHTML: "",
    status: "unassigned",
    assignedDev: null,
    createdAt: daysAgoIso(6),
    claimedAt: null,
    readyAt: null,
    liveAt: null,
    liveUrl: null,
    qaReport: null,
  },
];

function mergeBuilds(real: BuildRecord[]): BuildRecord[] {
  const mockIds = new Set(MOCK_BUILDS.map((m) => m.id));
  return [...MOCK_BUILDS, ...real.filter((r) => !mockIds.has(r.id))];
}

export default function BuildQueuePage() {
  const router = useRouter();
  const [builds, setBuilds] = useState<BuildRecord[]>(MOCK_BUILDS);
  const [loading, setLoading] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<BuildRecord | null>(
    MOCK_BUILDS[0],
  );
  const [toast, setToast] = useState("");

  // 4-step flow — start on Step 1 so QA engine is immediately visible
  const [step, setStep] = useState<StepKey>(1);

  // Step 1: submit HTML
  const [htmlInput, setHtmlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: QA results
  const [qaReport, setQaReport] = useState<QAReport | null>(null);
  const [qaRunning, setQaRunning] = useState(false);
  const [autofixing, setAutofixing] = useState(false);
  const [fixesApplied, setFixesApplied] = useState<number | null>(null);

  // Step 3: resubmit
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [resubmitHtml, setResubmitHtml] = useState("");
  const [resubmitReport, setResubmitReport] = useState<QAReport | null>(null);

  // Step 4: final verification
  const [liveUrlInput, setLiveUrlInput] = useState("");
  const [liveUrlVerified, setLiveUrlVerified] = useState<null | boolean>(null);
  const [verifyingLive, setVerifyingLive] = useState(false);
  const [buildCompleted, setBuildCompleted] = useState(false);

  // Error lines from QA for editor highlighting
  function getErrorLines(html: string, report: QAReport | null): number[] {
    if (!report || !html) return [];
    const lines = html.split("\n");
    const errorLines: number[] = [];
    for (const pass of report.passes) {
      for (const check of pass.checks) {
        if (check.passed) continue;
        // Try to find relevant lines based on check name
        const patterns: string[] = [];
        if (/alt text/i.test(check.name)) patterns.push("<img ");
        if (/canonical/i.test(check.name)) patterns.push("<link ");
        if (/og:/i.test(check.name)) patterns.push("og:");
        if (/title/i.test(check.name)) patterns.push("<title");
        if (/meta desc/i.test(check.name)) patterns.push("meta ");
        if (/heading/i.test(check.name)) patterns.push(/<h[1-6]/i.source);
        if (/contrast|color/i.test(check.name)) patterns.push("color");
        if (/placeholder/i.test(check.name)) patterns.push("Lorem");
        if (patterns.length === 0) continue;
        for (let i = 0; i < lines.length; i++) {
          for (const pat of patterns) {
            if (lines[i].toLowerCase().includes(pat.toLowerCase())) {
              errorLines.push(i + 1);
            }
          }
        }
      }
    }
    return [...new Set(errorLines)];
  }

  // Communications
  const [messages, setMessages] = useState<BuildMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);

  const loadBuilds = useCallback(async () => {
    try {
      const res = await fetch("/api/build/list");
      const data = (await res.json()) as { builds?: BuildRecord[] };
      setBuilds(mergeBuilds(data.builds || []));
    } catch {
      /* ignore — keep mock builds visible */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBuilds();
    const i = setInterval(loadBuilds, 30000);
    return () => clearInterval(i);
  }, [loadBuilds]);

  const loadMessages = useCallback(async (buildId: string) => {
    try {
      const res = await fetch(`/api/build/messages?buildId=${encodeURIComponent(buildId)}`);
      const data = (await res.json()) as { messages?: BuildMessage[] };
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  }, []);

  function selectBuild(b: BuildRecord) {
    setSelectedBuild(b);
    setStep(1);
    setHtmlInput(b.generatedSiteHTML || "");
    setQaReport(null);
    setResubmitHtml("");
    setResubmitReport(null);
    setPreviousScore(null);
    setLiveUrlInput(b.liveUrl || "");
    setLiveUrlVerified(null);
    setBuildCompleted(false);
    setFixesApplied(null);
    loadMessages(b.id);
  }

  async function claimBuild(build: BuildRecord) {
    setBuilds((prev) =>
      prev.map((b) =>
        b.id === build.id
          ? { ...b, status: "claimed", assignedDev: DEV_USERNAME, claimedAt: new Date().toISOString() }
          : b,
      ),
    );
    selectBuild({
      ...build,
      status: "claimed",
      assignedDev: DEV_USERNAME,
      claimedAt: new Date().toISOString(),
    });
    setToast(`Build claimed — ${build.businessName}`);
    setTimeout(() => setToast(""), 3000);
    try {
      await fetch("/api/build/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: build.clientId, buildId: build.id, devUsername: DEV_USERNAME }),
      });
    } catch {
      /* optimistic already applied */
    }
  }

  async function runQa(html: string, isResubmit: boolean) {
    if (!html.trim()) return;
    setQaRunning(true);
    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: html }),
      });
      const data = (await res.json()) as { report?: QAReport };
      if (isResubmit) {
        setResubmitReport(data.report || null);
        if (data.report?.score === 100) {
          setStep(4);
        }
      } else {
        setQaReport(data.report || null);
        setPreviousScore(data.report?.score ?? null);
        if (data.report) setStep(2);
      }
    } catch {
      /* ignore */
    }
    setQaRunning(false);
  }

  async function handleFileDrop(file: File) {
    const text = await file.text();
    if (step === 1) setHtmlInput(text);
    if (step === 3) setResubmitHtml(text);
  }

  async function autofix() {
    const source = step === 3 ? resubmitHtml : htmlInput;
    if (!source) return;
    setAutofixing(true);
    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent: source,
          autofix: true,
          businessName: selectedBuild?.businessName,
        }),
      });
      const data = (await res.json()) as { report?: QAReport; fixedHtml?: string };
      if (data.fixedHtml && data.report) {
        const priorReport = step === 3 ? resubmitReport : qaReport;
        const priorFails = priorReport
          ? priorReport.passes.reduce(
              (s, p) => s + p.checks.filter((c) => !c.passed).length,
              0,
            )
          : 0;
        const newFails = data.report.passes.reduce(
          (s, p) => s + p.checks.filter((c) => !c.passed).length,
          0,
        );
        setFixesApplied(Math.max(priorFails - newFails, 0));
        if (step === 3) {
          setResubmitHtml(data.fixedHtml);
          setResubmitReport(data.report);
        } else {
          setHtmlInput(data.fixedHtml);
          setQaReport(data.report);
        }
        const blob = new Blob([data.fixedHtml], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedBuild?.businessName || "site"}-fixed.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* ignore */
    }
    setAutofixing(false);
  }

  function downloadQaReport() {
    const report = step === 3 ? resubmitReport : qaReport;
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-report-${selectedBuild?.businessName || "build"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function verifyLiveUrl() {
    if (!liveUrlInput.trim()) return;
    setVerifyingLive(true);
    try {
      // Can't fetch cross-origin reliably from client — use a HEAD via no-cors
      // and treat "no network error" as a best-effort verification.
      await fetch(liveUrlInput, { mode: "no-cors" });
      setLiveUrlVerified(true);
    } catch {
      setLiveUrlVerified(false);
    }
    setVerifyingLive(false);
  }

  async function markBuildComplete() {
    if (!selectedBuild) return;
    try {
      await fetch("/api/build/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId: selectedBuild.id,
          clientId: selectedBuild.clientId,
          liveUrl: liveUrlInput || null,
        }),
      });
    } catch {
      /* ignore */
    }
    setBuildCompleted(true);
    setToast(`${selectedBuild.businessName} marked live — rep notified`);
    setTimeout(() => setToast(""), 4000);

    // Fire confetti
    try {
      const mod = await import("canvas-confetti");
      mod.default({ particleCount: 120, spread: 80, colors: [COLORS.success, COLORS.accent, "#F5C842"] });
    } catch {
      /* ignore */
    }

    loadBuilds();
  }

  async function downloadDevPack(build: BuildRecord) {
    // Try the server API first — works for real clients in mock-data store
    try {
      const res = await fetch(`/api/build/package?clientId=${encodeURIComponent(build.clientId)}`);
      if (res.ok) {
        const blob = await res.blob();
        // Only trust server-generated ZIPs (application/zip)
        const ct = res.headers.get("Content-Type") || "";
        if (ct.includes("zip") && blob.size > 200) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const slug = build.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
          a.download = `BVM_DevPack_${slug}.zip`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return;
        }
      }
    } catch {
      /* fall through to client-side fallback */
    }

    // Client-side fallback — generate a ZIP from the build record fields
    const zip = new JSZip();

    const indexHtml = buildFallbackIndexHtml(build);
    const briefMd = buildFallbackBriefMd(build);
    const qaChecklistMd = buildFallbackQaChecklistMd(build);
    const readmeMd = buildFallbackReadmeMd(build);

    zip.file("index.html", indexHtml);
    zip.file("brief.md", briefMd);
    zip.file("qa-checklist.md", qaChecklistMd);
    zip.file("README.md", readmeMd);

    const buf = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(buf);
    const a = document.createElement("a");
    a.href = url;
    const slug = build.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    a.download = `BVM_DevPack_${slug}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadFinalPack() {
    if (!selectedBuild) return;
    await downloadDevPack(selectedBuild);
  }

  async function sendDevMsg() {
    if (!msgInput.trim() || !selectedBuild || msgSending) return;
    setMsgSending(true);
    try {
      const res = await fetch("/api/build/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildId: selectedBuild.id, from: "dev", text: msgInput }),
      });
      const data = (await res.json()) as { message?: BuildMessage };
      if (data.message) setMessages((prev) => [...prev, data.message as BuildMessage]);
      setMsgInput("");
    } catch {
      /* ignore */
    }
    setMsgSending(false);
  }

  function handleSignOut() {
    document.cookie = "dc_session=; path=/; max-age=0";
    router.push("/login");
  }

  const unassigned = builds
    .filter((b) => b.status === "unassigned")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const myBuilds = builds.filter(
    (b) =>
      (b.status === "claimed" || b.status === "ready-for-qa") && b.assignedDev === DEV_USERNAME,
  );

  const liveBuilds = builds.filter((b) => b.status === "live").length;
  const avgScore = builds.reduce((acc, b) => acc + (b.qaReport?.score || 0), 0) / Math.max(builds.filter((b) => b.qaReport).length, 1);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `2px solid ${COLORS.accent}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.pageBg,
        display: "flex",
        flexDirection: "column",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes flashGreen{0%{background:#00bda5}50%{background:#e6fff9}100%{background:#fff}}`}</style>

      {/* ── HEADER BAR ──────────────────────────────────── */}
      <nav
        style={{
          background: COLORS.headerBar,
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em" }}>
            BVM BUILD QUEUE
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>v3.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              padding: "4px 12px",
              fontSize: 11,
              color: "#fff",
              fontWeight: 600,
            }}
          >
            DEV: {DEV_USERNAME}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              padding: "4px 12px",
              fontSize: 11,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            LOGOUT
          </button>
        </div>
      </nav>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 72,
            left: "50%",
            transform: "translateX(-50%)",
            background: COLORS.success,
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            zIndex: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* ── THREE COLUMNS ────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── LEFT COLUMN ──────────────────────────────── */}
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            background: COLORS.sidebarBg,
            borderRight: `1px solid ${COLORS.cardBorder}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: COLORS.headerBar,
              color: "#fff",
              padding: "12px 18px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            BUILD QUEUE
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: COLORS.secondary,
                margin: "0 0 10px",
              }}
            >
              Unassigned ({unassigned.length})
            </p>

            {unassigned.length === 0 ? (
              <div
                style={{
                  background: COLORS.cardBg,
                  border: `1px dashed ${COLORS.cardBorder}`,
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 11, color: COLORS.secondary, margin: 0 }}>
                  NO BUILDS AVAILABLE
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {unassigned.map((b) => {
                  const days = daysSince(b.createdAt);
                  const urgent = days > 3;
                  const featured =
                    (b.sbrData as Record<string, unknown> | null)?.featured_placement === true;
                  return (
                    <div
                      key={b.id}
                      onClick={() => selectBuild(b)}
                      style={{
                        background: COLORS.cardBg,
                        border: `1px solid ${selectedBuild?.id === b.id ? COLORS.accent : COLORS.cardBorder}`,
                        borderRadius: 8,
                        padding: 12,
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        {featured && (
                          <span
                            style={{
                              background: COLORS.action,
                              color: "#fff",
                              fontSize: 8,
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: 3,
                              letterSpacing: "0.08em",
                            }}
                          >
                            URGENT
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: COLORS.body,
                          margin: "0 0 2px",
                        }}
                      >
                        {b.businessName}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: COLORS.secondary,
                          margin: 0,
                        }}
                      >
                        {b.city}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: COLORS.secondary,
                          margin: "2px 0 0",
                          textTransform: "capitalize",
                        }}
                      >
                        {b.look.replace(/_/g, " ")}
                      </p>
                      {b.services.length > 0 && (
                        <p
                          style={{
                            fontSize: 10,
                            color: COLORS.secondary,
                            margin: "2px 0 8px",
                          }}
                        >
                          {b.services.slice(0, 2).join(", ")}
                          {b.services.length > 2 ? "…" : ""}
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: urgent ? COLORS.danger : COLORS.secondary,
                          }}
                        >
                          {days}d waiting
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          claimBuild(b);
                        }}
                        style={{
                          width: "100%",
                          background: COLORS.action,
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "8px 0",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                        }}
                      >
                        CLAIM BUILD →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                height: 1,
                background: COLORS.cardBorder,
                margin: "18px 0",
              }}
            />

            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: COLORS.secondary,
                margin: "0 0 10px",
              }}
            >
              My Builds ({myBuilds.length})
            </p>

            {myBuilds.length === 0 ? (
              <div
                style={{
                  background: COLORS.cardBg,
                  border: `1px dashed ${COLORS.cardBorder}`,
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 11, color: COLORS.secondary, margin: 0 }}>
                  CLAIM ONE TO START
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myBuilds.map((b) => {
                  const hrs = b.claimedAt ? hoursSince(b.claimedAt) : 0;
                  const statusLabel =
                    b.status === "ready-for-qa" ? "READY" : "IN PROGRESS";
                  const statusBg =
                    b.status === "ready-for-qa" ? COLORS.success : COLORS.accent;
                  return (
                    <div
                      key={b.id}
                      onClick={() => selectBuild(b)}
                      style={{
                        background: COLORS.cardBg,
                        border: `1px solid ${selectedBuild?.id === b.id ? COLORS.accent : COLORS.cardBorder}`,
                        borderRadius: 8,
                        padding: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: COLORS.body,
                            margin: 0,
                          }}
                        >
                          {b.businessName}
                        </p>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#fff",
                            background: statusBg,
                            padding: "2px 6px",
                            borderRadius: 3,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: COLORS.secondary,
                          margin: "0 0 2px",
                        }}
                      >
                        {b.city}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: COLORS.secondary,
                          margin: "0 0 8px",
                        }}
                      >
                        {hrs}h in progress
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadDevPack(b);
                        }}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: `1px solid ${COLORS.action}`,
                          color: COLORS.action,
                          borderRadius: 4,
                          padding: "6px 0",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                        }}
                      >
                        DOWNLOAD DEV PACK ↓
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER COLUMN — QA ENGINE ───────────────── */}
        <main
          style={{
            flex: 1,
            background: COLORS.cardBg,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            style={{
              background: COLORS.headerBar,
              color: "#fff",
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em" }}>
              QA ENGINE
            </span>
            {selectedBuild && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                {selectedBuild.businessName} · {selectedBuild.city}
              </span>
            )}
          </div>

          {/* Step indicator */}
          {selectedBuild && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "16px 24px",
                borderBottom: `1px solid ${COLORS.cardBorder}`,
                background: COLORS.pageBg,
              }}
            >
              {[
                { key: 1, label: "Submit HTML" },
                { key: 2, label: "QA Results" },
                { key: 3, label: "Re-Submit" },
                { key: 4, label: "Final Verify" },
              ].map((s, i) => {
                const active = step === s.key;
                const done = step > s.key;
                return (
                  <div
                    key={s.key}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 14px",
                        borderRadius: 999,
                        background: active
                          ? COLORS.accent
                          : done
                            ? COLORS.success
                            : "#fff",
                        color: active || done ? "#fff" : COLORS.secondary,
                        border: active || done ? "none" : `1px solid ${COLORS.cardBorder}`,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      <span>{done ? "✓" : s.key}</span>
                      <span style={{ letterSpacing: "0.04em" }}>{s.label}</span>
                    </div>
                    {i < 3 && (
                      <div
                        style={{
                          width: 16,
                          height: 2,
                          background: step > s.key ? COLORS.success : COLORS.cardBorder,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
            {!selectedBuild ? (
              <div
                style={{
                  border: `1px dashed ${COLORS.cardBorder}`,
                  borderRadius: 12,
                  padding: 80,
                  textAlign: "center",
                  background: COLORS.pageBg,
                }}
              >
                <p style={{ fontSize: 14, color: COLORS.secondary, margin: 0 }}>
                  Select a build from the queue to begin QA
                </p>
              </div>
            ) : (
              <>
                {/* STEP 1 ──────────────────────────── */}
                {step === 1 && (
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: COLORS.secondary,
                        margin: "0 0 6px",
                      }}
                    >
                      STEP 1 OF 4
                    </p>
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: COLORS.body,
                        margin: "0 0 6px",
                      }}
                    >
                      Submit HTML for QA
                    </h2>
                    <p style={{ fontSize: 13, color: COLORS.secondary, margin: "0 0 20px" }}>
                      Paste HTML from your dev pack or upload index.html
                    </p>

                    <HtmlEditor
                      value={htmlInput}
                      onChange={setHtmlInput}
                      placeholder="Paste your site HTML here to run QA analysis..."
                      minHeight={260}
                      errorLines={getErrorLines(htmlInput, qaReport)}
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleFileDrop(file);
                      }}
                      style={{
                        border: `2px dashed ${COLORS.accent}`,
                        borderRadius: 8,
                        padding: "18px 24px",
                        textAlign: "center",
                        cursor: "pointer",
                        marginTop: 12,
                        background: COLORS.pageBg,
                      }}
                    >
                      <p
                        style={{
                          color: COLORS.accent,
                          fontSize: 12,
                          margin: 0,
                          fontWeight: 600,
                        }}
                      >
                        or drag index.html here
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".html,.htm"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileDrop(file);
                        }}
                      />
                    </div>

                    <button
                      onClick={() => runQa(htmlInput, false)}
                      disabled={!htmlInput.trim() || qaRunning}
                      style={{
                        width: "100%",
                        marginTop: 18,
                        background: htmlInput.trim() ? COLORS.action : "#e7edf3",
                        color: htmlInput.trim() ? "#fff" : COLORS.secondary,
                        border: "none",
                        borderRadius: 6,
                        padding: "14px 0",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        cursor: htmlInput.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      {qaRunning ? "RUNNING QA..." : "RUN QA ANALYSIS →"}
                    </button>
                  </div>
                )}

                {/* STEP 2 ──────────────────────────── */}
                {step === 2 && qaReport && (
                  <QaResults
                    title="Step 2 — QA Results"
                    subtitle="Review issues, auto-fix, and advance when ready"
                    report={qaReport}
                    onAutofix={autofix}
                    autofixing={autofixing}
                    fixesApplied={fixesApplied}
                    onDownload={downloadQaReport}
                    actionLabel="I've made my fixes →"
                    onAction={() => {
                      setStep(3);
                      setResubmitHtml(htmlInput);
                      setFixesApplied(null);
                    }}
                  />
                )}

                {/* STEP 3 ──────────────────────────── */}
                {step === 3 && (
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: COLORS.secondary,
                        margin: "0 0 6px",
                      }}
                    >
                      STEP 3 OF 4
                    </p>
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: COLORS.body,
                        margin: "0 0 6px",
                      }}
                    >
                      Re-Submit After Fixes
                    </h2>
                    <p style={{ fontSize: 13, color: COLORS.secondary, margin: "0 0 20px" }}>
                      Paste the updated HTML — a score of 100 advances to final verification.
                    </p>

                    <HtmlEditor
                      value={resubmitHtml}
                      onChange={setResubmitHtml}
                      placeholder="Paste your updated HTML here..."
                      minHeight={240}
                      errorLines={getErrorLines(resubmitHtml, resubmitReport)}
                    />

                    <button
                      onClick={() => runQa(resubmitHtml, true)}
                      disabled={!resubmitHtml.trim() || qaRunning}
                      style={{
                        width: "100%",
                        marginTop: 18,
                        background: resubmitHtml.trim() ? COLORS.action : "#e7edf3",
                        color: resubmitHtml.trim() ? "#fff" : COLORS.secondary,
                        border: "none",
                        borderRadius: 6,
                        padding: "14px 0",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        cursor: resubmitHtml.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      {qaRunning ? "RUNNING QA..." : "RUN QA ANALYSIS →"}
                    </button>

                    {resubmitReport && previousScore != null && (
                      <>
                        <div
                          style={{
                            background: "#fff",
                            border: `1px solid ${COLORS.cardBorder}`,
                            borderRadius: 10,
                            padding: "18px 24px",
                            marginTop: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 20,
                          }}
                        >
                          <div style={{ textAlign: "center" }}>
                            <p
                              style={{
                                fontSize: 10,
                                letterSpacing: "0.12em",
                                color: COLORS.secondary,
                                margin: "0 0 4px",
                              }}
                            >
                              PREVIOUS
                            </p>
                            <p
                              style={{
                                fontSize: 32,
                                fontWeight: 800,
                                color: scoreColor(previousScore),
                                margin: 0,
                                lineHeight: 1,
                              }}
                            >
                              {previousScore}
                            </p>
                          </div>
                          <div style={{ fontSize: 28, color: COLORS.secondary }}>→</div>
                          <div style={{ textAlign: "center" }}>
                            <p
                              style={{
                                fontSize: 10,
                                letterSpacing: "0.12em",
                                color: COLORS.secondary,
                                margin: "0 0 4px",
                              }}
                            >
                              NEW
                            </p>
                            <p
                              style={{
                                fontSize: 32,
                                fontWeight: 800,
                                color: scoreColor(resubmitReport.score),
                                margin: 0,
                                lineHeight: 1,
                              }}
                            >
                              {resubmitReport.score}
                            </p>
                          </div>
                        </div>

                        {resubmitReport.score < 100 ? (
                          <QaResults
                            title=""
                            subtitle=""
                            report={resubmitReport}
                            onAutofix={autofix}
                            autofixing={autofixing}
                            fixesApplied={fixesApplied}
                            onDownload={downloadQaReport}
                            actionLabel={null}
                            onAction={() => {}}
                          />
                        ) : (
                          <div
                            style={{
                              marginTop: 20,
                              padding: 20,
                              background: "#e6fff9",
                              border: `1px solid ${COLORS.success}`,
                              borderRadius: 8,
                              textAlign: "center",
                              animation: "flashGreen 1.5s",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: COLORS.success,
                                margin: 0,
                              }}
                            >
                              Perfect score — advancing to final verification
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* STEP 4 ──────────────────────────── */}
                {step === 4 && (
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: COLORS.secondary,
                        margin: "0 0 6px",
                      }}
                    >
                      STEP 4 OF 4
                    </p>
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: COLORS.body,
                        margin: "0 0 6px",
                      }}
                    >
                      Final Verification
                    </h2>
                    <p style={{ fontSize: 13, color: COLORS.secondary, margin: "0 0 20px" }}>
                      All three checks must pass before marking complete.
                    </p>

                    {[
                      {
                        label: "Structure & Meta",
                        detail: "All meta tags, alt texts, and canonical present",
                        passed: true,
                      },
                      {
                        label: "Content Accuracy",
                        detail: `Business name, phone, CTA match brief for ${selectedBuild.businessName}`,
                        passed: (htmlInput || resubmitHtml).includes(selectedBuild.businessName),
                      },
                    ].map((check, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#fff",
                          border: `1px solid ${COLORS.cardBorder}`,
                          borderRadius: 8,
                          padding: "14px 18px",
                          marginBottom: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: check.passed ? COLORS.success : COLORS.danger,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {check.passed ? "✓" : "✗"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: COLORS.body,
                              margin: "0 0 2px",
                            }}
                          >
                            Pass {i + 1}: {check.label}
                          </p>
                          <p style={{ fontSize: 11, color: COLORS.secondary, margin: 0 }}>
                            {check.detail}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Live URL row */}
                    <div
                      style={{
                        background: "#fff",
                        border: `1px solid ${COLORS.cardBorder}`,
                        borderRadius: 8,
                        padding: "14px 18px",
                        marginBottom: 20,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background:
                            liveUrlVerified === true
                              ? COLORS.success
                              : liveUrlVerified === false
                                ? COLORS.danger
                                : COLORS.cardBorder,
                          color: liveUrlVerified == null ? COLORS.secondary : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {liveUrlVerified == null ? "3" : liveUrlVerified ? "✓" : "✗"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: COLORS.body,
                            margin: "0 0 4px",
                          }}
                        >
                          Pass 3: Live URL
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="url"
                            value={liveUrlInput}
                            onChange={(e) => {
                              setLiveUrlInput(e.target.value);
                              setLiveUrlVerified(null);
                            }}
                            placeholder="https://client-site.vercel.app"
                            style={{
                              flex: 1,
                              background: "#fff",
                              border: `1px solid ${COLORS.cardBorder}`,
                              borderRadius: 4,
                              padding: "6px 10px",
                              fontSize: 11,
                              color: COLORS.body,
                              outline: "none",
                            }}
                          />
                          <button
                            onClick={verifyLiveUrl}
                            disabled={!liveUrlInput.trim() || verifyingLive}
                            style={{
                              background: COLORS.accent,
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              padding: "6px 16px",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              cursor: liveUrlInput.trim() ? "pointer" : "not-allowed",
                              opacity: liveUrlInput.trim() ? 1 : 0.5,
                            }}
                          >
                            {verifyingLive ? "..." : "VERIFY →"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={markBuildComplete}
                      disabled={!liveUrlVerified || buildCompleted}
                      style={{
                        width: "100%",
                        background: liveUrlVerified ? COLORS.success : "#e7edf3",
                        color: liveUrlVerified ? "#fff" : COLORS.secondary,
                        border: "none",
                        borderRadius: 6,
                        padding: "14px 0",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        cursor: liveUrlVerified && !buildCompleted ? "pointer" : "not-allowed",
                      }}
                    >
                      {buildCompleted ? "✓ BUILD COMPLETE" : "MARK BUILD COMPLETE →"}
                    </button>

                    {buildCompleted && (
                      <button
                        onClick={downloadFinalPack}
                        style={{
                          width: "100%",
                          marginTop: 10,
                          background: "transparent",
                          color: COLORS.accent,
                          border: `1px solid ${COLORS.accent}`,
                          borderRadius: 6,
                          padding: "12px 0",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          cursor: "pointer",
                        }}
                      >
                        ASSEMBLE FINAL PACK →
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* ── RIGHT COLUMN — COMMS ─────────────────────── */}
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            background: COLORS.sidebarBg,
            borderLeft: `1px solid ${COLORS.cardBorder}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: COLORS.headerBar,
              color: "#fff",
              padding: "12px 18px",
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", margin: 0 }}>
              COMMS
            </p>
            {selectedBuild && (
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.65)",
                  margin: "2px 0 0",
                }}
              >
                VIEWING: {selectedBuild.businessName}
              </p>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {!selectedBuild ? (
              <p
                style={{
                  color: COLORS.secondary,
                  fontSize: 12,
                  textAlign: "center",
                  padding: "40px 16px",
                }}
              >
                Select a build to view thread
              </p>
            ) : messages.length === 0 ? (
              <p
                style={{
                  color: COLORS.secondary,
                  fontSize: 12,
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                No messages yet
              </p>
            ) : (
              messages.map((m) => {
                const isRep = m.from === "rep";
                const badgeColor = isRep ? COLORS.accent : COLORS.action;
                const badgeLabel = isRep ? "REP" : "DEV";
                return (
                  <div key={m.id} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          color: "#fff",
                          background: badgeColor,
                          padding: "2px 7px",
                          borderRadius: 3,
                        }}
                      >
                        {badgeLabel}
                      </span>
                      <span style={{ fontSize: 10, color: COLORS.secondary }}>
                        {new Date(m.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: COLORS.body,
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {m.text}
                    </p>
                  </div>
                );
              })
            )}

            {selectedBuild && (
              <>
                <div
                  style={{
                    height: 1,
                    background: COLORS.cardBorder,
                    margin: "16px 0",
                  }}
                />
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: COLORS.secondary,
                    margin: "0 0 8px",
                  }}
                >
                  TIMELINE
                </p>
                <div
                  style={{
                    background: COLORS.cardBg,
                    border: `1px solid ${COLORS.cardBorder}`,
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 11,
                    color: COLORS.secondary,
                    lineHeight: 1.6,
                  }}
                >
                  <div>Created: {new Date(selectedBuild.createdAt).toLocaleDateString()}</div>
                  {selectedBuild.claimedAt && (
                    <div>Claimed: {new Date(selectedBuild.claimedAt).toLocaleDateString()}</div>
                  )}
                  {selectedBuild.readyAt && (
                    <div>Ready: {new Date(selectedBuild.readyAt).toLocaleDateString()}</div>
                  )}
                  {selectedBuild.liveAt && (
                    <div>Live: {new Date(selectedBuild.liveAt).toLocaleDateString()}</div>
                  )}
                </div>
              </>
            )}
          </div>

          {selectedBuild && (
            <div
              style={{
                padding: 14,
                borderTop: `1px solid ${COLORS.cardBorder}`,
                background: "#fff",
                display: "flex",
                gap: 8,
              }}
            >
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendDevMsg()}
                placeholder="Message rep..."
                style={{
                  flex: 1,
                  background: "#fff",
                  border: `1px solid ${COLORS.cardBorder}`,
                  borderRadius: 4,
                  padding: "7px 10px",
                  fontSize: 12,
                  color: COLORS.body,
                  outline: "none",
                }}
              />
              <button
                onClick={sendDevMsg}
                disabled={!msgInput.trim() || msgSending}
                style={{
                  background: COLORS.action,
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "7px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  opacity: msgInput.trim() && !msgSending ? 1 : 0.5,
                }}
              >
                SEND
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* ── BOTTOM STATUS BAR ───────────────────────── */}
      <div
        style={{
          background: COLORS.pageBg,
          borderTop: `1px solid ${COLORS.cardBorder}`,
          padding: "10px 24px",
          display: "flex",
          gap: 32,
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 11,
          color: COLORS.secondary,
        }}
      >
        <div>
          Total:{" "}
          <span style={{ color: COLORS.body, fontWeight: 700 }}>{builds.length}</span>
        </div>
        <div>
          Unassigned:{" "}
          <span style={{ color: COLORS.body, fontWeight: 700 }}>{unassigned.length}</span>
        </div>
        <div>
          Live:{" "}
          <span style={{ color: COLORS.body, fontWeight: 700 }}>{liveBuilds}</span>
        </div>
        <div>
          Avg QA:{" "}
          <span style={{ color: COLORS.body, fontWeight: 700 }}>
            {Math.round(avgScore) || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared QA results panel ──────────────────────────────────────────
function QaResults({
  title,
  subtitle,
  report,
  onAutofix,
  autofixing,
  fixesApplied,
  onDownload,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  report: QAReport;
  onAutofix: () => void;
  autofixing: boolean;
  fixesApplied: number | null;
  onDownload: () => void;
  actionLabel: string | null;
  onAction: () => void;
}) {
  const color = scoreColor(report.score);
  return (
    <div>
      {title && (
        <>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: COLORS.secondary,
              margin: "0 0 6px",
            }}
          >
            STEP 2 OF 4
          </p>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.body,
              margin: "0 0 6px",
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 13, color: COLORS.secondary, margin: "0 0 20px" }}>
              {subtitle}
            </p>
          )}
        </>
      )}

      {/* Score header */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${color}`,
          borderRadius: 10,
          padding: 24,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: COLORS.secondary,
              margin: "0 0 6px",
            }}
          >
            OVERALL QA SCORE
          </p>
          <p
            style={{
              fontSize: 44,
              fontWeight: 800,
              color,
              margin: 0,
              lineHeight: 1,
            }}
          >
            {report.score}
            <span style={{ fontSize: 18, color: COLORS.secondary }}>/100</span>
          </p>
          {fixesApplied != null && fixesApplied > 0 && (
            <p
              style={{
                fontSize: 11,
                color: COLORS.success,
                margin: "8px 0 0",
                fontWeight: 700,
              }}
            >
              ✓ {fixesApplied} fix{fixesApplied === 1 ? "" : "es"} applied
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onAutofix}
            disabled={autofixing}
            style={{
              background: COLORS.action,
              color: "#fff",
              border: "none",
              padding: "10px 22px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: autofixing ? "wait" : "pointer",
              opacity: autofixing ? 0.5 : 1,
            }}
          >
            {autofixing ? "FIXING..." : "AUTO-FIX →"}
          </button>
          <button
            onClick={onDownload}
            style={{
              background: "transparent",
              color: COLORS.accent,
              border: `1px solid ${COLORS.accent}`,
              padding: "9px 20px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            DOWNLOAD QA REPORT
          </button>
        </div>
      </div>

      {/* Four passes grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {report.passes.map((pass) => (
          <div
            key={pass.name}
            style={{
              background: "#fff",
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: COLORS.pageBg,
                padding: "10px 14px",
                borderBottom: `1px solid ${COLORS.cardBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: COLORS.body,
                  letterSpacing: "0.04em",
                }}
              >
                {pass.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: pass.passed ? COLORS.success : COLORS.danger,
                  fontWeight: 700,
                }}
              >
                {pass.checks.filter((c) => c.passed).length}/{pass.checks.length}
              </span>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {pass.checks.map((check, i) => {
                const sev = severityStyle(check.severity);
                return (
                  <div key={i} style={{ fontSize: 11, lineHeight: 1.5 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          background: sev.bg,
                          color: sev.color,
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {sev.label}
                      </span>
                      <span style={{ color: check.passed ? COLORS.success : COLORS.body }}>
                        {check.passed ? "✓" : "✗"} {check.message}
                      </span>
                    </div>
                    {check.autofix && !check.passed && (
                      <blockquote
                        style={{
                          margin: "4px 0 0 18px",
                          padding: "6px 10px",
                          background: COLORS.pageBg,
                          borderLeft: `3px solid ${COLORS.accent}`,
                          fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                          fontSize: 10,
                          color: COLORS.body,
                        }}
                      >
                        → {check.autofix}
                      </blockquote>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            width: "100%",
            background: COLORS.action,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "14px 0",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
