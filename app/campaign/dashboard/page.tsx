"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { CampaignClient, CampaignDirection } from "@/lib/campaign";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface CloseLead {
  id: string; businessName: string; status: string; contactName: string;
  phone: string; email: string; agreementNumber: string; adType: string;
  cadence: string; monthly: string; firstEdition: string; lastEdition: string;
  renewStatus: string; publications: string; region: string; dvl: string;
  saleItems: string; closeUrl: string; dealValue: number; dealStatus: string;
}

/* ─── Design Tokens ──────────────────────────────────────────────────────── */

const BG = "#F5F0E8";
const SURFACE = "#FDFAF4";
const NAVY = "#1B2A4A";
const GOLD = "#C8922A";
const BORDER = "#DDD5C0";
const TEXT = "#1C2B1D";
const TEXT2 = "#6B5E45";
const GRAY = "#9B8E7A";
const GREEN = "#3D6B4F";
const AMBER = "#C8761A";
const RED = "#8B3A2A";

const STAGE_COLORS: Record<string, string> = { intake: "#64748b", tearsheet: "#f59e0b", approved: "#22c55e", production: "#3b82f6", delivered: "#8b5cf6" };
const STAGE_LABELS: Record<string, string> = { intake: "Intake", tearsheet: "Tearsheet", approved: "Approved", production: "Production", delivered: "Delivered" };
const AD_DIMS: Record<string, string> = { "1/8 page": '3.65"x2.5"', "1/4 page": '3.65"x5"', "1/2 page": '7.5"x5"', "full page": '7.5"x10"', "front cover": '7.5"x10"' };

const MOCK_CLIENTS: CampaignClient[] = [
  { id: "demo-1", created_at: "2026-04-10", business_name: "Tulsa Family Dental", category: "Dental", city: "Tulsa", zip: "74103", services: "Cleanings, implants, cosmetic", ad_size: "1/4 page", tagline: "Smiles start here.", rep_id: "demo", stage: "approved", sbr_data: { opportunityScore: 88, medianIncome: "82000", households: "41000", topCategories: ["Dental", "Health"] }, generated_directions: [{ name: "Bold", imageUrl: "", description: "Bold direct", prompt: "" }], selected_direction: "Bold", approved_at: "2026-04-12", revisions: null } as unknown as CampaignClient,
  { id: "demo-2", created_at: "2026-04-08", business_name: "Riverside Roofing", category: "Roofing", city: "Broken Arrow", zip: "74012", services: "Roof repair, new installs", ad_size: "1/2 page", tagline: "", rep_id: "demo", stage: "production", sbr_data: { opportunityScore: 72, medianIncome: "68000", households: "35000" }, generated_directions: null, selected_direction: null, approved_at: null, revisions: null } as unknown as CampaignClient,
  { id: "demo-3", created_at: "2026-04-01", business_name: "Maria's Kitchen", category: "Restaurant", city: "Jenks", zip: "74037", services: "Catering, dine-in", ad_size: "full page", tagline: "Taste the neighborhood.", rep_id: "demo", stage: "delivered", sbr_data: { opportunityScore: 94, medianIncome: "91000", households: "28000" }, generated_directions: null, selected_direction: null, approved_at: null, revisions: null } as unknown as CampaignClient,
  { id: "demo-4", created_at: "2026-04-14", business_name: "Peak Fitness", category: "Fitness", city: "Owasso", zip: "74055", services: "Personal training, group classes", ad_size: "1/4 page", tagline: null, rep_id: "demo", stage: "tearsheet", sbr_data: null, generated_directions: null, selected_direction: null, approved_at: null, revisions: null } as unknown as CampaignClient,
  { id: "demo-5", created_at: "2026-04-16", business_name: "Green Thumb Landscaping", category: "Landscaping", city: "Bixby", zip: "74008", services: "Design, maintenance, irrigation", ad_size: "1/8 page", tagline: "Your yard, perfected.", rep_id: "demo", stage: "intake", sbr_data: null, generated_directions: null, selected_direction: null, approved_at: null, revisions: null } as unknown as CampaignClient,
];

const MOCK_LEADS: CloseLead[] = [
  { id: "cl-1", businessName: "Tulsa Auto Glass", status: "Active", contactName: "Mark Rivera", phone: "+1 918-555-0101", email: "mark@tulsaautoglass.com", agreementNumber: "E-100001", adType: "Print Ad", cadence: "Monthly", monthly: "350", firstEdition: "2024-01-01", lastEdition: "2026-12-01", renewStatus: "Renewable", publications: "[101] Tulsa Living", region: "Central", dvl: "Derek", saleItems: "Print Ad", closeUrl: "", dealValue: 0, dealStatus: "" },
  { id: "cl-2", businessName: "Broken Arrow Plumbing", status: "Active", contactName: "Sarah Chen", phone: "+1 918-555-0102", email: "sarah@baplumbing.com", agreementNumber: "E-100002", adType: "Expert Contributor", cadence: "Monthly", monthly: "520", firstEdition: "2023-06-01", lastEdition: "2026-06-01", renewStatus: "Renewable", publications: "[102] BA Neighbors", region: "Central", dvl: "Derek", saleItems: "Print Ad, Digital", closeUrl: "", dealValue: 0, dealStatus: "" },
  { id: "cl-3", businessName: "Jenks Veterinary", status: "Cancelled", contactName: "Dr. Patel", phone: "+1 918-555-0103", email: "info@jenksvet.com", agreementNumber: "E-100003", adType: "Print Ad", cadence: "Monthly", monthly: "275", firstEdition: "2024-03-01", lastEdition: "2025-03-01", renewStatus: "Cancelled", publications: "[103] Jenks Journal", region: "South", dvl: "Alex", saleItems: "Print Ad", closeUrl: "", dealValue: 0, dealStatus: "" },
  { id: "cl-4", businessName: "Owasso Electric", status: "Active", contactName: "Tom Baker", phone: "+1 918-555-0104", email: "tom@owassoelectric.com", agreementNumber: "E-100004", adType: "Business Profile", cadence: "Monthly", monthly: "680", firstEdition: "2025-01-01", lastEdition: "2027-01-01", renewStatus: "Renewable", publications: "[104] Owasso Life", region: "North", dvl: "Derek", saleItems: "Print Ad, Business Profile", closeUrl: "", dealValue: 0, dealStatus: "" },
  { id: "cl-5", businessName: "Bixby Insurance Group", status: "Active", contactName: "Linda Park", phone: "+1 918-555-0105", email: "linda@bixbyins.com", agreementNumber: "E-100005", adType: "Print Ad", cadence: "Monthly", monthly: "410", firstEdition: "2024-07-01", lastEdition: "2026-07-01", renewStatus: "Renewable", publications: "[105] Bixby Buzz", region: "South", dvl: "Alex", saleItems: "Print Ad", closeUrl: "", dealValue: 0, dealStatus: "" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function daysSince(d: string): number { return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0; }
function timeAgo(d: string): string { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; }
function initials(n: string): string { return n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(); }

function avatarBg(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("dental")) return "#4A90D9";
  if (c.includes("restaurant")) return AMBER;
  if (c.includes("fitness")) return GREEN;
  if (c.includes("legal")) return NAVY;
  return GRAY;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function CampaignDashboardPage() {
  /* Auth */
  const [rep, setRep] = useState<{ username: string; role: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("campaign_user") || (() => { try { const c = document.cookie.split(";").find(x => x.trim().startsWith("campaign_user=")); return c ? decodeURIComponent(c.split("=").slice(1).join("=")) : null; } catch { return null; } })();
    if (raw) { try { setRep(JSON.parse(raw)); } catch { window.location.href = "/campaign/login"; } }
    else { window.location.href = "/campaign/login"; }
    setAuthChecked(true);
  }, []);

  /* Data */
  const [clients, setClients] = useState<CampaignClient[]>([]);
  const [closeLeads, setCloseLeads] = useState<CloseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeLoading, setCloseLoading] = useState(true);
  const [selected, setSelected] = useState<CampaignClient | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [search, setSearch] = useState("");
  const [clock, setClock] = useState(new Date());
  const [toast, setToast] = useState("");

  /* Messages */
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp: string }>>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  /* Bruno */
  const [brunoMsgs, setBrunoMsgs] = useState<Array<{ role: string; content: string }>>([]);
  const [brunoInput, setBrunoInput] = useState("");
  const [brunoLoading, setBrunoLoading] = useState(false);
  const brunoEndRef = useRef<HTMLDivElement>(null);

  /* Territory */
  const [scanZip, setScanZip] = useState("");
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  /* CS Intel */
  const [csIntelData, setCsIntelData] = useState<Array<{ businessName: string; health?: string; [k: string]: unknown }>>([]);
  const [csModalOpen, setCsModalOpen] = useState(false);
  const csFileRef = useRef<HTMLInputElement>(null);

  /* Card */
  const [cardMsg, setCardMsg] = useState("");
  const [sendingCard, setSendingCard] = useState(false);
  const [cardSent, setCardSent] = useState(false);

  /* Actions */
  const [sendingLink, setSendingLink] = useState(false);

  /* New layout state */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"actions" | "bruno" | "territory" | "csIntel" | "card">("actions");
  const [detailTab, setDetailTab] = useState<"overview" | "messages" | "crm">("overview");
  const [listFilter, setListFilter] = useState<"all" | "renewable" | "declined" | "campaign">("all");
  const [visibleLeadCount, setVisibleLeadCount] = useState(50);

  /* Inline note for drawer */
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  /* ─── Data Loading ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!rep) return;
    if (demoMode) { setClients(MOCK_CLIENTS); setCloseLeads(MOCK_LEADS); setLoading(false); setCloseLoading(false); return; }
    loadCampaigns(); loadCloseData();
    try { const cs = localStorage.getItem(`cs_intel_${rep.username}`); if (cs) setCsIntelData(JSON.parse(cs)); } catch { /* */ }
    const c1 = setInterval(() => setClock(new Date()), 1000);
    const c2 = setInterval(loadCampaigns, 30000);
    return () => { clearInterval(c1); clearInterval(c2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep, demoMode]);

  async function loadCampaigns() {
    if (!rep) return;
    try { const { getSupabase } = await import("@/lib/supabase"); const sb = getSupabase(); if (sb) { const { data } = await sb.from("campaign_clients").select("*").eq("rep_id", rep.username).order("created_at", { ascending: false }); if (data) setClients(data as CampaignClient[]); } } catch { /* */ }
    setLoading(false);
  }

  async function loadCloseData() {
    if (!rep) return;
    try { const res = await fetch("/api/campaign/close-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repName: rep.username }) }); const data = await res.json(); setCloseLeads(data.leads || []); } catch { /* */ }
    setCloseLoading(false);
  }

  useEffect(() => { if (!selected) return; loadMessages(); const i = setInterval(loadMessages, 30000); return () => clearInterval(i); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected?.id]);

  async function loadMessages() { if (!selected) return; try { const res = await fetch(`/api/campaign/message/${selected.id}`); const d = await res.json(); if (d.messages) setMessages(d.messages); } catch { /* */ } }

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { brunoEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [brunoMsgs]);

  /* ─── Action Functions ─────────────────────────────────────────────────── */

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  function selectContact(c: CampaignClient) { setSelected(c); setDrawerOpen(true); setDetailTab("overview"); setMessages([]); setCardSent(false); }

  function selectCloseLead(l: CloseLead) {
    selectContact({ id: l.id, business_name: l.businessName, city: l.publications || l.region || "", zip: "", category: l.adType || "", services: l.saleItems || "", ad_size: l.adType || "", tagline: "", rep_id: rep!.username, stage: "intake" as const, sbr_data: null, generated_directions: null, selected_direction: null, approved_at: null, revisions: null, created_at: new Date().toISOString() } as unknown as CampaignClient);
  }

  async function sendMessage() { if (!msgInput.trim() || !selected) return; setMsgSending(true); try { const res = await fetch(`/api/campaign/message/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "rep", content: msgInput }) }); const d = await res.json(); if (d.messages) setMessages(d.messages); setMsgInput(""); } catch { /* */ } setMsgSending(false); }

  async function sendCampaignLink() { if (!selected) return; setSendingLink(true); try { await fetch("/api/campaign/send-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: selected.id }) }); showToast("Campaign link sent!"); } catch { showToast("Failed"); } setSendingLink(false); }

  async function updateStage(s: string) { if (!selected) return; try { await fetch(`/api/campaign/stage/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: s }) }); setClients(p => p.map(c => c.id === selected.id ? { ...c, stage: s as CampaignClient["stage"] } : c)); setSelected(p => p ? { ...p, stage: s as CampaignClient["stage"] } : p); showToast(`→ ${STAGE_LABELS[s]}`); } catch { /* */ } }

  async function sendCard() { if (!selected) return; setSendingCard(true); try { await fetch("/api/campaign/send-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessName: selected.business_name, city: selected.city, message: cardMsg }) }); setCardSent(true); showToast("Card sent!"); } catch { showToast("Failed"); } setSendingCard(false); }

  async function askBruno() {
    if (!brunoInput.trim()) return;
    const userMsg = { role: "user", content: brunoInput };
    setBrunoMsgs(p => [...p, userMsg]); setBrunoInput(""); setBrunoLoading(true);
    try {
      const pipeline = clients.map(c => ({ name: c.business_name, city: c.city, stage: c.stage, adSize: c.ad_size, days: daysSince(c.created_at), score: ((c.sbr_data || {}) as Record<string, unknown>).opportunityScore || 0 }));
      const res = await fetch("/api/campaign/bruno-va", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...brunoMsgs, userMsg].map(m => ({ role: m.role, content: m.content })), pipeline }) });
      const d = await res.json();
      setBrunoMsgs(p => [...p, { role: "assistant", content: d.response || "No response" }]);
    } catch { setBrunoMsgs(p => [...p, { role: "assistant", content: "Something went wrong." }]); }
    setBrunoLoading(false);
  }

  async function runTerritoryScan() { if (!scanZip.trim()) return; setScanLoading(true); try { const res = await fetch("/api/campaign/sbr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessName: "Scan", city: "", zip: scanZip, category: "general" }) }); setScanResult(await res.json()); } catch { /* */ } setScanLoading(false); }

  async function handleCsUpload(file: File) {
    if (!(window as unknown as Record<string, unknown>).XLSX) { await new Promise<void>(r => { const s = document.createElement("script"); s.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"; s.onload = () => r(); document.head.appendChild(s); }); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const X = (window as any).XLSX; const buf = await file.arrayBuffer(); const wb = X.read(buf, { type: "array" }); const rows: Record<string, unknown>[] = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const rl = rep!.username.toLowerCase();
    const matched = rows.filter(r => Object.values(r).some(v => typeof v === "string" && v.toLowerCase().includes(rl)));
    const parsed = matched.map(r => { const ks = Object.keys(r); return { businessName: String(Object.values(r)[0] || ""), health: ks.find(k => k.toLowerCase().includes("health") || k.toLowerCase().includes("risk")) ? String(r[ks.find(k => k.toLowerCase().includes("health") || k.toLowerCase().includes("risk"))!] || "") : undefined, ...r }; });
    setCsIntelData(parsed); localStorage.setItem(`cs_intel_${rep!.username}`, JSON.stringify(parsed)); setCsModalOpen(false); showToast(`CS Intel: ${parsed.length} matched`);
  }

  function handleSignOut() { document.cookie = "campaign_user=; path=/; max-age=0"; localStorage.removeItem("campaign_user"); window.location.href = "/campaign/login"; }

  /* ─── Auth Guard ───────────────────────────────────────────────────────── */

  if (!authChecked) return <div style={{ background: BG, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: GRAY }}>Loading...</div>;
  if (!rep) return null;

  /* ─── Derived ───────────────────────────────────────────────────────────── */

  const activeCloseLeads = closeLeads.filter(l => l.renewStatus !== "Cancelled" && l.status !== "Cancelled" && l.renewStatus !== "Lost");
  const renewableLeads = closeLeads.filter(l => l.renewStatus === "Renewable");
  const declinedLeads = closeLeads.filter(l => l.renewStatus === "Declined");
  const cancelledCount = closeLeads.filter(l => l.renewStatus === "Cancelled" || l.status === "Cancelled").length;

  const sl = search.toLowerCase();
  const filteredList: Array<{ type: "campaign"; data: CampaignClient } | { type: "close"; data: CloseLead }> = (() => {
    const items: Array<{ type: "campaign"; data: CampaignClient } | { type: "close"; data: CloseLead }> = [];
    if (listFilter === "all") {
      clients.filter(c => !sl || c.business_name.toLowerCase().includes(sl)).forEach(c => items.push({ type: "campaign", data: c }));
      activeCloseLeads.filter(l => !clients.some(c => c.business_name.toLowerCase() === l.businessName.toLowerCase()) && (!sl || l.businessName.toLowerCase().includes(sl))).forEach(l => items.push({ type: "close", data: l }));
    } else if (listFilter === "renewable") {
      renewableLeads.filter(l => !sl || l.businessName.toLowerCase().includes(sl)).forEach(l => items.push({ type: "close", data: l }));
    } else if (listFilter === "declined") {
      declinedLeads.filter(l => !sl || l.businessName.toLowerCase().includes(sl)).forEach(l => items.push({ type: "close", data: l }));
    } else {
      clients.filter(c => !sl || c.business_name.toLowerCase().includes(sl)).forEach(c => items.push({ type: "campaign", data: c }));
    }
    return items;
  })();

  const sbr = selected ? (selected.sbr_data || {}) as Record<string, unknown> : {};
  const matchingLead = selected ? closeLeads.find(l => l.businessName.toLowerCase() === selected.business_name.toLowerCase()) : null;
  const totalMRV = closeLeads.reduce((s, l) => s + (parseFloat(l.monthly) || 0), 0);
  const avgMonthly = closeLeads.length > 0 ? Math.round(totalMRV / closeLeads.length) : 0;
  const repDisplay = demoMode ? "Demo User" : rep.username;

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <div style={{ height: "100vh", overflow: "hidden", fontFamily: "Inter, 'DM Sans', -apple-system, sans-serif", display: "grid", gridTemplateRows: "52px 1fr", gridTemplateColumns: "280px 1fr" }}>

      {/* Toast */}
      {toast && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: GREEN, color: "#fff", padding: "6px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, zIndex: 999 }}>{toast}</div>}

      {/* Demo banner */}
      {demoMode && <div style={{ position: "fixed", top: 52, left: 0, right: 0, background: "#fef3c7", color: "#92400e", textAlign: "center", fontSize: 11, fontWeight: 700, padding: "4px 0", zIndex: 60 }}>DEMO MODE — sample data</div>}

      {/* ── NAV (52px, spans both columns) ─────────────────────────────── */}
      <nav style={{ gridColumn: "1 / -1", height: 52, background: NAVY, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, position: "relative", zIndex: 50 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.12em" }}>CAMPAIGN PORTAL</span>

        {/* Center search */}
        <div style={{ flex: 1, maxWidth: 360, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "0 12px" }}>
            <input value={brunoInput} onChange={e => setBrunoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askBruno()} placeholder="Ask Bruno..." style={{ flex: 1, border: "none", background: "transparent", padding: "8px 0", fontSize: 12, outline: "none", color: "#fff" }} />
            {brunoInput.trim() && <button onClick={askBruno} disabled={brunoLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{brunoLoading ? "..." : "Ask"}</button>}
          </div>
        </div>

        {/* Right controls */}
        <span style={{ fontSize: 11, color: "#fff" }}>{clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
        <button onClick={() => setDemoMode(!demoMode)} style={{ background: demoMode ? "#fef3c7" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 600, color: demoMode ? "#92400e" : "rgba(255,255,255,0.7)", cursor: "pointer" }}>Demo</button>
        <button onClick={() => setCsModalOpen(true)} style={{ background: "transparent", border: "none", fontSize: 14, color: "#fff", cursor: "pointer", padding: "4px 6px" }}>📊</button>
        <Link href="/campaign/intake" style={{ background: GOLD, color: NAVY, borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>New Campaign →</Link>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{initials(repDisplay)}</div>
        <span style={{ fontSize: 12, color: "#fff" }}>{repDisplay}</span>
        <button onClick={handleSignOut} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "5px 10px", fontSize: 10, color: "#fff", cursor: "pointer" }}>Out</button>
      </nav>

      {/* ── LEFT SIDEBAR (280px) ───────────────────────────────────────── */}
      <div style={{ background: SURFACE, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Stat pills 2x2 */}
        <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Total", value: clients.length + activeCloseLeads.length },
            { label: "Renewable", value: renewableLeads.length },
            { label: "Declined", value: declinedLeads.length },
            { label: "Cancelled", value: cancelledCount },
          ].map(s => (
            <div key={s.label} style={{ background: BG, borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{s.value}</div>
              <div style={{ fontSize: 9, color: GRAY }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: "0 12px 8px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 12, outline: "none", boxSizing: "border-box", color: TEXT }} />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
          {(["all", "renewable", "declined", "campaign"] as const).map(f => (
            <button key={f} onClick={() => setListFilter(f)} style={{ flex: 1, padding: "7px 0", fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent", color: listFilter === f ? NAVY : GRAY, borderBottom: listFilter === f ? `2px solid ${GOLD}` : "2px solid transparent", textTransform: "capitalize" }}>{f}</button>
          ))}
        </div>

        {/* Client list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && !demoMode ? <div style={{ padding: 20, textAlign: "center", color: GRAY, fontSize: 12 }}>Loading...</div> : (
            <>
              {filteredList.slice(0, visibleLeadCount).map(item => {
                if (item.type === "campaign") {
                  const c = item.data;
                  const isActive = selected?.id === c.id;
                  return (
                    <div key={c.id} onClick={() => selectContact(c)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`, borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent", background: isActive ? SURFACE : "transparent" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: avatarBg(c.category), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initials(c.business_name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.business_name}</div>
                        <div style={{ fontSize: 10, color: GRAY }}>{c.city}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${STAGE_COLORS[c.stage]}15`, color: STAGE_COLORS[c.stage] }}>{STAGE_LABELS[c.stage]}</span>
                      </div>
                    </div>
                  );
                } else {
                  const l = item.data;
                  const isActive = selected?.business_name?.toLowerCase() === l.businessName.toLowerCase();
                  return (
                    <div key={l.id} onClick={() => selectCloseLead(l)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`, borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent", background: isActive ? SURFACE : "transparent" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: avatarBg(l.adType), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initials(l.businessName)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.businessName}</div>
                        <div style={{ fontSize: 10, color: GRAY }}>{l.publications || l.region}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                        {l.renewStatus && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, color: l.renewStatus === "Renewable" ? GREEN : l.renewStatus === "Declined" ? RED : GRAY, background: l.renewStatus === "Renewable" ? `${GREEN}15` : l.renewStatus === "Declined" ? `${RED}15` : `${GRAY}15` }}>{l.renewStatus}</span>}
                        {l.monthly && <span style={{ fontSize: 10, fontWeight: 600, color: GOLD }}>${l.monthly}/mo</span>}
                      </div>
                    </div>
                  );
                }
              })}
              {filteredList.length > visibleLeadCount && (
                <button onClick={() => setVisibleLeadCount(p => p + 50)} style={{ width: "100%", padding: "10px 0", border: "none", background: "transparent", color: GOLD, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Load more</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CENTER PANEL ───────────────────────────────────────────────── */}
      <div style={{ background: BG, overflowY: "auto", padding: 20 }}>
        {!selected ? (
          <div>
            <div style={{ textAlign: "center", padding: "48px 0 32px", color: GRAY }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: TEXT2 }}>Select a contact</div>
              <div style={{ fontSize: 13, color: GRAY }}>Choose from your contacts list to view details</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { l: "Total Active", v: clients.length + activeCloseLeads.length, c: NAVY },
                { l: "Renewable", v: renewableLeads.length, c: GREEN },
                { l: "Declined", v: declinedLeads.length, c: RED },
                { l: "Avg Monthly", v: `$${avgMonthly}`, c: GOLD },
              ].map(s => (
                <div key={s.l} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: GRAY, fontWeight: 600, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Recent Activity</div>
              {clients.slice(0, 8).map(c => (
                <div key={c.id} onClick={() => selectContact(c)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: avatarBg(c.category), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>{initials(c.business_name)}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: TEXT, flex: 1 }}>{c.business_name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${STAGE_COLORS[c.stage]}15`, color: STAGE_COLORS[c.stage] }}>{STAGE_LABELS[c.stage]}</span>
                  <span style={{ fontSize: 10, color: GRAY }}>{daysSince(c.created_at)}d</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Hero card */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: avatarBg(selected.category), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>{initials(selected.business_name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{selected.business_name}</div>
                  <div style={{ fontSize: 13, color: GRAY }}>{selected.city}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6, background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage] }}>{STAGE_LABELS[selected.stage]}</span>
                {matchingLead?.renewStatus && <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6, color: matchingLead.renewStatus === "Renewable" ? GREEN : matchingLead.renewStatus === "Declined" ? RED : GRAY, background: matchingLead.renewStatus === "Renewable" ? `${GREEN}15` : matchingLead.renewStatus === "Declined" ? `${RED}15` : `${GRAY}15` }}>{matchingLead.renewStatus}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {[
                  { l: "Monthly", v: matchingLead?.monthly ? `$${matchingLead.monthly}` : "---" },
                  { l: "Ad Type", v: selected.ad_size || matchingLead?.adType || "---" },
                  { l: "Last Edition", v: matchingLead?.lastEdition || "---" },
                  { l: "Agreement #", v: matchingLead?.agreementNumber || "---" },
                ].map(s => (
                  <div key={s.l} style={{ background: BG, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: GRAY }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail tabs (pill style) */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {(["overview", "messages", "crm"] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: detailTab === t ? "none" : `1px solid ${BORDER}`, background: detailTab === t ? NAVY : SURFACE, color: detailTab === t ? "#fff" : TEXT2 }}>{t === "crm" ? "Close CRM" : t === "overview" ? "Overview" : "Messages"}</button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {detailTab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", marginBottom: 8 }}>Contact</div>
                  <div style={{ fontSize: 12, color: TEXT, lineHeight: 2 }}>
                    <div>{matchingLead?.contactName || selected.business_name}</div>
                    {matchingLead?.phone && <div><a href={`tel:${matchingLead.phone}`} style={{ color: "#4A90D9" }}>{matchingLead.phone}</a></div>}
                    {matchingLead?.email && <div><a href={`mailto:${matchingLead.email}`} style={{ color: "#4A90D9" }}>{matchingLead.email}</a></div>}
                    {matchingLead?.agreementNumber && <div>Agr: {matchingLead.agreementNumber}</div>}
                    {matchingLead?.cadence && <div>Cadence: {matchingLead.cadence}</div>}
                  </div>
                </div>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", marginBottom: 8 }}>Account</div>
                  <div style={{ fontSize: 12, color: TEXT, lineHeight: 2 }}>
                    <div>Ad: {selected.ad_size} {AD_DIMS[selected.ad_size] ? `(${AD_DIMS[selected.ad_size]})` : ""}</div>
                    <div>Items: {matchingLead?.saleItems || selected.services || "---"}</div>
                    <div>Pubs: {matchingLead?.publications || "---"}</div>
                    <div>First: {matchingLead?.firstEdition || "---"}</div>
                    <div>Last: {matchingLead?.lastEdition || "---"}</div>
                    <div>DVL: {matchingLead?.dvl || "---"}</div>
                    <div>Region: {matchingLead?.region || "---"}</div>
                  </div>
                </div>
                {(sbr.opportunityScore as number) > 0 && (
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", marginBottom: 8 }}>Market Intel</div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}><span style={{ color: TEXT2 }}>Score</span><span style={{ fontWeight: 700 }}>{String(sbr.opportunityScore)}/100</span></div>
                      <div style={{ height: 6, background: BG, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${sbr.opportunityScore as number}%`, background: GOLD, borderRadius: 3 }} /></div>
                    </div>
                    <div style={{ fontSize: 12, color: TEXT, lineHeight: 2 }}>
                      <div>Income: ${String(sbr.medianIncome || "---")}</div>
                      <div>Households: {String(sbr.households || "---")}</div>
                      {Array.isArray(sbr.topCategories) && <div>Top: {(sbr.topCategories as string[]).join(", ")}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES TAB */}
            {detailTab === "messages" && (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
                {!clients.some(c => c.id === selected.id) ? (
                  <div style={{ textAlign: "center", padding: 20, color: GRAY }}>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>No campaign started</div>
                    <Link href="/campaign/intake" style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>Start Campaign</Link>
                  </div>
                ) : (
                  <>
                    <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 10 }}>
                      {messages.length === 0 ? <p style={{ color: GRAY, fontSize: 12 }}>No messages.</p> : messages.map((m, i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", padding: "1px 5px", borderRadius: 3, background: m.role === "rep" ? NAVY : GOLD, marginRight: 6 }}>{m.role === "rep" ? "REP" : "CLIENT"}</span>
                          <span style={{ fontSize: 10, color: GRAY }}>{timeAgo(m.timestamp)}</span>
                          <p style={{ fontSize: 12, color: TEXT, margin: "2px 0 0" }}>{m.content}</p>
                        </div>
                      ))}
                      <div ref={msgEndRef} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Message..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 12, outline: "none", boxSizing: "border-box", color: TEXT }} />
                      <button onClick={sendMessage} disabled={msgSending} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Send</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CLOSE CRM TAB */}
            {detailTab === "crm" && (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
                {matchingLead ? (
                  <div style={{ fontSize: 12, color: TEXT, lineHeight: 2 }}>
                    <div>Status: <strong>{matchingLead.status}</strong></div>
                    <div>Agreement: <strong>{matchingLead.agreementNumber}</strong></div>
                    <div>Ad Type: <strong>{matchingLead.adType}</strong></div>
                    <div>Monthly: <strong>${matchingLead.monthly}/mo</strong></div>
                    <div>Renew: <strong>{matchingLead.renewStatus}</strong></div>
                    <div>Publication: <strong>{matchingLead.publications}</strong></div>
                    {matchingLead.closeUrl && <a href={matchingLead.closeUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, background: GOLD, color: NAVY, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Open in Close →</a>}
                  </div>
                ) : <p style={{ color: GRAY, fontSize: 12 }}>No Close data.</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DRAWER BACKDROP ────────────────────────────────────────────── */}
      {drawerOpen && selected && <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 199 }} />}

      {/* ── DRAWER (380px) ─────────────────────────────────────────────── */}
      <div style={{ position: "fixed", right: 0, top: 52, height: "calc(100vh - 52px)", width: 380, background: SURFACE, borderLeft: `3px solid ${GOLD}`, boxShadow: "-8px 0 32px rgba(0,0,0,0.15)", zIndex: 200, transform: drawerOpen && selected ? "translateX(0)" : "translateX(380px)", transition: "transform 0.3s ease", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {selected && (
          <>
            {/* Drawer header */}
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <button onClick={() => setDrawerOpen(false)} style={{ background: BG, border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 12, color: TEXT2 }}>✕</button>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: avatarBg(selected.category), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>{initials(selected.business_name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{selected.business_name}</div>
                  <div style={{ fontSize: 12, color: GRAY }}>{selected.city}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage] }}>{STAGE_LABELS[selected.stage]}</span>
                {matchingLead?.renewStatus && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color: matchingLead.renewStatus === "Renewable" ? GREEN : matchingLead.renewStatus === "Declined" ? RED : GRAY, background: matchingLead.renewStatus === "Renewable" ? `${GREEN}15` : matchingLead.renewStatus === "Declined" ? `${RED}15` : `${GRAY}15` }}>{matchingLead.renewStatus}</span>}
              </div>
              <div style={{ height: 1, background: BORDER }} />

              {/* Action buttons row */}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {[
                  { icon: "📝", label: "Note", action: () => setNoteOpen(!noteOpen) },
                  { icon: "✉️", label: "Email", action: () => { if (matchingLead?.email) window.open(`mailto:${matchingLead.email}`); } },
                  { icon: "📞", label: "Call", action: () => { if (matchingLead?.phone) window.open(`tel:${matchingLead.phone}`); } },
                  { icon: "📋", label: "Task", action: () => showToast("Task created") },
                  { icon: "⚡", label: "Escalate", action: () => showToast("Escalated") },
                ].map(a => (
                  <button key={a.label} onClick={a.action} style={{ width: 44, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0" }}>
                    <span style={{ fontSize: 16 }}>{a.icon}</span>
                    <span style={{ fontSize: 8, color: GRAY }}>{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Inline note */}
              {noteOpen && (
                <div style={{ marginTop: 8 }}>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box", color: TEXT }} />
                  <button onClick={async () => { if (!noteText.trim()) return; try { await fetch(`/api/campaign/message/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "rep", content: noteText }) }); setNoteText(""); setNoteOpen(false); showToast("Note saved"); } catch { showToast("Failed"); } }} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Save</button>
                </div>
              )}
            </div>

            {/* Drawer tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
              {(["actions", "bruno", "territory", "csIntel", "card"] as const).map(t => (
                <button key={t} onClick={() => setDrawerTab(t)} style={{ flex: 1, padding: "9px 0", fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent", color: drawerTab === t ? NAVY : GRAY, borderBottom: drawerTab === t ? `2px solid ${GOLD}` : "2px solid transparent" }}>{t === "csIntel" ? "CS" : t === "actions" ? "Actions" : t === "bruno" ? "Bruno" : t === "territory" ? "Territory" : "Card"}</button>
              ))}
            </div>

            {/* Drawer tab content */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

              {/* ACTIONS TAB */}
              {drawerTab === "actions" && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={sendCampaignLink} disabled={sendingLink} style={{ width: "100%", background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: sendingLink ? 0.5 : 1, textAlign: "left" }}>{sendingLink ? "Sending..." : "📤 Send Campaign Link"}</button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/tearsheet/${selected.id}`); showToast("Tearsheet link copied!"); }} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>🔗 Copy Tearsheet</button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/client/${selected.id}`); showToast("Portal link copied!"); }} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>🌐 Copy Portal Link</button>
                  {selected.stage === "approved" && <button onClick={() => updateStage("production")} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>▶ Mark In Production</button>}
                  {selected.stage === "production" && <button onClick={() => updateStage("delivered")} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>✅ Mark Delivered</button>}
                  <button onClick={() => window.print()} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>📥 Delivery Pack</button>
                </div>
              )}

              {/* BRUNO TAB */}
              {drawerTab === "bruno" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ background: `linear-gradient(135deg, ${NAVY}, #2d3e50)`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>B</div>
                    <div><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Bruno</div><div style={{ fontSize: 9, color: "#22c55e" }}>● Online</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 4, padding: "8px 12px", flexWrap: "wrap" }}>
                    {["Who needs follow up?", "At-risk clients", "Campaigns stuck?", "Top opportunities"].map(chip => (
                      <button key={chip} onClick={() => setBrunoInput(chip)} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "4px 10px", fontSize: 10, color: TEXT2, cursor: "pointer", fontWeight: 500 }}>{chip}</button>
                    ))}
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", background: BG }}>
                    {brunoMsgs.map((m, i) => (
                      <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 12, lineHeight: 1.5, background: m.role === "user" ? NAVY : SURFACE, color: m.role === "user" ? "#fff" : TEXT, border: m.role === "user" ? "none" : `1px solid ${BORDER}` }}>{m.content}</div>
                      </div>
                    ))}
                    {brunoLoading && <div style={{ fontSize: 12, color: GRAY, padding: "4px 0" }}>Thinking...</div>}
                    <div ref={brunoEndRef} />
                  </div>
                  <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 6 }}>
                    <input value={brunoInput} onChange={e => setBrunoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askBruno()} placeholder="Ask Bruno..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 12, outline: "none", boxSizing: "border-box", color: TEXT }} />
                    <button onClick={askBruno} disabled={brunoLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Send</button>
                  </div>
                </div>
              )}

              {/* TERRITORY TAB */}
              {drawerTab === "territory" && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Territory Scan</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    <input value={scanZip || selected.zip} onChange={e => setScanZip(e.target.value)} onKeyDown={e => e.key === "Enter" && runTerritoryScan()} placeholder="ZIP code..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 12, outline: "none", boxSizing: "border-box", color: TEXT }} />
                    <button onClick={() => { if (!scanZip && selected.zip) setScanZip(selected.zip); runTerritoryScan(); }} disabled={scanLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{scanLoading ? "..." : "Scan"}</button>
                  </div>
                  {scanResult && (
                    <div style={{ fontSize: 12, color: TEXT, lineHeight: 2 }}>
                      <div>Score: <strong style={{ color: GREEN, fontSize: 20 }}>{String(scanResult.opportunityScore || "---")}</strong></div>
                      <div>Income: {String(scanResult.medianIncome || "---")}</div>
                      <div>Top: {Array.isArray(scanResult.topCategories) ? (scanResult.topCategories as string[]).slice(0, 3).join(", ") : "---"}</div>
                      <div>Gap: {String(scanResult.competitorGap || "---")}</div>
                      <Link href={`/campaign/intelligence/${selected.id}`} style={{ display: "inline-block", marginTop: 8, color: GOLD, fontSize: 12, fontWeight: 700 }}>Full Report →</Link>
                    </div>
                  )}
                </div>
              )}

              {/* CS INTEL TAB */}
              {drawerTab === "csIntel" && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>CS Intelligence</div>
                  <div onClick={() => csFileRef.current?.click()} onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsUpload(f); }} style={{ border: `2px dashed ${BORDER}`, borderRadius: 10, padding: 28, textAlign: "center", cursor: "pointer", background: BG, marginBottom: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📊</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Drop .xlsx/.csv</div>
                    <div style={{ fontSize: 10, color: GRAY }}>or click to browse</div>
                    <input ref={csFileRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCsUpload(f); }} />
                  </div>
                  {csIntelData.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: TEXT2, marginBottom: 8 }}><strong>{csIntelData.length}</strong> matched · {csIntelData.filter(c => c.health === "CRITICAL").length} CRITICAL · {csIntelData.filter(c => c.health === "HIGH").length} HIGH</div>
                      <div style={{ maxHeight: 200, overflowY: "auto" }}>
                        {csIntelData.sort((a, b) => (a.health === "CRITICAL" ? 0 : 1) - (b.health === "CRITICAL" ? 0 : 1)).slice(0, 15).map((c, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 11 }}>
                            <span style={{ color: TEXT }}>{c.businessName}</span>
                            {c.health && <span style={{ fontWeight: 700, color: c.health === "CRITICAL" ? RED : c.health === "HIGH" ? AMBER : GREEN }}>{c.health}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CARD TAB */}
              {drawerTab === "card" && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Send Handwrytten Card</div>
                  <div style={{ fontSize: 12, color: TEXT2, marginBottom: 8 }}>To: {selected.business_name}</div>
                  <textarea value={cardMsg} onChange={e => setCardMsg(e.target.value)} placeholder="Write your message..." rows={4} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 8, color: TEXT }} />
                  {cardSent ? (
                    <div style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>Card sent!</div>
                  ) : (
                    <button onClick={sendCard} disabled={sendingCard} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: sendingCard ? 0.5 : 1 }}>{sendingCard ? "Sending..." : "Send Card"}</button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── CS Intel Modal ─────────────────────────────────────────────── */}
      {csModalOpen && (
        <>
          <div onClick={() => setCsModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 600 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: SURFACE, borderRadius: 14, padding: 28, width: 400, zIndex: 601, boxShadow: "0 16px 48px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>CS Intelligence</span>
              <button onClick={() => setCsModalOpen(false)} style={{ background: BG, border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 12, color: TEXT2 }}>✕</button>
            </div>
            <div onClick={() => csFileRef.current?.click()} onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsUpload(f); }} style={{ border: `2px dashed ${BORDER}`, borderRadius: 10, padding: 36, textAlign: "center", cursor: "pointer", background: BG }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Drop .xlsx or .csv</div>
              <div style={{ fontSize: 11, color: GRAY }}>or click to browse</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
