"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CampaignClient, CampaignDirection } from "@/lib/campaign";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const STAGE_COLORS: Record<string, string> = {
  intake: "#64748b",
  tearsheet: "#f59e0b",
  approved: "#22c55e",
  production: "#3b82f6",
  delivered: "#F5C842",
};
const STAGE_LABELS: Record<string, string> = {
  intake: "Intake",
  tearsheet: "Tearsheet",
  approved: "Approved",
  production: "Production",
  delivered: "Delivered",
};

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

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function getRepFromCookie(): { username: string; name: string } {
  try {
    const match = document.cookie.match(/dc_session=([^;]+)/);
    if (!match) return { username: "unassigned", name: "Rep" };
    const [encoded] = match[1].split(".");
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    return { username: payload.username || "unassigned", name: payload.name || "Rep" };
  } catch {
    return { username: "unassigned", name: "Rep" };
  }
}

interface CrmResult {
  id: string;
  name: string;
  status: string;
  dealValue: string;
  dealStage: string;
  lastActivity: string;
}

const AFFIRMATIONS = [
  "Your pipeline is a reflection of your last 30 days of activity.",
  "Speed is a feature. The rep who moves fastest wins.",
  "The follow-up is where the money lives.",
  "Every 'not interested' is just 'not yet'.",
  "A rep with a system outperforms a rep with talent every time.",
];

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function CampaignDashboardPage() {
  const router = useRouter();
  const [rep, setRep] = useState({ username: "", name: "" });
  const [clients, setClients] = useState<CampaignClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CampaignClient | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "active" | "delivered">("all");
  const [clock, setClock] = useState(new Date());
  const [toast, setToast] = useState("");

  // Center panel
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [sendingTearsheet, setSendingTearsheet] = useState(false);

  // CRM
  const [crmQuery, setCrmQuery] = useState("");
  const [crmResults, setCrmResults] = useState<CrmResult[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);

  // Right panel — Bruno VA
  const [brunoOpen, setBrunoOpen] = useState(true);
  const [brunoQuery, setBrunoQuery] = useState("");
  const [brunoResponse, setBrunoResponse] = useState("");
  const [brunoLoading, setBrunoLoading] = useState(false);
  const brunoRef = useRef<HTMLTextAreaElement>(null);

  // Right panel — Territory scan
  const [scanZip, setScanZip] = useState("");
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // Right panel — Rep notes
  const [repNotes, setRepNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const [affIdx] = useState(Math.floor(new Date().getTime() / 86400000) % AFFIRMATIONS.length);

  useEffect(() => {
    const r = getRepFromCookie();
    setRep(r);
    loadClients(r.username);
    const clockInterval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Poll every 30s
  useEffect(() => {
    if (!rep.username) return;
    const i = setInterval(() => loadClients(rep.username), 30000);
    return () => clearInterval(i);
  }, [rep.username]);

  async function loadClients(repId: string) {
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb
          .from("campaign_clients")
          .select("*")
          .eq("rep_id", repId)
          .order("created_at", { ascending: false });
        if (data) {
          setClients(data as CampaignClient[]);
          if (!selected && data.length > 0) setSelected(data[0] as CampaignClient);
        }
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  // Filtered client list
  const filtered = clients.filter((c) => {
    if (search && !c.business_name.toLowerCase().includes(search.toLowerCase()) && !c.city?.toLowerCase().includes(search.toLowerCase())) return false;
    if (stageFilter === "active" && c.stage === "delivered") return false;
    if (stageFilter === "delivered" && c.stage !== "delivered") return false;
    return true;
  });

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

  async function sendTearsheetLink() {
    if (!selected) return;
    setSendingTearsheet(true);
    try {
      const link = `${window.location.origin}/campaign/tearsheet/${selected.id}`;
      navigator.clipboard.writeText(link);
      showToast("Tearsheet link copied to clipboard!");
    } catch { /* ignore */ }
    setSendingTearsheet(false);
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

  async function askBruno() {
    if (!brunoQuery.trim() || brunoLoading) return;
    setBrunoLoading(true);
    setBrunoResponse("");
    const pipelineSummary = clients.map((c) => ({
      name: c.business_name, city: c.city, stage: c.stage,
      adSize: c.ad_size, daysSince: daysSince(c.created_at),
      score: ((c.sbr_data as Record<string, unknown> | null)?.opportunityScore as number) || 0,
    }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Bruno, BVM's campaign intelligence assistant. You help reps manage print campaigns, understand market data, and grow their book of business.\n\nCurrent pipeline:\n${JSON.stringify(pipelineSummary, null, 2)}\n\nBe direct, concise, and actionable.`,
          messages: [{ role: "user", content: brunoQuery }],
          temperature: 0.5,
        }),
      });
      const data = await res.json();
      setBrunoResponse(data.response || "No response");
    } catch { setBrunoResponse("Something went wrong."); }
    setBrunoLoading(false);
  }

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

  async function saveRepNotes() {
    if (!selected) return;
    setNotesSaving(true);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        await sb.from("campaign_clients").update({ rep_notes: repNotes }).eq("id", selected.id);
      }
      showToast("Notes saved");
    } catch { /* ignore */ }
    setNotesSaving(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleSignOut() {
    document.cookie = "dc_session=; path=/; max-age=0";
    try { localStorage.removeItem("dc_auth_token"); } catch { /* */ }
    router.push("/login");
  }

  // Selected client data
  const sbr = selected ? (selected.sbr_data || {}) as Record<string, unknown> : {};
  const approvedDir = selected?.generated_directions?.find((d: CampaignDirection) => d.name === selected.selected_direction);
  const messages = selected ? (Array.isArray((selected as unknown as Record<string, unknown>).messages) ? (selected as unknown as Record<string, unknown>).messages as Array<{ role: string; content: string; timestamp: string }> : []) : [];
  const repInitials = rep.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // Load notes when client changes
  useEffect(() => {
    if (selected) {
      setRepNotes(((selected as unknown as Record<string, unknown>).rep_notes as string) || "");
    }
  }, [selected]);

  /* ─── Loading ────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", flexDirection: "column" }}>
        <nav style={{ background: "#2d3e50", height: 56, display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0 }}>
          <img src="/bvm_logo.png" alt="BVM" style={{ height: 32, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        </nav>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
          <div style={{ width: 32, height: 32, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#fff", padding: "10px 20px", borderRadius: 6, fontSize: 12, fontWeight: 700, zIndex: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          ✓ {toast}
        </div>
      )}

      {/* ── TOP NAV ────────────────────────────────────────────────────────── */}
      <nav style={{
        background: "#2d3e50", height: 56, display: "flex", alignItems: "center",
        padding: "0 20px", gap: 16, flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)", position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <img src="/bvm_logo.png" alt="BVM" style={{ height: 32, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }}>
              {clock.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <Link href="/campaign/intake" style={{
          background: "#f59e0b", color: "#1B2A4A", borderRadius: 6, padding: "8px 16px",
          fontSize: 12, fontWeight: 700, textDecoration: "none", letterSpacing: "0.02em",
          whiteSpace: "nowrap", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}>
          New Campaign →
        </Link>
        <Link href="/dashboard" style={{
          background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", borderRadius: 6,
          padding: "8px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none",
          border: "1px solid rgba(255,255,255,0.12)", whiteSpace: "nowrap",
        }}>
          Web Dashboard
        </Link>

        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#F5C842", color: "#2d3e50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
          {repInitials}
        </div>
        <button onClick={handleSignOut} style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600,
          color: "rgba(255,255,255,0.85)", cursor: "pointer", whiteSpace: "nowrap",
        }}>Log Out</button>
      </nav>

      {/* ── BODY: THREE-COLUMN ────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <aside style={{
          width: 280, flexShrink: 0, background: "#fff",
          borderRight: "1px solid #e5e9ef", display: "flex", flexDirection: "column", overflowY: "auto",
        }}>
          {/* Rep card */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #e5e9ef", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#2d3e50", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, margin: "0 auto 10px", boxShadow: "0 2px 10px rgba(45,62,80,0.2)" }}>
              {repInitials}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1a2332", margin: 0 }}>{getGreeting()}, {rep.name}</p>
            <p style={{ fontSize: 11, color: "#7a8a9a", margin: "4px 0 0" }}>Campaign Portal</p>
          </div>

          {/* Search */}
          <div style={{ padding: "12px 16px" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Stage filter tabs */}
          <div style={{ display: "flex", padding: "0 16px 12px", gap: 4 }}>
            {(["all", "active", "delivered"] as const).map((f) => (
              <button key={f} onClick={() => setStageFilter(f)} style={{
                flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: stageFilter === f ? "#F5C842" : "#f8fafc",
                color: stageFilter === f ? "#1B2A4A" : "#7a8a9a",
                border: stageFilter === f ? "none" : "1px solid #e5e9ef",
                textTransform: "capitalize",
              }}>{f}</button>
            ))}
          </div>

          {/* Client list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <p style={{ color: "#7a8a9a", fontSize: 13 }}>No campaigns found.</p>
                <Link href="/campaign/intake" style={{ color: "#F5C842", fontSize: 12, fontWeight: 600 }}>Start a new campaign →</Link>
              </div>
            ) : filtered.map((c) => {
              const isSelected = selected?.id === c.id;
              const cSbr = (c.sbr_data || {}) as Record<string, unknown>;
              const hasUnread = Array.isArray((c as unknown as Record<string, unknown>).messages) && ((c as unknown as Record<string, unknown>).messages as unknown[]).length > 0;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid #edf0f4",
                    background: isSelected ? "#fffbea" : "#fff",
                    borderLeft: isSelected ? "3px solid #F5C842" : "3px solid transparent",
                    transition: "all 0.1s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2332" }}>{c.business_name}</span>
                        {hasUnread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />}
                      </div>
                      <span style={{ fontSize: 11, color: "#7a8a9a" }}>{c.city}</span>
                    </div>
                    <span style={{
                      background: `${STAGE_COLORS[c.stage] || "#64748b"}18`,
                      color: STAGE_COLORS[c.stage] || "#64748b",
                      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 8, whiteSpace: "nowrap",
                    }}>{STAGE_LABELS[c.stage] || c.stage}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 10, color: "#b0b8c4" }}>
                    <span>{c.ad_size}</span>
                    {(cSbr.opportunityScore as number) > 0 && <span>Score: {String(cSbr.opportunityScore)}</span>}
                    <span>{daysSince(c.created_at)}d</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Affirmation */}
          <div style={{ margin: 12, padding: "12px 14px", borderRadius: 8, background: "#fffbea", border: "1px solid #F5C842" }}>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 11, fontStyle: "italic", color: "#7a5a00", margin: 0, lineHeight: 1.5 }}>
              {AFFIRMATIONS[affIdx]}
            </p>
          </div>
        </aside>

        {/* ── CENTER PANEL ────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
          {selected ? (
            <div style={{ padding: 28 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2332", margin: "0 0 4px" }}>{selected.business_name}</h1>
                  <p style={{ fontSize: 13, color: "#7a8a9a", margin: 0 }}>
                    {selected.city} · {selected.category} · {selected.ad_size}
                  </p>
                </div>
                <span style={{
                  background: `${STAGE_COLORS[selected.stage]}18`,
                  color: STAGE_COLORS[selected.stage],
                  fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 8,
                }}>{STAGE_LABELS[selected.stage]}</span>
              </div>

              {/* SBR Cards */}
              {(sbr.opportunityScore as number) > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                  <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#F5C842" }}>{String(sbr.opportunityScore)}</div>
                    <div style={{ fontSize: 11, color: "#7a8a9a", fontWeight: 600 }}>Opp. Score</div>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2332" }}>{String(sbr.medianIncome || "—")}</div>
                    <div style={{ fontSize: 11, color: "#7a8a9a", fontWeight: 600 }}>Med. Income</div>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2332" }}>{String(sbr.households || "—")}</div>
                    <div style={{ fontSize: 11, color: "#7a8a9a", fontWeight: 600 }}>Households</div>
                  </div>
                </div>
              )}

              {/* Approved image */}
              {approvedDir?.imageUrl && (
                <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", margin: "0 0 8px" }}>Approved: {selected.selected_direction}</p>
                  <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", maxWidth: 360, borderRadius: 8 }} />
                </div>
              )}

              {/* Brief */}
              <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", margin: "0 0 10px" }}>Campaign Brief</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: 12 }}>
                  <div><span style={{ color: "#7a8a9a" }}>Ad Size: </span><span style={{ color: "#1a2332", fontWeight: 600 }}>{selected.ad_size}</span></div>
                  <div><span style={{ color: "#7a8a9a" }}>Tagline: </span><span style={{ color: "#1a2332", fontWeight: 600 }}>{selected.tagline || "—"}</span></div>
                  <div><span style={{ color: "#7a8a9a" }}>Service: </span><span style={{ color: "#1a2332", fontWeight: 600 }}>{selected.services}</span></div>
                  <div><span style={{ color: "#7a8a9a" }}>ZIP: </span><span style={{ color: "#1a2332", fontWeight: 600 }}>{selected.zip}</span></div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                <button onClick={sendCampaignLink} disabled={sendingLink} style={{
                  background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 6,
                  padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  opacity: sendingLink ? 0.5 : 1,
                }}>{sendingLink ? "Sending..." : "Send Campaign Link"}</button>
                <button onClick={sendTearsheetLink} disabled={sendingTearsheet} style={{
                  background: "#fff", color: "#1a2332", border: "1px solid #e5e9ef", borderRadius: 6,
                  padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>{sendingTearsheet ? "Copied!" : "Copy Tearsheet Link"}</button>
                {selected.stage === "approved" && (
                  <button onClick={() => updateStage(selected.id, "production")} style={{
                    background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6,
                    padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>Mark In Production</button>
                )}
                {selected.stage === "production" && (
                  <button onClick={() => updateStage(selected.id, "delivered")} style={{
                    background: "#06b6d4", color: "#fff", border: "none", borderRadius: 6,
                    padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>Mark Delivered</button>
                )}
                <button onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/campaign/client/${selected.id}`);
                  showToast("Portal link copied!");
                }} style={{
                  background: "#fff", color: "#1a2332", border: "1px solid #e5e9ef", borderRadius: 6,
                  padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>Copy Portal Link</button>
              </div>

              {/* Communications */}
              <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", margin: "0 0 10px" }}>Communications</p>
                <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                  {messages.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#b0b8c4", margin: 0 }}>No messages yet.</p>
                  ) : messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 8, animation: "fadeIn 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#fff", padding: "1px 6px", borderRadius: 4,
                          background: m.role === "rep" ? "#2d3e50" : "#0891b2",
                        }}>{m.role === "rep" ? "REP" : "CLIENT"}</span>
                        <span style={{ fontSize: 10, color: "#b0b8c4" }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#1a2332", margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <textarea
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    placeholder="Type a message..."
                    rows={2}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, resize: "none", outline: "none", boxSizing: "border-box" }}
                  />
                  <button onClick={sendRepMessage} disabled={msgSending || !msgInput.trim()} style={{
                    background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 6,
                    padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                    alignSelf: "flex-end", opacity: msgSending || !msgInput.trim() ? 0.5 : 1,
                  }}>Send as Rep</button>
                </div>
              </div>

              {/* Close CRM Search */}
              <div style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", margin: "0 0 10px" }}>Close CRM</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={crmQuery}
                    onChange={(e) => setCrmQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchCrm()}
                    placeholder="Search Close CRM..."
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                  />
                  <button onClick={searchCrm} disabled={crmLoading} style={{
                    background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 6,
                    padding: "8px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#1a2332",
                  }}>{crmLoading ? "..." : "Search"}</button>
                </div>
                {crmResults.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    {crmResults.map((r) => (
                      <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid #f0f2f5", fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: "#1a2332" }}>{r.name}</div>
                        <div style={{ color: "#7a8a9a" }}>
                          {r.status} · {r.dealStage} · {r.dealValue}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#b0b8c4", fontSize: 14 }}>
              Select a campaign to view details
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <aside style={{
          width: 320, flexShrink: 0, background: "#fff",
          borderLeft: "1px solid #e5e9ef", display: "flex", flexDirection: "column", overflowY: "auto",
        }}>
          {/* Bruno VA */}
          <div style={{ padding: 16, borderBottom: "1px solid #e5e9ef" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 10 }}>B</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2332" }}>Ask Bruno</span>
            </div>
            <textarea
              ref={brunoRef}
              value={brunoQuery}
              onChange={(e) => setBrunoQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askBruno(); } }}
              placeholder="Who needs follow up? Pipeline status?"
              rows={2}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, resize: "none", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={askBruno} disabled={brunoLoading || !brunoQuery.trim()} style={{
              marginTop: 6, background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 6,
              padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              opacity: brunoLoading || !brunoQuery.trim() ? 0.5 : 1,
            }}>{brunoLoading ? "Thinking..." : "Ask"}</button>
            {brunoResponse && (
              <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 8, padding: 12, fontSize: 12, color: "#1a2332", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                {brunoResponse}
              </div>
            )}
          </div>

          {/* Territory Scan */}
          <div style={{ padding: 16, borderBottom: "1px solid #e5e9ef" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1a2332", margin: "0 0 8px" }}>Territory Quick Scan</p>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={scanZip}
                onChange={(e) => setScanZip(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runTerritoryScan()}
                placeholder="Enter ZIP..."
                style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, outline: "none", boxSizing: "border-box" }}
              />
              <button onClick={runTerritoryScan} disabled={scanLoading} style={{
                background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 6,
                padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#1a2332",
              }}>{scanLoading ? "..." : "Scan"}</button>
            </div>
            {scanResult && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#1a2332", lineHeight: 1.6 }}>
                <div><span style={{ color: "#7a8a9a" }}>Score: </span><span style={{ fontWeight: 700, color: "#F5C842" }}>{String(scanResult.opportunityScore || "—")}</span></div>
                <div><span style={{ color: "#7a8a9a" }}>Income: </span>{String(scanResult.medianIncome || "—")}</div>
                <div><span style={{ color: "#7a8a9a" }}>Top: </span>{Array.isArray(scanResult.topCategories) ? (scanResult.topCategories as string[]).slice(0, 3).join(", ") : "—"}</div>
              </div>
            )}
          </div>

          {/* Rep Notes */}
          {selected && (
            <div style={{ padding: 16, borderBottom: "1px solid #e5e9ef" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a2332", margin: "0 0 8px" }}>Rep Notes — {selected.business_name}</p>
              <textarea
                value={repNotes}
                onChange={(e) => setRepNotes(e.target.value)}
                placeholder="Add private notes..."
                rows={4}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
              <button onClick={saveRepNotes} disabled={notesSaving} style={{
                marginTop: 6, background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 6,
                padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#1a2332",
              }}>{notesSaving ? "Saving..." : "Save Notes"}</button>
            </div>
          )}

          {/* Quick links */}
          <div style={{ padding: 16, flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1a2332", margin: "0 0 10px" }}>Quick Links</p>
            {selected && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link href={`/campaign/client/${selected.id}`} style={{ display: "block", background: "#F5C842", color: "#1B2A4A", padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                  Open Client Portal →
                </Link>
                <Link href={`/campaign/tearsheet/${selected.id}`} style={{ display: "block", background: "#f8fafc", color: "#1a2332", padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none", textAlign: "center", border: "1px solid #e5e9ef" }}>
                  Open Tearsheet →
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
