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
  greenLines = new Set<number>(),
  editorRefCb,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  errorLines?: number[];
  greenLines?: Set<number>;
  editorRefCb?: (ref: { jumpToLine: (n: number) => void }) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  useEffect(() => {
    if (editorRefCb) editorRefCb({ jumpToLine });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const isGreen = greenLines.has(ln);
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
                color: isGreen ? COLORS.success : isError ? COLORS.danger : COLORS.secondary,
                fontWeight: isError || isGreen ? 700 : 400,
                cursor: isError ? "pointer" : "default",
                background: isHighlighted
                  ? "rgba(245, 200, 66, 0.35)"
                  : isGreen
                    ? "rgba(0, 189, 165, 0.1)"
                    : isError
                      ? "rgba(255, 92, 119, 0.08)"
                      : "transparent",
                borderLeft: isGreen ? `3px solid ${COLORS.success}` : isError ? `3px solid ${COLORS.danger}` : "3px solid transparent",
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

interface EditHistoryEntry {
  timestamp: string;
  dev: string;
  hash: string;
  action: string;
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
  editedHtml: string | null;
  editorStatus: "generated" | "editing" | "qa-passed" | "complete";
  qaEditedScore: number | null;
  qaEditedAt: string | null;
  qaHash: string | null;
  updatedAt: string | null;
  editHistory: EditHistoryEntry[];
}

interface BuildMessage {
  id: string;
  buildId: string;
  from: "rep" | "dev";
  text: string;
  timestamp: string;
}

type GateStep = 0 | 1 | 2 | 3 | 4; // 0=idle, 1=scanned, 2=autofixed, 3=rescored, 4=complete

interface QaIssue {
  line: number;
  message: string;
  fix: string;
  severity: "blocker" | "warning" | "optimization";
  fixed?: boolean;
}

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
    editedHtml: null,
    editorStatus: "generated",
    qaEditedScore: null,
    qaEditedAt: null,
    qaHash: null,
    updatedAt: null,
    editHistory: [],
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
    editedHtml: null,
    editorStatus: "generated",
    qaEditedScore: null,
    qaEditedAt: null,
    qaHash: null,
    updatedAt: null,
    editHistory: [],
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
    editedHtml: null,
    editorStatus: "generated",
    qaEditedScore: null,
    qaEditedAt: null,
    qaHash: null,
    updatedAt: null,
    editHistory: [],
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
    editedHtml: null,
    editorStatus: "generated",
    qaEditedScore: null,
    qaEditedAt: null,
    qaHash: null,
    updatedAt: null,
    editHistory: [],
  },
];

// ─── SHA-256 hash via Web Crypto API ─────────────────────────────────
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

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

  // Editor state — editedHtml is the local working copy
  const [editedHtml, setEditedHtml] = useState("");
  const [localUpdatedAt, setLocalUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Gated workflow state
  const [gateStep, setGateStep] = useState<GateStep>(0);
  const [qaReport, setQaReport] = useState<QAReport | null>(null);
  const [qaRunning, setQaRunning] = useState(false);
  const [autofixing, setAutofixing] = useState(false);
  const [qaEditedScore, setQaEditedScore] = useState<number | null>(null);
  const [qaHash, setQaHash] = useState<string | null>(null);
  const [qaGateMessage, setQaGateMessage] = useState("");
  const [issues, setIssues] = useState<QaIssue[]>([]);
  const [fixedLines, setFixedLines] = useState<Set<number>>(new Set());
  const [buildCompleted, setBuildCompleted] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
  const editorRef = useRef<{ jumpToLine: (n: number) => void } | null>(null);


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
    // Bruno rule: if editedHtml is null, copy generatedSiteHTML to local state
    // If generatedSiteHTML is also empty, generate fallback HTML
    const html = b.editedHtml ?? b.generatedSiteHTML ?? "";
    setEditedHtml(html || buildFallbackIndexHtml(b));
    setLocalUpdatedAt(b.updatedAt ?? null);
    setQaReport(null);
    setQaEditedScore(b.qaEditedScore ?? null);
    setQaHash(b.qaHash ?? null);
    setQaGateMessage("");
    setSaveError("");
    setBuildCompleted(false);
    setEditHistory(b.editHistory ?? []);
    setGateStep(0);
    setIssues([]);
    setFixedLines(new Set());
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

  // ─── Save editedHtml to server with optimistic lock ───────────────
  async function saveEditedHtml(htmlToSave?: string, extraUpdates?: Record<string, unknown>): Promise<boolean> {
    if (!selectedBuild) return false;
    setSaving(true);
    setSaveError("");
    try {
      const payload: Record<string, unknown> = {
        buildId: selectedBuild.id,
        editedHtml: htmlToSave ?? editedHtml,
        editorStatus: "editing",
        updatedAt: localUpdatedAt,
        ...(extraUpdates || {}),
      };
      const res = await fetch("/api/build/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        setSaveError("Build modified by another user — refresh to continue");
        setSaving(false);
        return false;
      }
      const data = await res.json();
      if (data.build) {
        setLocalUpdatedAt(data.build.updatedAt);
        // editorStatus tracked on server
        // Add history entry
        const hash = await sha256(htmlToSave ?? editedHtml);
        addHistoryEntry(hash.slice(0, 8), "HTML saved");
      }
      setSaving(false);
      return true;
    } catch {
      setSaveError("Save failed — check connection");
      setSaving(false);
      return false;
    }
  }

  function addHistoryEntry(hash: string, action: string) {
    const entry: EditHistoryEntry = {
      timestamp: new Date().toISOString(),
      dev: DEV_USERNAME,
      hash,
      action,
    };
    setEditHistory(prev => [entry, ...prev]);
  }

  // ─── Extract issues with line numbers from QA report ──────────────
  function extractIssues(html: string, report: QAReport): QaIssue[] {
    const lines = html.split("\n");
    const result: QaIssue[] = [];
    for (const pass of report.passes) {
      for (const check of pass.checks) {
        if (check.passed) continue;
        const patterns: { pat: string; fix: string }[] = [];
        if (/alt text/i.test(check.name)) patterns.push({ pat: "<img ", fix: "Add a descriptive alt attribute to this <img> tag" });
        if (/canonical/i.test(check.name)) patterns.push({ pat: "<head", fix: "Add <link rel=\"canonical\" href=\"/\"> inside <head>" });
        if (/og:title/i.test(check.name)) patterns.push({ pat: "<head", fix: "Add <meta property=\"og:title\" content=\"...\"> inside <head>" });
        if (/og:desc/i.test(check.name)) patterns.push({ pat: "<head", fix: "Add <meta property=\"og:description\" content=\"...\"> inside <head>" });
        if (/title tag/i.test(check.name)) patterns.push({ pat: "<title", fix: "Ensure <title> contains the business name" });
        if (/meta desc/i.test(check.name)) patterns.push({ pat: "<head", fix: "Add <meta name=\"description\" content=\"...\"> inside <head>" });
        if (/viewport/i.test(check.name)) patterns.push({ pat: "<head", fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" });
        if (/heading/i.test(check.name)) patterns.push({ pat: "<h", fix: "Fix heading hierarchy — use h1 then h2 then h3 in order" });
        if (/placeholder/i.test(check.name)) patterns.push({ pat: "lorem", fix: "Replace placeholder text with real content" });
        if (/button.*label/i.test(check.name)) patterns.push({ pat: "<button", fix: "Add visible text or aria-label to this button" });
        if (/script.*head/i.test(check.name)) patterns.push({ pat: "<script", fix: "Move script to end of body or add defer attribute" });
        if (/dimension|width.*height/i.test(check.name)) patterns.push({ pat: "<img ", fix: "Add width and height attributes to this image" });
        if (/contrast|color/i.test(check.name)) patterns.push({ pat: "color", fix: "Adjust text/background color for WCAG AA contrast" });

        if (patterns.length === 0) {
          result.push({ line: 1, message: check.message, fix: check.autofix || "Fix this issue manually", severity: check.severity });
          continue;
        }
        let found = false;
        for (let i = 0; i < lines.length; i++) {
          for (const { pat, fix } of patterns) {
            if (lines[i].toLowerCase().includes(pat.toLowerCase())) {
              result.push({ line: i + 1, message: check.message, fix, severity: check.severity });
              found = true;
            }
          }
        }
        if (!found) {
          result.push({ line: 1, message: check.message, fix: check.autofix || "Fix manually", severity: check.severity });
        }
      }
    }
    // Deduplicate by line
    const seen = new Set<string>();
    return result.filter(r => {
      const key = `${r.line}:${r.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ─── Button 1: Scan for Issues ──────────────────────────────────
  async function scanForIssues() {
    if (!editedHtml.trim() || !selectedBuild) return;
    setQaRunning(true);
    setQaGateMessage("");
    setIssues([]);
    setFixedLines(new Set());

    // Save first with optimistic lock
    const saved = await saveEditedHtml();
    if (!saved) { setQaRunning(false); return; }

    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: editedHtml }),
      });
      const data = (await res.json()) as { report?: QAReport };
      if (data.report) {
        setQaReport(data.report);
        const extracted = extractIssues(editedHtml, data.report);
        setIssues(extracted);
        setGateStep(1);
        const hash = await sha256(editedHtml);
        addHistoryEntry(hash.slice(0, 8), `Scan — ${extracted.length} issues found`);
      }
    } catch {
      setQaGateMessage("QA service unavailable — try again");
    }
    setQaRunning(false);
  }

  // ─── Button 2: Auto Fix ────────────────────────────────────────
  async function runAutoFix() {
    if (!editedHtml || !selectedBuild) return;
    setAutofixing(true);
    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: editedHtml, autofix: true, businessName: selectedBuild.businessName }),
      });
      const data = (await res.json()) as { report?: QAReport; fixedHtml?: string };
      if (data.fixedHtml && data.report) {
        // Find which lines changed (green)
        const oldLines = editedHtml.split("\n");
        const newLines = data.fixedHtml.split("\n");
        const green = new Set<number>();
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
          if (oldLines[i] !== newLines[i]) green.add(i + 1);
        }
        setFixedLines(green);
        setEditedHtml(data.fixedHtml);
        setQaReport(data.report);
        // Update issues — mark fixed ones
        const newIssues = extractIssues(data.fixedHtml, data.report);
        const remainingLines = new Set(newIssues.map(i => i.line));
        setIssues(prev => {
          const merged = prev.map(i => ({ ...i, fixed: !remainingLines.has(i.line) }));
          // Add any new issues from rescan
          for (const ni of newIssues) {
            if (!merged.some(m => m.line === ni.line && m.message === ni.message)) {
              merged.push({ ...ni, fixed: false });
            }
          }
          return merged;
        });
        setQaHash(null); // HTML changed, force rescore
        setGateStep(2);
        const hash = await sha256(data.fixedHtml);
        addHistoryEntry(hash.slice(0, 8), `Auto-fix — ${green.size} lines fixed`);
      }
    } catch { /* ignore */ }
    setAutofixing(false);
  }

  // ─── Button 3: Re-Score ─────────────────────────────────────────
  async function reScore() {
    if (!editedHtml.trim() || !selectedBuild) return;
    setQaRunning(true);
    setQaGateMessage("");

    // Optimistic lock + save
    const saved = await saveEditedHtml();
    if (!saved) { setQaRunning(false); return; }

    const hash = await sha256(editedHtml);

    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: editedHtml }),
      });
      const data = (await res.json()) as { report?: QAReport };
      if (data.report) {
        setQaReport(data.report);
        setQaEditedScore(data.report.score);
        setQaHash(hash);
        const newIssues = extractIssues(editedHtml, data.report);
        setIssues(newIssues);
        setFixedLines(new Set());

        // Store on server
        await fetch("/api/build/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buildId: selectedBuild.id, qaEditedScore: data.report.score,
            qaEditedAt: new Date().toISOString(), qaHash: hash, updatedAt: localUpdatedAt,
          }),
        }).then(r => r.json()).then(d => { if (d.build) setLocalUpdatedAt(d.build.updatedAt); }).catch(() => {});

        const hasBlockers = data.report.passes.some(p => p.checks.some(c => !c.passed && c.severity === "blocker"));
        if (data.report.score >= 70 && !hasBlockers) {
          setGateStep(3);
        } else {
          setQaGateMessage(data.report.score < 70 ? `Score ${data.report.score} — needs >= 70. Fix remaining issues and re-score.` : "Blocker issues remain. Fix red items and re-score.");
        }
        addHistoryEntry(hash.slice(0, 8), `Re-score — ${data.report.score}/100`);
      }
    } catch {
      setQaGateMessage("QA service unavailable — try again");
    }
    setQaRunning(false);
  }

  // ─── Button 4: Complete & Deliver ────────────────────────────────
  async function completeAndDeliver() {
    if (!selectedBuild) return;
    setQaGateMessage("");

    // Gate: score >= 70
    if (qaEditedScore == null || qaEditedScore < 70) {
      setQaGateMessage("QA score must be >= 70"); return;
    }
    // Gate: no blockers
    if (qaReport) {
      const hasBlockers = qaReport.passes.some(p => p.checks.some(c => !c.passed && c.severity === "blocker"));
      if (hasBlockers) { setQaGateMessage("Blocker checks must all pass"); return; }
    }
    // Gate: hash match
    if (qaHash) {
      const currentHash = await sha256(editedHtml);
      if (currentHash !== qaHash) { setQaGateMessage("HTML changed since last QA — re-score first"); return; }
    } else { setQaGateMessage("QA required before completion"); return; }

    // Generate and download final pack
    const zip = new JSZip();
    const slug = selectedBuild.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const dateStr = new Date().toISOString().split("T")[0];
    zip.file("index.html", editedHtml);
    zip.file("build-brief.json", JSON.stringify({
      businessName: selectedBuild.businessName, city: selectedBuild.city, zip: selectedBuild.zip,
      services: selectedBuild.services, look: selectedBuild.look, tagline: selectedBuild.tagline,
      cta: selectedBuild.cta, createdAt: selectedBuild.createdAt,
    }, null, 2));
    zip.file("postflight-report.json", JSON.stringify(qaReport, null, 2));
    zip.file("image-manifest.json", JSON.stringify({ images: [], note: "No external images in this build" }, null, 2));
    const buf = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(buf);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BVM_${slug}_PASS_${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // Call /api/build/complete
    try {
      await fetch("/api/build/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildId: selectedBuild.id, clientId: selectedBuild.clientId, liveUrl: null }),
      });
    } catch { /* ignore */ }

    // Update editor status
    await fetch("/api/build/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildId: selectedBuild.id, editorStatus: "complete", updatedAt: localUpdatedAt }),
    }).then(r => r.json()).then(d => { if (d.build) setLocalUpdatedAt(d.build.updatedAt); }).catch(() => {});

    setGateStep(4);
    setBuildCompleted(true);
    addHistoryEntry(qaHash || "", "Build complete — delivered");
    setToast(`${selectedBuild.businessName} — COMPLETE. Rep, AM, and client notified.`);
    setTimeout(() => setToast(""), 5000);

    try { const mod = await import("canvas-confetti"); mod.default({ particleCount: 120, spread: 80, colors: [COLORS.success, COLORS.accent, "#F5C842"] }); } catch { /* ignore */ }
    loadBuilds();
  }

  // ─── Run QA on editedHtml (legacy, kept for compatibility) ──────
  async function runQa() {
    if (!editedHtml.trim() || !selectedBuild) return;
    setQaRunning(true);
    setQaGateMessage("");

    // 1. Optimistic lock check
    try {
      const checkRes = await fetch(`/api/build/list`);
      const checkData = await checkRes.json();
      const currentBuild = (checkData.builds || []).find((b: BuildRecord) => b.id === selectedBuild.id);
      if (currentBuild?.updatedAt && localUpdatedAt && currentBuild.updatedAt !== localUpdatedAt) {
        setQaGateMessage("Build modified by another user — refresh to continue");
        setQaRunning(false);
        return;
      }
    } catch { /* proceed — best effort lock check */ }

    // 2. Save first
    const saved = await saveEditedHtml();
    if (!saved) {
      setQaRunning(false);
      return;
    }

    // 3. Compute hash
    const hash = await sha256(editedHtml);

    // 4. Run QA
    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: editedHtml }),
      });
      const data = (await res.json()) as { report?: QAReport };
      if (data.report) {
        setQaReport(data.report);
        setQaEditedScore(data.report.score);
        setQaHash(hash);

        // 5. Store QA results on server
        await fetch("/api/build/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buildId: selectedBuild.id,
            qaEditedScore: data.report.score,
            qaEditedAt: new Date().toISOString(),
            qaHash: hash,
            updatedAt: localUpdatedAt,
          }),
        }).then(r => r.json()).then(d => {
          if (d.build) setLocalUpdatedAt(d.build.updatedAt);
        });

        addHistoryEntry(hash.slice(0, 8), `QA run — score ${data.report.score}`);
      }
    } catch {
      setQaGateMessage("QA service unavailable — try again");
    }
    setQaRunning(false);
  }

  // ─── Autofix ─────────────────────────────────────────────────────
  async function autofix() {
    if (!editedHtml || !selectedBuild) return;
    setAutofixing(true);
    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent: editedHtml,
          autofix: true,
          businessName: selectedBuild.businessName,
        }),
      });
      const data = (await res.json()) as { report?: QAReport; fixedHtml?: string };
      if (data.fixedHtml && data.report) {
        const priorFails = qaReport
          ? qaReport.passes.reduce((s, p) => s + p.checks.filter((c) => !c.passed).length, 0)
          : 0;
        const newFails = data.report.passes.reduce(
          (s, p) => s + p.checks.filter((c) => !c.passed).length, 0,
        );
        // Write to editedHtml — NEVER to generatedSiteHTML
        setEditedHtml(data.fixedHtml);
        setQaReport(data.report);
        setQaEditedScore(data.report.score);
        // Reset hash since HTML changed
        setQaHash(null);

        const hash = await sha256(data.fixedHtml);
        addHistoryEntry(hash.slice(0, 8), `Auto-fix applied — ${Math.max(priorFails - newFails, 0)} fixes`);
      }
    } catch {
      /* ignore */
    }
    setAutofixing(false);
  }

  function downloadQaReport() {
    if (!qaReport) return;
    const blob = new Blob([JSON.stringify(qaReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-report-${selectedBuild?.businessName || "build"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Mark Complete with all gates ────────────────────────────────
  async function markBuildComplete() {
    if (!selectedBuild) return;
    setQaGateMessage("");

    // Gate: QA score >= 70
    if (qaEditedScore == null || qaEditedScore < 70) {
      setQaGateMessage("QA score must be >= 70");
      return;
    }

    // Gate: no hard fails (blocker checks)
    if (qaReport) {
      const hasBlockers = qaReport.passes.some(p =>
        p.checks.some(c => !c.passed && c.severity === "blocker")
      );
      if (hasBlockers) {
        setQaGateMessage("Blocker checks must all pass before completion");
        return;
      }
    }

    // Gate: hash match
    if (qaHash) {
      const currentHash = await sha256(editedHtml);
      if (currentHash !== qaHash) {
        setQaGateMessage("HTML changed since last QA — re-run QA");
        return;
      }
    } else {
      setQaGateMessage("QA required before completion");
      return;
    }

    try {
      await fetch("/api/build/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId: selectedBuild.id,
          clientId: selectedBuild.clientId,
          liveUrl: null,
        }),
      });
    } catch {
      /* ignore */
    }

    // Update editor status to complete
    await fetch("/api/build/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildId: selectedBuild.id,
        editorStatus: "complete",
        updatedAt: localUpdatedAt,
      }),
    }).then(r => r.json()).then(d => {
      if (d.build) setLocalUpdatedAt(d.build.updatedAt);
    }).catch(() => {});

    setBuildCompleted(true);
    addHistoryEntry(qaHash || "", "Build marked complete");
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

        {/* ── CENTER COLUMN — EDITOR PANEL ────────────── */}
        <main style={{ flex: 1, background: COLORS.cardBg, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Header */}
          <div style={{ background: COLORS.headerBar, color: "#fff", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em" }}>BUILD EDITOR</span>
              {selectedBuild && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 3, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>{selectedBuild.look.replace(/_/g, " ").toUpperCase()}</span>}
            </div>
            {selectedBuild && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{selectedBuild.businessName} · {selectedBuild.city}</span>
                {qaEditedScore != null && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: scoreColor(qaEditedScore), color: "#fff" }}>QA: {qaEditedScore}</span>}
              </div>
            )}
          </div>

          {/* Labels bar */}
          {selectedBuild && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 24px", borderBottom: `1px solid ${COLORS.cardBorder}`, background: COLORS.pageBg, flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 3, background: "#e7edf3", color: COLORS.secondary, letterSpacing: "0.06em" }}>GENERATED — READ ONLY</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 3, background: COLORS.accent, color: "#fff", letterSpacing: "0.06em" }}>EDITED — ACTIVE</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: COLORS.secondary }}>generatedSiteHTML is never modified</span>
            </div>
          )}

          {/* Editor + Preview split */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {!selectedBuild ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ border: `1px dashed ${COLORS.cardBorder}`, borderRadius: 12, padding: 80, textAlign: "center", background: COLORS.pageBg }}>
                  <p style={{ fontSize: 14, color: COLORS.secondary, margin: 0 }}>Select a build from the queue to begin</p>
                </div>
              </div>
            ) : (
              <>
                {/* Left: Editor */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: `1px solid ${COLORS.cardBorder}` }}>
                  <div style={{ flex: 1, overflow: "auto", padding: "12px 16px 0" }}>
                    <HtmlEditor
                      value={editedHtml}
                      onChange={(v) => { setEditedHtml(v); setSaveError(""); if (gateStep >= 1) setQaHash(null); }}
                      placeholder="HTML content loads on claim..."
                      minHeight={400}
                      errorLines={issues.filter(i => !i.fixed).map(i => i.line)}
                      greenLines={fixedLines}
                      editorRefCb={(ref) => { editorRef.current = ref; }}
                    />
                  </div>

                  {/* Error list below editor */}
                  {issues.length > 0 && (
                    <div style={{ maxHeight: 180, overflowY: "auto", borderTop: `1px solid ${COLORS.cardBorder}`, background: COLORS.pageBg, padding: "8px 16px" }}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, margin: "0 0 6px", textTransform: "uppercase" }}>
                        ISSUES ({issues.filter(i => !i.fixed).length} remaining / {issues.length} total)
                      </p>
                      {issues.map((issue, i) => {
                        const sev = severityStyle(issue.severity);
                        return (
                          <div
                            key={`${issue.line}-${i}`}
                            onClick={() => editorRef.current?.jumpToLine(issue.line)}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0",
                              cursor: "pointer", opacity: issue.fixed ? 0.4 : 1,
                              textDecoration: issue.fixed ? "line-through" : "none",
                              borderBottom: i < issues.length - 1 ? `1px solid ${COLORS.cardBorder}` : "none",
                            }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 700, color: issue.fixed ? COLORS.success : sev.color, fontFamily: "monospace", minWidth: 36, flexShrink: 0 }}>
                              L{issue.line}
                            </span>
                            <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: issue.fixed ? COLORS.success : sev.bg, color: issue.fixed ? "#fff" : sev.color, flexShrink: 0 }}>
                              {issue.fixed ? "FIXED" : sev.label}
                            </span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 11, color: COLORS.body }}>{issue.message}</span>
                              {!issue.fixed && <span style={{ fontSize: 10, color: COLORS.accent, display: "block", marginTop: 1 }}>{issue.fix}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Save error */}
                  {saveError && (
                    <div style={{ padding: "8px 16px", background: "#ffe5e5", borderTop: `1px solid ${COLORS.danger}`, fontSize: 11, color: COLORS.danger, fontWeight: 600 }}>
                      {saveError}
                    </div>
                  )}
                  {qaGateMessage && (
                    <div style={{ padding: "8px 16px", background: "#ffe5e5", borderTop: `1px solid ${COLORS.danger}`, fontSize: 11, color: COLORS.danger, fontWeight: 600 }}>
                      {qaGateMessage}
                    </div>
                  )}
                </div>

                {/* Right: Live Preview */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "8px 16px", background: COLORS.pageBg, borderBottom: `1px solid ${COLORS.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, textTransform: "uppercase" }}>Live Preview</span>
                    {qaEditedScore != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(qaEditedScore) }}>Score: {qaEditedScore}/100</span>
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <iframe srcDoc={editedHtml} title="Preview" sandbox="allow-same-origin" style={{ width: "100%", height: "100%", border: "none" }} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── BOTTOM BAR — 4 GATED BUTTONS ──────────────── */}
          {selectedBuild && selectedBuild.status !== "unassigned" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 0, padding: 0,
              borderTop: `2px solid ${COLORS.cardBorder}`, background: COLORS.pageBg, flexShrink: 0,
            }}>
              {/* Button 1: Scan */}
              <button
                onClick={scanForIssues}
                disabled={qaRunning || !editedHtml.trim()}
                style={{
                  flex: 1, padding: "16px 0", border: "none", borderRight: `1px solid ${COLORS.cardBorder}`,
                  background: gateStep >= 1 ? "#e6fff9" : COLORS.cardBg,
                  color: qaRunning ? COLORS.secondary : COLORS.body,
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", cursor: qaRunning ? "wait" : "pointer",
                }}
              >
                {qaRunning && gateStep < 1 ? "Scanning..." : gateStep >= 1 ? "Scanned" : "1. Scan for Issues →"}
              </button>

              {/* Button 2: Auto Fix */}
              <button
                onClick={runAutoFix}
                disabled={gateStep < 1 || autofixing}
                style={{
                  flex: 1, padding: "16px 0", border: "none", borderRight: `1px solid ${COLORS.cardBorder}`,
                  background: gateStep >= 2 ? "#e6fff9" : gateStep < 1 ? "#f0f0f0" : COLORS.cardBg,
                  color: gateStep < 1 ? "#bbb" : autofixing ? COLORS.secondary : COLORS.body,
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                  cursor: gateStep < 1 || autofixing ? "not-allowed" : "pointer",
                  opacity: gateStep < 1 ? 0.5 : 1,
                }}
              >
                {autofixing ? "Fixing..." : gateStep >= 2 ? "Auto-Fixed" : "2. Auto Fix →"}
              </button>

              {/* Button 3: Re-Score */}
              <button
                onClick={reScore}
                disabled={gateStep < 2 || qaRunning}
                style={{
                  flex: 1, padding: "16px 0", border: "none", borderRight: `1px solid ${COLORS.cardBorder}`,
                  background: gateStep >= 3 ? "#e6fff9" : gateStep < 2 ? "#f0f0f0" : COLORS.cardBg,
                  color: gateStep < 2 ? "#bbb" : qaRunning ? COLORS.secondary : COLORS.body,
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                  cursor: gateStep < 2 || qaRunning ? "not-allowed" : "pointer",
                  opacity: gateStep < 2 ? 0.5 : 1,
                }}
              >
                {qaRunning && gateStep >= 2 ? "Scoring..." : gateStep >= 3 ? `Passed (${qaEditedScore})` : "3. Re-Score →"}
              </button>

              {/* Button 4: Complete & Deliver */}
              <button
                onClick={completeAndDeliver}
                disabled={gateStep < 3 || buildCompleted}
                style={{
                  flex: 1, padding: "16px 0", border: "none",
                  background: buildCompleted ? COLORS.success : gateStep >= 3 ? COLORS.action : "#f0f0f0",
                  color: buildCompleted ? "#fff" : gateStep >= 3 ? "#fff" : "#bbb",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                  cursor: gateStep < 3 || buildCompleted ? "not-allowed" : "pointer",
                  opacity: gateStep < 3 ? 0.5 : 1,
                }}
              >
                {buildCompleted ? "DELIVERED" : "4. Complete & Deliver →"}
              </button>
            </div>
          )}
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
  onErrorLineClick,
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
  onErrorLineClick?: (lineNum: number) => void;
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
                      <span
                        onClick={!check.passed && onErrorLineClick ? () => onErrorLineClick(1) : undefined}
                        style={{
                          color: check.passed ? COLORS.success : COLORS.body,
                          cursor: !check.passed && onErrorLineClick ? "pointer" : "default",
                          textDecoration: !check.passed && onErrorLineClick ? "underline" : "none",
                          textDecorationStyle: "dotted" as const,
                        }}
                      >
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
