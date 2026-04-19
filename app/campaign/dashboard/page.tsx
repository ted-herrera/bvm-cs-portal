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
  saleDate: string; soldBy: string;
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
const AD_BLEED: Record<string, string> = { "1/8 page": '3.9"x2.75"', "1/4 page": '3.9"x5.25"', "1/2 page": '7.75"x5.25"', "full page": '7.75"x10.25"', "front cover": '7.75"x10.25"' };

const MOCK_CLIENTS: CampaignClient[] = [
  { id: "demo-1", created_at: "2026-04-10", business_name: "Tulsa Family Dental", category: "Dental", city: "Tulsa", zip: "74103", services: "Cleanings, implants, cosmetic", ad_size: "1/4 page", tagline: "Smiles start here.", rep_id: "demo", stage: "approved", sbr_data: { opportunityScore: 88, medianIncome: "82000", households: "41000", topCategories: ["Dental", "Health"] }, generated_directions: [{ name: "Bold", imageUrl: "", description: "Bold direct", prompt: "" }], selected_direction: "Bold", approved_at: "2026-04-12", revisions: null } as unknown as CampaignClient,
  { id: "demo-2", created_at: "2026-04-08", business_name: "Riverside Roofing", category: "Roofing", city: "Broken Arrow", zip: "74012", services: "Roof repair, new installs", ad_size: "1/2 page", tagline: "", rep_id: "demo", stage: "production", sbr_data: { opportunityScore: 72, medianIncome: "68000", households: "35000" }, generated_directions: null, selected_direction: null, approved_at: null, revisions: null } as unknown as CampaignClient,
  { id: "demo-3", created_at: "2026-04-01", business_name: "Maria's Kitchen", category: "Restaurant", city: "Jenks", zip: "74037", services: "Catering, dine-in", ad_size: "full page", tagline: "Taste the neighborhood.", rep_id: "demo", stage: "delivered", sbr_data: { opportunityScore: 94, medianIncome: "91000", households: "28000" }, generated_directions: null, selected_direction: null, approved_at: null, revisions: null } as unknown as CampaignClient,
  { id: "demo-4", created_at: "2026-04-14", business_name: "Peak Fitness", category: "Fitness", city: "Owasso", zip: "74055", services: "Personal training, group classes", ad_size: "1/4 page", tagline: null, rep_id: "demo", stage: "tearsheet", sbr_data: null, generated_directions: null, selected_direction: null, approved_at: null, revisions: null } as unknown as CampaignClient,
  { id: "demo-5", created_at: "2026-04-16", business_name: "Green Thumb Landscaping", category: "Landscaping", city: "Bixby", zip: "74008", services: "Design, maintenance, irrigation", ad_size: "1/8 page", tagline: "Your yard, perfected.", rep_id: "demo", stage: "intake", sbr_data: null, generated_directions: null, selected_direction: null, approved_at: null, revisions: null } as unknown as CampaignClient,
];

const MOCK_LEADS: CloseLead[] = [
  { id: "cl-1", businessName: "Tulsa Auto Glass", status: "Active", contactName: "Mark Rivera", phone: "+1 918-555-0101", email: "mark@tulsaautoglass.com", agreementNumber: "E-100001", adType: "Print Ad", cadence: "Monthly", monthly: "350", firstEdition: "2024-01-01", lastEdition: "2026-12-01", renewStatus: "Renewable", publications: "[101] Tulsa Living", region: "Central", dvl: "Derek", saleItems: "Print Ad", closeUrl: "", dealValue: 0, dealStatus: "", saleDate: "2024-01-15", soldBy: "Derek" },
  { id: "cl-2", businessName: "Broken Arrow Plumbing", status: "Active", contactName: "Sarah Chen", phone: "+1 918-555-0102", email: "sarah@baplumbing.com", agreementNumber: "E-100002", adType: "Expert Contributor", cadence: "Monthly", monthly: "520", firstEdition: "2023-06-01", lastEdition: "2026-06-01", renewStatus: "Renewable", publications: "[102] BA Neighbors", region: "Central", dvl: "Derek", saleItems: "Print Ad, Digital", closeUrl: "", dealValue: 0, dealStatus: "", saleDate: "2024-01-15", soldBy: "Derek" },
  { id: "cl-3", businessName: "Jenks Veterinary", status: "Cancelled", contactName: "Dr. Patel", phone: "+1 918-555-0103", email: "info@jenksvet.com", agreementNumber: "E-100003", adType: "Print Ad", cadence: "Monthly", monthly: "275", firstEdition: "2024-03-01", lastEdition: "2025-03-01", renewStatus: "Cancelled", publications: "[103] Jenks Journal", region: "South", dvl: "Alex", saleItems: "Print Ad", closeUrl: "", dealValue: 0, dealStatus: "", saleDate: "2024-01-15", soldBy: "Derek" },
  { id: "cl-4", businessName: "Owasso Electric", status: "Active", contactName: "Tom Baker", phone: "+1 918-555-0104", email: "tom@owassoelectric.com", agreementNumber: "E-100004", adType: "Business Profile", cadence: "Monthly", monthly: "680", firstEdition: "2025-01-01", lastEdition: "2027-01-01", renewStatus: "Renewable", publications: "[104] Owasso Life", region: "North", dvl: "Derek", saleItems: "Print Ad, Business Profile", closeUrl: "", dealValue: 0, dealStatus: "", saleDate: "2024-01-15", soldBy: "Derek" },
  { id: "cl-5", businessName: "Bixby Insurance Group", status: "Active", contactName: "Linda Park", phone: "+1 918-555-0105", email: "linda@bixbyins.com", agreementNumber: "E-100005", adType: "Print Ad", cadence: "Monthly", monthly: "410", firstEdition: "2024-07-01", lastEdition: "2026-07-01", renewStatus: "Renewable", publications: "[105] Bixby Buzz", region: "South", dvl: "Alex", saleItems: "Print Ad", closeUrl: "", dealValue: 0, dealStatus: "", saleDate: "2024-01-15", soldBy: "Derek" },
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

function mapRenewStatus(status: string): string {
  const s = (status || "").toLowerCase().trim();
  if (s === "renewable" || s === "yes") return "Renewable";
  if (s === "declined" || s === "no") return "Declined";
  if (s === "merged") return "Merged";
  return status || "";
}

function renewColor(status: string): string {
  const mapped = mapRenewStatus(status);
  if (mapped === "Renewable") return GREEN;
  if (mapped === "Declined") return RED;
  if (mapped === "Merged") return AMBER;
  return GRAY;
}

function excelDateToString(serial: unknown): string {
  if (!serial) return "";
  const num = Number(serial);
  if (isNaN(num) || num < 1000) return String(serial);
  const date = new Date((num - 25569) * 86400 * 1000);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function normName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\b(llc|inc|corp|co|ltd|the)\b/g, "").trim().replace(/\s+/g, " ");
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
  const [cardTemplate, setCardTemplate] = useState<"welcome"|"thankyou"|"followup"|"congrats">("welcome");
  const [cardDelivery, setCardDelivery] = useState<"email"|"snail">("email");
  const [cardEmailTo, setCardEmailTo] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  /* Actions */
  const [sendingLink, setSendingLink] = useState(false);

  /* New layout state */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"actions" | "bruno" | "territory" | "csIntel" | "card">("actions");
  const [detailTab, setDetailTab] = useState<"overview" | "messages" | "crm">("overview");
  const [emptyTab, setEmptyTab] = useState<"overview" | "audit">("overview");
  const [listFilter, setListFilter] = useState<"priority" | "all" | "renewable" | "declined" | "campaign">("priority");
  const [visibleLeadCount, setVisibleLeadCount] = useState(50);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reportingPeriod, setReportingPeriod] = useState("");
  const [auditBrunoResponse, setAuditBrunoResponse] = useState("");
  const [auditBrunoLoading, setAuditBrunoLoading] = useState(false);
  const [auditShowMatched, setAuditShowMatched] = useState(false);
  const [auditShowCsOnly, setAuditShowCsOnly] = useState(false);
  const [auditShowCloseOnly, setAuditShowCloseOnly] = useState(false);

  /* Inline note for drawer */
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  /* Contact hydration */
  const [hydrating, setHydrating] = useState(false);

  /* Escalation */
  const [escalationNote, setEscalationNote] = useState("");

  /* Floating Bruno Bot */
  const [brunoBotOpen, setBrunoBotOpen] = useState(false);

  /* ─── Data Loading ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!rep) return;
    if (demoMode) { setClients(MOCK_CLIENTS); setCloseLeads(MOCK_LEADS); setLoading(false); setCloseLoading(false); return; }
    loadCampaigns(); loadCloseData(); loadCsIntel();
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

  async function loadCsIntel() {
    if (!rep) return;
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("cs_intel").select("*").eq("rep_name", rep.username);
        if (data && data.length > 0) {
          setCsIntelData(data.map((r: Record<string, unknown>) => ({
            businessName: String(r.business_name || ""),
            health: mapRenewStatus(String(r.renew_status || "")),
            monthly: r.monthly,
            saleItems: String(r.sale_items || ""),
            contractNumber: String(r.contract_number || ""),
            lastEdition: excelDateToString(r.last_edition),
            market: String(r.market || ""),
            industry: String(r.industry || ""),
            region: String(r.region || ""),
            attritionCause: String(r.attrition_cause || ""),
            ...r,
          })));
          return;
        }
      }
    } catch { /* */ }
    // Fallback to localStorage
    try { const cs = localStorage.getItem(`cs_intel_${rep.username}`); if (cs) setCsIntelData(JSON.parse(cs)); } catch { /* */ }
  }

  useEffect(() => { if (!selected) return; loadMessages(); const i = setInterval(loadMessages, 30000); return () => clearInterval(i); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected?.id]);

  async function loadMessages() {
    if (!selected) return;
    const msgId = getCampaignId(selected.business_name) || selected.id;
    try { const res = await fetch(`/api/campaign/message/${msgId}`); const d = await res.json(); if (d.messages) setMessages(d.messages); } catch { /* */ }
  }

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { brunoEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [brunoMsgs]);

  /* ─── Action Functions ─────────────────────────────────────────────────── */

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  // Find real campaign_clients UUID for message routing
  function getCampaignId(businessName: string): string | null {
    const match = clients.find(cc => cc.business_name.toLowerCase() === businessName.toLowerCase());
    return match?.id || null;
  }

  function selectContact(c: CampaignClient) {
    // If synthetic contact (csIntel/Close), swap in real campaign client if exists
    const realClient = clients.find(cc => cc.business_name.toLowerCase() === c.business_name.toLowerCase());
    setSelected(realClient || c); setDrawerOpen(true); setDetailTab("overview"); setMessages([]); setCardSent(false);
    setCardEmailTo(closeLeads.find(l => l.businessName.toLowerCase() === c.business_name.toLowerCase())?.email || "");
    const lead = closeLeads.find(l => l.businessName.toLowerCase() === c.business_name.toLowerCase());
    if (!lead) {
      setHydrating(true);
      fetch("/api/campaign/crm-search", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ query: c.business_name }) })
        .then(r => r.json()).then(() => { /* just log for now */ }).catch(() => {}).finally(() => setHydrating(false));
    }
  }

  function selectCloseLead(l: CloseLead) {
    selectContact({ id: l.id, business_name: l.businessName, city: l.publications || l.region || "", zip: "", category: l.adType || "", services: l.saleItems || "", ad_size: l.adType || "", tagline: "", rep_id: rep!.username, stage: "intake" as const, sbr_data: null, generated_directions: null, selected_direction: null, approved_at: null, revisions: null, created_at: new Date().toISOString() } as unknown as CampaignClient);
  }

  async function sendMessage() {
    if (!msgInput.trim() || !selected) return;
    // Use real campaign UUID for message API, not synthetic IDs
    const msgId = getCampaignId(selected.business_name) || selected.id;
    setMsgSending(true);
    try { const res = await fetch(`/api/campaign/message/${msgId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "rep", content: msgInput }) }); const d = await res.json(); if (d.messages) setMessages(d.messages); setMsgInput(""); } catch { /* */ }
    setMsgSending(false);
  }

  async function sendCampaignLink() { if (!selected) return; setSendingLink(true); try { await fetch("/api/campaign/send-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: selected.id }) }); showToast("Campaign link sent!"); } catch { showToast("Failed"); } setSendingLink(false); }

  async function updateStage(s: string) { if (!selected) return; try { await fetch(`/api/campaign/stage/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: s }) }); setClients(p => p.map(c => c.id === selected.id ? { ...c, stage: s as CampaignClient["stage"] } : c)); setSelected(p => p ? { ...p, stage: s as CampaignClient["stage"] } : p); showToast(`→ ${STAGE_LABELS[s]}`); } catch { /* */ } }

  async function sendCard() {
    if (!selected) return;
    setSendingCard(true);
    const templates: Record<string, {bg:string, accent:string, title:string}> = {
      welcome: {bg:"#1B2A4A", accent:"#F5C842", title:"Welcome to the Family"},
      thankyou: {bg:"#F5F0E8", accent:"#2C3E2D", title:"Thank You"},
      followup: {bg:"#ffffff", accent:"#3A5F7D", title:"Just Checking In"},
      congrats: {bg:"linear-gradient(135deg,#C8922A,#F5C842)", accent:"#fff", title:"Congratulations!"},
    };
    const t = templates[cardTemplate];
    const cardHtml = `<div style="background:${t.bg};border-radius:12px;padding:32px;font-family:Georgia,serif;text-align:center;${t.bg.includes("gradient")?"color:white":"color:"+(cardTemplate==="welcome"?"white":cardTemplate==="thankyou"?"#2C3E2D":"#1B2A4A")}"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${t.accent};margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;margin-bottom:8px">${t.title}</div><div style="width:40px;height:2px;background:${t.accent};margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;font-style:italic">${cardMsg || "Thank you for being part of the BVM family."}</div><div style="margin-top:24px;font-size:12px;color:${t.accent}">${rep!.username}</div><div style="font-size:10px;opacity:0.5;margin-top:4px">BVM Campaign Portal</div></div>`;
    try {
      if (cardDelivery === "email") {
        await fetch("/api/campaign/escalate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"card-email", to: cardEmailTo || matchingLead?.email || "", repName: rep!.username, subject: `A personal note from ${rep!.username} at BVM`, body: cardHtml }) });
      } else {
        await fetch("/api/campaign/escalate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"card-snail", repName: rep!.username, clientName: selected.business_name, note: cardMsg, body: cardTemplate }) });
      }
      setCardSent(true);
      showToast(cardDelivery === "email" ? "Card sent!" : "Card request sent to Ted");
      setTimeout(() => { setCardSent(false); setCardMsg(""); }, 3000);
    } catch { showToast("Failed"); }
    setSendingCard(false);
  }

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

  async function loadCsForDate(dateStr: string) {
    if (!rep) return;
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("cs_intel").select("*").eq("rep_name", rep.username).eq("week_of", dateStr);
        if (data && data.length > 0) {
          setCsIntelData(data.map((r: Record<string, unknown>) => ({
            businessName: String(r.business_name || ""), health: mapRenewStatus(String(r.renew_status || "")),
            monthly: r.monthly, saleItems: String(r.sale_items || ""), contractNumber: String(r.contract_number || ""),
            lastEdition: excelDateToString(r.last_edition), market: String(r.market || ""),
            industry: String(r.industry || ""), region: String(r.region || ""), attritionCause: String(r.attrition_cause || ""), ...r,
          })));
          showToast(`Loaded ${data.length} records for ${dateStr}`);
        } else { showToast("No records for that date"); }
      }
    } catch { /* */ }
  }

  function handleSignOut() { document.cookie = "campaign_user=; path=/; max-age=0"; localStorage.removeItem("campaign_user"); window.location.href = "/campaign/login"; }

  async function handleDeleteClient() {
    if (!selected || deleteCode !== "BVM2026") { setDeleteError("Invalid code"); return; }
    setDeleting(true);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) { await sb.from("campaign_clients").delete().eq("id", selected.id); }
      setClients(p => p.filter(c => c.id !== selected.id));
      setSelected(null); setDrawerOpen(false); setDeleteModalOpen(false); setDeleteCode(""); setDeleteError("");
      showToast("Client deleted");
    } catch { showToast("Delete failed — try again"); }
    setDeleting(false);
  }

  function priorityScore(item: { businessName: string; health?: string; monthly?: unknown; lastEdition?: string }): number {
    let score = 0;
    const mapped = mapRenewStatus(item.health || "");
    const mo = parseFloat(String(item.monthly || "0")) || 0;
    const le = item.lastEdition || "";
    if (le) {
      const days = Math.floor((new Date(le).getTime() - Date.now()) / 86400000);
      if (days <= 30 && days > -365) score += 50;
      else if (days <= 60 && days > -365) score += 30;
    }
    if (mapped === "Declined") score += 40;
    if (mapped === "Renewable" && mo > 500) score += 25;
    else if (mapped === "Renewable" && mo > 300) score += 15;
    if (clients.some(c => c.business_name.toLowerCase() === item.businessName.toLowerCase())) score += 20;
    return score;
  }

  function priDotColor(score: number): string {
    if (score > 70) return RED;
    if (score >= 40) return AMBER;
    return GRAY;
  }

  /* ─── Auth Guard ───────────────────────────────────────────────────────── */

  if (!authChecked) return <div style={{ background: BG, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: GRAY }}>Loading...</div>;
  if (!rep) return null;

  /* ─── Derived ───────────────────────────────────────────────────────────── */

  const useCs = csIntelData.length > 0;

  // Stats from cs_intel when available, otherwise from Close
  const renewableCount = useCs
    ? csIntelData.filter(c => mapRenewStatus(c.health || "") === "Renewable").length
    : closeLeads.filter(l => l.renewStatus === "Renewable").length;
  const declinedCount = useCs
    ? csIntelData.filter(c => mapRenewStatus(c.health || "") === "Declined").length
    : closeLeads.filter(l => l.renewStatus === "Declined").length;
  const mergedCount = useCs
    ? csIntelData.filter(c => mapRenewStatus(c.health || "") === "Merged").length
    : 0;
  const totalCount = useCs ? csIntelData.length : closeLeads.length;

  // For backward compat — used in center stats and drawer
  const activeCloseLeads = closeLeads.filter(l => l.renewStatus !== "Cancelled" && l.status !== "Cancelled" && l.renewStatus !== "Lost");
  const totalMRV = useCs
    ? csIntelData.reduce((s, c) => s + (parseFloat(String(c.monthly || "0")) || 0), 0)
    : closeLeads.reduce((s, l) => s + (parseFloat(l.monthly) || 0), 0);
  const avgMonthly = totalCount > 0 ? Math.round(totalMRV / totalCount) : 0;

  type ListItem = { type: "campaign"; data: CampaignClient; score: number } | { type: "close"; data: CloseLead; score: number } | { type: "csIntel"; data: typeof csIntelData[number]; score: number };
  const sl = search.toLowerCase();
  const filteredList: ListItem[] = (() => {
    const items: ListItem[] = [];

    if (listFilter === "campaign") {
      clients.filter(c => !sl || c.business_name.toLowerCase().includes(sl)).forEach(c => items.push({ type: "campaign", data: c, score: 20 }));
      return items;
    }

    // Build full list from csIntel or Close
    if (useCs) {
      // Campaign clients
      clients.filter(c => !sl || c.business_name.toLowerCase().includes(sl)).forEach(c => {
        const csMatch = csIntelData.find(ci => ci.businessName.toLowerCase() === c.business_name.toLowerCase());
        items.push({ type: "campaign", data: c, score: csMatch ? priorityScore(csMatch) + 20 : 20 });
      });
      // CS Intel clients (no campaign duplicate)
      csIntelData.filter(c => {
        if (sl && !c.businessName.toLowerCase().includes(sl)) return false;
        if (clients.some(cc => cc.business_name.toLowerCase() === c.businessName.toLowerCase())) return false;
        const mapped = mapRenewStatus(c.health || "");
        if (listFilter === "renewable" && mapped !== "Renewable") return false;
        if (listFilter === "declined" && mapped !== "Declined") return false;
        return true;
      }).forEach(c => items.push({ type: "csIntel", data: c, score: priorityScore(c) }));
    } else {
      clients.filter(c => !sl || c.business_name.toLowerCase().includes(sl)).forEach(c => items.push({ type: "campaign", data: c, score: 20 }));
      const src = listFilter === "renewable" ? closeLeads.filter(l => l.renewStatus === "Renewable")
        : listFilter === "declined" ? closeLeads.filter(l => l.renewStatus === "Declined")
        : activeCloseLeads.filter(l => !clients.some(c => c.business_name.toLowerCase() === l.businessName.toLowerCase()));
      src.filter(l => !sl || l.businessName.toLowerCase().includes(sl)).forEach(l => items.push({ type: "close", data: l, score: 0 }));
    }

    // Sort by priority score descending
    items.sort((a, b) => b.score - a.score);

    // Priority filter: top 25 only (unless searching or other filter)
    if (listFilter === "priority" && !sl) return items.slice(0, 25);

    return items;
  })();

  const sbr = selected ? (selected.sbr_data || {}) as Record<string, unknown> : {};
  const matchingLead = selected ? closeLeads.find(l => l.businessName.toLowerCase() === selected.business_name.toLowerCase()) : null;
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

        <div style={{ flex: 1 }} />

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

        {/* Header */}
        <div style={{ padding: "10px 12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{listFilter === "priority" ? "Priority Queue" : listFilter === "all" ? "All Contacts" : listFilter.charAt(0).toUpperCase() + listFilter.slice(1)}</span>
          <span style={{ fontSize: 10, color: GRAY }}>{sl ? `${filteredList.length} results` : listFilter === "priority" ? `Top 25 of ${totalCount}` : `${filteredList.length}`}</span>
        </div>

        {/* Search */}
        <div style={{ padding: "0 12px 8px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all contacts..." style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 12, outline: "none", boxSizing: "border-box", color: TEXT }} />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
          {(["priority", "renewable", "declined", "campaign", "all"] as const).map(f => (
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
                } else if (item.type === "csIntel") {
                  const c = item.data;
                  const mapped = mapRenewStatus(c.health || "");
                  const isActive = selected?.business_name?.toLowerCase() === c.businessName.toLowerCase();
                  const mo = parseFloat(String(c.monthly || "0")) || 0;
                  return (
                    <div key={c.businessName + String(c.contractNumber || "")} onClick={() => selectContact({ id: c.businessName, business_name: c.businessName, city: String(c.market || c.region || ""), zip: "", category: String(c.industry || ""), services: String(c.saleItems || ""), ad_size: String(c.saleItems || ""), tagline: "", rep_id: rep!.username, stage: "intake" as const, sbr_data: null, generated_directions: null, selected_direction: null, approved_at: null, revisions: null, created_at: "" } as unknown as CampaignClient)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`, borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent", background: isActive ? SURFACE : "transparent" }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: avatarBg(String(c.industry || "")), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initials(c.businessName)}</div>
                        {item.score > 0 && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: priDotColor(item.score), border: "1px solid " + SURFACE }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.businessName}</div>
                        <div style={{ fontSize: 10, color: GRAY }}>{c.lastEdition ? `Last: ${c.lastEdition}` : String(c.market || c.industry || "")}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                        {mapped && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, color: renewColor(c.health || ""), background: `${renewColor(c.health || "")}15` }}>{mapped}</span>}
                        {mo > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: GOLD }}>${mo.toFixed(0)}/mo</span>}
                      </div>
                    </div>
                  );
                } else {
                  const l = item.data as CloseLead;
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
            {/* BOB Snapshot */}
            {useCs && (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Book of Business</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{repDisplay}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: GRAY }}>Period:</span>
                    <input type="date" value={reportingPeriod} onChange={e => { setReportingPeriod(e.target.value); if (e.target.value) loadCsForDate(e.target.value); }} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 11, color: TEXT, background: BG }} />
                    {(() => { const wk = csIntelData[0]?.week_of; return wk ? <span style={{ fontSize: 10, background: `${NAVY}12`, color: NAVY, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{String(wk).slice(0, 10)}</span> : null; })()}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: GOLD }}>${Math.round(totalMRV).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: GRAY, fontWeight: 600, textTransform: "uppercase" as const }}>MRR</div>
                  </div>
                  <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: TEXT }}>${(totalMRV * 12 / 1000000).toFixed(2)}M</div>
                    <div style={{ fontSize: 11, color: GRAY, fontWeight: 600, textTransform: "uppercase" as const }}>ARR</div>
                  </div>
                  <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: TEXT2 }}>${(totalMRV * 12 * 1.75 / 1000000).toFixed(2)}M</div>
                    <div style={{ fontSize: 11, color: GRAY, fontWeight: 600, textTransform: "uppercase" as const }}>TCV (est.)</div>
                  </div>
                  <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: NAVY }}>{totalCount}</div>
                    <div style={{ fontSize: 11, color: GRAY, fontWeight: 600, textTransform: "uppercase" as const }}>Accounts</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: `${GREEN}12`, padding: "3px 10px", borderRadius: 10 }}><span style={{ fontSize: 16, fontWeight: 800 }}>{renewableCount}</span> <span style={{ fontSize: 11 }}>Renewable</span></span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: RED, background: `${RED}12`, padding: "3px 10px", borderRadius: 10 }}><span style={{ fontSize: 16, fontWeight: 800 }}>{declinedCount}</span> <span style={{ fontSize: 11 }}>Declined</span></span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, background: `${AMBER}12`, padding: "3px 10px", borderRadius: 10 }}><span style={{ fontSize: 16, fontWeight: 800 }}>{mergedCount}</span> <span style={{ fontSize: 11 }}>Merged</span></span>
                </div>
              </div>
            )}

            {/* Tabs: Overview / Audit */}
            {useCs && closeLeads.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                {(["overview", "audit"] as const).map(t => (
                  <button key={t} onClick={() => setEmptyTab(t)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: emptyTab === t ? NAVY : SURFACE, color: emptyTab === t ? "#fff" : TEXT2, textTransform: "capitalize" }}>{t === "audit" ? "CSOps × Close Audit" : t}</button>
                ))}
              </div>
            )}

            {emptyTab === "audit" && useCs && closeLeads.length > 0 ? (() => {
              const csNames = csIntelData.map(c => ({ orig: c.businessName, norm: normName(c.businessName), data: c }));
              const clNames = closeLeads.map(l => ({ orig: l.businessName, norm: normName(l.businessName), data: l }));
              const matched = csNames.filter(c => clNames.some(l => l.norm === c.norm));
              const csOnly = csNames.filter(c => !clNames.some(l => l.norm === c.norm));
              const closeOnly = clNames.filter(l => !csNames.some(c => c.norm === l.norm));
              return (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 4 }}>CSOps × Close CRM Reconciliation</div>
                    <div style={{ fontSize: 12, color: GRAY }}>CSOps report vs live Close CRM data</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: GREEN }}>{matched.length}</div>
                      <div style={{ fontSize: 10, color: GRAY, fontWeight: 600 }}>Matched</div>
                    </div>
                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: AMBER }}>{csOnly.length}</div>
                      <div style={{ fontSize: 10, color: GRAY, fontWeight: 600 }}>CSOps Only</div>
                    </div>
                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#4A90D9" }}>{closeOnly.length}</div>
                      <div style={{ fontSize: 10, color: GRAY, fontWeight: 600 }}>Close Only</div>
                    </div>
                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: TEXT2 }}>{Math.abs(csIntelData.length - closeLeads.length)}</div>
                      <div style={{ fontSize: 10, color: GRAY, fontWeight: 600 }}>Discrepancy</div>
                      <div style={{ fontSize: 9, color: GRAY, marginTop: 4, lineHeight: 1.4 }} title="Close CRM includes all leads including cancelled and lapsed accounts. CSOps renewal report includes only active accounts in the current reporting period. The difference represents cancelled, lapsed, or post-report accounts.">ⓘ hover for details</div>
                    </div>
                  </div>

                  {/* Expandable tables */}
                  {[
                    { label: "Matched", color: GREEN, items: matched.map(m => m.orig), show: auditShowMatched, toggle: () => setAuditShowMatched(p => !p) },
                    { label: "CSOps Only", color: AMBER, items: csOnly.map(c => `${c.orig} — $${parseFloat(String(c.data.monthly || "0")).toFixed(0)}/mo — ${mapRenewStatus(c.data.health || "")}`), show: auditShowCsOnly, toggle: () => setAuditShowCsOnly(p => !p) },
                    { label: "Close Only", color: "#4A90D9", items: closeOnly.map(c => `${c.orig} — ${c.data.status} — $${c.data.monthly}/mo`), show: auditShowCloseOnly, toggle: () => setAuditShowCloseOnly(p => !p) },
                  ].map(section => (
                    <div key={section.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                      <button onClick={section.toggle} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: section.color }}>{section.label} ({section.items.length})</span>
                        <span style={{ fontSize: 10, color: GRAY }}>{section.show ? "▼" : "▶"}</span>
                      </button>
                      {section.show && (
                        <div style={{ marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
                          {section.items.map((item, i) => (
                            <div key={i} style={{ fontSize: 11, color: TEXT, padding: "3px 0", borderBottom: `1px solid ${BORDER}` }}>{item}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Bruno audit */}
                  <button onClick={async () => {
                    setAuditBrunoLoading(true);
                    try {
                      const summary = `CSOps has ${csIntelData.length} accounts. Close has ${closeLeads.length}. Matched: ${matched.length}. CSOps-only: ${csOnly.length}. Close-only: ${closeOnly.length}. Top CSOps-only names: ${csOnly.slice(0, 5).map(c => c.orig).join(", ")}. Top Close-only names: ${closeOnly.slice(0, 5).map(c => c.orig).join(", ")}.`;
                      const res = await fetch("/api/campaign/bruno-va", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: `Analyze this CSOps vs Close CRM audit and give me actionable recommendations: ${summary}` }], pipeline: [] }) });
                      const d = await res.json();
                      setAuditBrunoResponse(d.response || "No response");
                    } catch { setAuditBrunoResponse("Failed to analyze"); }
                    setAuditBrunoLoading(false);
                  }} disabled={auditBrunoLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 10, opacity: auditBrunoLoading ? 0.5 : 1 }}>
                    {auditBrunoLoading ? "Analyzing..." : "🔍 Ask Bruno to Analyze"}
                  </button>
                  {auditBrunoResponse && (
                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, fontSize: 12, color: TEXT, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{auditBrunoResponse}</div>
                  )}
                </div>
              );
            })() : (
            <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { l: "Total Active", v: totalCount, c: NAVY },
                { l: "Renewable", v: renewableCount, c: GREEN },
                { l: "Declined", v: declinedCount, c: RED },
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
            </>
            )}
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
                    {matchingLead?.saleDate && <div>Sale Date: <strong>{matchingLead.saleDate}</strong></div>}
                    {matchingLead?.firstEdition && <div>First Edition: <strong>{matchingLead.firstEdition}</strong></div>}
                    {matchingLead?.lastEdition && <div>Last Edition: <strong style={{ color: (() => { const d = Math.floor((new Date(matchingLead.lastEdition).getTime() - Date.now()) / 86400000); return d <= 60 ? AMBER : TEXT; })() }}>{matchingLead.lastEdition}</strong></div>}
                    {matchingLead?.soldBy && <div>Sold By: <strong>{matchingLead.soldBy}</strong></div>}
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
                {!getCampaignId(selected.business_name) ? (
                  <div style={{ textAlign: "center", padding: 20, color: GRAY }}>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>No campaign started — messages unavailable</div>
                    <Link href={`/campaign/intake?businessName=${encodeURIComponent(selected.business_name)}`} style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>Start Campaign →</Link>
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
                <button onClick={() => setDrawerOpen(false)} style={{ background: BG, border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, color: TEXT2 }}>✕</button>
                {selected.id && !selected.id.startsWith("cl-") && !selected.id.startsWith("demo-") && <button onClick={() => { setDeleteCode(""); setDeleteError(""); setDeleteModalOpen(true); }} style={{ background: `${RED}15`, border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 13, color: RED }} title="Delete client">🗑</button>}
                <div style={{ width: 44, height: 44, borderRadius: 10, background: avatarBg(selected.category), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>{initials(selected.business_name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{selected.business_name}</div>
                  <div style={{ fontSize: 14, color: GRAY }}>{selected.city}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage] }}>{STAGE_LABELS[selected.stage]}</span>
                {matchingLead?.renewStatus && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color: matchingLead.renewStatus === "Renewable" ? GREEN : matchingLead.renewStatus === "Declined" ? RED : GRAY, background: matchingLead.renewStatus === "Renewable" ? `${GREEN}15` : matchingLead.renewStatus === "Declined" ? `${RED}15` : `${GRAY}15` }}>{matchingLead.renewStatus}</span>}
              </div>
              <div style={{ height: 1, background: BORDER }} />

              {/* Action buttons row */}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {[
                  { icon: "📝", label: "Note", action: async () => { setNoteOpen(!noteOpen); } },
                  { icon: "✉️", label: "Email", action: () => { setEmailTo(matchingLead?.email || ""); setEmailSubject(`Following up — ${selected.business_name}`); setEmailBody(""); setEmailModalOpen(true); } },
                  { icon: "📞", label: "Call", action: () => { window.open("tel:" + (matchingLead?.phone || "")); fetch("/api/campaign/close-action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"log-call", leadId: selected.id, data:{ note:"Call from Campaign Portal" } }) }).catch(() => {}); showToast("Call logged in Close ✓"); } },
                  { icon: "📋", label: "Task", action: () => showToast("Task created") },
                  { icon: "⚡", label: "Escalate", action: () => showToast("Escalated") },
                ].map(a => (
                  <button key={a.label} onClick={a.action} style={{ width: 44, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0" }}>
                    <span style={{ fontSize: 16 }}>{a.icon}</span>
                    <span style={{ fontSize: 11, color: GRAY }}>{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Inline note */}
              {noteOpen && (
                <div style={{ marginTop: 8 }}>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", color: TEXT }} />
                  <button onClick={async () => { if (!noteText.trim()) return; try { await fetch(`/api/campaign/message/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "rep", content: noteText }) }); fetch("/api/campaign/close-action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"log-note", leadId: selected.id, data:{ note: noteText } }) }).catch(() => {}); setNoteText(""); setNoteOpen(false); showToast("Note logged in Close ✓"); } catch { showToast("Failed"); } }} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Save</button>
                </div>
              )}
            </div>

            {/* Drawer tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
              {(["actions", "bruno", "territory", "csIntel", "card"] as const).map(t => (
                <button key={t} onClick={() => setDrawerTab(t)} style={{ flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent", color: drawerTab === t ? NAVY : GRAY, borderBottom: drawerTab === t ? `2px solid ${GOLD}` : "2px solid transparent" }}>{t === "csIntel" ? "CS" : t === "actions" ? "Actions" : t === "bruno" ? "Bruno" : t === "territory" ? "Territory" : "Card"}</button>
              ))}
            </div>

            {/* Drawer tab content */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

              {/* ACTIONS TAB */}
              {drawerTab === "actions" && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={sendCampaignLink} disabled={sendingLink} style={{ width: "100%", background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: sendingLink ? 0.5 : 1, textAlign: "left" }}>{sendingLink ? "Sending..." : "📤 Send Campaign Link"}</button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/tearsheet/${selected.id}`); showToast("Tearsheet link copied!"); }} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>🔗 Copy Tearsheet</button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/client/${selected.id}`); showToast("Portal link copied!"); }} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>🌐 Copy Portal Link</button>
                  {selected.stage === "approved" && <button onClick={() => updateStage("production")} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>▶ Mark In Production</button>}
                  {selected.stage === "production" && <button onClick={() => updateStage("delivered")} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>✅ Mark Delivered</button>}
                  <button onClick={() => {
                    const trimSize = AD_DIMS[selected.ad_size] || selected.ad_size;
                    const bleedSize = AD_BLEED[selected.ad_size] || "";
                    const w = window.open("", "_blank");
                    if (!w) return;
                    w.document.write(`<!DOCTYPE html><html><head><title>Delivery Pack — ${selected.business_name}</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;color:#1C2B1D;line-height:1.8}h1{font-size:24px;border-bottom:2px solid #C8922A;padding-bottom:8px}h2{font-size:16px;color:#1B2A4A;margin-top:24px}table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:6px 12px;border:1px solid #DDD5C0;font-size:13px}td:first-child{font-weight:700;width:200px;background:#F5F0E8}.gold{color:#C8922A;font-weight:700}</style></head><body>`);
                    w.document.write(`<h1>BVM Campaign Delivery Pack</h1><p><strong>${selected.business_name}</strong> — ${selected.city} — ${new Date().toLocaleDateString()}</p>`);
                    w.document.write(`<h2>Campaign Details</h2><table><tr><td>Business Name</td><td>${selected.business_name}</td></tr><tr><td>City / ZIP</td><td>${selected.city} ${selected.zip}</td></tr><tr><td>Category</td><td>${selected.category}</td></tr><tr><td>Ad Size</td><td>${selected.ad_size}</td></tr><tr><td>Tagline</td><td>${selected.tagline || "—"}</td></tr><tr><td>Services / Ad Copy</td><td>${selected.services}</td></tr><tr><td>Selected Direction</td><td>${selected.selected_direction || "—"}</td></tr></table>`);
                    w.document.write(`<h2>Print Specifications</h2><table><tr><td>Trim Size</td><td class="gold">${trimSize}</td></tr><tr><td>Document with Bleed</td><td class="gold">${bleedSize}</td></tr><tr><td>Bleed</td><td>0.125" all sides</td></tr><tr><td>Safe Space</td><td>0.25" minimum from trim edge</td></tr><tr><td>Resolution</td><td>300dpi minimum</td></tr><tr><td>Color Mode</td><td>CMYK (convert from RGB before sending to printer)</td></tr><tr><td>Border</td><td>Visual border required around perimeter</td></tr><tr><td>File Formats</td><td>PDF, JPG, TIFF, EPS, PSD, AI, SVG</td></tr></table>`);
                    w.document.write(`<p style="margin-top:32px;font-size:11px;color:#9B8E7A;border-top:1px solid #DDD5C0;padding-top:12px">Best Version Media | Campaign Portal | ${new Date().toLocaleDateString()}</p></body></html>`);
                    w.document.close();
                    w.print();
                  }} style={{ width: "100%", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>📥 Delivery Pack</button>

                  <div style={{ height: 1, background: BORDER, margin: "12px 0" }} />

                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 6 }}>⚠️ Escalation</div>
                  <textarea value={escalationNote} onChange={e => setEscalationNote(e.target.value)} placeholder={"Describe the issue for " + selected.business_name + "..."} rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" as const, color: TEXT, background: BG, marginBottom: 6 }} />
                  <button onClick={async () => { try { await fetch("/api/campaign/escalate", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ type: "escalation", repName: rep!.username, clientName: selected.business_name, clientStatus: selected.stage || "", note: escalationNote }) }); showToast("Escalation sent ✓"); setEscalationNote(""); } catch { /* */ } }} disabled={!escalationNote.trim()} style={{ width: "100%", background: NAVY, color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: escalationNote.trim() ? 1 : 0.4 }}>🚨 Escalate to Ted →</button>

                  <div style={{ height: 1, background: BORDER, margin: "12px 0" }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 6 }}>✉️ Send Handwrytten Card</div>
                  <textarea value={cardMsg} onChange={e => setCardMsg(e.target.value)} placeholder="Write your message..." rows={4} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" as const, marginBottom: 8, color: TEXT }} />
                  {cardSent ? (
                    <div style={{ fontSize: 14, color: GREEN, fontWeight: 600 }}>Card sent!</div>
                  ) : (
                    <button onClick={sendCard} disabled={sendingCard} style={{ width: "100%", background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: sendingCard ? 0.5 : 1 }}>{sendingCard ? "Sending..." : "Send Card"}</button>
                  )}
                </div>
              )}

              {/* BRUNO TAB */}
              {drawerTab === "bruno" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ background: `linear-gradient(135deg, ${NAVY}, #2d3e50)`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>B</div>
                    <div><div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Bruno</div><div style={{ fontSize: 11, color: "#22c55e" }}>● Online</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 4, padding: "8px 12px", flexWrap: "wrap" }}>
                    {["Who needs follow up?", "At-risk clients", "Campaigns stuck?", "Top opportunities"].map(chip => (
                      <button key={chip} onClick={() => setBrunoInput(chip)} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "4px 10px", fontSize: 12, color: TEXT2, cursor: "pointer", fontWeight: 500 }}>{chip}</button>
                    ))}
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", background: BG }}>
                    {brunoMsgs.map((m, i) => (
                      <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 14, lineHeight: 1.5, background: m.role === "user" ? NAVY : SURFACE, color: m.role === "user" ? "#fff" : TEXT, border: m.role === "user" ? "none" : `1px solid ${BORDER}` }}>{m.content}</div>
                      </div>
                    ))}
                    {brunoLoading && <div style={{ fontSize: 14, color: GRAY, padding: "4px 0" }}>Thinking...</div>}
                    <div ref={brunoEndRef} />
                  </div>
                  <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 6 }}>
                    <input value={brunoInput} onChange={e => setBrunoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askBruno()} placeholder="Ask Bruno..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 14, outline: "none", boxSizing: "border-box", color: TEXT }} />
                    <button onClick={askBruno} disabled={brunoLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Send</button>
                  </div>
                </div>
              )}

              {/* TERRITORY TAB */}
              {drawerTab === "territory" && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Territory Scan</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    <input value={scanZip || selected.zip} onChange={e => setScanZip(e.target.value)} onKeyDown={e => e.key === "Enter" && runTerritoryScan()} placeholder="ZIP code..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 14, outline: "none", boxSizing: "border-box", color: TEXT }} />
                    <button onClick={() => { if (!scanZip && selected.zip) setScanZip(selected.zip); runTerritoryScan(); }} disabled={scanLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{scanLoading ? "..." : "Scan"}</button>
                  </div>
                  {scanResult && (
                    <div style={{ fontSize: 14, color: TEXT, lineHeight: 2 }}>
                      <div>Score: <strong style={{ color: GREEN, fontSize: 20 }}>{String(scanResult.opportunityScore || "---")}</strong></div>
                      <div>Income: {String(scanResult.medianIncome || "---")}</div>
                      <div>Top: {Array.isArray(scanResult.topCategories) ? (scanResult.topCategories as string[]).slice(0, 3).join(", ") : "---"}</div>
                      <div>Gap: {String(scanResult.competitorGap || "---")}</div>
                      <Link href={`/campaign/intelligence/${selected.id}`} style={{ display: "inline-block", marginTop: 8, color: GOLD, fontSize: 14, fontWeight: 700 }}>Full Report →</Link>
                    </div>
                  )}
                </div>
              )}

              {/* CS INTEL TAB */}
              {drawerTab === "csIntel" && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 10 }}>CS Intelligence</div>
                  <div onClick={() => csFileRef.current?.click()} onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsUpload(f); }} style={{ border: `2px dashed ${BORDER}`, borderRadius: 10, padding: 28, textAlign: "center", cursor: "pointer", background: BG, marginBottom: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📊</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Drop .xlsx/.csv</div>
                    <div style={{ fontSize: 12, color: GRAY }}>or click to browse</div>
                    <input ref={csFileRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCsUpload(f); }} />
                  </div>
                  {csIntelData.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, color: TEXT2, marginBottom: 8 }}><strong>{csIntelData.length}</strong> matched · {csIntelData.filter(c => c.health === "CRITICAL").length} CRITICAL · {csIntelData.filter(c => c.health === "HIGH").length} HIGH</div>
                      <div style={{ maxHeight: 200, overflowY: "auto" }}>
                        {csIntelData.sort((a, b) => (a.health === "CRITICAL" ? 0 : 1) - (b.health === "CRITICAL" ? 0 : 1)).slice(0, 15).map((c, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
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
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 12 }}>✉️ Send a Card</div>

                  {/* Template selector */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                    {(["welcome","thankyou","followup","congrats"] as const).map(t => (
                      <button key={t} onClick={() => setCardTemplate(t)} style={{ flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: cardTemplate === t ? GOLD : SURFACE, color: cardTemplate === t ? NAVY : TEXT2, textTransform: "capitalize" }}>{t === "thankyou" ? "Thanks" : t === "followup" ? "Follow Up" : t}</button>
                    ))}
                  </div>

                  {/* Live preview */}
                  <div style={{ transform: "scale(0.6)", transformOrigin: "top center", height: 180, marginBottom: -60 }}>
                    <div dangerouslySetInnerHTML={{ __html: (() => {
                      const msg = cardMsg || "Thank you for being part of the BVM family.";
                      const name = rep!.username;
                      if (cardTemplate === "welcome") return `<div style="background:#1B2A4A;border-radius:12px;padding:32px;color:white;font-family:Georgia,serif;text-align:center"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#F5C842;margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;margin-bottom:8px">Welcome to the Family</div><div style="width:40px;height:2px;background:#F5C842;margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;color:rgba(255,255,255,0.85);font-style:italic">${msg}</div><div style="margin-top:24px;font-size:12px;color:#F5C842">${name}</div></div>`;
                      if (cardTemplate === "thankyou") return `<div style="background:#F5F0E8;border-radius:12px;padding:32px;font-family:Georgia,serif;text-align:center;border:2px solid #2C3E2D"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#2C3E2D;margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;color:#2C3E2D;margin-bottom:8px">Thank You</div><div style="width:40px;height:2px;background:#C8922A;margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;color:#4a3728;font-style:italic">${msg}</div><div style="margin-top:24px;font-size:12px;color:#2C3E2D">${name}</div></div>`;
                      if (cardTemplate === "followup") return `<div style="background:#ffffff;border-radius:12px;padding:32px;font-family:Georgia,serif;text-align:center;border:2px solid #3A5F7D"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#3A5F7D;margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;color:#1B2A4A;margin-bottom:8px">Just Checking In</div><div style="width:40px;height:2px;background:#3A5F7D;margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;color:#475569;font-style:italic">${msg}</div><div style="margin-top:24px;font-size:12px;color:#3A5F7D">${name}</div></div>`;
                      return `<div style="background:linear-gradient(135deg,#C8922A,#F5C842);border-radius:12px;padding:32px;font-family:Georgia,serif;text-align:center;color:white"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;margin-bottom:8px">Congratulations!</div><div style="width:40px;height:2px;background:white;margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;color:rgba(255,255,255,0.9);font-style:italic">${msg}</div><div style="margin-top:24px;font-size:12px;color:white">${name}</div></div>`;
                    })() }} />
                  </div>

                  {/* Message input */}
                  <textarea value={cardMsg} onChange={e => setCardMsg(e.target.value)} placeholder="Write your personal message..." rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", color: TEXT, background: BG, marginBottom: 10 }} />

                  {/* Delivery selector */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <button onClick={() => setCardDelivery("email")} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", border: cardDelivery === "email" ? `2px solid ${GOLD}` : `1px solid ${BORDER}`, background: SURFACE, color: TEXT }}>📧 Email</button>
                    <button onClick={() => setCardDelivery("snail")} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", border: cardDelivery === "snail" ? `2px solid ${NAVY}` : `1px solid ${BORDER}`, background: SURFACE, color: TEXT }}>✉️ Snail Mail</button>
                  </div>

                  {cardDelivery === "email" && (
                    <input value={cardEmailTo} onChange={e => setCardEmailTo(e.target.value)} placeholder="To email..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", boxSizing: "border-box", color: TEXT, background: BG, marginBottom: 10 }} />
                  )}
                  {cardDelivery === "snail" && (
                    <div style={{ fontSize: 14, color: AMBER, background: `${AMBER}12`, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>Ted will handle mailing — address on file in Close</div>
                  )}

                  {cardSent ? (
                    <div style={{ fontSize: 14, color: GREEN, fontWeight: 600, textAlign: "center", padding: "10px 0" }}>{cardDelivery === "email" ? "✓ Card sent!" : "✓ Card request sent to Ted"}</div>
                  ) : (
                    <button onClick={sendCard} disabled={sendingCard} style={{ width: "100%", background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "12px 16px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: sendingCard ? 0.5 : 1 }}>{sendingCard ? "Sending..." : "Send Card →"}</button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Email Compose Modal */}
      {emailModalOpen && selected && (
        <>
          <div onClick={() => setEmailModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 499 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: SURFACE, borderRadius: 12, padding: 24, width: 440, zIndex: 500, boxShadow: "0 16px 48px rgba(0,0,0,0.2)", border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 16 }}>Compose Email</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: GRAY, display: "block", marginBottom: 4 }}>To</label>
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", boxSizing: "border-box", color: TEXT, background: BG }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: GRAY, display: "block", marginBottom: 4 }}>Subject</label>
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", boxSizing: "border-box", color: TEXT, background: BG }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: GRAY, display: "block", marginBottom: 4 }}>Message</label>
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", color: TEXT, background: BG }} />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={async () => { setEmailSending(true); try { await fetch("/api/campaign/escalate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"email", to: emailTo, subject: emailSubject, body: emailBody }) }); await fetch("/api/campaign/close-action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"log-email", leadId: selected.id, data:{ subject: emailSubject, body: emailBody } }) }); showToast("Email sent + logged in Close ✓"); setEmailModalOpen(false); } catch { showToast("Send failed"); } setEmailSending(false); }} disabled={emailSending || !emailTo.trim()} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: emailSending ? 0.5 : 1 }}>{emailSending ? "Sending..." : "Send Email →"}</button>
              <button onClick={() => setEmailModalOpen(false)} style={{ background: "none", border: "none", color: GRAY, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* ── CS Intel Modal ─────────────────────────────────────────────── */}
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selected && (
        <>
          <div onClick={() => setDeleteModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 599 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: SURFACE, borderRadius: 12, padding: 24, width: 400, zIndex: 600, boxShadow: "0 16px 48px rgba(0,0,0,0.2)", border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: RED, textAlign: "center", marginBottom: 8 }}>Delete Campaign Client</div>
            <p style={{ fontSize: 13, color: TEXT2, textAlign: "center", lineHeight: 1.6, margin: "0 0 16px" }}>This will permanently remove <strong>{selected.business_name}</strong> from the Campaign Portal. This cannot be undone.</p>
            <label style={{ fontSize: 12, fontWeight: 600, color: GRAY, display: "block", marginBottom: 6 }}>Enter approval code to confirm:</label>
            <input value={deleteCode} onChange={e => setDeleteCode(e.target.value)} placeholder="Enter code..." style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `2px solid ${deleteError ? RED : BORDER}`, fontSize: 16, textAlign: "center", outline: "none", boxSizing: "border-box", color: TEXT, background: BG, letterSpacing: "0.15em", marginBottom: 8 }} />
            {deleteError && <div style={{ fontSize: 12, color: RED, textAlign: "center", marginBottom: 8 }}>{deleteError}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
              <button onClick={handleDeleteClient} disabled={deleting || !deleteCode.trim()} style={{ background: RED, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: deleting || !deleteCode.trim() ? 0.4 : 1 }}>{deleting ? "Deleting..." : "Confirm Delete"}</button>
              <button onClick={() => setDeleteModalOpen(false)} style={{ background: "none", border: "none", color: GRAY, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Floating Bruno Bot */}
      {!brunoBotOpen && (
        <button onClick={() => setBrunoBotOpen(true)} style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, width: 56, height: 56, borderRadius: "50%", background: GOLD, color: "#fff", border: "none", fontSize: 22, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", animation: "pulse 2s ease infinite" }}>B</button>
      )}
      {brunoBotOpen && (
        <div style={{ position: "fixed", bottom: 90, right: 24, width: 360, height: 480, background: SURFACE, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", zIndex: 300, display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${BORDER}` }}>
          <div style={{ background: `linear-gradient(135deg, ${NAVY}, #2d3e50)`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>B</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Bruno</div><div style={{ fontSize: 9, color: GOLD }}>Powered by Close CRM</div></div>
            <button onClick={() => setBrunoBotOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 24, height: 24, borderRadius: "50%", cursor: "pointer", fontSize: 12 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 4, padding: "8px 12px", flexWrap: "wrap" }}>
            {["Who needs follow up?", "Top renewals", "Declined this month", "Upsell opportunities"].map(chip => (
              <button key={chip} onClick={() => setBrunoInput(chip)} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "4px 10px", fontSize: 9, color: TEXT2, cursor: "pointer" }}>{chip}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", background: BG }}>
            {brunoMsgs.map((m, i) => (
              <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 12, lineHeight: 1.5, background: m.role === "user" ? NAVY : SURFACE, color: m.role === "user" ? "#fff" : TEXT, border: m.role === "user" ? "none" : `1px solid ${BORDER}` }}>{m.content}</div>
              </div>
            ))}
            {brunoLoading && <div style={{ fontSize: 11, color: GRAY }}>Thinking...</div>}
            <div ref={brunoEndRef} />
          </div>
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 6 }}>
            <input value={brunoInput} onChange={e => setBrunoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askBruno()} placeholder="Ask Bruno..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 12, outline: "none", boxSizing: "border-box" as const, color: TEXT, background: BG }} />
            <button onClick={askBruno} disabled={brunoLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Send</button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 4px 16px rgba(200,146,42,0.3); } 50% { box-shadow: 0 4px 24px rgba(200,146,42,0.6); } }`}</style>

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
