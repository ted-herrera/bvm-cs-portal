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

  /* New 3-column layout state */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [centerTab, setCenterTab] = useState<"activity" | "campaign" | "messages" | "crm">("activity");
  const [rightTab, setRightTab] = useState<"actions" | "bruno" | "territory" | "csIntel">("actions");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reportingPeriod, setReportingPeriod] = useState("");

  /* Inline note */
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  /* Contact hydration */
  const [hydrating, setHydrating] = useState(false);

  /* Escalation */
  const [escalationNote, setEscalationNote] = useState("");

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
    const msgId = getCampaignId(selected) || selected.id;
    try { const res = await fetch(`/api/campaign/message/${msgId}`); const d = await res.json(); if (d.messages) setMessages(d.messages); } catch { /* */ }
  }

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { brunoEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [brunoMsgs]);

  /* ─── Action Functions ─────────────────────────────────────────────────── */

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  // Get valid campaign_clients UUID for message routing
  function getCampaignId(sel: CampaignClient): string | null {
    // If selected already has a valid UUID, use it directly
    if (sel.id && isUUID(sel.id)) return sel.id;
    // Otherwise try to find by business name
    const match = clients.find(cc => cc.business_name.toLowerCase() === sel.business_name.toLowerCase());
    return match?.id || null;
  }

  function selectContact(c: CampaignClient) {
    // If synthetic contact (csIntel/Close), swap in real campaign client if exists
    const realClient = clients.find(cc => cc.business_name.toLowerCase() === c.business_name.toLowerCase());
    setSelected(realClient || c); setMessages([]); setCardSent(false);
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
    const msgId = getCampaignId(selected) || selected.id;
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
      setSelected(null); setDeleteModalOpen(false); setDeleteCode(""); setDeleteError("");
      showToast("Client deleted");
    } catch { showToast("Delete failed — try again"); }
    setDeleting(false);
  }

  /* ─── Auth Guard ───────────────────────────────────────────────────────── */

  if (!authChecked) return <div style={{ background: BG, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: GRAY }}>Loading...</div>;
  if (!rep) return null;

  /* ─── Derived ───────────────────────────────────────────────────────────── */

  const matchingLead = selected ? closeLeads.find(l => l.businessName.toLowerCase() === selected.business_name.toLowerCase()) : null;
  const repDisplay = demoMode ? "Demo User" : rep.username;
  const sbr = selected ? (selected.sbr_data || {}) as Record<string, unknown> : {};
  const csMatch = selected ? csIntelData.find(ci => ci.businessName.toLowerCase() === selected.business_name.toLowerCase()) : null;

  // Search results
  const sq = searchQuery.trim().toLowerCase();
  const searchResults: Array<{ name: string; city: string; type: "cs" | "close" | "campaign"; renew?: string; monthly?: string; source: unknown }> = [];
  if (sq) {
    csIntelData.filter(c => c.businessName.toLowerCase().includes(sq)).forEach(c => searchResults.push({ name: c.businessName, city: String(c.market || c.region || ""), type: "cs", renew: mapRenewStatus(c.health || ""), monthly: String(c.monthly || ""), source: c }));
    closeLeads.filter(l => l.businessName.toLowerCase().includes(sq) && !searchResults.some(r => r.name.toLowerCase() === l.businessName.toLowerCase())).forEach(l => searchResults.push({ name: l.businessName, city: l.publications || l.region, type: "close", renew: l.renewStatus, monthly: l.monthly, source: l }));
    clients.filter(c => c.business_name.toLowerCase().includes(sq) && !searchResults.some(r => r.name.toLowerCase() === c.business_name.toLowerCase())).forEach(c => searchResults.push({ name: c.business_name, city: c.city, type: "campaign", source: c }));
  }

  // Activity items
  const activityItems: Array<{ id: string; name: string; desc: string; time: string; color: string; client: CampaignClient }> = [];
  const activityClients = selected ? clients.filter(c => c.id === selected.id) : clients;
  activityClients.forEach(c => {
    activityItems.push({ id: c.id + "-created", name: c.business_name, desc: `Campaign created - ${c.category}`, time: c.created_at, color: GREEN, client: c });
    if (c.stage !== "intake") activityItems.push({ id: c.id + "-stage", name: c.business_name, desc: `Stage: ${STAGE_LABELS[c.stage]}`, time: c.approved_at || c.created_at, color: "#3b82f6", client: c });
  });
  activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const stageOrder = ["intake", "tearsheet", "approved", "production", "delivered"];

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <div style={{ height: "100vh", overflow: "hidden", fontFamily: "Inter, 'DM Sans', -apple-system, sans-serif", display: "grid", gridTemplateRows: "52px 1fr" }}>

      {/* Toast */}
      {toast && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: GREEN, color: "#fff", padding: "6px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, zIndex: 999 }}>{toast}</div>}

      {/* Demo banner */}
      {demoMode && <div style={{ position: "fixed", top: 52, left: 0, right: 0, background: "#fef3c7", color: "#92400e", textAlign: "center", fontSize: 11, fontWeight: 700, padding: "4px 0", zIndex: 60 }}>DEMO MODE — sample data</div>}

      {/* ── TOP NAV (52px) ─────────────────────────────────────────────── */}
      <nav style={{ gridColumn: "1 / -1", height: 52, background: NAVY, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, position: "relative", zIndex: 50 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.12em" }}>CAMPAIGN PORTAL</span>

        {/* Center search bar */}
        <div style={{ flex: 1, maxWidth: 400, margin: "0 auto", position: "relative" }}>
          <div style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "0 14px", display: "flex", alignItems: "center" }}>
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onBlur={() => { setTimeout(() => setSearchOpen(false), 200); }}
              onKeyDown={e => { if (e.key === "Escape") { setSearchQuery(""); setSearchOpen(false); } }}
              placeholder="Search contacts..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 13, padding: "8px 0" }}
            />
          </div>
          {/* Search dropdown */}
          {searchOpen && sq && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: SURFACE, borderRadius: "0 0 8px 8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", maxHeight: 320, overflowY: "auto", zIndex: 100 }}>
              <div style={{ padding: "8px 14px", fontSize: 11, color: GRAY }}>{searchResults.length} results for &apos;{searchQuery.trim()}&apos;</div>
              {searchResults.map((r, i) => (
                <div key={i} onClick={() => {
                  if (r.type === "close") selectCloseLead(r.source as CloseLead);
                  else if (r.type === "campaign") selectContact(r.source as CampaignClient);
                  else selectContact({ id: r.name, business_name: r.name, city: r.city, zip: "", category: "", services: "", ad_size: "", tagline: "", rep_id: rep.username, stage: "intake" as const, sbr_data: null, generated_directions: null, selected_direction: null, approved_at: null, revisions: null, created_at: "" } as unknown as CampaignClient);
                  setSearchOpen(false); setSearchQuery("");
                }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarBg(r.type === "campaign" ? ((r.source as CampaignClient).category || "") : ""), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{initials(r.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: GRAY }}>{r.city}</div>
                  </div>
                  {r.renew && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, color: renewColor(r.renew), background: `${renewColor(r.renew)}15` }}>{r.renew}</span>}
                  {r.monthly && parseFloat(r.monthly) > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: GOLD }}>${parseFloat(r.monthly).toFixed(0)}/mo</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right controls */}
        <span style={{ fontSize: 11, color: "#fff" }}>{clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
        <button onClick={() => setDemoMode(!demoMode)} style={{ background: demoMode ? "#fef3c7" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 600, color: demoMode ? "#92400e" : "rgba(255,255,255,0.7)", cursor: "pointer" }}>Demo</button>
        <button onClick={() => setCsModalOpen(true)} style={{ background: "transparent", border: "none", fontSize: 14, color: "#fff", cursor: "pointer", padding: "4px 6px" }}>📊 CS</button>
        <Link href="/campaign/intake" style={{ background: GOLD, color: NAVY, borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>New Campaign →</Link>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{initials(repDisplay)}</div>
        <span style={{ fontSize: 12, color: "#fff" }}>{repDisplay}</span>
        <button onClick={handleSignOut} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "5px 10px", fontSize: 10, color: "#fff", cursor: "pointer" }}>Out</button>
      </nav>

      {/* ── BODY (3-column grid) ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 420px", height: "calc(100vh - 52px)" }}>

        {/* ── LEFT COLUMN (300px) ───────────────────────────────────────── */}
        <div style={{ background: SURFACE, borderRight: `1px solid ${BORDER}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: GOLD, opacity: 0.15, marginBottom: 12 }}>BVM</div>
              <div style={{ fontSize: 14, color: TEXT2, marginBottom: 6 }}>Search for a contact</div>
              <div style={{ fontSize: 12, color: GRAY }}>Use the search bar to find any client</div>
            </div>
          ) : (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
              {/* IDENTITY */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: avatarBg(selected.category), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>{initials(selected.business_name)}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: TEXT, marginTop: 12 }}>{selected.business_name}</div>
                <div style={{ fontSize: 13, color: GRAY }}>{selected.city}{matchingLead?.publications ? ` · ${matchingLead.publications}` : ""}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 6, background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage] }}>{STAGE_LABELS[selected.stage]}</span>
                  {matchingLead?.renewStatus && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 6, color: renewColor(matchingLead.renewStatus), background: `${renewColor(matchingLead.renewStatus)}15` }}>{mapRenewStatus(matchingLead.renewStatus)}</span>}
                </div>
                {csMatch?.health && <span style={{ fontSize: 10, fontWeight: 700, marginTop: 6, padding: "2px 10px", borderRadius: 6, color: csMatch.health === "CRITICAL" ? RED : csMatch.health === "HIGH" ? AMBER : GREEN, background: csMatch.health === "CRITICAL" ? `${RED}15` : csMatch.health === "HIGH" ? `${AMBER}15` : `${GREEN}15` }}>{String(csMatch.health)}</span>}
              </div>

              <div style={{ height: 1, background: BORDER, margin: "16px 0" }} />

              {/* CONTACT */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>CONTACT</div>
                {matchingLead?.phone && <div style={{ fontSize: 14, color: TEXT, marginBottom: 4 }}>📞 <a href={`tel:${matchingLead.phone}`} style={{ color: "#4A90D9", textDecoration: "none" }}>{matchingLead.phone}</a></div>}
                {matchingLead?.email && <div style={{ fontSize: 14, color: TEXT, marginBottom: 4 }}>📧 <a href={`mailto:${matchingLead.email}`} style={{ color: "#4A90D9", textDecoration: "none" }}>{matchingLead.email}</a></div>}
                {matchingLead?.agreementNumber && <div style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>📋 Agr: {matchingLead.agreementNumber}</div>}
                {matchingLead?.saleDate && <div style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>📅 Sale: {matchingLead.saleDate}</div>}
                {matchingLead?.firstEdition && <div style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>▶ First: {matchingLead.firstEdition}</div>}
                {matchingLead?.lastEdition && <div style={{ fontSize: 13, color: (() => { const d = Math.floor((new Date(matchingLead.lastEdition).getTime() - Date.now()) / 86400000); return d <= 60 ? AMBER : TEXT; })(), marginBottom: 4 }}>⏹ Last: {matchingLead.lastEdition}</div>}
                {matchingLead?.soldBy && <div style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>👤 Sold By: {matchingLead.soldBy}</div>}
              </div>

              <div style={{ height: 1, background: BORDER, margin: "16px 0" }} />

              {/* ACCOUNT */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>ACCOUNT</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: GOLD, marginBottom: 8 }}>{matchingLead?.monthly ? `$${matchingLead.monthly}/mo` : "---"}</div>
                <div style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>Ad Type: {selected.ad_size || matchingLead?.adType || "---"}</div>
                <div style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>Publication: {matchingLead?.publications || "---"}</div>
                <div style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>Cadence: {matchingLead?.cadence || "---"}</div>
                <div style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>Region/DVL: {matchingLead?.region || "---"} / {matchingLead?.dvl || "---"}</div>
              </div>

              {/* CAMPAIGN section */}
              {getCampaignId(selected) && (
                <>
                  <div style={{ height: 1, background: BORDER, margin: "16px 0" }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>CAMPAIGN</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {stageOrder.map((s, i) => (
                        <div key={s} style={{ width: 10, height: 10, borderRadius: "50%", background: i <= stageOrder.indexOf(selected.stage) ? STAGE_COLORS[selected.stage] : BORDER }} />
                      ))}
                    </div>
                    <Link href={`/campaign/client/${getCampaignId(selected)}`} style={{ color: GOLD, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>View Campaign →</Link>
                  </div>
                </>
              )}

              {/* Bottom fixed action */}
              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                {getCampaignId(selected) ? (
                  <Link href={`/campaign/client/${getCampaignId(selected)}`} style={{ display: "block", width: "100%", background: GOLD, color: NAVY, borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 700, textDecoration: "none", textAlign: "center", boxSizing: "border-box" }}>Open Portal →</Link>
                ) : (
                  <Link href={`/campaign/intake?businessName=${encodeURIComponent(selected.business_name)}`} style={{ display: "block", width: "100%", background: GOLD, color: NAVY, borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 700, textDecoration: "none", textAlign: "center", boxSizing: "border-box" }}>Start Campaign →</Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER COLUMN ─────────────────────────────────────────────── */}
        <div style={{ background: BG, display: "flex", flexDirection: "column" }}>
          {/* Tab bar */}
          <div style={{ height: 40, background: SURFACE, borderBottom: `1px solid ${BORDER}`, display: "flex" }}>
            {(["activity", "campaign", "messages", "crm"] as const).map(t => (
              <button key={t} onClick={() => setCenterTab(t)} style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent", borderBottom: centerTab === t ? `2px solid ${GOLD}` : "2px solid transparent", color: centerTab === t ? NAVY : GRAY }}>{t === "crm" ? "Close CRM" : t === "activity" ? "Activity" : t === "campaign" ? "Campaign" : "Messages"}</button>
            ))}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

            {/* ACTIVITY TAB */}
            {centerTab === "activity" && (
              <div>
                {activityItems.slice(0, 20).map(item => (
                  <div key={item.id} onClick={() => selectContact(item.client)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: GRAY }}>{item.desc}</div>
                    </div>
                    <div style={{ fontSize: 11, color: GRAY, flexShrink: 0 }}>{timeAgo(item.time)}</div>
                  </div>
                ))}
                {activityItems.length === 0 && <div style={{ textAlign: "center", color: GRAY, fontSize: 13, padding: 40 }}>No recent activity</div>}
              </div>
            )}

            {/* CAMPAIGN TAB */}
            {centerTab === "campaign" && (
              <div>
                {!selected ? (
                  <div style={{ textAlign: "center", color: GRAY, fontSize: 13, padding: 40 }}>Select a contact to view campaign</div>
                ) : !getCampaignId(selected) ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: 13, color: GRAY, marginBottom: 8 }}>No campaign</div>
                    <Link href={`/campaign/intake?businessName=${encodeURIComponent(selected.business_name)}`} style={{ color: GOLD, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Start Campaign →</Link>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginBottom: 2 }}>{selected.business_name}</div>
                    <div style={{ fontSize: 13, color: GRAY, marginBottom: 10 }}>{selected.city}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage] }}>{STAGE_LABELS[selected.stage]}</span>

                    {/* 4 stat pills */}
                    <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 16 }}>
                      {[
                        { label: "Monthly", value: matchingLead?.monthly ? `$${matchingLead.monthly}` : "---" },
                        { label: "Ad Size", value: selected.ad_size || "---" },
                        { label: "Score", value: sbr.opportunityScore ? String(sbr.opportunityScore) : "---" },
                        { label: "Renew", value: matchingLead?.renewStatus || "---" },
                      ].map(s => (
                        <div key={s.label} style={{ background: BG, borderRadius: 8, padding: "8px 12px", textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: GRAY }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Approved direction image */}
                    {selected.generated_directions && selected.selected_direction && (() => {
                      const dir = (selected.generated_directions as CampaignDirection[]).find(d => d.name === selected.selected_direction);
                      if (dir?.imageUrl) return (
                        <div style={{ marginBottom: 16 }}>
                          <img src={dir.imageUrl} alt={dir.name} style={{ width: "100%", maxWidth: 500, borderRadius: 8 }} />
                          {selected.tagline && <div style={{ fontSize: 15, fontStyle: "italic", color: GOLD, marginTop: 8 }}>{selected.tagline}</div>}
                        </div>
                      );
                      return null;
                    })()}

                    {/* Status card */}
                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Current Status</div>
                      <div style={{ fontSize: 12, color: TEXT2, lineHeight: 1.6 }}>
                        {selected.stage === "intake" && "Campaign is in intake — gathering information."}
                        {selected.stage === "tearsheet" && "Tearsheet generated and awaiting client review."}
                        {selected.stage === "approved" && "Direction approved by client — ready for production."}
                        {selected.stage === "production" && "Ad is currently in production."}
                        {selected.stage === "delivered" && "Campaign has been delivered."}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES TAB */}
            {centerTab === "messages" && (
              <div>
                {!selected || !getCampaignId(selected) ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: 13, color: GRAY, marginBottom: 8 }}>Start a campaign to enable messaging</div>
                    {selected && <Link href={`/campaign/intake?businessName=${encodeURIComponent(selected.business_name)}`} style={{ color: GOLD, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Start Campaign →</Link>}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
                      {messages.length === 0 ? <p style={{ color: GRAY, fontSize: 12 }}>No messages yet.</p> : messages.map((m, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", padding: "2px 6px", borderRadius: 3, background: m.role === "rep" ? NAVY : GOLD, marginRight: 6 }}>{m.role === "rep" ? "REP" : "CLIENT"}</span>
                          <span style={{ fontSize: 10, color: GRAY }}>{timeAgo(m.timestamp)}</span>
                          <p style={{ fontSize: 13, color: TEXT, margin: "3px 0 0" }}>{m.content}</p>
                        </div>
                      ))}
                      <div ref={msgEndRef} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <textarea value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Message..." rows={2} style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 14, outline: "none", boxSizing: "border-box", color: TEXT, resize: "none" }} />
                      <button onClick={sendMessage} disabled={msgSending} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end" }}>Send →</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CLOSE CRM TAB */}
            {centerTab === "crm" && (
              <div>
                {matchingLead ? (
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 12, color: TEXT, lineHeight: 2.2 }}>
                      <div>Status: <strong>{matchingLead.status}</strong></div>
                      <div>Contact: <strong>{matchingLead.contactName}</strong></div>
                      <div>Agreement: <strong>{matchingLead.agreementNumber}</strong></div>
                      <div>Ad Type: <strong>{matchingLead.adType}</strong></div>
                      <div>Monthly: <strong>${matchingLead.monthly}/mo</strong></div>
                      <div>Cadence: <strong>{matchingLead.cadence}</strong></div>
                      <div>Renew: <strong>{matchingLead.renewStatus}</strong></div>
                      <div>Publication: <strong>{matchingLead.publications}</strong></div>
                      <div>Region: <strong>{matchingLead.region}</strong></div>
                      <div>DVL: <strong>{matchingLead.dvl}</strong></div>
                      <div>First Edition: <strong>{matchingLead.firstEdition}</strong></div>
                      <div>Last Edition: <strong>{matchingLead.lastEdition}</strong></div>
                      <div>Sale Date: <strong>{matchingLead.saleDate}</strong></div>
                      <div>Sold By: <strong>{matchingLead.soldBy}</strong></div>
                      <div>Sale Items: <strong>{matchingLead.saleItems}</strong></div>
                    </div>
                    {matchingLead.closeUrl && <a href={matchingLead.closeUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, background: GOLD, color: NAVY, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Open in Close →</a>}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: GRAY, fontSize: 13, padding: 40 }}>No Close CRM data for this contact</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (420px) ─────────────────────────────────────── */}
        <div style={{ background: SURFACE, borderLeft: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: GRAY, fontSize: 13 }}>Select a contact</div>
            </div>
          ) : (
            <>
              {/* TOP SECTION */}
              <div style={{ padding: 16, borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{selected.business_name}</div>
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>{selected.city}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage] }}>{STAGE_LABELS[selected.stage]}</span>

                {/* 5 action buttons */}
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  {[
                    { icon: "📝", label: "Note", action: () => setShowNote(!showNote) },
                    { icon: "📧", label: "Email", action: () => { setEmailTo(matchingLead?.email || ""); setEmailSubject(`Following up — ${selected.business_name}`); setEmailBody(""); setEmailModalOpen(true); } },
                    { icon: "📞", label: "Call", action: () => { window.open("tel:" + (matchingLead?.phone || "")); fetch("/api/campaign/close-action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"log-call", leadId: selected.id, data:{ note:"Call from Campaign Portal" } }) }).catch(() => {}); showToast("Call logged"); } },
                    { icon: "✅", label: "Task", action: () => showToast("Task created") },
                    { icon: "🚨", label: "Escalate", action: () => { setRightTab("actions"); setEscalationNote(""); } },
                  ].map(a => (
                    <button key={a.label} onClick={a.action} style={{ flex: 1, height: 44, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                      <span style={{ fontSize: 16 }}>{a.icon}</span>
                      <span style={{ fontSize: 9, color: GRAY }}>{a.label}</span>
                    </button>
                  ))}
                </div>

                {/* Inline note area */}
                {showNote && (
                  <div style={{ marginTop: 10 }}>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", color: TEXT }} />
                    <button onClick={async () => { if (!noteText.trim()) return; try { await fetch(`/api/campaign/message/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "rep", content: noteText }) }); fetch("/api/campaign/close-action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"log-note", leadId: selected.id, data:{ note: noteText } }) }).catch(() => {}); setNoteText(""); setShowNote(false); showToast("Note saved"); } catch { showToast("Failed"); } }} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Save Note →</button>
                  </div>
                )}
              </div>

              {/* Tab bar */}
              <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
                {(["actions", "bruno", "territory", "csIntel"] as const).map(t => (
                  <button key={t} onClick={() => setRightTab(t)} style={{ flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent", borderBottom: rightTab === t ? `2px solid ${GOLD}` : "2px solid transparent", color: rightTab === t ? NAVY : GRAY }}>{t === "csIntel" ? "CS Intel" : t === "actions" ? "Actions" : t === "bruno" ? "Bruno" : "Territory"}</button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: "auto" }}>

                {/* ACTIONS TAB */}
                {rightTab === "actions" && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>CAMPAIGN ACTIONS</div>
                    <button onClick={sendCampaignLink} disabled={sendingLink} style={{ width: "100%", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left", background: GOLD, color: NAVY, border: "none", opacity: sendingLink ? 0.5 : 1 }}>{sendingLink ? "Sending..." : "📤 Send Campaign Link"}</button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/tearsheet/${selected.id}`); showToast("Tearsheet link copied!"); }} style={{ width: "100%", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>🔗 Copy Tearsheet Link</button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/client/${selected.id}`); showToast("Portal link copied!"); }} style={{ width: "100%", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>🌐 Copy Portal Link</button>
                    {selected.stage === "approved" && <button onClick={() => updateStage("production")} style={{ width: "100%", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>▶ Mark In Production</button>}
                    {selected.stage === "production" && <button onClick={() => updateStage("delivered")} style={{ width: "100%", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>✅ Mark Delivered</button>}
                    <button onClick={() => {
                      const trimSize = AD_DIMS[selected.ad_size] || selected.ad_size;
                      const bleedSize = AD_BLEED[selected.ad_size] || "";
                      const w = window.open("", "_blank");
                      if (!w) return;
                      w.document.write(`<!DOCTYPE html><html><head><title>Delivery Pack — ${selected.business_name}</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;color:#1C2B1D;line-height:1.8}h1{font-size:24px;border-bottom:2px solid #C8922A;padding-bottom:8px}h2{font-size:16px;color:#1B2A4A;margin-top:24px}table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:6px 12px;border:1px solid #DDD5C0;font-size:13px}td:first-child{font-weight:700;width:200px;background:#F5F0E8}.gold{color:#C8922A;font-weight:700}</style></head><body>`);
                      w.document.write(`<h1>BVM Campaign Delivery Pack</h1><p><strong>${selected.business_name}</strong> — ${selected.city} — ${new Date().toLocaleDateString()}</p>`);
                      w.document.write(`<h2>Campaign Details</h2><table><tr><td>Business Name</td><td>${selected.business_name}</td></tr><tr><td>City / ZIP</td><td>${selected.city} ${selected.zip}</td></tr><tr><td>Category</td><td>${selected.category}</td></tr><tr><td>Ad Size</td><td>${selected.ad_size}</td></tr><tr><td>Tagline</td><td>${selected.tagline || "—"}</td></tr><tr><td>Services / Ad Copy</td><td>${selected.services}</td></tr><tr><td>Selected Direction</td><td>${selected.selected_direction || "—"}</td></tr></table>`);
                      w.document.write(`<h2>Print Specifications</h2><table><tr><td>Trim Size</td><td class="gold">${trimSize}</td></tr><tr><td>Document with Bleed</td><td class="gold">${bleedSize}</td></tr><tr><td>Bleed</td><td>0.125" all sides</td></tr><tr><td>Safe Space</td><td>0.25" minimum from trim edge</td></tr><tr><td>Resolution</td><td>300dpi minimum</td></tr><tr><td>Color Mode</td><td>CMYK (convert from RGB before sending to printer)</td></tr><tr><td>Border</td><td>Visual border required around perimeter</td></tr><tr><td>File Formats</td><td>PDF, JPG, TIFF, EPS, PSD, AI, SVG</td></tr></table>`);
                      // QR Code section
                      const qrUrl = (selected as unknown as Record<string,unknown>).qr_url as string | undefined;
                      if (qrUrl) {
                        w.document.write(`<h2>QR Code</h2><table><tr><td>QR URL</td><td class="gold">${qrUrl}</td></tr><tr><td>Placement</td><td>Bottom right corner of ad (recommended)</td></tr><tr><td>Minimum Size</td><td>0.75" x 0.75" (minimum scannable)</td></tr></table>`);
                      } else {
                        w.document.write(`<p style="color:#9B8E7A;margin-top:16px">No QR code — client can add from their portal</p>`);
                      }
                      w.document.write(`<p style="margin-top:32px;font-size:11px;color:#9B8E7A;border-top:1px solid #DDD5C0;padding-top:12px">Best Version Media | Campaign Portal | ${new Date().toLocaleDateString()}</p></body></html>`);
                      w.document.close();
                      w.print();
                    }} style={{ width: "100%", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>📥 Delivery Pack</button>

                    <div style={{ height: 1, background: BORDER, margin: "14px 0" }} />

                    {/* SEND A CARD */}
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>SEND A CARD</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                      {(["welcome","thankyou","followup","congrats"] as const).map(t => (
                        <button key={t} onClick={() => setCardTemplate(t)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", border: cardTemplate === t ? "none" : `1px solid ${BORDER}`, background: cardTemplate === t ? GOLD : SURFACE, color: cardTemplate === t ? NAVY : TEXT2 }}>{t === "thankyou" ? "Thanks" : t === "followup" ? "Follow Up" : t.charAt(0).toUpperCase() + t.slice(1)}</button>
                      ))}
                    </div>

                    {/* Card preview */}
                    <div style={{ transform: "scale(0.55)", transformOrigin: "top center", height: 160, marginBottom: -40 }}>
                      <div dangerouslySetInnerHTML={{ __html: (() => {
                        const msg = cardMsg || "Thank you for being part of the BVM family.";
                        const name = rep.username;
                        if (cardTemplate === "welcome") return `<div style="background:#1B2A4A;border-radius:12px;padding:32px;color:white;font-family:Georgia,serif;text-align:center"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#F5C842;margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;margin-bottom:8px">Welcome to the Family</div><div style="width:40px;height:2px;background:#F5C842;margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;color:rgba(255,255,255,0.85);font-style:italic">${msg}</div><div style="margin-top:24px;font-size:12px;color:#F5C842">${name}</div></div>`;
                        if (cardTemplate === "thankyou") return `<div style="background:#F5F0E8;border-radius:12px;padding:32px;font-family:Georgia,serif;text-align:center;border:2px solid #2C3E2D"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#2C3E2D;margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;color:#2C3E2D;margin-bottom:8px">Thank You</div><div style="width:40px;height:2px;background:#C8922A;margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;color:#4a3728;font-style:italic">${msg}</div><div style="margin-top:24px;font-size:12px;color:#2C3E2D">${name}</div></div>`;
                        if (cardTemplate === "followup") return `<div style="background:#ffffff;border-radius:12px;padding:32px;font-family:Georgia,serif;text-align:center;border:2px solid #3A5F7D"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#3A5F7D;margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;color:#1B2A4A;margin-bottom:8px">Just Checking In</div><div style="width:40px;height:2px;background:#3A5F7D;margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;color:#475569;font-style:italic">${msg}</div><div style="margin-top:24px;font-size:12px;color:#3A5F7D">${name}</div></div>`;
                        return `<div style="background:linear-gradient(135deg,#C8922A,#F5C842);border-radius:12px;padding:32px;font-family:Georgia,serif;text-align:center;color:white"><div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:16px">Best Version Media</div><div style="font-size:28px;font-weight:700;margin-bottom:8px">Congratulations!</div><div style="width:40px;height:2px;background:white;margin:0 auto 20px"></div><div style="font-size:14px;line-height:1.8;color:rgba(255,255,255,0.9);font-style:italic">${msg}</div><div style="margin-top:24px;font-size:12px;color:white">${name}</div></div>`;
                      })() }} />
                    </div>

                    <textarea value={cardMsg} onChange={e => setCardMsg(e.target.value)} placeholder="Write your personal message..." rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", color: TEXT, background: BG, marginBottom: 8 }} />

                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <button onClick={() => setCardDelivery("email")} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: cardDelivery === "email" ? `2px solid ${GOLD}` : `1px solid ${BORDER}`, background: SURFACE, color: TEXT }}>📧 Email</button>
                      <button onClick={() => setCardDelivery("snail")} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: cardDelivery === "snail" ? `2px solid ${NAVY}` : `1px solid ${BORDER}`, background: SURFACE, color: TEXT }}>✉️ Snail Mail</button>
                    </div>

                    {cardDelivery === "email" && (
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 11, color: GRAY, marginBottom: 4, display: "block" }}>To:</label>
                        <input value={cardEmailTo} onChange={e => setCardEmailTo(e.target.value)} placeholder="Email address..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: "none", boxSizing: "border-box", color: TEXT, background: BG }} />
                      </div>
                    )}
                    {cardDelivery === "snail" && (
                      <div style={{ fontSize: 12, color: AMBER, background: `${AMBER}12`, borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>Ted will handle mailing</div>
                    )}

                    {cardSent ? (
                      <div style={{ fontSize: 14, color: GREEN, fontWeight: 600, textAlign: "center", padding: "10px 0" }}>✓ Card sent!</div>
                    ) : (
                      <button onClick={sendCard} disabled={sendingCard} style={{ width: "100%", background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: sendingCard ? 0.5 : 1 }}>{sendingCard ? "Sending..." : "Send Card →"}</button>
                    )}

                    <div style={{ height: 1, background: BORDER, margin: "14px 0" }} />

                    {/* ESCALATION */}
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>ESCALATION</div>
                    <textarea value={escalationNote} onChange={e => setEscalationNote(e.target.value)} placeholder="Describe the issue..." rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", color: TEXT, background: BG, marginBottom: 6 }} />
                    <button onClick={async () => { try { await fetch("/api/campaign/escalate", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ type: "escalation", repName: rep.username, clientName: selected.business_name, clientStatus: selected.stage || "", note: escalationNote }) }); showToast("Escalation sent"); setEscalationNote(""); } catch { /* */ } }} disabled={!escalationNote.trim()} style={{ width: "100%", background: NAVY, color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: escalationNote.trim() ? 1 : 0.4 }}>🚨 Escalate to Ted →</button>
                  </div>
                )}

                {/* BRUNO TAB */}
                {rightTab === "bruno" && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ background: `linear-gradient(135deg, ${NAVY}, #2d3e50)`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, height: 40 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: GOLD, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>B</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Bruno</div>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                    </div>
                    <div style={{ display: "flex", gap: 4, padding: "8px 12px", flexWrap: "wrap" }}>
                      {["Who needs follow up?", "At-risk clients", "Campaigns stuck?", "Top opportunities"].map(chip => (
                        <button key={chip} onClick={() => setBrunoInput(chip)} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "4px 10px", fontSize: 11, color: TEXT2, cursor: "pointer", fontWeight: 500 }}>{chip}</button>
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
                    <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 6 }}>
                      <input value={brunoInput} onChange={e => setBrunoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askBruno()} placeholder="Ask Bruno..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 14, outline: "none", boxSizing: "border-box", color: TEXT }} />
                      <button onClick={askBruno} disabled={brunoLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Send</button>
                    </div>
                  </div>
                )}

                {/* TERRITORY TAB */}
                {rightTab === "territory" && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>TERRITORY QUICK SCAN</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      <input value={scanZip || selected.zip} onChange={e => setScanZip(e.target.value)} onKeyDown={e => e.key === "Enter" && runTerritoryScan()} placeholder="ZIP code..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: BG, fontSize: 13, outline: "none", boxSizing: "border-box", color: TEXT }} />
                      <button onClick={() => { if (!scanZip && selected.zip) setScanZip(selected.zip); runTerritoryScan(); }} disabled={scanLoading} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{scanLoading ? "..." : "Scan →"}</button>
                    </div>
                    {scanResult && (
                      <div style={{ fontSize: 13, color: TEXT, lineHeight: 2 }}>
                        <div>Score: <strong style={{ color: GREEN, fontSize: 20 }}>{String(scanResult.opportunityScore || "---")}</strong></div>
                        <div>Income: {String(scanResult.medianIncome || "---")}</div>
                        <div>Top: {Array.isArray(scanResult.topCategories) ? (scanResult.topCategories as string[]).slice(0, 3).join(", ") : "---"}</div>
                        <div>Gap: {String(scanResult.competitorGap || "---")}</div>
                        {getCampaignId(selected) && <Link href={`/campaign/intelligence/${getCampaignId(selected)}`} style={{ display: "inline-block", marginTop: 8, color: GOLD, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Full Report →</Link>}
                      </div>
                    )}
                  </div>
                )}

                {/* CS INTEL TAB */}
                {rightTab === "csIntel" && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>CS INTELLIGENCE</div>
                    {csIntelData.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: TEXT2, marginBottom: 8 }}><strong>{csIntelData.length}</strong> matched · {csIntelData.filter(c => c.health === "CRITICAL").length} CRITICAL · {csIntelData.filter(c => c.health === "HIGH").length} HIGH</div>
                        <div style={{ maxHeight: 240, overflowY: "auto" }}>
                          {csIntelData.sort((a, b) => (a.health === "CRITICAL" ? 0 : 1) - (b.health === "CRITICAL" ? 0 : 1)).slice(0, 20).map((c, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                              <span style={{ color: TEXT }}>{c.businessName}</span>
                              {c.health && <span style={{ fontWeight: 700, color: c.health === "CRITICAL" ? RED : c.health === "HIGH" ? AMBER : GREEN }}>{c.health}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div onClick={() => csFileRef.current?.click()} onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsUpload(f); }} style={{ border: `2px dashed ${BORDER}`, borderRadius: 10, padding: 24, textAlign: "center", cursor: "pointer", background: BG }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📊</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Drop .xlsx/.csv</div>
                      <div style={{ fontSize: 11, color: GRAY }}>or click to browse</div>
                      <input ref={csFileRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCsUpload(f); }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── EMAIL COMPOSE MODAL ────────────────────────────────────────── */}
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
              <button onClick={async () => { setEmailSending(true); try { await fetch("/api/campaign/escalate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"email", to: emailTo, subject: emailSubject, body: emailBody }) }); await fetch("/api/campaign/close-action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"log-email", leadId: selected.id, data:{ subject: emailSubject, body: emailBody } }) }); showToast("Email sent + logged in Close"); setEmailModalOpen(false); } catch { showToast("Send failed"); } setEmailSending(false); }} disabled={emailSending || !emailTo.trim()} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: emailSending ? 0.5 : 1 }}>{emailSending ? "Sending..." : "Send Email →"}</button>
              <button onClick={() => setEmailModalOpen(false)} style={{ background: "none", border: "none", color: GRAY, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* ── DELETE MODAL ───────────────────────────────────────────────── */}
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

      {/* ── CS MODAL ───────────────────────────────────────────────────── */}
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
