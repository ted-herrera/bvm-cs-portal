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

/* ─── Constants ──────────────────────────────────────────────────────────── */

const NAVY = "#1B2A4A";
const GOLD = "#F5C842";
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

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function CampaignDashboardPage() {
  // Auth
  const [rep, setRep] = useState<{ username: string; role: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("campaign_user") || (() => { try { const c = document.cookie.split(";").find(x => x.trim().startsWith("campaign_user=")); return c ? decodeURIComponent(c.split("=").slice(1).join("=")) : null; } catch { return null; } })();
    if (raw) { try { setRep(JSON.parse(raw)); } catch { window.location.href = "/campaign/login"; } }
    else { window.location.href = "/campaign/login"; }
    setAuthChecked(true);
  }, []);

  // Data
  const [clients, setClients] = useState<CampaignClient[]>([]);
  const [closeLeads, setCloseLeads] = useState<CloseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeLoading, setCloseLoading] = useState(true);
  const [selected, setSelected] = useState<CampaignClient | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "campaign" | "messages" | "crm">("overview");
  const [rightTab, setRightTab] = useState<"bruno" | "territory" | "csIntel" | "card">("bruno");
  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "campaign" | "close">("all");
  const [clock, setClock] = useState(new Date());
  const [toast, setToast] = useState("");

  // Messages
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp: string }>>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Bruno
  const [brunoMsgs, setBrunoMsgs] = useState<Array<{ role: string; content: string }>>([]);
  const [brunoInput, setBrunoInput] = useState("");
  const [brunoLoading, setBrunoLoading] = useState(false);
  const brunoEndRef = useRef<HTMLDivElement>(null);

  // Territory
  const [scanZip, setScanZip] = useState("");
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // CS Intel
  const [csIntelData, setCsIntelData] = useState<Array<{ businessName: string; health?: string; [k: string]: unknown }>>([]);
  const [csModalOpen, setCsModalOpen] = useState(false);
  const csFileRef = useRef<HTMLInputElement>(null);

  // Card (Handwrytten)
  const [cardMsg, setCardMsg] = useState("");
  const [sendingCard, setSendingCard] = useState(false);
  const [cardSent, setCardSent] = useState(false);

  // Actions
  const [sendingLink, setSendingLink] = useState(false);

  // Load data
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

  // Actions
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  function selectContact(c: CampaignClient) { setSelected(c); setDetailTab("overview"); setMessages([]); setCardSent(false); }

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

  // Auth guard
  if (!authChecked) return <div style={{ background: "#f8fafc", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>Loading...</div>;
  if (!rep) return null;

  // Derived
  const allContacts = (() => {
    const sl = search.toLowerCase();
    const campFiltered = clients.filter(c => !sl || c.business_name.toLowerCase().includes(sl));
    const closeFiltered = closeLeads.filter(l => !clients.some(c => c.business_name.toLowerCase() === l.businessName.toLowerCase()) && (!sl || l.businessName.toLowerCase().includes(sl)));
    if (listFilter === "campaign") return { camp: campFiltered, close: [] as CloseLead[] };
    if (listFilter === "close") return { camp: [] as CampaignClient[], close: closeFiltered };
    return { camp: campFiltered, close: closeFiltered };
  })();
  const sbr = selected ? (selected.sbr_data || {}) as Record<string, unknown> : {};
  const approvedDir = selected?.generated_directions?.find((d: CampaignDirection) => d.name === selected.selected_direction);
  const matchingLead = selected ? closeLeads.find(l => l.businessName.toLowerCase() === selected.business_name.toLowerCase()) : null;
  const totalMRV = closeLeads.reduce((s, l) => s + (parseFloat(l.monthly) || 0), 0);
  const repDisplay = demoMode ? "Demo User" : rep.username;

  /* ─── Render ────────────────────────────────────────────────────────── */
  return (
    <div style={{ height: "100vh", overflow: "hidden", fontFamily: "Inter, 'DM Sans', -apple-system, sans-serif" }}>
      {toast && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#fff", padding: "6px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, zIndex: 999 }}>{toast}</div>}

      {demoMode && <div style={{ position: "fixed", top: 52, left: 0, right: 0, background: "#fef3c7", color: "#92400e", textAlign: "center", fontSize: 11, fontWeight: 700, padding: "4px 0", zIndex: 60 }}>DEMO MODE — viewing sample data for presentation purposes</div>}

      {/* ── NAV (52px) ─────────────────────────────────────────────────── */}
      <nav style={{ height: 52, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, position: "relative", zIndex: 50 }}>
        {/* BVM logo commented out per spec */}
        {/* <img src="/bvm_logo.png" alt="BVM" style={{ height: 24 }} /> */}
        <span style={{ fontSize: 13, fontWeight: 800, color: NAVY, letterSpacing: "0.1em" }}>CAMPAIGN PORTAL</span>
        <div style={{ flex: 1, maxWidth: 360, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0 12px" }}>
            <span style={{ color: "#94a3b8", fontSize: 13, marginRight: 8 }}>🔍</span>
            <input value={brunoInput} onChange={e => setBrunoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askBruno()} placeholder="Ask Bruno..." style={{ flex: 1, border: "none", background: "transparent", padding: "8px 0", fontSize: 12, outline: "none", color: "#1e293b" }} />
            {brunoInput.trim() && <button onClick={askBruno} disabled={brunoLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{brunoLoading ? "..." : "Ask"}</button>}
          </div>
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
        <button onClick={() => setCsModalOpen(true)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          📊 {csIntelData.length > 0 && <span style={{ background: "#22c55e", color: "#fff", fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 6 }}>{csIntelData.length}</span>}
        </button>
        <button onClick={() => setDemoMode(!demoMode)} style={{ background: demoMode ? "#fef3c7" : "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 600, color: demoMode ? "#92400e" : "#94a3b8", cursor: "pointer" }}>Demo</button>
        <Link href="/campaign/intake" style={{ background: GOLD, color: NAVY, borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>New Campaign →</Link>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: NAVY, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{initials(repDisplay)}</div>
        <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{repDisplay}</span>
        <button onClick={handleSignOut} style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 10px", fontSize: 10, color: "#64748b", cursor: "pointer" }}>Out</button>
      </nav>

      {/* ── BODY (3 columns) ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 340px", height: demoMode ? "calc(100vh - 52px - 24px)" : "calc(100vh - 52px)", marginTop: demoMode ? 24 : 0 }}>

        {/* ── LEFT: Contacts ───────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Contacts</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: NAVY, background: "#f1f5f9", padding: "2px 8px", borderRadius: 10 }}>{clients.length + closeLeads.length}</span>
          </div>
          <div style={{ padding: "0 12px 8px" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
            {(["all", "campaign", "close"] as const).map(f => (
              <button key={f} onClick={() => setListFilter(f)} style={{ flex: 1, padding: "7px 0", fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent", color: listFilter === f ? NAVY : "#94a3b8", borderBottom: listFilter === f ? `2px solid ${NAVY}` : "2px solid transparent", textTransform: "uppercase" }}>{f === "close" ? "Close CRM" : f}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading && !demoMode ? <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Loading...</div> : (
              <>
                {allContacts.camp.map(c => {
                  const score = ((c.sbr_data || {}) as Record<string, unknown>).opportunityScore as number || 0;
                  const isActive = selected?.id === c.id;
                  return (
                    <div key={c.id} onClick={() => selectContact(c)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: isActive ? "#eef2ff" : "#fff", borderRight: isActive ? `3px solid ${NAVY}` : "3px solid transparent" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initials(c.business_name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.business_name}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{c.city}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${STAGE_COLORS[c.stage]}15`, color: STAGE_COLORS[c.stage] }}>{STAGE_LABELS[c.stage]}</span>
                        {score > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444" }}>{score}</span>}
                      </div>
                    </div>
                  );
                })}
                {allContacts.close.slice(0, 30).map(l => {
                  const isActive = selected?.business_name?.toLowerCase() === l.businessName.toLowerCase();
                  return (
                    <div key={l.id} onClick={() => selectCloseLead(l)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: isActive ? "#eef2ff" : "#fff", borderRight: isActive ? `3px solid ${NAVY}` : "3px solid transparent", opacity: 0.8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: "#e2e8f0", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initials(l.businessName)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.businessName}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{l.publications || l.adType}</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>CLOSE</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: Detail ───────────────────────────────────────────── */}
        <div style={{ background: "#f8fafc", overflowY: "auto", padding: 20 }}>
          {!selected ? (
            <div>
              <div style={{ textAlign: "center", padding: "48px 0 32px", color: "#94a3b8" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b" }}>Select a contact</div>
                <div style={{ fontSize: 13 }}>Choose from your contacts list to view details</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                {[{ l: "Total Contacts", v: clients.length + closeLeads.length, c: NAVY }, { l: "Active", v: clients.filter(c => c.stage === "approved" || c.stage === "production").length, c: "#22c55e" }, { l: "Delivered", v: clients.filter(c => c.stage === "delivered").length, c: "#8b5cf6" }, { l: "Monthly Value", v: `$${Math.round(totalMRV).toLocaleString()}`, c: "#f59e0b" }].map(s => (
                  <div key={s.l} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Recent</div>
                {clients.slice(0, 6).map(c => (
                  <div key={c.id} onClick={() => selectContact(c)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>{initials(c.business_name)}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", flex: 1 }}>{c.business_name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${STAGE_COLORS[c.stage]}15`, color: STAGE_COLORS[c.stage] }}>{STAGE_LABELS[c.stage]}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{daysSince(c.created_at)}d</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Hero card */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>{initials(selected.business_name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{selected.business_name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{selected.city} · {selected.category}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6, background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage] }}>{STAGE_LABELS[selected.stage]}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[{ l: "Monthly", v: matchingLead?.monthly ? `$${matchingLead.monthly}` : "—" }, { l: "Ad Size", v: selected.ad_size || "—" }, { l: "Score", v: (sbr.opportunityScore as number) > 0 ? String(sbr.opportunityScore) : "—" }, { l: "Status", v: matchingLead?.renewStatus || STAGE_LABELS[selected.stage] }].map(s => (
                    <div key={s.l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: "#94a3b8" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={sendCampaignLink} disabled={sendingLink} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: sendingLink ? 0.5 : 1 }}>{sendingLink ? "..." : "Send Link"}</button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/tearsheet/${selected.id}`); showToast("Copied!"); }} style={{ background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Tearsheet</button>
                  {selected.stage === "approved" && <button onClick={() => updateStage("production")} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>→ Production</button>}
                  {selected.stage === "production" && <button onClick={() => updateStage("delivered")} style={{ background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>→ Delivered</button>}
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/client/${selected.id}`); showToast("Portal copied!"); }} style={{ background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Portal</button>
                  <button onClick={() => window.print()} style={{ background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Pack ↓</button>
                </div>
              </div>

              {/* Detail tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                {(["overview", "campaign", "messages", "crm"] as const).map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: detailTab === t ? NAVY : "#fff", color: detailTab === t ? "#fff" : "#64748b", textTransform: "capitalize" }}>{t === "crm" ? "Close CRM" : t}</button>
                ))}
              </div>

              {/* Tab content */}
              {detailTab === "overview" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Contact</div>
                    <div style={{ fontSize: 12, color: "#1e293b", lineHeight: 2 }}>
                      <div>{matchingLead?.contactName || selected.business_name}</div>
                      {matchingLead?.phone && <div><a href={`tel:${matchingLead.phone}`} style={{ color: "#3b82f6" }}>{matchingLead.phone}</a></div>}
                      {matchingLead?.email && <div><a href={`mailto:${matchingLead.email}`} style={{ color: "#3b82f6" }}>{matchingLead.email}</a></div>}
                      {matchingLead?.agreementNumber && <div>Agr: {matchingLead.agreementNumber}</div>}
                    </div>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Campaign</div>
                    <div style={{ fontSize: 12, color: "#1e293b", lineHeight: 2 }}>
                      <div>Size: {selected.ad_size} {AD_DIMS[selected.ad_size] ? `(${AD_DIMS[selected.ad_size]})` : ""}</div>
                      <div>Tagline: {selected.tagline || "—"}</div>
                      <div>Services: {selected.services || "—"}</div>
                    </div>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Market Intel</div>
                    {(sbr.opportunityScore as number) > 0 ? (<div style={{ fontSize: 12 }}>
                      <div style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}><span style={{ color: "#64748b" }}>Score</span><span style={{ fontWeight: 700 }}>{String(sbr.opportunityScore)}/100</span></div><div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${sbr.opportunityScore as number}%`, background: GOLD, borderRadius: 3 }} /></div></div>
                      <div style={{ color: "#1e293b", lineHeight: 2 }}><div>Income: {String(sbr.medianIncome || "—")}</div><div>Households: {String(sbr.households || "—")}</div></div>
                    </div>) : <div style={{ fontSize: 12, color: "#94a3b8" }}>No data</div>}
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>CS Health</div>
                    {(() => { const cs = csIntelData.find(ci => ci.businessName.toLowerCase().includes(selected.business_name.toLowerCase().slice(0, 8))); return cs?.health ? <span style={{ fontSize: 14, fontWeight: 800, color: cs.health === "CRITICAL" ? "#dc2626" : cs.health === "HIGH" ? "#d97706" : "#16a34a" }}>{cs.health}</span> : <span style={{ fontSize: 12, color: "#94a3b8" }}>No data</span>; })()}
                    {matchingLead?.lastEdition && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Last Edition: {matchingLead.lastEdition}</div>}
                    {matchingLead?.renewStatus && <div style={{ fontSize: 11, color: matchingLead.renewStatus === "Renewable" ? "#22c55e" : "#dc2626", fontWeight: 600, marginTop: 2 }}>{matchingLead.renewStatus}</div>}
                  </div>
                </div>
              )}

              {detailTab === "campaign" && (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                  {approvedDir?.imageUrl && <img src={approvedDir.imageUrl} alt="" style={{ width: "100%", maxWidth: 400, borderRadius: 8, marginBottom: 12 }} />}
                  {selected.tagline && <p style={{ fontSize: 14, fontStyle: "italic", color: "#64748b", margin: "0 0 8px" }}>&ldquo;{selected.tagline}&rdquo;</p>}
                  <div style={{ fontSize: 12, color: "#1e293b", marginBottom: 8 }}>{selected.services}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{selected.ad_size} {AD_DIMS[selected.ad_size] || ""}</div>
                </div>
              )}

              {detailTab === "messages" && (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                  <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 10 }}>
                    {messages.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 12 }}>No messages.</p> : messages.map((m, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", padding: "1px 5px", borderRadius: 3, background: m.role === "rep" ? NAVY : GOLD, marginRight: 6 }}>{m.role === "rep" ? "REP" : "CLIENT"}</span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(m.timestamp)}</span>
                        <p style={{ fontSize: 12, color: "#1e293b", margin: "2px 0 0" }}>{m.content}</p>
                      </div>
                    ))}
                    <div ref={msgEndRef} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Message..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    <button onClick={sendMessage} disabled={msgSending} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Send</button>
                  </div>
                </div>
              )}

              {detailTab === "crm" && (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                  {matchingLead ? (
                    <div style={{ fontSize: 12, color: "#1e293b", lineHeight: 2 }}>
                      <div>Status: <strong>{matchingLead.status}</strong></div>
                      <div>Agreement: <strong>{matchingLead.agreementNumber}</strong></div>
                      <div>Ad Type: <strong>{matchingLead.adType}</strong></div>
                      <div>Monthly: <strong>${matchingLead.monthly}/mo</strong></div>
                      <div>Renew: <strong>{matchingLead.renewStatus}</strong></div>
                      <div>Publication: <strong>{matchingLead.publications}</strong></div>
                      {matchingLead.closeUrl && <a href={matchingLead.closeUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, background: GOLD, color: NAVY, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Open in Close →</a>}
                    </div>
                  ) : <p style={{ color: "#94a3b8", fontSize: 12 }}>No Close data.</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Tools ─────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
            {(["bruno", "territory", "csIntel", "card"] as const).map(t => (
              <button key={t} onClick={() => setRightTab(t)} style={{ flex: 1, padding: "9px 0", fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent", color: rightTab === t ? NAVY : "#94a3b8", borderBottom: rightTab === t ? `2px solid ${GOLD}` : "2px solid transparent", textTransform: t === "csIntel" ? "uppercase" : "capitalize" }}>{t === "csIntel" ? "CS" : t === "card" ? "Card" : t}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {rightTab === "bruno" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ background: `linear-gradient(135deg, ${NAVY}, #2d3e50)`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>B</div>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Bruno</div><div style={{ fontSize: 9, color: "#22c55e" }}>● Online</div></div>
                </div>
                <div style={{ display: "flex", gap: 4, padding: "8px 12px", flexWrap: "wrap" }}>
                  {["Who needs follow up?", "At-risk clients", "Campaigns stuck?", "Top opportunities"].map(chip => (
                    <button key={chip} onClick={() => { setBrunoInput(chip); }} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "4px 10px", fontSize: 10, color: "#64748b", cursor: "pointer", fontWeight: 500 }}>{chip}</button>
                  ))}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", background: "#f8fafc" }}>
                  {brunoMsgs.map((m, i) => (
                    <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 12, lineHeight: 1.5, background: m.role === "user" ? NAVY : "#fff", color: m.role === "user" ? "#fff" : "#1e293b", border: m.role === "user" ? "none" : "1px solid #e2e8f0" }}>{m.content}</div>
                    </div>
                  ))}
                  {brunoLoading && <div style={{ fontSize: 12, color: "#94a3b8", padding: "4px 0" }}>Thinking...</div>}
                  <div ref={brunoEndRef} />
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 6 }}>
                  <input value={brunoInput} onChange={e => setBrunoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askBruno()} placeholder="Ask Bruno..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  <button onClick={askBruno} disabled={brunoLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Send</button>
                </div>
              </div>
            )}

            {rightTab === "territory" && (
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Territory Scan</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <input value={scanZip} onChange={e => setScanZip(e.target.value)} onKeyDown={e => e.key === "Enter" && runTerritoryScan()} placeholder="ZIP code..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  <button onClick={runTerritoryScan} disabled={scanLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{scanLoading ? "..." : "Scan"}</button>
                </div>
                {scanResult && (
                  <div style={{ fontSize: 12, color: "#1e293b", lineHeight: 2 }}>
                    <div>Score: <strong style={{ color: "#22c55e", fontSize: 20 }}>{String(scanResult.opportunityScore || "—")}</strong></div>
                    <div>Income: {String(scanResult.medianIncome || "—")}</div>
                    <div>Top: {Array.isArray(scanResult.topCategories) ? (scanResult.topCategories as string[]).slice(0, 3).join(", ") : "—"}</div>
                    <div>Gap: {String(scanResult.competitorGap || "—")}</div>
                  </div>
                )}
              </div>
            )}

            {rightTab === "csIntel" && (
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>CS Intelligence</div>
                <div onClick={() => csFileRef.current?.click()} onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsUpload(f); }} style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: 28, textAlign: "center", cursor: "pointer", background: "#f8fafc", marginBottom: 12 }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📊</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>Drop .xlsx/.csv</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>or click to browse</div>
                  <input ref={csFileRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCsUpload(f); }} />
                </div>
                {csIntelData.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}><strong>{csIntelData.length}</strong> matched · {csIntelData.filter(c => c.health === "CRITICAL").length} CRITICAL · {csIntelData.filter(c => c.health === "HIGH").length} HIGH</div>
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {csIntelData.sort((a, b) => (a.health === "CRITICAL" ? 0 : 1) - (b.health === "CRITICAL" ? 0 : 1)).slice(0, 15).map((c, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9", fontSize: 11 }}>
                          <span style={{ color: "#1e293b" }}>{c.businessName}</span>
                          {c.health && <span style={{ fontWeight: 700, color: c.health === "CRITICAL" ? "#dc2626" : c.health === "HIGH" ? "#d97706" : "#16a34a" }}>{c.health}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {rightTab === "card" && (
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Send Handwrytten Card</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>To: {selected?.business_name || "Select a client"}</div>
                <textarea value={cardMsg} onChange={e => setCardMsg(e.target.value)} placeholder="Write your message..." rows={4} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
                {cardSent ? (
                  <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>Card sent! ✓</div>
                ) : (
                  <button onClick={sendCard} disabled={sendingCard || !selected} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: sendingCard || !selected ? 0.5 : 1 }}>{sendingCard ? "Sending..." : "Send Card"}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CS Intel Modal */}
      {csModalOpen && (
        <>
          <div onClick={() => setCsModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 600 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 14, padding: 28, width: 400, zIndex: 601, boxShadow: "0 16px 48px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>CS Intelligence</span>
              <button onClick={() => setCsModalOpen(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 12, color: "#64748b" }}>✕</button>
            </div>
            <div onClick={() => csFileRef.current?.click()} onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsUpload(f); }} style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: 36, textAlign: "center", cursor: "pointer", background: "#f8fafc" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Drop .xlsx or .csv</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>or click to browse</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
