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

type TabKey = "overview" | "editor" | "qa" | "history";

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

  // 4-tab panel
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Editor state — editedHtml is the local working copy
  const [editedHtml, setEditedHtml] = useState("");
  const [editorStatus, setEditorStatus] = useState<BuildRecord["editorStatus"]>("generated");
  const [localUpdatedAt, setLocalUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // QA state
  const [qaReport, setQaReport] = useState<QAReport | null>(null);
  const [qaRunning, setQaRunning] = useState(false);
  const [autofixing, setAutofixing] = useState(false);
  const [fixesApplied, setFixesApplied] = useState<number | null>(null);
  const [qaEditedScore, setQaEditedScore] = useState<number | null>(null);
  const [qaHash, setQaHash] = useState<string | null>(null);
  const [qaGateMessage, setQaGateMessage] = useState("");

  // History state
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);

  // Final verification
  const [liveUrlInput, setLiveUrlInput] = useState("");
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
    setActiveTab("overview");
    // Bruno rule: if editedHtml is null, copy generatedSiteHTML to local state
    setEditedHtml(b.editedHtml ?? b.generatedSiteHTML ?? "");
    setEditorStatus(b.editorStatus ?? "generated");
    setLocalUpdatedAt(b.updatedAt ?? null);
    setQaReport(null);
    setQaEditedScore(b.qaEditedScore ?? null);
    setQaHash(b.qaHash ?? null);
    setQaGateMessage("");
    setFixesApplied(null);
    setSaveError("");
    setLiveUrlInput(b.liveUrl || "");
    setBuildCompleted(false);
    setEditHistory(b.editHistory ?? []);
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
        setEditorStatus(data.build.editorStatus ?? "editing");
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

  // ─── Run QA on editedHtml ────────────────────────────────────────
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
        setFixesApplied(Math.max(priorFails - newFails, 0));
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
          liveUrl: liveUrlInput || null,
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

    setEditorStatus("complete");
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
              BUILD EDITOR
            </span>
            {selectedBuild && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                {selectedBuild.businessName} · {selectedBuild.city}
              </span>
            )}
          </div>

          {/* Tab bar */}
          {selectedBuild && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                borderBottom: `1px solid ${COLORS.cardBorder}`,
                background: COLORS.pageBg,
                flexShrink: 0,
              }}
            >
              {([
                { key: "overview" as TabKey, label: "Overview" },
                { key: "editor" as TabKey, label: "HTML Editor" },
                { key: "qa" as TabKey, label: "QA" },
                { key: "history" as TabKey, label: "History" },
              ]).map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      padding: "12px 24px",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: active ? COLORS.accent : COLORS.secondary,
                      background: active ? COLORS.cardBg : "transparent",
                      border: "none",
                      borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                      cursor: "pointer",
                      transition: "color 0.15s, border-color 0.15s",
                    }}
                  >
                    {t.label}
                  </button>
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
                  Select a build from the queue to begin
                </p>
              </div>
            ) : (
              <>
                {/* ── TAB 1: OVERVIEW ──────────────────── */}
                {activeTab === "overview" && (
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.body, margin: "0 0 20px" }}>
                      Job Overview
                    </h2>

                    {/* Info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                      {[
                        { label: "Business Name", value: selectedBuild.businessName },
                        { label: "City", value: selectedBuild.city },
                        { label: "Look / Subtype", value: selectedBuild.look.replace(/_/g, " ") },
                        { label: "CTA", value: selectedBuild.cta },
                        { label: "Services", value: selectedBuild.services.join(", ") || "(none)" },
                        { label: "Tagline", value: selectedBuild.tagline || "(none)" },
                      ].map((item) => (
                        <div key={item.label} style={{ background: COLORS.pageBg, borderRadius: 8, padding: "12px 16px" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, margin: "0 0 4px", textTransform: "uppercase" }}>
                            {item.label}
                          </p>
                          <p style={{ fontSize: 13, color: COLORS.body, margin: 0, fontWeight: 600 }}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Status badges */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                      <div style={{ background: COLORS.pageBg, borderRadius: 8, padding: "12px 20px" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, margin: "0 0 6px", textTransform: "uppercase" }}>
                          Job Status
                        </p>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                          background: selectedBuild.status === "live" ? COLORS.success : selectedBuild.status === "claimed" ? COLORS.accent : COLORS.secondary,
                          color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          {selectedBuild.status}
                        </span>
                      </div>

                      <div style={{ background: COLORS.pageBg, borderRadius: 8, padding: "12px 20px" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, margin: "0 0 6px", textTransform: "uppercase" }}>
                          Editor Status
                        </p>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                          background: editorStatus === "complete" ? COLORS.success : editorStatus === "qa-passed" ? "#F5C842" : editorStatus === "editing" ? COLORS.accent : COLORS.secondary,
                          color: editorStatus === "qa-passed" ? COLORS.body : "#fff",
                          textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          {editorStatus}
                        </span>
                      </div>

                      {qaEditedScore != null && (
                        <div style={{ background: COLORS.pageBg, borderRadius: 8, padding: "12px 20px" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, margin: "0 0 6px", textTransform: "uppercase" }}>
                            QA Score
                          </p>
                          <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(qaEditedScore) }}>
                            {qaEditedScore}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div style={{ background: COLORS.pageBg, borderRadius: 8, padding: "14px 20px" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, margin: "0 0 8px", textTransform: "uppercase" }}>
                        Timeline
                      </p>
                      <div style={{ fontSize: 12, color: COLORS.body, lineHeight: 1.8 }}>
                        <div>Created: {new Date(selectedBuild.createdAt).toLocaleDateString()} ({daysSince(selectedBuild.createdAt)}d ago)</div>
                        {selectedBuild.claimedAt && <div>Claimed: {new Date(selectedBuild.claimedAt).toLocaleDateString()}</div>}
                        {selectedBuild.readyAt && <div>Ready: {new Date(selectedBuild.readyAt).toLocaleDateString()}</div>}
                        {selectedBuild.liveAt && <div>Live: {new Date(selectedBuild.liveAt).toLocaleDateString()}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: HTML EDITOR ───────────────── */}
                {activeTab === "editor" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 4,
                        background: "#e7edf3", color: COLORS.secondary, letterSpacing: "0.06em",
                      }}>
                        Generated (Read Only)
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 4,
                        background: COLORS.accent, color: "#fff", letterSpacing: "0.06em",
                      }}>
                        Edited (Active)
                      </span>
                      <span style={{ fontSize: 11, color: COLORS.secondary, marginLeft: "auto" }}>
                        Edits write to editedHtml — generatedSiteHTML is never modified
                      </span>
                    </div>

                    <HtmlEditor
                      value={editedHtml}
                      onChange={(v) => { setEditedHtml(v); setSaveError(""); }}
                      placeholder="HTML content..."
                      minHeight={320}
                      errorLines={getErrorLines(editedHtml, qaReport)}
                    />

                    {/* Live preview */}
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, margin: "0 0 8px", textTransform: "uppercase" }}>
                        Live Preview
                      </p>
                      <div style={{ border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, overflow: "hidden", height: 300 }}>
                        <iframe
                          srcDoc={editedHtml}
                          title="Preview"
                          sandbox="allow-same-origin"
                          style={{ width: "100%", height: "100%", border: "none" }}
                        />
                      </div>
                    </div>

                    {/* Save button */}
                    {saveError && (
                      <div style={{ marginTop: 12, padding: "10px 16px", background: "#ffe5e5", border: `1px solid ${COLORS.danger}`, borderRadius: 6, fontSize: 12, color: COLORS.danger, fontWeight: 600 }}>
                        {saveError}
                      </div>
                    )}
                    <button
                      onClick={() => saveEditedHtml()}
                      disabled={saving || !editedHtml.trim()}
                      style={{
                        width: "100%",
                        marginTop: 14,
                        background: editedHtml.trim() && !saving ? COLORS.action : "#e7edf3",
                        color: editedHtml.trim() && !saving ? "#fff" : COLORS.secondary,
                        border: "none",
                        borderRadius: 6,
                        padding: "14px 0",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        cursor: editedHtml.trim() && !saving ? "pointer" : "not-allowed",
                      }}
                    >
                      {saving ? "SAVING..." : "SAVE EDITED HTML"}
                    </button>
                  </div>
                )}

                {/* ── TAB 3: QA ────────────────────────── */}
                {activeTab === "qa" && (
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.body, margin: "0 0 6px" }}>
                      QA Analysis
                    </h2>
                    <p style={{ fontSize: 13, color: COLORS.secondary, margin: "0 0 20px" }}>
                      Run QA against your edited HTML. Score must be &gt;= 70 with no blockers to mark complete.
                    </p>

                    {qaEditedScore != null && (
                      <div style={{
                        background: "#fff",
                        border: `1px solid ${scoreColor(qaEditedScore)}`,
                        borderRadius: 10,
                        padding: "18px 24px",
                        marginBottom: 20,
                        textAlign: "center",
                      }}>
                        <p style={{ fontSize: 10, letterSpacing: "0.12em", color: COLORS.secondary, margin: "0 0 6px" }}>
                          EDITED HTML QA SCORE
                        </p>
                        <p style={{ fontSize: 48, fontWeight: 800, color: scoreColor(qaEditedScore), margin: 0, lineHeight: 1 }}>
                          {qaEditedScore}<span style={{ fontSize: 18, color: COLORS.secondary }}>/100</span>
                        </p>
                      </div>
                    )}

                    {qaGateMessage && (
                      <div style={{ marginBottom: 16, padding: "10px 16px", background: "#ffe5e5", border: `1px solid ${COLORS.danger}`, borderRadius: 6, fontSize: 12, color: COLORS.danger, fontWeight: 600 }}>
                        {qaGateMessage}
                      </div>
                    )}

                    <button
                      onClick={runQa}
                      disabled={!editedHtml.trim() || qaRunning}
                      style={{
                        width: "100%",
                        marginBottom: 20,
                        background: editedHtml.trim() && !qaRunning ? COLORS.action : "#e7edf3",
                        color: editedHtml.trim() && !qaRunning ? "#fff" : COLORS.secondary,
                        border: "none",
                        borderRadius: 6,
                        padding: "14px 0",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        cursor: editedHtml.trim() && !qaRunning ? "pointer" : "not-allowed",
                      }}
                    >
                      {qaRunning ? "RUNNING QA..." : "RUN QA ANALYSIS"}
                    </button>

                    {qaReport && (
                      <QaResults
                        title=""
                        subtitle=""
                        report={qaReport}
                        onAutofix={autofix}
                        autofixing={autofixing}
                        fixesApplied={fixesApplied}
                        onDownload={downloadQaReport}
                        actionLabel={null}
                        onAction={() => {}}
                        onErrorLineClick={() => {
                          setActiveTab("editor");
                        }}
                      />
                    )}

                    {/* Mark Complete section */}
                    <div style={{ marginTop: 24, padding: "20px 24px", background: COLORS.pageBg, borderRadius: 10, border: `1px solid ${COLORS.cardBorder}` }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.body, margin: "0 0 12px" }}>
                        Mark Complete
                      </h3>

                      {/* Gate indicators */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ color: qaEditedScore != null && qaEditedScore >= 70 ? COLORS.success : COLORS.danger, fontWeight: 700 }}>
                            {qaEditedScore != null && qaEditedScore >= 70 ? "PASS" : "FAIL"}
                          </span>
                          <span style={{ color: COLORS.body }}>QA score &gt;= 70 {qaEditedScore != null ? `(current: ${qaEditedScore})` : "(not run)"}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ color: qaReport && !qaReport.passes.some(p => p.checks.some(c => !c.passed && c.severity === "blocker")) ? COLORS.success : COLORS.danger, fontWeight: 700 }}>
                            {qaReport && !qaReport.passes.some(p => p.checks.some(c => !c.passed && c.severity === "blocker")) ? "PASS" : "FAIL"}
                          </span>
                          <span style={{ color: COLORS.body }}>No blocker failures</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ color: qaHash ? COLORS.success : COLORS.danger, fontWeight: 700 }}>
                            {qaHash ? "PASS" : "FAIL"}
                          </span>
                          <span style={{ color: COLORS.body }}>HTML hash matches last QA run</span>
                        </div>
                      </div>

                      {/* Live URL input for completion */}
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.secondary, margin: "0 0 6px", textTransform: "uppercase" }}>
                          Live URL (optional)
                        </p>
                        <input
                          type="url"
                          value={liveUrlInput}
                          onChange={(e) => setLiveUrlInput(e.target.value)}
                          placeholder="https://client-site.vercel.app"
                          style={{
                            width: "100%",
                            background: "#fff",
                            border: `1px solid ${COLORS.cardBorder}`,
                            borderRadius: 4,
                            padding: "8px 12px",
                            fontSize: 12,
                            color: COLORS.body,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <button
                        onClick={markBuildComplete}
                        disabled={buildCompleted}
                        style={{
                          width: "100%",
                          background: !buildCompleted ? COLORS.success : "#e7edf3",
                          color: !buildCompleted ? "#fff" : COLORS.secondary,
                          border: "none",
                          borderRadius: 6,
                          padding: "14px 0",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          cursor: !buildCompleted ? "pointer" : "not-allowed",
                        }}
                      >
                        {buildCompleted ? "BUILD COMPLETE" : "MARK COMPLETE"}
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
                          ASSEMBLE FINAL PACK
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 4: HISTORY ───────────────────── */}
                {activeTab === "history" && (
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.body, margin: "0 0 20px" }}>
                      Edit History
                    </h2>

                    {editHistory.length === 0 ? (
                      <div style={{
                        border: `1px dashed ${COLORS.cardBorder}`,
                        borderRadius: 8,
                        padding: 40,
                        textAlign: "center",
                        background: COLORS.pageBg,
                      }}>
                        <p style={{ fontSize: 12, color: COLORS.secondary, margin: 0 }}>
                          No history entries yet. Save HTML or run QA to create entries.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {editHistory.map((entry, i) => (
                          <div
                            key={`${entry.timestamp}-${i}`}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 14,
                              padding: "14px 0",
                              borderBottom: i < editHistory.length - 1 ? `1px solid ${COLORS.cardBorder}` : "none",
                            }}
                          >
                            {/* Timeline dot */}
                            <div style={{
                              width: 10, height: 10, borderRadius: "50%",
                              background: COLORS.accent, marginTop: 4, flexShrink: 0,
                            }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.body }}>
                                  {entry.action}
                                </span>
                                <span style={{
                                  fontSize: 10, fontFamily: 'Menlo, Consolas, "Courier New", monospace',
                                  color: COLORS.accent, background: COLORS.pageBg, padding: "2px 6px",
                                  borderRadius: 3,
                                }}>
                                  {entry.hash.slice(0, 8)}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.secondary }}>
                                {entry.dev} · {new Date(entry.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
