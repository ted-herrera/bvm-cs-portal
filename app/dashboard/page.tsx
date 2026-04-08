"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import type { ClientProfile, PipelineStage } from "@/lib/pipeline";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/pipeline";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function lastStageDate(c: ClientProfile): string {
  return c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at;
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const AFFIRMATIONS = [
  "The rep who shows up prepared wins the room every time.",
  "Every great client started as a cold call someone almost didn't make.",
  "Your pipeline is a reflection of your last 30 days of activity.",
  "Speed is a feature. The rep who moves fastest wins.",
  "A confused client says no. A confident rep creates clarity.",
  "Your best upsell is a client who trusts you completely.",
  "Show them the site before they ask to see it.",
  "The follow-up is where the money lives.",
  "Every 'not interested' is just 'not yet'.",
  "You're not selling a website. You're selling their neighborhood seeing them.",
  "The best time to plant a tree was 20 years ago. The second best time is today's intake.",
  "A rep with a system outperforms a rep with talent every time.",
  "Your clients don't know what they want until you show them.",
  "The difference between a good rep and a great rep is one more follow-up.",
  "Build the site. Send the link. Let Bruno close.",
];

function getStoryPill(c: ClientProfile): { icon: string; text: string; color: string; urgency: number } {
  const days = daysSince(lastStageDate(c));
  if (c.interests?.featured_placement) return { icon: "👑", text: "Featured Placement requested — CALL NOW", color: "#ef4444", urgency: 0 };
  if (c.stage === "revision-requested") return { icon: "💬", text: "Client replied — unread message", color: "#ef4444", urgency: 1 };
  if (c.stage === "tear-sheet" && days > 7) return { icon: "🔴", text: `Stuck ${days} days — Tear Sheet not opened`, color: "#ef4444", urgency: 2 };
  if (c.interests?.print) {
    const size = typeof c.interests.print === "string" ? c.interests.print : "print";
    return { icon: "📰", text: `${size} print selected — follow up`, color: "#f59e0b", urgency: 3 };
  }
  if (c.qaReport && c.qaReport.score < 50) return { icon: "⚠️", text: `QA Score ${c.qaReport.score} — needs dev attention`, color: "#f59e0b", urgency: 4 };
  if (c.stage === "tear-sheet") return { icon: "📧", text: `Awaiting client — ${days}d`, color: "#f59e0b", urgency: 5 };
  if (c.stage === "delivered" || c.approved_at) return { icon: "✅", text: "Approved — ready to deploy", color: "#22c55e", urgency: 6 };
  if (c.stage === "live") return { icon: "🟢", text: "Live", color: "#22c55e", urgency: 8 };
  return { icon: "🔵", text: `${STAGE_LABELS[c.stage]} — ${days}d`, color: "#3b82f6", urgency: 7 };
}

function getAction(c: ClientProfile): { label: string; href: string } {
  if (c.interests?.featured_placement) return { label: "Call Client →", href: `tel:${c.phone?.replace(/\D/g, "")}` };
  if (c.stage === "revision-requested") return { label: "View Message →", href: `/profile/${c.id}` };
  if (c.stage === "tear-sheet") return { label: "Open Tear Sheet →", href: `/tearsheet/${c.id}` };
  if (c.stage === "qa") return { label: "Review QA →", href: `/profile/${c.id}` };
  if (c.stage === "live") return { label: "View Site →", href: c.published_url || `/profile/${c.id}` };
  return { label: "View Profile →", href: `/profile/${c.id}` };
}

function addToCalendar(title: string, details: string) {
  const start = new Date(Date.now() + 86400000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(Date.now() + 86400000 + 3600000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}`, "_blank");
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bellOpen, setBellOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState<Set<string>>(new Set());
  const [affIdx, setAffIdx] = useState(Math.floor(new Date().getTime() / 86400000) % AFFIRMATIONS.length);
  const [drawerClient, setDrawerClient] = useState<ClientProfile | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "comm" | "actions">("overview");
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [weather, setWeather] = useState<{ temp: string; icon: string } | null>(null);
  const [gcalConnected, setGcalConnected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/clients");
        const d = await r.json();
        setClients(d.clients || []);
      } catch {
        const ids = ["client-001", "client-002", "client-003"];
        const results = await Promise.all(ids.map((id) => fetch(`/api/profile/${id}`).then((r) => r.json()).then((d) => d.client as ClientProfile | null).catch(() => null)));
        setClients(results.filter(Boolean) as ClientProfile[]);
      }
      setLoading(false);
    }
    load();
    // Weather
    fetch("https://wttr.in/Tulsa?format=j1").then((r) => r.json()).then((d) => {
      const cur = d?.current_condition?.[0];
      if (cur) setWeather({ temp: `${cur.temp_F}°F`, icon: cur.weatherDesc?.[0]?.value || "" });
    }).catch(() => {});
    // Calendar
    setGcalConnected(localStorage.getItem("gcal_connected") === "true");
  }, []);

  // Poll
  useEffect(() => {
    const i = setInterval(() => { fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.clients || [])).catch(() => {}); }, 10000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [drawerClient]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Notifications
  const notifications = clients.flatMap((c) =>
    c.buildLog.slice(-3).map((e) => ({
      id: `${c.id}-${e.timestamp}`,
      name: c.business_name,
      msg: `${STAGE_LABELS[e.from]} → ${STAGE_LABELS[e.to]}`,
      time: timeAgo(e.timestamp),
      clientId: c.id,
    }))
  ).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 20);

  const unread = notifications.filter((n) => !readNotifs.has(n.id)).length;

  // Priority queue
  const priorityQueue = [...clients].map((c) => ({ client: c, story: getStoryPill(c) })).sort((a, b) => a.story.urgency - b.story.urgency);

  // Kanban
  const kanbanCols: PipelineStage[] = ["intake", "tear-sheet", "building", "qa", "review", "delivered", "live"];

  // Right panel data
  const followUps = clients.filter((c) => c.stage === "tear-sheet" && daysSince(lastStageDate(c)) >= 2);
  const interests = clients.filter((c) => c.interests && Object.keys(c.interests).some((k) => !k.endsWith("_at") && c.interests?.[k]));

  // Stats
  const delivered = clients.filter((c) => c.stage === "delivered" || c.stage === "live").length;
  const qaClients = clients.filter((c) => c.qaReport);
  const avgQA = qaClients.length ? Math.round(qaClients.reduce((s, c) => s + (c.qaReport?.score || 0), 0) / qaClients.length) : 0;

  async function sendMessage() {
    if (!msgInput.trim() || !drawerClient || msgSending) return;
    setMsgSending(true);
    try {
      await fetch(`/api/profile/message/${drawerClient.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgInput, from: "rep", repName: "Ted" }),
      });
      const newMsg = { from: "rep", text: msgInput, timestamp: new Date().toISOString() };
      const updated = { ...drawerClient, messages: [...drawerClient.messages, newMsg] };
      setDrawerClient(updated);
      setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setMsgInput("");
    } catch { /* ignore */ }
    setMsgSending(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a2f50" }}>
        <TopNav activePage="dashboard" />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
          <div style={{ width: 32, height: 32, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1f3d", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
      <TopNav activePage="dashboard" />

      <div style={{ display: "flex", flex: 1 }}>
        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <aside style={{ width: 220, flexShrink: 0, background: "#0d1a2e", display: "flex", flexDirection: "column", padding: "20px 12px", overflowY: "auto" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", margin: "0 0 20px", padding: "0 2px" }}>BVM Design Center</p>

          {/* Nav links */}
          {[
            { label: "Dashboard", href: "/dashboard", active: true },
            { label: "New Intake", href: "/intake", active: false },
            { label: "QA Engine", href: "/qa", active: false },
            { label: "All Clients", href: "/clients", active: false },
            { label: "Build Queue", href: "/build-queue", active: false },
          ].map((link) => (
            <Link key={link.href} href={link.href} style={{
              display: "block", padding: "10px 14px", borderRadius: 8, fontSize: 13,
              fontWeight: link.active ? 700 : 500, marginBottom: 2,
              background: link.active ? "#F5C842" : "transparent",
              color: link.active ? "#0d1a2e" : "rgba(255,255,255,0.6)",
              textDecoration: "none",
            }}>
              {link.label}
            </Link>
          ))}

          <div style={{ flex: 1 }} />

          {/* Calendar connection */}
          {!gcalConnected ? (
            <button onClick={() => { localStorage.setItem("gcal_connected", "true"); setGcalConnected(true); }} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 8, textAlign: "left" }}>
              📅 Connect Google Calendar
            </button>
          ) : (
            <div style={{ padding: "8px 14px", fontSize: 12, color: "#22c55e", fontWeight: 600 }}>📅 Calendar Connected</div>
          )}
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, background: "#0f1f3d", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                {getGreeting()}, Ted
              </h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>{today}</p>
              {/* Affirmation */}
              <p onClick={() => setAffIdx((affIdx + 1) % AFFIRMATIONS.length)} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 13, color: "#F5C842", fontStyle: "italic", margin: "8px 0 0", cursor: "pointer", animation: "fadeIn 0.5s", opacity: 1 }}>
                ✨ {AFFIRMATIONS[affIdx]}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {weather && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{weather.temp} {weather.icon}</span>}
              <div style={{ position: "relative" }}>
                <button onClick={() => setBellOpen(!bellOpen)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", position: "relative", padding: 4 }}>
                  🔔
                  {unread > 0 && <span style={{ position: "absolute", top: -2, right: -4, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
                </button>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, padding: 24, display: "flex", gap: 20 }}>
            {/* Left: Priority + Kanban */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Featured Placement Urgent */}
              {clients.filter((c) => c.interests?.featured_placement).length > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderLeft: "4px solid #ef4444", borderRadius: 12, padding: "12px 20px", marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c" }}>👑 Featured Placement Requests — Call These Clients Now: </span>
                  <span style={{ fontSize: 13, color: "#dc2626" }}>{clients.filter((c) => c.interests?.featured_placement).map((c) => c.business_name).join(", ")}</span>
                </div>
              )}

              {/* Priority Queue */}
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5C842", marginBottom: 12 }}>Priority Queue</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {priorityQueue.slice(0, 8).map(({ client: c, story }) => {
                    const action = getAction(c);
                    return (
                      <div key={c.id} onClick={() => { setDrawerClient(c); setDrawerTab("overview"); }} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0f1f3d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", transition: "box-shadow 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: story.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{c.business_name}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 8 }}>{c.city}</span>
                        </div>
                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: `${story.color}18`, color: story.color, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {story.icon} {story.text}
                        </span>
                        <a href={action.href} onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: "#F5C842", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {action.label}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kanban */}
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5C842", marginBottom: 12 }}>Pipeline</p>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${kanbanCols.length}, 1fr)`, gap: 8, overflowX: "auto" }}>
                {kanbanCols.map((stage) => {
                  const stageClients = clients.filter((c) => c.stage === stage);
                  return (
                    <div key={stage} style={{ background: "#1a2f50", borderRadius: 10, padding: 10, minHeight: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{STAGE_LABELS[stage]}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#243454", color: "rgba(255,255,255,0.4)", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{stageClients.length}</span>
                      </div>
                      {stageClients.map((c) => {
                        const days = daysSince(lastStageDate(c));
                        const dayColor = days > 10 ? "#ef4444" : days > 5 ? "#f59e0b" : "#94a3b8";
                        return (
                          <div key={c.id} onClick={() => { setDrawerClient(c); setDrawerTab("overview"); }} style={{ background: "#0f1f3d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 6, cursor: "pointer", fontSize: 12 }}>
                            <p style={{ fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{c.business_name}</p>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{c.city}</span>
                              <span style={{ color: dayColor, fontSize: 10, fontWeight: 600 }}>{days}d</span>
                            </div>
                            {c.interests?.print && <span style={{ fontSize: 9, color: "#92400e", fontWeight: 700 }}>📰</span>}
                            {c.interests?.featured_placement && <span style={{ fontSize: 9, color: "#dc2626", fontWeight: 700 }}> 👑</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── RIGHT PANEL ─────────────────────────────────────────────── */}
            <div style={{ width: 280, flexShrink: 0, background: "#162744", borderRadius: 12, padding: "20px 16px" }}>
              {/* Follow Up Today */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5C842", marginBottom: 10 }}>Follow Up Today</p>
                {followUps.length === 0 && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>All caught up!</p>}
                {followUps.slice(0, 5).map((c) => (
                  <div key={c.id} style={{ background: "#1a2f50", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{c.business_name}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "2px 0 6px" }}>Tear sheet unopened {daysSince(lastStageDate(c))}d</p>
                    <Link href={`/tearsheet/${c.id}`} style={{ fontSize: 11, color: "#F5C842", fontWeight: 600, textDecoration: "none" }}>Send Reminder →</Link>
                  </div>
                ))}
              </div>

              {/* Campaign Interest */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5C842", marginBottom: 10 }}>Campaign Interest</p>
                {interests.length === 0 && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>No interest signals yet.</p>}
                {interests.slice(0, 5).map((c) => {
                  const types = Object.keys(c.interests || {}).filter((k) => !k.endsWith("_at") && c.interests?.[k]);
                  return (
                    <div key={c.id} style={{ background: "#1a2f50", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{c.business_name}</p>
                      <p style={{ fontSize: 11, color: "#F5C842", margin: "2px 0 6px" }}>{types.join(", ")}</p>
                      <a href={`tel:${c.phone?.replace(/\D/g, "")}`} style={{ fontSize: 11, color: "#F5C842", fontWeight: 600, textDecoration: "none" }}>Call Now →</a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Stats Bar */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "16px 24px", display: "flex", gap: 40, justifyContent: "center", background: "#0d1a2e" }}>
            {[
              { value: delivered, label: "Sites Delivered" },
              { value: "4.2 hrs", label: "Avg TTM" },
              { value: `${avgQA}%`, label: "QA Pass Rate" },
              { value: `${clients.filter((c) => c.messages.length > 0).length}/${clients.length}`, label: "Client Response" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#F5C842" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* ── NOTIFICATION DRAWER ─────────────────────────────────────────── */}
      {bellOpen && (
        <>
          <div onClick={() => setBellOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 48 }} />
          <div style={{ position: "fixed", top: 60, right: 24, width: 360, background: "#0d1a2e", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", zIndex: 100, maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Notifications</span>
              <button onClick={() => setReadNotifs(new Set(notifications.map((n) => n.id)))} style={{ background: "none", border: "none", fontSize: 11, color: "#3b82f6", cursor: "pointer" }}>Mark all read</button>
            </div>
            {notifications.map((n) => (
              <Link key={n.id} href={`/profile/${n.clientId}`} onClick={() => setBellOpen(false)} style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid #f8fafc", textDecoration: "none", background: readNotifs.has(n.id) ? "#fff" : "#f8fafc" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{n.name}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>{n.msg}</p>
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", flexShrink: 0 }}>{n.time}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── SLIDE-OUT PANEL ─────────────────────────────────────────────── */}
      {drawerClient && (
        <>
          <div onClick={() => setDrawerClient(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 49 }} />
          <div style={{ position: "fixed", top: 0, right: 0, width: 400, height: "100vh", background: "#0f1f3d", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)", zIndex: 50, display: "flex", flexDirection: "column", animation: "slideIn 0.25s ease-out" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{drawerClient.business_name}</h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "2px 0 0" }}>{drawerClient.city} · {STAGE_LABELS[drawerClient.stage]}</p>
              </div>
              <button onClick={() => setDrawerClient(null)} style={{ background: "none", border: "none", fontSize: 22, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {([{ key: "overview" as const, label: "Overview" }, { key: "comm" as const, label: "Communication" }, { key: "actions" as const, label: "Actions" }]).map((t) => (
                <button key={t.key} onClick={() => setDrawerTab(t.key)} style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: drawerTab === t.key ? 700 : 500, color: drawerTab === t.key ? "#0d1a2e" : "#94a3b8", background: "transparent", borderBottom: drawerTab === t.key ? "2px solid #F5C842" : "2px solid transparent" }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {drawerTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Phone: </span><span style={{ color: "#e2e8f0", fontWeight: 600 }}>{drawerClient.phone || "—"}</span></div>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Look: </span><span style={{ color: "#e2e8f0", fontWeight: 600, textTransform: "capitalize" }}>{drawerClient.selectedLook?.replace(/_/g, " ") || "—"}</span></div>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Services: </span><span style={{ color: "#e2e8f0" }}>{drawerClient.intakeAnswers?.q3 || "—"}</span></div>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>CTA: </span><span style={{ color: "#e2e8f0" }}>{drawerClient.intakeAnswers?.q4 || "—"}</span></div>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Stage: </span><span style={{ color: "#F5C842", fontWeight: 600 }}>{STAGE_LABELS[drawerClient.stage]}</span></div>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Created: </span><span style={{ color: "#e2e8f0" }}>{new Date(drawerClient.created_at).toLocaleDateString()}</span></div>
                  {drawerClient.interests && Object.keys(drawerClient.interests).filter((k) => !k.endsWith("_at") && drawerClient.interests?.[k]).length > 0 && (
                    <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Interests: </span><span style={{ color: "#F5C842", fontWeight: 600 }}>{Object.keys(drawerClient.interests).filter((k) => !k.endsWith("_at") && drawerClient.interests?.[k]).join(", ")}</span></div>
                  )}
                </div>
              )}

              {drawerTab === "comm" && (
                <div>
                  {drawerClient.messages.length === 0 && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No messages yet.</p>}
                  {drawerClient.messages.map((m, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{m.from}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#cbd5e1", margin: "4px 0 0", lineHeight: 1.5 }}>{m.text}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}

              {drawerTab === "actions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link href={`/profile/${drawerClient.id}`} style={{ display: "block", background: "#F5C842", color: "#e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>Open Full Profile →</Link>
                  <Link href={`/tearsheet/${drawerClient.id}`} style={{ display: "block", background: "#1a2f50", color: "#e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>Open Tear Sheet →</Link>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/client/${drawerClient.id}`); }} style={{ background: "#1a2f50", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Copy Client Portal Link</button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/tearsheet/${drawerClient.id}`); }} style={{ background: "#1a2f50", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Copy Tear Sheet Link</button>
                  {gcalConnected && (
                    <button onClick={() => addToCalendar(`Follow up: ${drawerClient.business_name}`, `Check in on ${drawerClient.business_name} build status. Stage: ${STAGE_LABELS[drawerClient.stage]}`)} style={{ background: "#1a2f50", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📅 Add Calendar Reminder</button>
                  )}
                  <Link href={`/qa?clientId=${drawerClient.id}`} style={{ display: "block", background: "#1a2f50", color: "#e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>Run QA</Link>
                </div>
              )}
            </div>

            {/* Message input for comm tab */}
            {drawerTab === "comm" && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
                <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Send message to client..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, outline: "none" }} />
                <button onClick={sendMessage} disabled={msgSending || !msgInput.trim()} style={{ background: "#F5C842", color: "#e2e8f0", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: msgSending ? 0.5 : 1 }}>Send</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
