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

const STAGE_COLORS: Record<string, string> = {
  intake: "#64748b", tearsheet: "#f59e0b", approved: "#22c55e",
  production: "#3b82f6", delivered: "#8b5cf6",
};
const STAGE_LABELS: Record<string, string> = {
  intake: "Intake", tearsheet: "Tearsheet", approved: "Approved",
  production: "Production", delivered: "Delivered",
};

const AD_DIMS: Record<string, string> = {
  "1/8 page": '3.65" x 2.5"', "1/4 page": '3.65" x 5"',
  "1/2 page": '7.5" x 5"',
  "full page": '7.5" x 10" (bleed: 8.625" x 11.125")',
  "front cover": '7.5" x 10" (bleed: 8.625" x 11.125")',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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
function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function CampaignDashboardPage() {
  /* ── Auth ────────────────────────────────────────────────────────────── */
  const [rep, setRep] = useState<{ username: string; role: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const raw =
      localStorage.getItem("campaign_user") ||
      (() => {
        try {
          const c = document.cookie.split(";").find((x) => x.trim().startsWith("campaign_user="));
          return c ? decodeURIComponent(c.split("=").slice(1).join("=")) : null;
        } catch { return null; }
      })();
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setRep(u);
        // Load CS Intel from localStorage
        try {
          const cs = localStorage.getItem(`cs_intel_${u.username}`);
          if (cs) setCsIntelData(JSON.parse(cs));
        } catch { /* */ }
      } catch {
        window.location.href = "/campaign/login";
      }
    } else {
      window.location.href = "/campaign/login";
    }
    setAuthChecked(true);
  }, []);

  /* ── Data state ─────────────────────────────────────────────────────── */
  const [clients, setClients] = useState<CampaignClient[]>([]);
  const [closeLeads, setCloseLeads] = useState<CloseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeLoading, setCloseLoading] = useState(true);
  const [selected, setSelected] = useState<CampaignClient | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "campaign" | "messages" | "crm">("overview");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");
  const [clock, setClock] = useState(new Date());
  const [toast, setToast] = useState("");

  // Messages
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp: string }>>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Actions
  const [sendingLink, setSendingLink] = useState(false);
  const [sendingCard, setSendingCard] = useState(false);

  // CS Intel
  const [csIntelData, setCsIntelData] = useState<Array<{ businessName: string; health?: string; [key: string]: unknown }>>([]);
  const [csModalOpen, setCsModalOpen] = useState(false);
  const csFileRef = useRef<HTMLInputElement>(null);

  /* ── Load data ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!rep) return;
    loadCampaigns();
    loadCloseData();
    const clockI = setInterval(() => setClock(new Date()), 1000);
    const pollI = setInterval(loadCampaigns, 30000);
    return () => { clearInterval(clockI); clearInterval(pollI); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep]);

  async function loadCampaigns() {
    if (!rep) return;
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("campaign_clients").select("*").eq("rep_id", rep.username).order("created_at", { ascending: false });
        if (data) setClients(data as CampaignClient[]);
      }
    } catch { /* */ }
    setLoading(false);
  }

  async function loadCloseData() {
    if (!rep) return;
    try {
      const res = await fetch("/api/campaign/close-leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repName: rep.username }),
      });
      const data = await res.json();
      setCloseLeads(data.leads || []);
    } catch { /* */ }
    setCloseLoading(false);
  }

  // Load messages when selected changes or messages tab active
  useEffect(() => {
    if (!selected) return;
    loadMessages();
    const i = setInterval(loadMessages, 30000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  async function loadMessages() {
    if (!selected) return;
    try {
      const res = await fetch(`/api/campaign/message/${selected.id}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch { /* */ }
  }

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Actions ────────────────────────────────────────────────────────── */
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function selectClient(c: CampaignClient) {
    setSelected(c);
    setDrawerOpen(true);
    setDrawerTab("overview");
    setMessages([]);
  }

  async function sendMessage() {
    if (!msgInput.trim() || !selected) return;
    setMsgSending(true);
    try {
      const res = await fetch(`/api/campaign/message/${selected.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "rep", content: msgInput }),
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      setMsgInput("");
    } catch { /* */ }
    setMsgSending(false);
  }

  async function sendCampaignLink() {
    if (!selected) return;
    setSendingLink(true);
    try {
      await fetch("/api/campaign/send-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selected.id }),
      });
      showToast("Campaign link sent!");
    } catch { showToast("Send failed"); }
    setSendingLink(false);
  }

  async function updateStage(stage: string) {
    if (!selected) return;
    try {
      await fetch(`/api/campaign/stage/${selected.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      setClients((prev) => prev.map((c) => c.id === selected.id ? { ...c, stage: stage as CampaignClient["stage"] } : c));
      setSelected((prev) => prev ? { ...prev, stage: stage as CampaignClient["stage"] } : prev);
      showToast(`Stage updated to ${STAGE_LABELS[stage]}`);
    } catch { /* */ }
  }

  async function sendCard() {
    if (!selected) return;
    setSendingCard(true);
    try {
      await fetch("/api/campaign/send-card", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: selected.business_name, city: selected.city }),
      });
      showToast("Card sent via Handwrytten!");
    } catch { showToast("Card send failed"); }
    setSendingCard(false);
  }

  function handleSignOut() {
    document.cookie = "campaign_user=; path=/; max-age=0";
    localStorage.removeItem("campaign_user");
    window.location.href = "/campaign/login";
  }

  async function handleCsUpload(file: File) {
    // Load SheetJS from CDN
    if (!(window as unknown as Record<string, unknown>).XLSX) {
      await new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
        s.onload = () => resolve();
        document.head.appendChild(s);
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = (window as any).XLSX;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
    // Filter by rep name in any column (Column F typical)
    const repLower = rep!.username.toLowerCase();
    const matched = rows.filter((r) => Object.values(r).some((v) => typeof v === "string" && v.toLowerCase().includes(repLower)));
    const parsed = matched.map((r) => {
      const vals = Object.values(r);
      const keys = Object.keys(r);
      return {
        businessName: String(vals[0] || ""),
        health: keys.find((k) => k.toLowerCase().includes("health") || k.toLowerCase().includes("risk")) ? String(r[keys.find((k) => k.toLowerCase().includes("health") || k.toLowerCase().includes("risk"))!] || "") : undefined,
        ...r,
      };
    });
    setCsIntelData(parsed);
    localStorage.setItem(`cs_intel_${rep!.username}`, JSON.stringify(parsed));
    setCsModalOpen(false);
    showToast(`CS Intel loaded — ${parsed.length} clients matched`);
  }

  /* ── Auth guard ─────────────────────────────────────────────────────── */
  if (!authChecked) return <div style={{ background: "#f8fafc", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>Loading...</div>;
  if (!rep) return null;

  /* ── Derived ────────────────────────────────────────────────────────── */
  const filtered = clients.filter((c) => {
    if (search && !c.business_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active" && c.stage === "delivered") return false;
    if (filter === "delivered" && c.stage !== "delivered") return false;
    return true;
  });

  const sbr = selected ? (selected.sbr_data || {}) as Record<string, unknown> : {};
  const approvedDir = selected?.generated_directions?.find((d: CampaignDirection) => d.name === selected.selected_direction);
  const matchingLead = selected ? closeLeads.find((l) => l.businessName.toLowerCase() === selected.business_name.toLowerCase()) : null;
  const repInitials = initials(rep.username);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, 'DM Sans', -apple-system, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
      <nav style={{
        height: 56, background: "#fff", borderBottom: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 28 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1B2A4A", borderLeft: "1px solid #e2e8f0", paddingLeft: 16 }}>Campaign Portal</span>

        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
            {clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {clock.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        <button onClick={() => setCsModalOpen(true)} style={{
          background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
          padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "#64748b",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 14 }}>📊</span> CS Intel {csIntelData.length > 0 && <span style={{ background: "#22c55e", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 8 }}>{csIntelData.length}</span>}
        </button>
        <Link href="/campaign/intake" style={{
          background: "#F5C842", color: "#1B2A4A", borderRadius: 8, padding: "8px 18px",
          fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
        }}>
          New Campaign →
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1B2A4A", color: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
            {repInitials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1B2A4A" }}>{rep.username}</span>
          <button onClick={handleSignOut} style={{
            background: "transparent", border: "1px solid #e2e8f0", borderRadius: 6,
            padding: "6px 12px", fontSize: 11, color: "#64748b", cursor: "pointer",
          }}>Sign Out</button>
        </div>
      </nav>

      {/* ── BODY ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside style={{
          width: 280, background: "#fff", borderRight: "1px solid #e2e8f0",
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          {/* Search */}
          <div style={{ padding: "12px 16px" }}>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", padding: "0 16px 8px", gap: 4 }}>
            {(["all", "active", "delivered"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: "pointer", textTransform: "capitalize",
                background: filter === f ? "#1B2A4A" : "#f8fafc",
                color: filter === f ? "#fff" : "#64748b",
                border: filter === f ? "none" : "1px solid #e2e8f0",
              }}>{f}</button>
            ))}
          </div>

          {/* Client list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading...</div>
            ) : filtered.length === 0 && closeLeads.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <p style={{ color: "#94a3b8", fontSize: 13 }}>No campaigns yet.</p>
                <Link href="/campaign/intake" style={{ color: "#F5C842", fontSize: 12, fontWeight: 600 }}>Start a campaign →</Link>
              </div>
            ) : (
              <>
                {/* Campaign clients */}
                {filtered.map((c) => {
                  const cLead = closeLeads.find((l) => l.businessName.toLowerCase() === c.business_name.toLowerCase());
                  const cSbr = (c.sbr_data || {}) as Record<string, unknown>;
                  const score = (cSbr.opportunityScore as number) || 0;
                  const csMatch = csIntelData.find((ci) => ci.businessName.toLowerCase().includes(c.business_name.toLowerCase().slice(0, 8)));
                  const lastEdDays = cLead?.lastEdition ? Math.floor((new Date(cLead.lastEdition).getTime() - Date.now()) / 86400000) : 999;
                  return (
                    <div key={c.id} onClick={() => selectClient(c)} style={{
                      padding: "10px 16px", cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      background: selected?.id === c.id ? "#fffbeb" : "#fff",
                      borderLeft: selected?.id === c.id ? "3px solid #F5C842" : "3px solid transparent",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      {/* Avatar */}
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#F5C842", color: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {initials(c.business_name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.business_name}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, fontSize: 10, color: "#94a3b8", flexWrap: "wrap", alignItems: "center" }}>
                          <span>{c.city}</span>
                          <span style={{ background: `${STAGE_COLORS[c.stage]}15`, color: STAGE_COLORS[c.stage], fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>{STAGE_LABELS[c.stage]}</span>
                          {score > 0 && <span style={{ color: score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>{score}</span>}
                          {csMatch?.health && <span style={{ fontWeight: 700, fontSize: 9, padding: "1px 4px", borderRadius: 3, background: csMatch.health === "CRITICAL" ? "#fef2f2" : csMatch.health === "HIGH" ? "#fffbeb" : "#f0fdf4", color: csMatch.health === "CRITICAL" ? "#dc2626" : csMatch.health === "HIGH" ? "#d97706" : "#16a34a" }}>{csMatch.health}</span>}
                          {lastEdDays <= 60 && lastEdDays > -999 && <span style={{ color: "#d97706", fontWeight: 700 }}>Renewal</span>}
                          {cLead?.monthly && parseFloat(cLead.monthly) > 0 && <span style={{ color: "#f59e0b", fontWeight: 600 }}>${cLead.monthly}/mo</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Close leads without campaigns */}
                {!closeLoading && closeLeads.filter((l) =>
                  !clients.some((c) => c.business_name.toLowerCase() === l.businessName.toLowerCase()) &&
                  (!search || l.businessName.toLowerCase().includes(search.toLowerCase()))
                ).slice(0, 20).map((l) => (
                  <div key={l.id} style={{
                    padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
                    opacity: 0.7,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{l.businessName}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", padding: "2px 6px", background: "#f1f5f9", borderRadius: 4 }}>Close</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{l.publications || l.adType}</span>
                      <Link href={`/campaign/intake?businessName=${encodeURIComponent(l.businessName)}&adType=${encodeURIComponent(l.adType)}`} style={{
                        fontSize: 10, fontWeight: 700, color: "#1B2A4A", background: "#F5C842",
                        padding: "3px 10px", borderRadius: 6, textDecoration: "none",
                      }}>Campaign →</Link>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* ── CENTER PANEL ──────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {!selected ? (
            <div>
              {/* Stats cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Total Campaigns", value: clients.length, color: "#1B2A4A" },
                  { label: "Active", value: clients.filter((c) => c.stage === "approved" || c.stage === "production").length, color: "#22c55e" },
                  { label: "Delivered", value: clients.filter((c) => c.stage === "delivered").length, color: "#8b5cf6" },
                  { label: "Close Book", value: closeLeads.length, color: "#f59e0b" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1B2A4A", margin: "0 0 16px" }}>Recent Activity</h3>
                {clients.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No campaigns yet. Click &quot;New Campaign&quot; to get started.</p>
                ) : (
                  <div>
                    {clients.slice(0, 8).map((c) => (
                      <div key={c.id} onClick={() => selectClient(c)} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                        borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                      }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F5C842", color: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                          {initials(c.business_name)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{c.business_name}</span>
                          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>{c.city}</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${STAGE_COLORS[c.stage]}15`, color: STAGE_COLORS[c.stage] }}>{STAGE_LABELS[c.stage]}</span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{daysSince(c.created_at)}d ago</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 800 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>{selected.business_name}</h1>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{selected.city} · {selected.category} · {selected.ad_size}</p>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: "6px 16px", borderRadius: 8,
                  background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage],
                }}>{STAGE_LABELS[selected.stage]}</span>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                <button onClick={sendCampaignLink} disabled={sendingLink} style={{
                  background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8,
                  padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  opacity: sendingLink ? 0.5 : 1,
                }}>{sendingLink ? "Sending..." : "Send Campaign Link"}</button>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/tearsheet/${selected.id}`); showToast("Tearsheet link copied!"); }} style={{
                  background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>Copy Tearsheet Link</button>
                {selected.stage === "approved" && (
                  <button onClick={() => updateStage("production")} style={{
                    background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8,
                    padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>Mark In Production</button>
                )}
                {selected.stage === "production" && (
                  <button onClick={() => updateStage("delivered")} style={{
                    background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8,
                    padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>Mark Delivered</button>
                )}
                <button onClick={sendCard} disabled={sendingCard} style={{
                  background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>{sendingCard ? "Sending..." : "Send Card"}</button>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/client/${selected.id}`); showToast("Portal link copied!"); }} style={{
                  background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>Copy Portal Link</button>
              </div>

              {/* Brief + SBR cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {/* Brief */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Campaign Brief</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                    <div><span style={{ color: "#94a3b8" }}>Ad Size: </span><span style={{ color: "#1e293b", fontWeight: 600 }}>{selected.ad_size} {AD_DIMS[selected.ad_size] ? `(${AD_DIMS[selected.ad_size]})` : ""}</span></div>
                    <div><span style={{ color: "#94a3b8" }}>Tagline: </span><span style={{ color: "#1e293b", fontWeight: 600 }}>{selected.tagline || "—"}</span></div>
                    <div><span style={{ color: "#94a3b8" }}>Service: </span><span style={{ color: "#1e293b", fontWeight: 600 }}>{selected.services}</span></div>
                    <div><span style={{ color: "#94a3b8" }}>ZIP: </span><span style={{ color: "#1e293b", fontWeight: 600 }}>{selected.zip}</span></div>
                  </div>
                </div>

                {/* SBR */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Market Intelligence</h3>
                  {(sbr.opportunityScore as number) > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                      <div><span style={{ color: "#94a3b8" }}>Score: </span><span style={{ color: "#1e293b", fontWeight: 700 }}>{String(sbr.opportunityScore)}/100</span></div>
                      <div><span style={{ color: "#94a3b8" }}>Income: </span><span style={{ color: "#1e293b", fontWeight: 600 }}>{String(sbr.medianIncome || "—")}</span></div>
                      <div><span style={{ color: "#94a3b8" }}>Households: </span><span style={{ color: "#1e293b", fontWeight: 600 }}>{String(sbr.households || "—")}</span></div>
                    </div>
                  ) : (
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>No market data yet</p>
                  )}
                </div>
              </div>

              {/* Approved image */}
              {approvedDir?.imageUrl && (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Approved Direction: {selected.selected_direction}</h3>
                  <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", maxWidth: 400, borderRadius: 8 }} />
                </div>
              )}

              {/* Messages */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Messages</h3>
                <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
                  {messages.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>No messages yet.</p>
                  ) : messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#fff", padding: "1px 6px", borderRadius: 4,
                          background: m.role === "rep" ? "#1B2A4A" : "#0891b2",
                        }}>{m.role === "rep" ? "REP" : "CLIENT"}</span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#1e293b", margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                    </div>
                  ))}
                  <div ref={msgEndRef} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text" value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                  <button onClick={sendMessage} disabled={msgSending || !msgInput.trim()} style={{
                    background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8,
                    padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    opacity: msgSending || !msgInput.trim() ? 0.5 : 1,
                  }}>Send</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── RIGHT SLIDE-OUT DRAWER ──────────────────────────────────────── */}
      {drawerOpen && selected && (
        <div onClick={() => setDrawerOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 199,
        }} />
      )}
      <div style={{
        position: "fixed", top: 56, right: 0, width: 400, height: "calc(100vh - 56px)",
        background: "#fff", borderLeft: "1px solid #e2e8f0", zIndex: 200,
        transform: drawerOpen && selected ? "translateX(0)" : "translateX(400px)",
        transition: "transform 0.3s ease", overflowY: "auto",
      }}>
        {selected && (() => {
          const lead = matchingLead;
          return (
            <div>
              {/* Close */}
              <button onClick={() => setDrawerOpen(false)} style={{
                position: "absolute", top: 12, right: 12, background: "#f1f5f9",
                border: "none", borderRadius: "50%", width: 28, height: 28,
                cursor: "pointer", fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>

              {/* Header */}
              <div style={{ padding: "24px 24px 16px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F5C842", color: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, margin: "0 auto 12px" }}>
                  {initials(selected.business_name)}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>{selected.business_name}</h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>{selected.city}</p>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                  background: `${STAGE_COLORS[selected.stage]}15`, color: STAGE_COLORS[selected.stage],
                }}>{STAGE_LABELS[selected.stage]}</span>
                {lead?.closeUrl && (
                  <div style={{ marginTop: 8 }}>
                    <a href={lead.closeUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#F5C842", fontWeight: 600 }}>View in Close →</a>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 1, background: "#f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                {[
                  { label: "Monthly", value: lead?.monthly ? `$${lead.monthly}` : "—" },
                  { label: "Ad Size", value: selected.ad_size || "—" },
                  { label: "Score", value: (sbr.opportunityScore as number) > 0 ? String(sbr.opportunityScore) : "—" },
                  { label: "Status", value: lead?.renewStatus || STAGE_LABELS[selected.stage] },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#fff", padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
                {(["overview", "campaign", "messages", "crm"] as const).map((tab) => (
                  <button key={tab} onClick={() => setDrawerTab(tab)} style={{
                    flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", border: "none", textTransform: "capitalize",
                    background: drawerTab === tab ? "#fff" : "#f8fafc",
                    color: drawerTab === tab ? "#1B2A4A" : "#94a3b8",
                    borderBottom: drawerTab === tab ? "2px solid #F5C842" : "2px solid transparent",
                  }}>{tab}</button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ padding: 20 }}>
                {drawerTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Contact */}
                    {lead && (
                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", margin: "0 0 8px" }}>Contact</h4>
                        <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 2 }}>
                          <div>{lead.contactName}</div>
                          {lead.phone && <div><a href={`tel:${lead.phone}`} style={{ color: "#3b82f6" }}>{lead.phone}</a></div>}
                          {lead.email && <div><a href={`mailto:${lead.email}`} style={{ color: "#3b82f6" }}>{lead.email}</a></div>}
                        </div>
                      </div>
                    )}
                    {/* Agreement */}
                    {lead && (
                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", margin: "0 0 8px" }}>Agreement</h4>
                        <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 2 }}>
                          {lead.agreementNumber && <div>Agreement: {lead.agreementNumber}</div>}
                          {lead.adType && <div>Ad Type: {lead.adType}</div>}
                          {lead.publications && <div>Publication: {lead.publications}</div>}
                          {lead.firstEdition && <div>First Edition: {lead.firstEdition}</div>}
                          {lead.lastEdition && <div>Last Edition: {lead.lastEdition}</div>}
                          {lead.cadence && <div>Cadence: {lead.cadence}</div>}
                        </div>
                      </div>
                    )}
                    {/* SBR */}
                    {(sbr.opportunityScore as number) > 0 && (
                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", margin: "0 0 8px" }}>Market Data</h4>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: "#64748b" }}>Opportunity Score</span>
                            <span style={{ fontWeight: 700, color: "#1e293b" }}>{String(sbr.opportunityScore)}/100</span>
                          </div>
                          <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${sbr.opportunityScore as number}%`, background: "#F5C842", borderRadius: 3 }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#1e293b", lineHeight: 2 }}>
                          <div>Income: {String(sbr.medianIncome || "—")}</div>
                          <div>Households: {String(sbr.households || "—")}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {drawerTab === "campaign" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {approvedDir?.imageUrl && (
                      <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", borderRadius: 8 }} />
                    )}
                    {selected.tagline && <p style={{ fontSize: 14, fontStyle: "italic", color: "#64748b", margin: 0 }}>&ldquo;{selected.tagline}&rdquo;</p>}
                    <p style={{ fontSize: 13, color: "#1e293b", margin: 0 }}>{selected.services}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      <button onClick={sendCampaignLink} disabled={sendingLink} style={{ background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: sendingLink ? 0.5 : 1 }}>
                        {sendingLink ? "Sending..." : "Send Campaign Link"}
                      </button>
                      {selected.stage === "approved" && (
                        <button onClick={() => updateStage("production")} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Mark In Production</button>
                      )}
                      {selected.stage === "production" && (
                        <button onClick={() => updateStage("delivered")} style={{ background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Mark Delivered</button>
                      )}
                      <button onClick={() => window.print()} style={{ background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Download Delivery Pack</button>
                    </div>
                  </div>
                )}

                {drawerTab === "messages" && (
                  <div>
                    <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12 }}>
                      {messages.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: 13 }}>No messages.</p>
                      ) : messages.map((m, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", padding: "1px 6px", borderRadius: 4, background: m.role === "rep" ? "#1B2A4A" : "#0891b2" }}>{m.role === "rep" ? "REP" : "CLIENT"}</span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(m.timestamp)}</span>
                          </div>
                          <p style={{ fontSize: 13, color: "#1e293b", margin: 0 }}>{m.content}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Message..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                      <button onClick={sendMessage} disabled={msgSending} style={{ background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Send</button>
                    </div>
                  </div>
                )}

                {drawerTab === "crm" && (
                  <div>
                    {lead ? (
                      <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 2 }}>
                        <div>Status: <strong>{lead.status}</strong></div>
                        <div>Agreement: <strong>{lead.agreementNumber}</strong></div>
                        <div>Ad Type: <strong>{lead.adType}</strong></div>
                        <div>Monthly: <strong>${lead.monthly}/mo</strong></div>
                        <div>Renew Status: <strong>{lead.renewStatus}</strong></div>
                        <div>Region: <strong>{lead.region}</strong></div>
                        {lead.closeUrl && (
                          <a href={lead.closeUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, background: "#F5C842", color: "#1B2A4A", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Open in Close →</a>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>No Close CRM data found for this client.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── CS Intel Upload Modal ──────────────────────────────────────── */}
      {csModalOpen && (
        <>
          <div onClick={() => setCsModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 600 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "#fff", borderRadius: 16, padding: 32, width: 440, zIndex: 601,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: 0 }}>CS Intelligence Upload</h2>
              <button onClick={() => setCsModalOpen(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#64748b" }}>✕</button>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleCsUpload(f); }}
              onClick={() => csFileRef.current?.click()}
              style={{
                border: "2px dashed #e2e8f0", borderRadius: 12, padding: 40, textAlign: "center",
                cursor: "pointer", background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: "0 0 4px" }}>Drop .xlsx or .csv file here</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>or click to browse</p>
              <input ref={csFileRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsUpload(f); }} />
            </div>
            {csIntelData.length > 0 && (
              <div style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>
                <strong>{csIntelData.length}</strong> clients loaded · Last updated: {new Date().toLocaleDateString()}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
