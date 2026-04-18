"use client";

import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CampaignClient, CampaignDirection } from "@/lib/campaign";

/* ─── Error Boundary ─────────────────────────────────────────────────────── */

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Dashboard error boundary caught:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 32 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: 0 }}>Dashboard Error</h1>
          <pre style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 16, color: "#ef4444", fontSize: 12, maxWidth: 600, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {this.state.error?.message}{"\n"}{this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Constants ───────────────────────────────────────────────────────────── */

const NAVY = "#1B2A4A";
const GOLD = "#F5C842";
const RAIL_BG = "#2d3e50";

const AD_DIMS: Record<string, string> = {
  "1/8 page": '3.65" x 2.5"',
  "1/4 page": '3.65" x 5"',
  "1/2 page": '7.5" x 5"',
  "full page": '7.5" x 10" (bleed: 8.625" x 11.125")',
  "front cover": '7.5" x 10" (bleed: 8.625" x 11.125")',
};

const STAGE_COLORS: Record<string, string> = {
  intake: "#64748b",
  tearsheet: "#f59e0b",
  approved: "#22c55e",
  production: "#3b82f6",
  delivered: GOLD,
};
const STAGE_LABELS: Record<string, string> = {
  intake: "Intake",
  tearsheet: "Tearsheet",
  approved: "Approved",
  production: "Production",
  delivered: "Delivered",
};
const STAGE_ORDER: CampaignClient["stage"][] = ["intake", "tearsheet", "approved", "production", "delivered"];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getRepFromCookie() {
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const parts = cookie.trim().split("=");
      const key = parts[0];
      const value = parts.slice(1).join("=");
      if (key === "campaign_user") {
        const parsed = JSON.parse(decodeURIComponent(value));
        const result = { username: parsed.username, name: parsed.username, role: parsed.role };
        console.log("getRepFromCookie result:", result);
        return result;
      }
    }
  } catch (e) {
    console.error("getRepFromCookie error:", e);
  }
  console.log("getRepFromCookie result: null (no campaign_user cookie found)");
  return null;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function oppScoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

interface CsIntelEntry {
  businessName: string;
  health?: string;
  nps?: number;
  churn?: string;
  lastContact?: string;
  notes?: string;
  [key: string]: unknown;
}

interface CrmResult {
  id: string;
  name: string;
  status: string;
  dealValue: string;
  dealStage: string;
  lastActivity: string;
}

type ActivePanel = "pipeline" | "bruno" | "territory" | "crm" | "csIntel";
type ActiveTab = "priority" | "pipeline" | "review" | "stats";

/* ─── Icon SVGs ───────────────────────────────────────────────────────────── */

function GridIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1.5" fill={color} />
      <rect x="11" y="2" width="7" height="7" rx="1.5" fill={color} />
      <rect x="2" y="11" width="7" height="7" rx="1.5" fill={color} />
      <rect x="11" y="11" width="7" height="7" rx="1.5" fill={color} />
    </svg>
  );
}
function BrunoIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="2" />
      <text x="10" y="14" textAnchor="middle" fill={color} fontSize="11" fontWeight="800" fontFamily="DM Sans, sans-serif">B</text>
    </svg>
  );
}
function MapPinIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2C6.69 2 4 4.69 4 8c0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" fill={color} />
    </svg>
  );
}
function SearchIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke={color} strokeWidth="2" />
      <path d="M14 14l4 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ChartIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="10" width="3" height="8" rx="1" fill={color} />
      <rect x="8.5" y="5" width="3" height="13" rx="1" fill={color} />
      <rect x="14" y="2" width="3" height="16" rx="1" fill={color} />
    </svg>
  );
}
function BellIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5c-.3.5.1 1 .6 1H17c.5 0 .9-.5.6-1L16 11V8a6 6 0 00-6-6z" fill={color} />
      <path d="M8 16a2 2 0 004 0" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function CampaignDashboardPage() {
  const router = useRouter();

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [rep, setRep] = useState({ username: "", name: "", role: "" });
  const [clients, setClients] = useState<CampaignClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CampaignClient | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>("pipeline");
  const [activeTab, setActiveTab] = useState<ActiveTab>("priority");
  const [clock, setClock] = useState(new Date());
  const [toast, setToast] = useState("");

  // Drawer actions
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [sendingCard, setSendingCard] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "campaign" | "messages" | "crm">("overview");
  const [drawerMessages, setDrawerMessages] = useState<Array<{ role: string; content: string; timestamp: string }>>([]);

  // Bruno VA
  const [brunoMessages, setBrunoMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [brunoInput, setBrunoInput] = useState("");
  const [brunoLoading, setBrunoLoading] = useState(false);
  const brunoEndRef = useRef<HTMLDivElement>(null);

  // Territory
  const [scanZip, setScanZip] = useState("");
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // CRM
  const [crmQuery, setCrmQuery] = useState("");
  const [crmResults, setCrmResults] = useState<CrmResult[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);

  // CS Intel
  const [csIntelData, setCsIntelData] = useState<CsIntelEntry[]>([]);
  const [csUploading, setCsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bruno search bar
  const [brunoBarQuery, setBrunoBarQuery] = useState("");
  const [brunoBarLoading, setBrunoBarLoading] = useState(false);
  const [brunoBarResponse, setBrunoBarResponse] = useState("");

  // Close CRM leads
  interface CloseLead {
    id: string; businessName: string; status: string; contactName: string;
    phone: string; email: string; agreementNumber: string; adType: string;
    cadence: string; monthly: string; firstEdition: string; lastEdition: string;
    renewStatus: string; publications: string; region: string; dvl: string;
    saleItems: string; closeUrl: string; dealValue: number; dealStatus: string;
  }
  const [closeLeads, setCloseLeads] = useState<CloseLead[]>([]);
  const [closeLoading, setCloseLoading] = useState(true);
  const [closeError, setCloseError] = useState("");
  const [closeSearch, setCloseSearch] = useState("");
  const [closeFilter, setCloseFilter] = useState<"all" | "active" | "renewable" | "cancelled">("all");

  /* ── Init ───────────────────────────────────────────────────────────────── */

  useEffect(() => {
    console.log("Dashboard mount - cookies:", document.cookie);
    console.log("Campaign user cookie:", document.cookie.match(/campaign_user=([^;]+)/)?.[1]);
    const r = getRepFromCookie();
    if (!r) { console.log("No cookie found — redirecting to login"); router.push("/campaign/login"); return; }
    setRep(r);
    loadClients(r.username);
    loadCloseLeads(r.name);
    // Load CS Intel from localStorage
    try {
      const stored = localStorage.getItem(`cs_intel_${r.username}`);
      if (stored) setCsIntelData(JSON.parse(stored));
    } catch { /* ignore */ }
    const clockInterval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Poll every 30s
  useEffect(() => {
    if (!rep.username) return;
    const i = setInterval(() => loadClients(rep.username), 30000);
    return () => clearInterval(i);
  }, [rep.username]);

  // Scroll Bruno chat
  useEffect(() => {
    brunoEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [brunoMessages]);

  const loadClients = useCallback(async (repId: string) => {
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb
          .from("campaign_clients")
          .select("*")
          .eq("rep_id", repId)
          .order("created_at", { ascending: false });
        if (data) setClients(data as CampaignClient[]);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  async function loadCloseLeads(repName: string) {
    setCloseLoading(true);
    setCloseError("");
    try {
      const res = await fetch("/api/campaign/close-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repName }),
      });
      const data = await res.json();
      if (data.error) setCloseError(data.error);
      setCloseLeads(data.leads || []);
    } catch {
      setCloseError("Unable to load Close CRM data");
    }
    setCloseLoading(false);
  }

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleSignOut() {
    document.cookie = "campaign_user=; path=/; max-age=0";
    document.cookie = "dc_session=; path=/; max-age=0";
    try { localStorage.removeItem("dc_auth_token"); } catch { /* */ }
    router.push("/campaign/login");
  }

  function selectClient(c: CampaignClient) {
    setSelected(c);
    setDrawerOpen(true);
    setMsgInput("");
  }

  /* ── API Actions ────────────────────────────────────────────────────────── */

  async function updateStage(clientId: string, newStage: string) {
    try {
      await fetch(`/api/campaign/stage/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, stage: newStage as CampaignClient["stage"] } : c));
      setSelected((prev) => prev && prev.id === clientId ? { ...prev, stage: newStage as CampaignClient["stage"] } : prev);
      showToast(`Stage updated to ${STAGE_LABELS[newStage]}`);
    } catch { /* ignore */ }
  }

  async function sendCampaignLink() {
    if (!selected) return;
    setSendingLink(true);
    try {
      await fetch("/api/campaign/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selected.id }),
      });
      showToast("Campaign link sent!");
    } catch { showToast("Send failed"); }
    setSendingLink(false);
  }

  function copyTearsheetLink() {
    if (!selected) return;
    const link = `${window.location.origin}/campaign/tearsheet/${selected.id}`;
    navigator.clipboard.writeText(link);
    showToast("Tearsheet link copied!");
  }

  async function sendCard() {
    if (!selected) return;
    setSendingCard(true);
    try {
      await fetch("/api/campaign/send-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: selected.business_name, city: selected.city }),
      });
      showToast("Card sent!");
    } catch { showToast("Card send failed"); }
    setSendingCard(false);
  }

  async function sendRepMessage() {
    if (!msgInput.trim() || !selected || msgSending) return;
    setMsgSending(true);
    try {
      const res = await fetch(`/api/campaign/message/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "rep", content: msgInput }),
      });
      const data = await res.json();
      if (data.messages) {
        setSelected((prev) => prev ? { ...prev, messages: data.messages } as unknown as CampaignClient : prev);
        setClients((prev) => prev.map((c) => c.id === selected.id ? { ...c, messages: data.messages } as unknown as CampaignClient : c));
      }
      setMsgInput("");
    } catch { /* ignore */ }
    setMsgSending(false);
  }

  // Bruno VA (panel)
  async function askBrunoPanel() {
    if (!brunoInput.trim() || brunoLoading) return;
    const userMsg = { role: "user" as const, content: brunoInput };
    const newMsgs = [...brunoMessages, userMsg];
    setBrunoMessages(newMsgs);
    setBrunoInput("");
    setBrunoLoading(true);
    const pipelineSummary = clients.map((c) => {
      const cSbr = (c.sbr_data || {}) as Record<string, unknown>;
      return {
        name: c.business_name, city: c.city, stage: c.stage,
        adSize: c.ad_size, daysSince: daysSince(c.created_at),
        score: (cSbr.opportunityScore as number) || 0,
      };
    });
    try {
      const res = await fetch("/api/campaign/bruno-va", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, pipeline: pipelineSummary }),
      });
      const data = await res.json();
      setBrunoMessages((prev) => [...prev, { role: "assistant", content: data.response || "No response." }]);
    } catch {
      setBrunoMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong." }]);
    }
    setBrunoLoading(false);
  }

  // Bruno bar (top bar)
  async function askBrunoBar() {
    if (!brunoBarQuery.trim() || brunoBarLoading) return;
    setBrunoBarLoading(true);
    setBrunoBarResponse("");
    const pipelineSummary = clients.map((c) => {
      const cSbr = (c.sbr_data || {}) as Record<string, unknown>;
      return {
        name: c.business_name, city: c.city, stage: c.stage,
        adSize: c.ad_size, daysSince: daysSince(c.created_at),
        score: (cSbr.opportunityScore as number) || 0,
      };
    });
    try {
      const res = await fetch("/api/campaign/bruno-va", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: brunoBarQuery }], pipeline: pipelineSummary }),
      });
      const data = await res.json();
      setBrunoBarResponse(data.response || "No response.");
    } catch {
      setBrunoBarResponse("Something went wrong.");
    }
    setBrunoBarLoading(false);
  }

  // Territory scan
  async function runTerritoryScan() {
    if (!scanZip.trim()) return;
    setScanLoading(true);
    try {
      const res = await fetch("/api/campaign/sbr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "Territory Scan", city: "", zip: scanZip, category: "general" }),
      });
      setScanResult(await res.json());
    } catch { setScanResult(null); }
    setScanLoading(false);
  }

  // CRM search
  async function searchCrm() {
    if (!crmQuery.trim()) return;
    setCrmLoading(true);
    try {
      const res = await fetch("/api/campaign/crm-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: crmQuery }),
      });
      const data = await res.json();
      setCrmResults(data.results || []);
    } catch { setCrmResults([]); }
    setCrmLoading(false);
  }

  // CS Intel upload
  async function handleCsIntelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsUploading(true);

    // Load SheetJS from CDN if not loaded
    if (!(window as unknown as Record<string, unknown>).XLSX) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load SheetJS"));
        document.head.appendChild(script);
      });
    }

    try {
      const data = await file.arrayBuffer();
      const XLSX = (window as unknown as Record<string, unknown>).XLSX as {
        read: (d: ArrayBuffer, opts: { type: string }) => { Sheets: Record<string, unknown>; SheetNames: string[] };
        utils: { sheet_to_json: (s: unknown) => Record<string, unknown>[] };
      };
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

      // Try to find rep name column and filter
      const repName = rep.name.toLowerCase();
      const repUsername = rep.username.toLowerCase();

      const filtered = rows.filter((row) => {
        return Object.values(row).some((val) => {
          if (typeof val !== "string") return false;
          const lower = val.toLowerCase();
          return lower.includes(repName) || lower.includes(repUsername);
        });
      });

      const entries: CsIntelEntry[] = (filtered.length > 0 ? filtered : rows).map((row) => {
        // Flexibly extract fields
        const findField = (candidates: string[]): string => {
          for (const key of Object.keys(row)) {
            if (candidates.some((c) => key.toLowerCase().includes(c))) {
              return String(row[key] || "");
            }
          }
          return "";
        };
        return {
          businessName: findField(["business", "company", "name", "client", "account"]) || "Unknown",
          health: findField(["health", "status", "risk"]) || undefined,
          nps: (() => { const v = findField(["nps", "score", "satisfaction"]); return v ? Number(v) : undefined; })(),
          churn: findField(["churn", "cancel", "attrition"]) || undefined,
          lastContact: findField(["last contact", "last_contact", "contacted", "touch"]) || undefined,
          notes: findField(["note", "comment", "remark"]) || undefined,
        };
      });

      setCsIntelData(entries);
      localStorage.setItem(`cs_intel_${rep.username}`, JSON.stringify(entries));
      showToast(`Imported ${entries.length} CS Intel records`);
    } catch (err) {
      showToast("Failed to parse file");
      console.error(err);
    }
    setCsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Delivery Pack print
  function printDeliveryPack() {
    if (!selected) return;
    const approvedDir = selected.generated_directions?.find((d: CampaignDirection) => d.name === selected.selected_direction);
    const dims = AD_DIMS[selected.ad_size] || "";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Delivery Pack - ${selected.business_name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; color: #1B2A4A; padding: 40px; }
  h1 { font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 4px; }
  h2 { font-family: 'Playfair Display', serif; font-size: 18px; color: #1B2A4A; margin: 24px 0 12px; border-bottom: 2px solid #F5C842; padding-bottom: 6px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1B2A4A; }
  .badge { display: inline-block; background: #F5C842; color: #1B2A4A; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 14px; }
  .grid dt { color: #7a8a9a; font-weight: 500; }
  .grid dd { font-weight: 700; margin: 0; }
  .specs { background: #f8fafc; border: 1px solid #e5e9ef; border-radius: 8px; padding: 16px; margin-top: 16px; }
  .specs li { margin-bottom: 4px; font-size: 13px; }
  .img-container { text-align: center; margin: 16px 0; }
  .img-container img { max-width: 400px; border-radius: 8px; border: 1px solid #e5e9ef; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <div>
    <h1>${selected.business_name}</h1>
    <p style="color:#7a8a9a;font-size:14px;">${selected.city} &middot; ${selected.category}</p>
  </div>
  <div style="text-align:right;">
    <span class="badge">${STAGE_LABELS[selected.stage]}</span>
    <p style="font-size:11px;color:#7a8a9a;margin-top:4px;">Campaign ID: ${selected.id.slice(0, 8)}</p>
  </div>
</div>

<h2>Campaign Brief</h2>
<dl class="grid">
  <dt>Ad Size</dt><dd>${selected.ad_size}</dd>
  <dt>Dimensions</dt><dd>${dims}</dd>
  <dt>Tagline</dt><dd>${selected.tagline || "—"}</dd>
  <dt>Services</dt><dd>${selected.services}</dd>
  <dt>ZIP</dt><dd>${selected.zip}</dd>
  <dt>Rep</dt><dd>${selected.rep_id}</dd>
</dl>

${approvedDir?.imageUrl ? `<h2>Approved Direction: ${selected.selected_direction}</h2>
<div class="img-container"><img src="${approvedDir.imageUrl}" alt="${approvedDir.name}" /></div>
<p style="font-size:13px;color:#7a8a9a;margin-top:4px;">${approvedDir.description || ""}</p>` : ""}

<h2>Production Specifications</h2>
<ul class="specs">
  <li><strong>Color Mode:</strong> CMYK</li>
  <li><strong>Resolution:</strong> 300 dpi minimum</li>
  <li><strong>Bleed:</strong> 0.125" on all sides</li>
  <li><strong>Safe Zone:</strong> 0.25" from trim on all sides</li>
  <li><strong>Visual Border:</strong> Required</li>
  <li><strong>Trim Size:</strong> ${dims}</li>
  <li><strong>File Format:</strong> Press-ready PDF (PDF/X-1a preferred)</li>
</ul>

<p style="margin-top:32px;font-size:11px;color:#b0b8c4;text-align:center;">BVM Design Center &middot; Delivery Pack &middot; Generated ${new Date().toLocaleDateString()}</p>
</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  /* ── Derived ────────────────────────────────────────────────────────────── */

  const repInitials = initials(rep.name);
  const activeClients = clients.filter((c) => c.stage !== "delivered");
  const messages: Array<{ role: string; content: string; timestamp: string }> = selected
    ? (Array.isArray((selected as unknown as Record<string, unknown>).messages)
      ? ((selected as unknown as Record<string, unknown>).messages as Array<{ role: string; content: string; timestamp: string }>)
      : [])
    : [];

  const approvedDir = selected?.generated_directions?.find((d: CampaignDirection) => d.name === selected.selected_direction);
  const sbr = selected ? ((selected.sbr_data || {}) as Record<string, unknown>) : {};
  const oppScore = (sbr.opportunityScore as number) || 0;

  // CS Intel match for selected client
  const csMatch = selected
    ? csIntelData.find((e) => e.businessName.toLowerCase() === selected.business_name.toLowerCase())
    : null;

  // Notification count: clients stuck > 7 days or no messages > 3 days
  const notifCount = clients.filter((c) => {
    if (c.stage === "delivered") return false;
    const days = daysSince(c.created_at);
    const msgs = (c as unknown as Record<string, unknown>).messages as Array<{ timestamp: string }> | undefined;
    const lastMsg = msgs && msgs.length > 0 ? daysSince(msgs[msgs.length - 1].timestamp) : days;
    return days > 7 || lastMsg > 3;
  }).length;

  // Renewal check: within 60 days
  function isRenewal(c: CampaignClient): boolean {
    if (!c.approved_at) return false;
    const approvedDate = new Date(c.approved_at);
    const renewalDate = new Date(approvedDate.getTime() + 305 * 86400000); // ~10 months
    const daysToRenewal = Math.floor((renewalDate.getTime() - Date.now()) / 86400000);
    return daysToRenewal >= 0 && daysToRenewal <= 60;
  }

  // CS health badge for a client
  function getCsHealth(c: CampaignClient): CsIntelEntry | undefined {
    return csIntelData.find((e) => e.businessName.toLowerCase() === c.business_name.toLowerCase());
  }

  function healthBadgeColor(health?: string): string {
    if (!health) return "#94a3b8";
    const h = health.toLowerCase();
    if (h.includes("good") || h.includes("healthy") || h.includes("green")) return "#22c55e";
    if (h.includes("risk") || h.includes("yellow") || h.includes("warn")) return "#f59e0b";
    return "#ef4444";
  }

  /* ── Loading ────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Render Tabs ────────────────────────────────────────────────────────── */

  function renderPriorityQueue() {
    return (
      <div>
        <div style={{ padding: "16px 24px 8px", display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#1a2332", margin: 0 }}>
            {activeClients.length} Active Campaigns
          </h2>
        </div>
        <div style={{ padding: "0 24px" }}>
          {activeClients.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: "#7a8a9a", fontSize: 14 }}>No active campaigns.</p>
              <Link href="/campaign/intake" style={{ color: GOLD, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Start a new campaign →</Link>
            </div>
          ) : activeClients.map((c) => {
            const cSbr = (c.sbr_data || {}) as Record<string, unknown>;
            const score = (cSbr.opportunityScore as number) || 0;
            const csH = getCsHealth(c);
            const renewal = isRenewal(c);
            const cMsgs = (c as unknown as Record<string, unknown>).messages as Array<{ timestamp: string }> | undefined;
            const pastDue = (cSbr.amount as number) || 0;
            return (
              <div
                key={c.id}
                onClick={() => selectClient(c)}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
                  borderBottom: "1px solid #edf0f4", cursor: "pointer",
                  background: selected?.id === c.id ? "#fffbea" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                {/* Initials circle */}
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", background: RAIL_BG, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, flexShrink: 0,
                }}>
                  {initials(c.business_name)}
                </div>

                {/* Name + city */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2332", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.business_name}
                  </div>
                  <div style={{ fontSize: 11, color: "#7a8a9a" }}>{c.city}</div>
                </div>

                {/* Ad size badge */}
                <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                  {c.ad_size}
                </span>

                {/* Stage badge */}
                <span style={{
                  background: `${STAGE_COLORS[c.stage]}18`,
                  color: STAGE_COLORS[c.stage],
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap",
                }}>
                  {STAGE_LABELS[c.stage]}
                </span>

                {/* Opp score */}
                {score > 0 && (
                  <span style={{
                    background: `${oppScoreColor(score)}18`,
                    color: oppScoreColor(score),
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                  }}>
                    {score}
                  </span>
                )}

                {/* CS health */}
                {csH && (
                  <span style={{
                    background: `${healthBadgeColor(csH.health)}18`,
                    color: healthBadgeColor(csH.health),
                    fontSize: 9, fontWeight: 700, padding: "3px 6px", borderRadius: 6,
                  }}>
                    CS
                  </span>
                )}

                {/* Renewal flag */}
                {renewal && (
                  <span style={{ background: "#dbeafe", color: "#2563eb", fontSize: 9, fontWeight: 700, padding: "3px 6px", borderRadius: 6 }}>
                    RENEWAL
                  </span>
                )}

                {/* Past due */}
                {pastDue > 0 && (
                  <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 9, fontWeight: 700, padding: "3px 6px", borderRadius: 6 }}>
                    ${pastDue}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Close CRM Book ──────────────────────────────────────────────── */}
        <div style={{ padding: "24px 24px 8px", borderTop: "2px solid #e5e9ef", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#1a2332", margin: 0 }}>
              Your Close CRM Book
            </h2>
            <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>
              {closeLeads.length} leads
            </span>
          </div>

          {closeError && (
            <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
              {closeError}
            </div>
          )}

          {/* Search + filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              type="text"
              value={closeSearch}
              onChange={(e) => setCloseSearch(e.target.value)}
              placeholder="Search your book..."
              style={{ flex: 1, minWidth: 160, padding: "7px 12px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, outline: "none", boxSizing: "border-box" }}
            />
            {(["all", "active", "renewable", "cancelled"] as const).map((f) => (
              <button key={f} onClick={() => setCloseFilter(f)} style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: closeFilter === f ? GOLD : "#f8fafc",
                color: closeFilter === f ? NAVY : "#7a8a9a",
                border: closeFilter === f ? "none" : "1px solid #e5e9ef",
                textTransform: "capitalize",
              }}>{f}</button>
            ))}
          </div>

          {closeLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ height: 48, background: "#f1f5f9", borderRadius: 8, animation: "pulse 1.5s ease infinite" }} />
              ))}
            </div>
          ) : (() => {
            const searchLower = closeSearch.toLowerCase();
            const filteredClose = closeLeads.filter((l) => {
              if (closeFilter === "active" && (l.status === "Cancelled" || l.renewStatus === "Cancelled")) return false;
              if (closeFilter === "renewable" && l.renewStatus !== "Renewable") return false;
              if (closeFilter === "cancelled" && l.status !== "Cancelled") return false;
              if (searchLower && !l.businessName.toLowerCase().includes(searchLower) && !l.agreementNumber.toLowerCase().includes(searchLower) && !l.adType.toLowerCase().includes(searchLower) && !l.publications.toLowerCase().includes(searchLower)) return false;
              return true;
            });
            const daysUntil = (dateStr: string) => {
              if (!dateStr) return 999;
              return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
            };
            return filteredClose.length === 0 ? (
              <p style={{ color: "#7a8a9a", fontSize: 13, padding: "20px 0", textAlign: "center" }}>No matching leads.</p>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {filteredClose.map((l) => {
                  const lastEdDays = daysUntil(l.lastEdition);
                  return (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #edf0f4", fontSize: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: RAIL_BG, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {initials(l.businessName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#1a2332", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.businessName}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.publications}</div>
                      </div>
                      {l.agreementNumber && <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 5, whiteSpace: "nowrap" }}>{l.agreementNumber}</span>}
                      {l.adType && <span style={{ background: `${NAVY}15`, color: NAVY, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, whiteSpace: "nowrap" }}>{l.adType}</span>}
                      {l.monthly && parseFloat(l.monthly) > 0 && <span style={{ background: `${GOLD}20`, color: "#92400e", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, whiteSpace: "nowrap" }}>${l.monthly}/mo</span>}
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, whiteSpace: "nowrap",
                        background: l.renewStatus === "Renewable" ? "#dcfce720" : l.status === "Cancelled" ? "#fef2f220" : "#f1f5f9",
                        color: l.renewStatus === "Renewable" ? "#16a34a" : l.status === "Cancelled" ? "#dc2626" : "#64748b",
                      }}>{l.renewStatus || l.status}</span>
                      {lastEdDays <= 60 && lastEdDays > -999 && <span style={{ background: "#fffbeb", color: "#d97706", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, whiteSpace: "nowrap" }}>{lastEdDays > 0 ? `${lastEdDays}d` : "Past"}</span>}
                      <a href={l.closeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", fontSize: 10, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Close →</a>
                      <Link href={`/campaign/intake?businessName=${encodeURIComponent(l.businessName)}&phone=${encodeURIComponent(l.phone)}&email=${encodeURIComponent(l.email)}&adType=${encodeURIComponent(l.adType)}`} style={{ background: GOLD, color: NAVY, fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 5, textDecoration: "none", whiteSpace: "nowrap" }}>
                        Campaign →
                      </Link>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  function renderPipelineKanban() {
    return (
      <div style={{ display: "flex", gap: 12, padding: 20, overflowX: "auto", height: "100%" }}>
        {STAGE_ORDER.map((stage) => {
          const stageClients = clients.filter((c) => c.stage === stage);
          return (
            <div key={stage} style={{ minWidth: 220, flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #e5e9ef", display: "flex", flexDirection: "column" }}>
              <div style={{
                padding: "12px 14px", borderBottom: "1px solid #e5e9ef",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_COLORS[stage] }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2332" }}>{STAGE_LABELS[stage]}</span>
                <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{stageClients.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                {stageClients.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectClient(c)}
                    style={{
                      background: "#f8fafc", borderRadius: 8, padding: "10px 12px", marginBottom: 8,
                      cursor: "pointer", border: "1px solid #edf0f4",
                      transition: "box-shadow 0.15s",
                    }}
                    onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2332", marginBottom: 3 }}>{c.business_name}</div>
                    <div style={{ fontSize: 11, color: "#7a8a9a", marginBottom: 4 }}>{c.city}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>{c.ad_size}</span>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>{daysSince(c.created_at)}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderAmReview() {
    const needsAttention = clients.filter((c) => {
      if (c.stage === "delivered") return false;
      const days = daysSince(c.created_at);
      const msgs = (c as unknown as Record<string, unknown>).messages as Array<{ timestamp: string }> | undefined;
      const lastMsgDays = msgs && msgs.length > 0 ? daysSince(msgs[msgs.length - 1].timestamp) : days;
      return days > 7 || lastMsgDays > 3;
    });

    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#1a2332", margin: "0 0 16px" }}>
          Clients Needing Attention ({needsAttention.length})
        </h2>
        {needsAttention.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#7a8a9a", fontSize: 14 }}>
            All clients are on track.
          </div>
        ) : needsAttention.map((c) => {
          const days = daysSince(c.created_at);
          const msgs = (c as unknown as Record<string, unknown>).messages as Array<{ timestamp: string }> | undefined;
          const lastMsgDays = msgs && msgs.length > 0 ? daysSince(msgs[msgs.length - 1].timestamp) : days;
          const stuckStage = days > 7;
          const noComms = lastMsgDays > 3;

          return (
            <div
              key={c.id}
              onClick={() => selectClient(c)}
              style={{
                background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16,
                marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2332" }}>{c.business_name}</div>
                <div style={{ fontSize: 12, color: "#7a8a9a" }}>{c.city} — {STAGE_LABELS[c.stage]}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {stuckStage && (
                  <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                    Stuck {days}d
                  </span>
                )}
                {noComms && (
                  <span style={{ background: "#fff7ed", color: "#ea580c", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                    No msgs {lastMsgDays}d
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, whiteSpace: "nowrap" }}>
                {stuckStage && noComms ? "Send follow-up" : stuckStage ? "Advance stage" : "Send message"}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderStats() {
    const stageCounts: Record<string, number> = {};
    clients.forEach((c) => { stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1; });

    const deliveredClients = clients.filter((c) => c.stage === "delivered");
    const avgDeliveryDays = deliveredClients.length > 0
      ? Math.round(deliveredClients.reduce((sum, c) => sum + daysSince(c.created_at), 0) / deliveredClients.length)
      : 0;

    const adSizeCounts: Record<string, number> = {};
    clients.forEach((c) => { adSizeCounts[c.ad_size] = (adSizeCounts[c.ad_size] || 0) + 1; });

    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#1a2332", margin: "0 0 16px" }}>Campaign Stats</h2>

        {/* Stage counts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 24 }}>
          {STAGE_ORDER.map((s) => (
            <div key={s} style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: STAGE_COLORS[s] }}>{stageCounts[s] || 0}</div>
              <div style={{ fontSize: 11, color: "#7a8a9a", fontWeight: 600 }}>{STAGE_LABELS[s]}</div>
            </div>
          ))}
          <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: NAVY }}>{clients.length}</div>
            <div style={{ fontSize: 11, color: "#7a8a9a", fontWeight: 600 }}>Total</div>
          </div>
        </div>

        {/* Avg days */}
        <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 6 }}>Average Days to Delivery</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1a2332" }}>
            {avgDeliveryDays > 0 ? `${avgDeliveryDays} days` : "—"}
          </div>
        </div>

        {/* Ad size breakdown */}
        <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 12 }}>Ad Size Breakdown</div>
          {Object.entries(adSizeCounts).sort((a, b) => b[1] - a[1]).map(([size, count]) => (
            <div key={size} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2332", width: 100 }}>{size}</span>
              <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(count / clients.length) * 100}%`, background: GOLD, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", width: 30, textAlign: "right" }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Close CRM Stats */}
        {closeLeads.length > 0 && (() => {
          const activeLeads = closeLeads.filter((l) => l.status !== "Cancelled");
          const cancelledLeads = closeLeads.filter((l) => l.status === "Cancelled");
          const renewableLeads = closeLeads.filter((l) => l.renewStatus === "Renewable");
          const totalMRV = closeLeads.reduce((sum, l) => sum + (parseFloat(l.monthly) || 0), 0);
          const digitalLeads = closeLeads.filter((l) => l.saleItems.toLowerCase().includes("digital"));
          return (
            <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 12 }}>Close CRM — Your Book</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1a2332" }}>{closeLeads.length}</div>
                  <div style={{ fontSize: 10, color: "#7a8a9a", fontWeight: 600 }}>Total Leads</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{activeLeads.length}</div>
                  <div style={{ fontSize: 10, color: "#7a8a9a", fontWeight: 600 }}>Active</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#dc2626" }}>{cancelledLeads.length}</div>
                  <div style={{ fontSize: 10, color: "#7a8a9a", fontWeight: 600 }}>Cancelled</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: GOLD }}>${totalMRV.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: 10, color: "#7a8a9a", fontWeight: 600 }}>Monthly Revenue</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#3b82f6" }}>{renewableLeads.length}</div>
                  <div style={{ fontSize: 10, color: "#7a8a9a", fontWeight: 600 }}>Renewable</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#8b5cf6" }}>{closeLeads.length > 0 ? Math.round((digitalLeads.length / closeLeads.length) * 100) : 0}%</div>
                  <div style={{ fontSize: 10, color: "#7a8a9a", fontWeight: 600 }}>Digital</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  /* ── Render Center Panels (non-pipeline) ────────────────────────────────── */

  function renderBrunoPanel() {
    const chips = ["Who needs follow-up?", "Pipeline summary", "At-risk clients", "Top opportunities"];
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e9ef" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: NAVY, fontSize: 16 }}>B</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2332" }}>Bruno VA</div>
              <div style={{ fontSize: 11, color: "#7a8a9a" }}>Your campaign intelligence assistant</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => { setBrunoInput(chip); }}
                style={{
                  background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 20,
                  padding: "6px 14px", fontSize: 11, fontWeight: 600, color: "#1a2332",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {brunoMessages.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>
              Ask Bruno anything about your pipeline.
            </div>
          )}
          {brunoMessages.map((m, i) => (
            <div key={i} style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                background: m.role === "user" ? NAVY : "#f8fafc",
                color: m.role === "user" ? "#fff" : "#1a2332",
                padding: "10px 16px", borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                maxWidth: "80%", whiteSpace: "pre-wrap",
                border: m.role === "user" ? "none" : "1px solid #e5e9ef",
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {brunoLoading && (
            <div style={{ display: "flex", gap: 4, padding: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "bounce 0.6s infinite alternate" }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "bounce 0.6s infinite alternate 0.2s" }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "bounce 0.6s infinite alternate 0.4s" }} />
            </div>
          )}
          <div ref={brunoEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 24px 16px", borderTop: "1px solid #e5e9ef", display: "flex", gap: 8 }}>
          <input
            value={brunoInput}
            onChange={(e) => setBrunoInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") askBrunoPanel(); }}
            placeholder="Ask Bruno..."
            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e9ef", fontSize: 13, outline: "none" }}
          />
          <button onClick={askBrunoPanel} disabled={brunoLoading || !brunoInput.trim()} style={{
            background: GOLD, color: NAVY, border: "none", borderRadius: 8,
            padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            opacity: brunoLoading || !brunoInput.trim() ? 0.5 : 1,
          }}>Ask</button>
        </div>
      </div>
    );
  }

  function renderTerritoryPanel() {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#1a2332", margin: "0 0 4px" }}>Territory Scanner</h2>
        <p style={{ fontSize: 12, color: "#7a8a9a", margin: "0 0 20px" }}>Enter a ZIP code to scan market data.</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={scanZip}
            onChange={(e) => setScanZip(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runTerritoryScan()}
            placeholder="ZIP code..."
            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e9ef", fontSize: 13, outline: "none" }}
          />
          <button onClick={runTerritoryScan} disabled={scanLoading} style={{
            background: GOLD, color: NAVY, border: "none", borderRadius: 8,
            padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            opacity: scanLoading ? 0.5 : 1,
          }}>{scanLoading ? "Scanning..." : "Scan"}</button>
        </div>

        {scanResult && (
          <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: GOLD }}>{String(scanResult.opportunityScore || "—")}</div>
                <div style={{ fontSize: 11, color: "#7a8a9a", fontWeight: 600 }}>Opp. Score</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a2332" }}>{String(scanResult.medianIncome || "—")}</div>
                <div style={{ fontSize: 11, color: "#7a8a9a", fontWeight: 600 }}>Med. Income</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a2332" }}>{String(scanResult.households || "—")}</div>
                <div style={{ fontSize: 11, color: "#7a8a9a", fontWeight: 600 }}>Households</div>
              </div>
            </div>
            {Array.isArray(scanResult.topCategories) && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7a8a9a", marginBottom: 6 }}>Top Categories</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(scanResult.topCategories as string[]).map((cat) => (
                    <span key={cat} style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>{cat}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderCrmPanel() {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#1a2332", margin: "0 0 4px" }}>Close CRM Search</h2>
        <p style={{ fontSize: 12, color: "#7a8a9a", margin: "0 0 20px" }}>Search for contacts and deals in Close CRM.</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={crmQuery}
            onChange={(e) => setCrmQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchCrm()}
            placeholder="Business name, contact..."
            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e9ef", fontSize: 13, outline: "none" }}
          />
          <button onClick={searchCrm} disabled={crmLoading} style={{
            background: GOLD, color: NAVY, border: "none", borderRadius: 8,
            padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            opacity: crmLoading ? 0.5 : 1,
          }}>{crmLoading ? "Searching..." : "Search"}</button>
        </div>

        {crmResults.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, overflow: "hidden" }}>
            {crmResults.map((r) => (
              <div key={r.id} style={{ padding: "12px 16px", borderBottom: "1px solid #edf0f4" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2332" }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "#7a8a9a", marginTop: 3 }}>
                  {r.status} &middot; {r.dealStage} &middot; {r.dealValue}
                </div>
                {r.lastActivity && (
                  <div style={{ fontSize: 11, color: "#b0b8c4", marginTop: 2 }}>Last activity: {r.lastActivity}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderCsIntelPanel() {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#1a2332", margin: "0 0 4px" }}>CS Intel</h2>
        <p style={{ fontSize: 12, color: "#7a8a9a", margin: "0 0 20px" }}>Upload a CS health spreadsheet (xlsx/csv) to match client data.</p>

        <div style={{ marginBottom: 20 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleCsIntelUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={csUploading}
            style={{
              background: GOLD, color: NAVY, border: "none", borderRadius: 8,
              padding: "12px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              opacity: csUploading ? 0.5 : 1,
            }}
          >
            {csUploading ? "Parsing..." : "Upload Spreadsheet"}
          </button>
          {csIntelData.length > 0 && (
            <span style={{ marginLeft: 12, fontSize: 12, color: "#7a8a9a" }}>
              {csIntelData.length} records loaded
            </span>
          )}
        </div>

        {/* Drop zone visual */}
        {csIntelData.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #e5e9ef", borderRadius: 12, padding: "40px 24px",
              textAlign: "center", cursor: "pointer", marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 32, color: "#d1d5db", marginBottom: 8 }}>+</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Drop or click to upload xlsx / csv</div>
          </div>
        )}

        {/* Loaded data */}
        {csIntelData.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, overflow: "hidden" }}>
            {csIntelData.map((entry, i) => (
              <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid #edf0f4", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2332" }}>{entry.businessName}</div>
                  {entry.notes && <div style={{ fontSize: 11, color: "#7a8a9a", marginTop: 2 }}>{entry.notes}</div>}
                </div>
                {entry.health && (
                  <span style={{
                    background: `${healthBadgeColor(entry.health)}18`,
                    color: healthBadgeColor(entry.health),
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                  }}>
                    {entry.health}
                  </span>
                )}
                {entry.nps !== undefined && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: entry.nps >= 8 ? "#22c55e" : entry.nps >= 6 ? "#f59e0b" : "#ef4444" }}>
                    NPS {entry.nps}
                  </span>
                )}
                {entry.churn && (
                  <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>{entry.churn}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderCenterContent() {
    if (activePanel !== "pipeline") {
      switch (activePanel) {
        case "bruno": return renderBrunoPanel();
        case "territory": return renderTerritoryPanel();
        case "crm": return renderCrmPanel();
        case "csIntel": return renderCsIntelPanel();
      }
    }

    // Pipeline view with tabs
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e9ef", background: "#fff", flexShrink: 0 }}>
          {([
            { key: "priority" as const, label: "Priority Queue" },
            { key: "pipeline" as const, label: "Pipeline" },
            { key: "review" as const, label: "AM Review" },
            { key: "stats" as const, label: "Stats" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "12px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "transparent", border: "none",
                color: activeTab === tab.key ? NAVY : "#94a3b8",
                borderBottom: activeTab === tab.key ? `2px solid ${GOLD}` : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeTab === "priority" && renderPriorityQueue()}
          {activeTab === "pipeline" && renderPipelineKanban()}
          {activeTab === "review" && renderAmReview()}
          {activeTab === "stats" && renderStats()}
        </div>
      </div>
    );
  }

  /* ── Render Drawer ──────────────────────────────────────────────────────── */

  // Load drawer messages when messages tab is active
  useEffect(() => {
    if (!selected || drawerTab !== "messages") return;
    let cancelled = false;
    async function loadMessages() {
      try {
        const res = await fetch(`/api/campaign/message/${selected!.id}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data.messages)) setDrawerMessages(data.messages);
      } catch { /* ignore */ }
    }
    loadMessages();
    const interval = setInterval(loadMessages, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [selected?.id, drawerTab]);

  // CRM search state for drawer
  const [drawerCrmQuery, setDrawerCrmQuery] = useState("");
  const [drawerCrmResults, setDrawerCrmResults] = useState<CrmResult[]>([]);
  const [drawerCrmLoading, setDrawerCrmLoading] = useState(false);

  async function searchDrawerCrm() {
    if (!drawerCrmQuery.trim()) return;
    setDrawerCrmLoading(true);
    try {
      const res = await fetch("/api/campaign/crm-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: drawerCrmQuery }),
      });
      const data = await res.json();
      setDrawerCrmResults(data.results || []);
    } catch { setDrawerCrmResults([]); }
    setDrawerCrmLoading(false);
  }

  // Reset drawer tab & CRM query when selecting a new client
  useEffect(() => {
    if (selected) {
      setDrawerTab("overview");
      setDrawerCrmQuery(selected.business_name);
      setDrawerCrmResults([]);
      setDrawerMessages([]);
    }
  }, [selected?.id]);

  function renderDrawer() {
    const matchingLead = selected
      ? closeLeads.find((l) => l.businessName.toLowerCase() === selected.business_name.toLowerCase())
      : null;

    const drawerTabs: Array<{ key: "overview" | "campaign" | "messages" | "crm"; label: string }> = [
      { key: "overview", label: "Overview" },
      { key: "campaign", label: "Campaign" },
      { key: "messages", label: "Messages" },
      { key: "crm", label: "Close CRM" },
    ];

    const csHealthEntry = selected ? getCsHealth(selected) : undefined;
    const csHealthLabel = csHealthEntry?.health?.toUpperCase() || "";
    const csHealthColor = (() => {
      if (!csHealthLabel) return "#94a3b8";
      if (csHealthLabel.includes("CRITICAL")) return "#dc2626";
      if (csHealthLabel.includes("HIGH")) return "#f59e0b";
      if (csHealthLabel.includes("WATCHLIST") || csHealthLabel.includes("WATCH")) return "#eab308";
      if (csHealthLabel.includes("HEALTHY") || csHealthLabel.includes("GOOD") || csHealthLabel.includes("GREEN")) return "#22c55e";
      return "#94a3b8";
    })();

    return (
      <>
        {/* Backdrop */}
        {drawerOpen && selected && (
          <div onClick={() => setDrawerOpen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 199,
          }} />
        )}

        {/* Slide-out Panel */}
        <div style={{
          position: "fixed", top: 52, right: 0, width: 420, height: "calc(100vh - 52px)",
          background: "#1B2A4A", borderLeft: "1px solid rgba(255,255,255,0.1)",
          zIndex: 200, transform: drawerOpen && selected ? "translateX(0)" : "translateX(420px)",
          transition: "transform 0.3s ease", overflowY: "auto",
        }}>
          {selected && (
            <>
              {/* Close X button */}
              <button onClick={() => setDrawerOpen(false)} style={{
                position: "absolute", top: 16, right: 16, background: "none", border: "none",
                fontSize: 20, cursor: "pointer", color: "rgba(255,255,255,0.5)", zIndex: 1,
                lineHeight: 1,
              }}>×</button>

              {/* TOP SECTION */}
              <div style={{ padding: "24px 20px 16px", textAlign: "center" }}>
                {/* Initials avatar */}
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: GOLD, color: NAVY,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800, margin: "0 auto 10px",
                }}>
                  {initials(selected.business_name)}
                </div>

                {/* Business name */}
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                  {selected.business_name}
                </div>

                {/* City */}
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                  {selected.city}
                </div>

                {/* Stage badge */}
                <span style={{
                  display: "inline-block",
                  background: `${STAGE_COLORS[selected.stage]}30`,
                  color: STAGE_COLORS[selected.stage],
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6,
                }}>
                  {STAGE_LABELS[selected.stage]}
                </span>

                {/* View in Close link */}
                {matchingLead?.closeUrl && (
                  <div style={{ marginTop: 8 }}>
                    <a href={matchingLead.closeUrl} target="_blank" rel="noopener noreferrer" style={{
                      color: GOLD, fontSize: 12, fontWeight: 600, textDecoration: "none",
                    }}>View in Close →</a>
                  </div>
                )}
              </div>

              {/* STATS ROW */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "0 20px 20px" }}>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                    {matchingLead?.monthly && parseFloat(matchingLead.monthly) > 0 ? `$${matchingLead.monthly}/mo` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Monthly</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{selected.ad_size}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Ad Size</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: oppScoreColor(oppScore) }}>{oppScore > 0 ? oppScore : "—"}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Score</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800,
                    color: matchingLead?.renewStatus === "Renewable" ? "#22c55e" : matchingLead?.renewStatus === "Cancelled" ? "#dc2626" : "rgba(255,255,255,0.6)",
                  }}>
                    {matchingLead?.renewStatus || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Status</div>
                </div>
              </div>

              {/* TABS */}
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", margin: "0 20px" }}>
                {drawerTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDrawerTab(tab.key)}
                    style={{
                      flex: 1, padding: "10px 0", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: "transparent", border: "none",
                      color: drawerTab === tab.key ? GOLD : "rgba(255,255,255,0.4)",
                      borderBottom: drawerTab === tab.key ? `2px solid ${GOLD}` : "2px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT */}
              <div style={{ padding: 20 }}>

                {/* ── OVERVIEW TAB ──────────────────────────────────── */}
                {drawerTab === "overview" && (
                  <div>
                    {/* Contact card */}
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 8 }}>Contact</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                        {matchingLead?.contactName || "—"}
                      </div>
                      {matchingLead?.phone && (
                        <div style={{ marginBottom: 3 }}>
                          <a href={`tel:${matchingLead.phone}`} style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, textDecoration: "none" }}>
                            {matchingLead.phone}
                          </a>
                        </div>
                      )}
                      {matchingLead?.email && (
                        <div>
                          <a href={`mailto:${matchingLead.email}`} style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, textDecoration: "none" }}>
                            {matchingLead.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Agreement section */}
                    {matchingLead && (
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 8 }}>Agreement</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 12 }}>
                          <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Agreement #: </span><span style={{ color: "#fff", fontWeight: 600 }}>{matchingLead.agreementNumber || "—"}</span></div>
                          <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Ad Type: </span><span style={{ color: "#fff", fontWeight: 600 }}>{matchingLead.adType || "—"}</span></div>
                          <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Publications: </span><span style={{ color: "#fff", fontWeight: 600 }}>{matchingLead.publications || "—"}</span></div>
                          <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Cadence: </span><span style={{ color: "#fff", fontWeight: 600 }}>{matchingLead.cadence || "—"}</span></div>
                          <div><span style={{ color: "rgba(255,255,255,0.4)" }}>First Ed: </span><span style={{ color: "#fff", fontWeight: 600 }}>{matchingLead.firstEdition || "—"}</span></div>
                          <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Last Ed: </span><span style={{ color: "#fff", fontWeight: 600 }}>{matchingLead.lastEdition || "—"}</span></div>
                        </div>
                      </div>
                    )}

                    {/* SBR section */}
                    {oppScore > 0 && (
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 8 }}>SBR Market Data</div>
                        {/* Opp score bar */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Opportunity Score</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: oppScoreColor(oppScore) }}>{oppScore}</span>
                          </div>
                          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(oppScore, 100)}%`, background: oppScoreColor(oppScore), borderRadius: 3 }} />
                          </div>
                        </div>
                        {/* Income */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%", border: `3px solid ${GOLD}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, color: "#fff",
                          }}>
                            {sbr.medianIncome ? "$" : "—"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{String(sbr.medianIncome || "—")}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Median Income</div>
                          </div>
                        </div>
                        {/* Top category */}
                        {Array.isArray(sbr.topCategories) && (sbr.topCategories as string[]).length > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Top Category: </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{(sbr.topCategories as string[])[0]}</span>
                          </div>
                        )}
                        {/* Competitor gap */}
                        {sbr.competitorGap !== undefined && (
                          <div>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Competitor Gap: </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{String(sbr.competitorGap)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CS Health */}
                    {csHealthEntry && (
                      <div style={{
                        background: `${csHealthColor}18`, borderRadius: 8, padding: 12, marginBottom: 14,
                        border: `1px solid ${csHealthColor}40`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%", background: csHealthColor,
                          }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: csHealthColor }}>
                            {csHealthEntry.health || "Unknown"}
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: "auto" }}>CS Health</span>
                        </div>
                        {csHealthEntry.nps !== undefined && (
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>NPS: {csHealthEntry.nps}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── CAMPAIGN TAB ──────────────────────────────────── */}
                {drawerTab === "campaign" && (
                  <div>
                    {/* Approved direction image */}
                    {approvedDir?.imageUrl && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, margin: "0 0 6px" }}>Approved: {selected.selected_direction}</p>
                        <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
                      </div>
                    )}

                    {/* Tagline */}
                    {selected.tagline && (
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 4 }}>Tagline</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontStyle: "italic" }}>{selected.tagline}</div>
                      </div>
                    )}

                    {/* Services */}
                    {selected.services && (
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 4 }}>Services</div>
                        <div style={{ fontSize: 13, color: "#fff" }}>{selected.services}</div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={sendCampaignLink} disabled={sendingLink} style={{
                        background: GOLD, color: NAVY, border: "none", borderRadius: 8,
                        padding: "11px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        opacity: sendingLink ? 0.5 : 1, width: "100%",
                      }}>{sendingLink ? "Sending..." : "Send Campaign Link"}</button>

                      <button onClick={() => {
                        if (!selected) return;
                        navigator.clipboard.writeText(window.location.origin + "/campaign/tearsheet/" + selected.id);
                        showToast("Tearsheet link copied!");
                      }} style={{
                        background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                        padding: "11px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
                      }}>Copy Tearsheet Link</button>

                      {selected.stage === "approved" && (
                        <button onClick={() => updateStage(selected.id, "production")} style={{
                          background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8,
                          padding: "11px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%",
                        }}>Mark In Production</button>
                      )}

                      {selected.stage === "production" && (
                        <button onClick={() => updateStage(selected.id, "delivered")} style={{
                          background: "#06b6d4", color: "#fff", border: "none", borderRadius: 8,
                          padding: "11px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%",
                        }}>Mark Delivered</button>
                      )}

                      <button onClick={sendCard} disabled={sendingCard} style={{
                        background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                        padding: "11px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
                        opacity: sendingCard ? 0.5 : 1,
                      }}>{sendingCard ? "Sending..." : "Send Card"}</button>

                      <button onClick={printDeliveryPack} style={{
                        background: NAVY, color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
                        padding: "11px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%",
                      }}>Download Delivery Pack</button>
                    </div>
                  </div>
                )}

                {/* ── MESSAGES TAB ──────────────────────────────────── */}
                {drawerTab === "messages" && (
                  <div>
                    <div style={{ maxHeight: 360, overflowY: "auto", marginBottom: 12 }}>
                      {drawerMessages.length === 0 ? (
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0, textAlign: "center", padding: 20 }}>No messages yet.</p>
                      ) : drawerMessages.map((m, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: "#fff", padding: "2px 6px", borderRadius: 4,
                              background: m.role === "rep" ? NAVY : "#0891b2",
                            }}>{m.role === "rep" ? "REP" : "CLIENT"}</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{timeAgo(m.timestamp)}</span>
                          </div>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <textarea
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRepMessage(); } }}
                        placeholder="Type a message..."
                        rows={2}
                        style={{
                          flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 12, resize: "none", outline: "none", boxSizing: "border-box",
                        }}
                      />
                      <button onClick={sendRepMessage} disabled={msgSending || !msgInput.trim()} style={{
                        background: GOLD, color: NAVY, border: "none", borderRadius: 6,
                        padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        alignSelf: "flex-end", opacity: msgSending || !msgInput.trim() ? 0.5 : 1,
                      }}>Send as Rep</button>
                    </div>
                  </div>
                )}

                {/* ── CLOSE CRM TAB ──────────────────────────────────── */}
                {drawerTab === "crm" && (
                  <div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      <input
                        value={drawerCrmQuery}
                        onChange={(e) => setDrawerCrmQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchDrawerCrm()}
                        placeholder="Business name..."
                        style={{
                          flex: 1, padding: "9px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box",
                        }}
                      />
                      <button onClick={searchDrawerCrm} disabled={drawerCrmLoading} style={{
                        background: GOLD, color: NAVY, border: "none", borderRadius: 6,
                        padding: "9px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        opacity: drawerCrmLoading ? 0.5 : 1,
                      }}>{drawerCrmLoading ? "..." : "Search"}</button>
                    </div>

                    {drawerCrmResults.length > 0 && (
                      <div style={{ borderRadius: 8, overflow: "hidden" }}>
                        {drawerCrmResults.map((r) => (
                          <div key={r.id} style={{
                            padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.04)",
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                              {r.dealStage} &middot; {r.dealValue}
                            </div>
                            {r.lastActivity && (
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Last activity: {r.lastActivity}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {matchingLead?.closeUrl && (
                      <div style={{ marginTop: 16, textAlign: "center" }}>
                        <a href={matchingLead.closeUrl} target="_blank" rel="noopener noreferrer" style={{
                          color: GOLD, fontSize: 13, fontWeight: 600, textDecoration: "none",
                        }}>Open in Close →</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  /* ─── Main Render ───────────────────────────────────────────────────────── */

  const railItems: Array<{ key: ActivePanel; icon: (color: string) => React.ReactNode; label: string }> = [
    { key: "pipeline", icon: (c) => <GridIcon color={c} />, label: "Pipeline" },
    { key: "bruno", icon: (c) => <BrunoIcon color={c} />, label: "Bruno" },
    { key: "territory", icon: (c) => <MapPinIcon color={c} />, label: "Territory" },
    { key: "crm", icon: (c) => <SearchIcon color={c} />, label: "CRM" },
    { key: "csIntel", icon: (c) => <ChartIcon color={c} />, label: "CS Intel" },
  ];

  return (
    <DashboardErrorBoundary>
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-4px); } }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Playfair+Display:wght@700&display=swap');
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)",
          background: "#22c55e", color: "#fff", padding: "10px 20px", borderRadius: 6,
          fontSize: 12, fontWeight: 700, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}>
          {toast}
        </div>
      )}

      {/* Bruno bar response overlay */}
      {brunoBarResponse && (
        <div style={{
          position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)",
          background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10,
          padding: 20, maxWidth: 500, width: "90%", zIndex: 150,
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)", fontSize: 13, lineHeight: 1.6,
          color: "#1a2332", whiteSpace: "pre-wrap",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>Bruno</span>
            <button onClick={() => setBrunoBarResponse("")} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
          {brunoBarResponse}
        </div>
      )}

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <nav style={{
        background: RAIL_BG, height: 56, display: "flex", alignItems: "center",
        padding: "0 16px", gap: 12, flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)", position: "sticky", top: 0, zIndex: 40,
      }}>
        {/* Clock + date */}
        <div style={{ flexShrink: 0, minWidth: 80 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0, fontVariantNumeric: "tabular-nums" }}>
            {clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            {clock.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>

        {/* Bruno search bar */}
        <div style={{ flex: 1, maxWidth: 400, display: "flex", gap: 6, margin: "0 auto" }}>
          <input
            value={brunoBarQuery}
            onChange={(e) => setBrunoBarQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") askBrunoBar(); }}
            placeholder="Ask Bruno..."
            style={{
              flex: 1, padding: "7px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 12, outline: "none",
            }}
          />
          <button onClick={askBrunoBar} disabled={brunoBarLoading || !brunoBarQuery.trim()} style={{
            background: GOLD, color: NAVY, border: "none", borderRadius: 6,
            padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
            opacity: brunoBarLoading ? 0.5 : 1,
          }}>{brunoBarLoading ? "..." : "Ask"}</button>
        </div>

        {/* New Campaign */}
        <Link href="/campaign/intake" style={{
          background: GOLD, color: NAVY, borderRadius: 6, padding: "8px 14px",
          fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
        }}>
          New Campaign →
        </Link>

        {/* Bell */}
        <div style={{ position: "relative", cursor: "pointer" }} onClick={() => { setActivePanel("pipeline"); setActiveTab("review"); }}>
          <BellIcon color="rgba(255,255,255,0.7)" />
          {notifCount > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700,
              width: 16, height: 16, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{notifCount}</span>
          )}
        </div>

        {/* Rep name + avatar */}
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, whiteSpace: "nowrap" }}>{rep.name}</span>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: GOLD, color: NAVY,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, flexShrink: 0,
        }}>
          {repInitials}
        </div>

        {/* Log out */}
        <button onClick={handleSignOut} style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 600,
          color: "rgba(255,255,255,0.8)", cursor: "pointer", whiteSpace: "nowrap",
        }}>Log Out</button>
      </nav>

      {/* ── BODY ──────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT RAIL ─────────────────────────────────────────────────────── */}
        <aside style={{
          width: 72, flexShrink: 0, background: RAIL_BG,
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 16, gap: 4,
        }}>
          {/* BVM Logo */}
          <div style={{ marginBottom: 16 }}>
            <img src="/bvm_logo.png" alt="BVM" style={{ width: 36, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>

          {/* Icon buttons */}
          {railItems.map((item) => {
            const isActive = activePanel === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setActivePanel(item.key); if (item.key === "pipeline") setActiveTab("priority"); }}
                title={item.label}
                style={{
                  width: 40, height: 40, borderRadius: 8, border: "none",
                  background: isActive ? "rgba(245,200,66,0.15)" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                  borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent",
                }}
              >
                {item.icon(isActive ? GOLD : "rgba(255,255,255,0.35)")}
              </button>
            );
          })}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Rep initials avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: "50%", background: GOLD, color: NAVY,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, marginBottom: 8,
          }}>
            {repInitials}
          </div>

          {/* Logout */}
          <button onClick={handleSignOut} style={{
            width: 40, height: 40, borderRadius: 8, border: "none",
            background: "transparent", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", marginBottom: 12,
          }} title="Log Out">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M7 4H4a1 1 0 00-1 1v10a1 1 0 001 1h3M13 14l4-4-4-4M17 10H7" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </aside>

        {/* ── CENTER ────────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
          {renderCenterContent()}
        </main>
      </div>

      {/* ── RIGHT DRAWER ──────────────────────────────────────────────────── */}
      {renderDrawer()}
    </div>
    </DashboardErrorBoundary>
  );
}
