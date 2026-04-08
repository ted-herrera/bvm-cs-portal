"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import type { ClientProfile, PipelineStage } from "@/lib/pipeline";
import { STAGE_LABELS } from "@/lib/pipeline";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function daysSince(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function lastStageDate(c: ClientProfile): string {
  return c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at;
}

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const REP_AVATARS: Record<string, { bg: string; initials: string }> = {
  ted: { bg: "#0d1a2e", initials: "TH" },
  sal: { bg: "#3b82f6", initials: "S" },
  alex: { bg: "#22c55e", initials: "A" },
  jacquelyn: { bg: "#7c3aed", initials: "J" },
};

const STAGE_INLINE_COLORS: Record<string, { bg: string; text: string }> = {
  "revision-requested": { bg: "#fef2f2", text: "#ef4444" },
  "tear-sheet": { bg: "#fffbeb", text: "#f59e0b" },
  building: { bg: "#eff6ff", text: "#3b82f6" },
  qa: { bg: "#f5f3ff", text: "#7c3aed" },
  review: { bg: "#f5f3ff", text: "#7c3aed" },
  delivered: { bg: "#f0fdf4", text: "#22c55e" },
  live: { bg: "#f0fdf4", text: "#16a34a" },
  intake: { bg: "#f8fafc", text: "#6b7280" },
};

type SidebarPill = {
  key: string;
  label: string;
  badgeColor: string;
  filter: (c: ClientProfile) => boolean;
};

const SIDEBAR_PILLS: SidebarPill[] = [
  { key: "attention", label: "Needs Attention", badgeColor: "#ef4444", filter: (c) => c.stage === "revision-requested" },
  { key: "awaiting", label: "Awaiting Client", badgeColor: "#f59e0b", filter: (c) => c.stage === "tear-sheet" },
  { key: "progress", label: "In Progress", badgeColor: "#3b82f6", filter: (c) => c.stage === "building" || c.stage === "qa" || c.stage === "review" },
  { key: "delivered", label: "Delivered", badgeColor: "#22c55e", filter: (c) => c.stage === "delivered" || c.stage === "live" },
  { key: "all", label: "All Clients", badgeColor: "#94a3b8", filter: () => true },
];

interface Notification {
  id: string;
  icon: string;
  message: string;
  timeAgo: string;
  clientName: string;
  type: string;
}

function buildNotifications(clients: ClientProfile[]): Notification[] {
  const now = Date.now();
  const cutoff = now - 48 * 60 * 60 * 1000;
  const notifs: Notification[] = [];

  for (const c of clients) {
    for (const entry of c.buildLog) {
      const ts = new Date(entry.timestamp).getTime();
      if (ts < cutoff) continue;

      let icon = "\u26AA";
      let message = `Stage changed: ${STAGE_LABELS[entry.from]} \u2192 ${STAGE_LABELS[entry.to]}`;
      const type = "stage";
      const toStage = entry.to as string;

      if (toStage === "revision-requested") {
        icon = "\uD83D\uDD34";
        message = "Client left a note (revision requested)";
      } else if (toStage === "qa") {
        icon = "\uD83D\uDFE1";
        message = "QA report ready for review";
      } else if (toStage === "review" || (entry.from === "building" && toStage === "qa")) {
        icon = "\uD83D\uDFE2";
        message = "Dev marked build ready";
      }

      notifs.push({
        id: `${c.id}-${entry.timestamp}`,
        icon,
        message,
        timeAgo: timeAgo(entry.timestamp),
        clientName: c.business_name,
        type,
      });
    }

    if (c.qaReport && c.qaReport.runAt) {
      const ts = new Date(c.qaReport.runAt).getTime();
      if (ts >= cutoff) {
        notifs.push({
          id: `${c.id}-pulse-${c.qaReport.runAt}`,
          icon: "\uD83D\uDD35",
          message: `Pulse score received: ${c.qaReport.score}/100`,
          timeAgo: timeAgo(c.qaReport.runAt),
          clientName: c.business_name,
          type: "pulse",
        });
      }
    }
  }

  notifs.sort((a, b) => {
    const ta = notifs.indexOf(a);
    const tb = notifs.indexOf(b);
    return tb - ta;
  });

  return notifs.slice(0, 8);
}

function getTodaysFocus(clients: ClientProfile[]): { client: ClientProfile; reason: string; action: string; link: string } | null {
  const revisions = clients.filter((c) => c.stage === "revision-requested");
  if (revisions.length > 0) {
    const c = revisions[0];
    return { client: c, reason: "Client left a revision note", action: "View Note \u2192", link: `/profile/${c.id}` };
  }

  const qa = clients.filter((c) => c.stage === "qa");
  if (qa.length > 0) {
    const c = qa[0];
    return { client: c, reason: "QA report pending review", action: "Review QA \u2192", link: `/profile/${c.id}` };
  }

  const awaiting = clients.filter((c) => c.stage === "tear-sheet" && daysSince(lastStageDate(c)) >= 3);
  if (awaiting.length > 0) {
    const c = awaiting.sort((a, b) => daysSince(lastStageDate(b)) - daysSince(lastStageDate(a)))[0];
    return { client: c, reason: `Awaiting client for ${daysSince(lastStageDate(c))} days`, action: "Send Tear Sheet \u2192", link: `/profile/${c.id}` };
  }

  const building = clients.filter((c) => c.stage === "building" && daysSince(lastStageDate(c)) >= 5);
  if (building.length > 0) {
    const c = building.sort((a, b) => daysSince(lastStageDate(b)) - daysSince(lastStageDate(a)))[0];
    return { client: c, reason: `In building for ${daysSince(lastStageDate(c))} days`, action: "Check In \u2192", link: `/profile/${c.id}` };
  }

  const anyAwaiting = clients.filter((c) => c.stage === "tear-sheet");
  if (anyAwaiting.length > 0) {
    const c = anyAwaiting[0];
    return { client: c, reason: "Awaiting client approval", action: "Send Tear Sheet \u2192", link: `/profile/${c.id}` };
  }

  return null;
}

function getQuickAction(c: ClientProfile): { label: string; action: () => void } {
  switch (c.stage) {
    case "revision-requested":
      return { label: "View Client Note \u2192", action: () => { window.location.href = `/profile/${c.id}`; } };
    case "tear-sheet":
      return {
        label: "Copy Client Link \u2192",
        action: () => {
          navigator.clipboard.writeText(`${window.location.origin}/tearsheet/${c.id}`);
        },
      };
    case "building":
      return { label: "View Dev Status \u2192", action: () => { window.location.href = `/profile/${c.id}`; } };
    case "qa":
      return { label: "Review QA Report \u2192", action: () => { window.location.href = `/profile/${c.id}`; } };
    case "review":
      return { label: "Approve & Deliver \u2192", action: () => { window.location.href = `/profile/${c.id}`; } };
    case "delivered":
      return { label: "Send Pulse \u2192", action: () => { window.location.href = `/profile/${c.id}`; } };
    case "live":
      return { label: "View Live Site \u2192", action: () => { if (c.published_url) window.open(c.published_url, "_blank"); else window.location.href = `/profile/${c.id}`; } };
    default:
      return { label: "View Profile \u2192", action: () => { window.location.href = `/profile/${c.id}`; } };
  }
}

function getStatusBarColor(stage: PipelineStage): string {
  if (stage === "revision-requested") return "#ef4444";
  if (stage === "tear-sheet") return "#f59e0b";
  if (stage === "building" || stage === "qa" || stage === "review") return "#3b82f6";
  if (stage === "delivered" || stage === "live") return "#22c55e";
  return "#94a3b8";
}

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bellOpen, setBellOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [brunoOpen, setBrunoOpen] = useState(false);
  const [brunoChat, setBrunoChat] = useState<{ role: string; text: string }[]>([]);
  const [brunoInput, setBrunoInput] = useState("");
  const [brunoLoading, setBrunoLoading] = useState(false);
  const brunoChatEndRef = useRef<HTMLDivElement>(null);
  const [activePill, setActivePill] = useState<string>("all");
  const [drawerClientId, setDrawerClientId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"communication" | "qa" | "buildlog">("communication");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/clients");
        const data = await res.json();
        setClients(data.clients || []);
      } catch {
        const ids = ["client-001", "client-002", "client-003"];
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/profile/${id}`)
              .then((r) => r.json())
              .then((d) => d.client as ClientProfile | null)
              .catch(() => null)
          )
        );
        setClients(results.filter(Boolean) as ClientProfile[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.clients || [])).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    brunoChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [brunoChat]);

  // Auto-select first pill that has items
  useEffect(() => {
    if (clients.length > 0 && activePill === "all") {
      const firstWithItems = SIDEBAR_PILLS.find((p) => p.key !== "all" && clients.filter(p.filter).length > 0);
      if (firstWithItems) setActivePill(firstWithItems.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  const greeting = getGreeting();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const activeBuilds = clients.filter((c) => c.stage === "building" || c.stage === "qa").length;
  const qaPending = clients.filter((c) => c.stage === "qa").length;
  const awaitingClient = clients.filter((c) => c.stage === "tear-sheet").length;

  const stats = [
    { label: "Active Builds", value: activeBuilds, color: "#3b82f6" },
    { label: "QA Pending", value: qaPending, color: "#7c3aed" },
    { label: "Awaiting Client", value: awaitingClient, color: "#f59e0b" },
    { label: "Total Clients", value: clients.length, color: "#0d1a2e" },
  ];

  const notifications = buildNotifications(clients);
  const unreadCount = notifications.filter((n) => !readNotifs.has(n.id)).length;
  const focus = getTodaysFocus(clients);

  const needsAttention = clients.filter((c) => c.stage === "revision-requested").length;
  const inProgress = clients.filter((c) => c.stage === "building" || c.stage === "qa").length;

  // Filtered clients based on active pill
  const currentPill = SIDEBAR_PILLS.find((p) => p.key === activePill) || SIDEBAR_PILLS[4];
  const filteredClients = clients.filter(currentPill.filter);

  // Activity ticker items
  const tickerItems = clients
    .flatMap((c) =>
      c.buildLog.map((entry) => ({
        clientName: c.business_name,
        action: `${STAGE_LABELS[entry.from]} \u2192 ${STAGE_LABELS[entry.to]}`,
        timestamp: entry.timestamp,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  const drawerClient = drawerClientId ? clients.find((c) => c.id === drawerClientId) || null : null;

  function openBruno() {
    setBrunoOpen(true);
    if (brunoChat.length === 0) {
      setBrunoChat([{
        role: "bruno",
        text: `Morning Ted \u2014 you have ${needsAttention} client${needsAttention !== 1 ? "s" : ""} needing attention and ${inProgress} build${inProgress !== 1 ? "s" : ""} in progress. What do you need?`,
      }]);
    }
  }

  async function sendBrunoDash() {
    if (!brunoInput.trim()) return;
    const userMsg = { role: "user", text: brunoInput };
    setBrunoChat((prev) => [...prev, userMsg]);
    setBrunoInput("");
    setBrunoLoading(true);

    const clientSummary = clients.map((c) => `${c.business_name} (${c.stage}, ${daysSince(lastStageDate(c))}d, rep: ${c.assigned_rep}${c.qaReport ? `, QA: ${c.qaReport.score}` : ""})`).join("; ");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Bruno, dashboard assistant for BVM Design Center. Rep: Ted. Current clients: ${clientSummary}. Help the rep understand their workload, answer questions about specific clients, and suggest next actions. Be concise and direct.`,
          messages: [
            ...brunoChat.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
            { role: "user", content: brunoInput },
          ],
        }),
      });
      const data = await res.json();
      setBrunoChat((prev) => [...prev, { role: "bruno", text: data.response || "Sorry, I couldn't process that." }]);
    } catch {
      setBrunoChat((prev) => [...prev, { role: "bruno", text: "Connection error. Try again." }]);
    }
    setBrunoLoading(false);
  }

  function handleCopyLink(clientId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/tearsheet/${clientId}`);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#ffffff" }}>
        <TopNav activePage="dashboard" />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
          <div style={{ width: 32, height: 32, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  const tickerText = tickerItems.map((t) => `${t.clientName} \u2014 ${t.action}`).join("   \u2022   ");

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ticker-scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .ticker-track:hover { animation-play-state: paused !important; }
        .drawer-slide { animation: slideIn 0.25s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
      <TopNav activePage="dashboard" />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT SIDEBAR */}
        <aside style={{
          width: 220, flexShrink: 0, background: "#0d1a2e", display: "flex", flexDirection: "column",
          padding: "20px 12px", overflowY: "auto",
        }}>
          {/* Brand */}
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
            color: "#F5C842", margin: "0 0 12px", padding: "0 2px",
          }}>
            BVM Design Center
          </p>
          <img
            src="/bruno.png"
            alt="Bruno"
            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", marginBottom: 20 }}
          />

          {/* Status Pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SIDEBAR_PILLS.map((pill) => {
              const count = clients.filter(pill.filter).length;
              const isActive = activePill === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setActivePill(pill.key)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: isActive ? "#F5C842" : "transparent",
                    color: isActive ? "#0d1a2e" : "rgba(255,255,255,0.6)",
                    fontWeight: isActive ? 700 : 500, fontSize: 13,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                >
                  <span>{pill.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, minWidth: 22, height: 22, display: "flex",
                    alignItems: "center", justifyContent: "center", borderRadius: 9999,
                    background: isActive ? "#0d1a2e" : pill.badgeColor,
                    color: "#fff",
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "16px 0" }} />

          {/* Quick Links */}
          <p style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
            color: "#F5C842", margin: "0 0 8px", padding: "0 2px",
          }}>
            Quick Links
          </p>
          {[
            { label: "New Intake", href: "/intake" },
            { label: "QA Engine", href: "/qa" },
            { label: "All Clients", href: "/clients" },
            { label: "Build Queue", href: "/build-queue" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "block", padding: "6px 2px", fontSize: 12,
                color: "rgba(255,255,255,0.6)", textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            >
              {"\u2192"} {link.label}
            </Link>
          ))}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            {bellOpen && (
              <div style={{
                position: "absolute", bottom: 44, left: 0, width: 300, background: "#fff",
                borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", border: "1px solid #e2e8f0",
                zIndex: 100, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0d1a2e" }}>Notifications</span>
                  <button
                    onClick={() => { setReadNotifs(new Set(notifications.map((n) => n.id))); }}
                    style={{ background: "none", border: "none", fontSize: 11, color: "#3b82f6", cursor: "pointer", padding: 0 }}
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "24px 16px" }}>No recent notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "10px 16px", borderBottom: "1px solid #f8fafc", display: "flex", gap: 10, alignItems: "flex-start",
                        background: readNotifs.has(n.id) ? "#fff" : "#f8fafc",
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: "#0d1a2e", margin: 0, fontWeight: 600 }}>{n.clientName}</p>
                        <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>{n.message}</p>
                      </div>
                      <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>{n.timeAgo}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            <button
              onClick={() => setBellOpen(!bellOpen)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 13,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            >
              <span style={{ fontSize: 18 }}>{"\uD83D\uDD14"}</span>
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 9999, background: "#ef4444", color: "#fff",
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main style={{ flex: 1, background: "#ffffff", padding: 24, overflowY: "auto", paddingBottom: 56 }}>
          {/* Page Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#0d1a2e", margin: 0 }}>
              {greeting}, Ted
            </h1>
            <p style={{ fontSize: 12, color: "#F5C842", fontWeight: 500, margin: "4px 0 0" }}>{today}</p>
          </div>

          {/* Stat Chips */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {stats.map((s) => (
              <div key={s.label} style={{
                flex: 1, display: "flex", alignItems: "center", gap: 12,
                background: "#fff", border: "1px solid #e2e8f0", borderLeft: `3px solid ${s.color}`,
                borderRadius: 8, padding: "10px 14px",
              }}>
                <div>
                  <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{s.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#0d1a2e", margin: "2px 0 0" }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interest Notifications */}
          {(() => {
            const interested = clients.filter((c) => c.interests && (c.interests.print || c.interests.digital || c.interests.premier));
            if (interested.length === 0) return null;
            return (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderLeft: "4px solid #F5C842", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>🔔</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>
                  {interested.length} client{interested.length !== 1 ? "s" : ""} expressed campaign interest
                </span>
              </div>
            );
          })()}

          {/* Today's Focus */}
          {focus && (
            <div style={{
              background: "rgba(245,200,66,0.06)", border: "1px solid #e2e8f0", borderLeft: "4px solid #F5C842",
              borderRadius: 12, padding: "16px 20px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5C842", margin: "0 0 6px" }}>{"\uD83C\uDFAF"} Today&apos;s Focus</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#0d1a2e", margin: 0 }}>{focus.client.business_name}</p>
                <p style={{ fontSize: 13, color: "#F5C842", margin: "4px 0 0" }}>{focus.reason}</p>
              </div>
              <Link href={focus.link} style={{
                background: "#F5C842", color: "#0d1a2e", padding: "10px 20px", borderRadius: 8,
                fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
              }}>
                {focus.action}
              </Link>
            </div>
          )}

          {/* Client Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredClients.length === 0 && (
              <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 0", fontStyle: "italic" }}>No clients in this category</p>
            )}
            {filteredClients.map((c) => {
              const days = daysSince(lastStageDate(c));
              const stageColor = STAGE_INLINE_COLORS[c.stage] || { bg: "#f8fafc", text: "#6b7280" };
              const rep = REP_AVATARS[c.assigned_rep?.toLowerCase()] || { bg: "#94a3b8", initials: "?" };
              const qa = getQuickAction(c);
              const isCopyAction = c.stage === "tear-sheet";
              const barColor = getStatusBarColor(c.stage);

              return (
                <div
                  key={c.id}
                  onClick={() => { setDrawerClientId(c.id); setDrawerTab("communication"); }}
                  style={{
                    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
                    padding: 0, cursor: "pointer", display: "flex", overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    transition: "box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                >
                  {/* Status Bar */}
                  <div style={{ width: 4, background: barColor, flexShrink: 0 }} />

                  {/* Content */}
                  <div style={{ flex: 1, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#0d1a2e", margin: 0 }}>{c.business_name}</p>
                        {c.interests?.print && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 9999, background: "#fffbeb", color: "#92400e", fontWeight: 700 }}>📰 Print</span>}
                        {c.interests?.digital && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 9999, background: "#fffbeb", color: "#92400e", fontWeight: 700 }}>📱 Digital</span>}
                        {c.interests?.premier && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 9999, background: "#fffbeb", color: "#92400e", fontWeight: 700 }}>⭐ Premier</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{c.city}</span>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", background: rep.bg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>{rep.initials}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 9999,
                          background: stageColor.bg, color: stageColor.text, fontWeight: 600,
                        }}>
                          {STAGE_LABELS[c.stage]}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{days}d in stage</span>
                      </div>
                    </div>

                    {/* Quick Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCopyAction) {
                          handleCopyLink(c.id);
                        } else {
                          qa.action();
                        }
                      }}
                      style={{
                        background: "none", border: "none", color: "#F5C842",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
                        whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      {isCopyAction && copiedId === c.id ? "Copied!" : qa.label}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* RIGHT DRAWER */}
      {drawerClient && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setDrawerClientId(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 49,
            }}
          />
          {/* Drawer */}
          <div
            className="drawer-slide"
            style={{
              position: "fixed", top: 0, right: 0, width: 420, height: "100vh",
              background: "#fff", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
              zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: "20px 20px 16px", borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: "#0d1a2e", margin: 0 }}>
                {drawerClient.business_name}
              </h2>
              <button
                onClick={() => setDrawerClientId(null)}
                style={{ background: "none", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer", padding: 0, lineHeight: 1 }}
              >
                {"\u00D7"}
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
              {([
                { key: "communication" as const, label: "Communication" },
                { key: "qa" as const, label: "QA Report" },
                { key: "buildlog" as const, label: "Build Log" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDrawerTab(tab.key)}
                  style={{
                    flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: drawerTab === tab.key ? 700 : 500,
                    color: drawerTab === tab.key ? "#0d1a2e" : "#94a3b8",
                    background: "transparent",
                    borderBottom: drawerTab === tab.key ? "2px solid #F5C842" : "2px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {drawerTab === "communication" && (
                <div>
                  {drawerClient.messages.length === 0 && drawerClient.internalNotes.length === 0 && (
                    <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No messages yet.</p>
                  )}
                  {drawerClient.messages.length > 0 && (
                    <>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "0 0 8px" }}>Client Messages</p>
                      {drawerClient.messages.map((m, i) => (
                        <div key={`msg-${i}`} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#0d1a2e" }}>{m.from}</span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(m.timestamp)}</span>
                          </div>
                          <p style={{ fontSize: 13, color: "#334155", margin: "4px 0 0", lineHeight: 1.5 }}>{m.text}</p>
                        </div>
                      ))}
                    </>
                  )}
                  {drawerClient.internalNotes.length > 0 && (
                    <>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "16px 0 8px" }}>Internal Notes</p>
                      {drawerClient.internalNotes.map((m, i) => (
                        <div key={`note-${i}`} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#0d1a2e" }}>{m.from}</span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(m.timestamp)}</span>
                          </div>
                          <p style={{ fontSize: 13, color: "#334155", margin: "4px 0 0", lineHeight: 1.5 }}>{m.text}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {drawerTab === "qa" && (
                <div>
                  {drawerClient.qaReport ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: "50%",
                          border: `3px solid ${drawerClient.qaReport.score >= 80 ? "#22c55e" : drawerClient.qaReport.score >= 60 ? "#f59e0b" : "#ef4444"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: "#0d1a2e" }}>{drawerClient.qaReport.score}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#0d1a2e", margin: 0 }}>
                            {drawerClient.qaReport.passed ? "Passed" : "Needs Work"}
                          </p>
                          <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                            Run {timeAgo(drawerClient.qaReport.runAt)}
                          </p>
                        </div>
                      </div>
                      {drawerClient.qaReport.passes.map((pass, i) => (
                        <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{pass.passed ? "\u2705" : "\u274C"}</span>
                          <span style={{ fontSize: 13, color: "#334155" }}>{pass.name}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No QA report yet.</p>
                  )}
                </div>
              )}

              {drawerTab === "buildlog" && (
                <div>
                  {drawerClient.buildLog.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No build log entries.</p>
                  ) : (
                    drawerClient.buildLog.slice().reverse().map((entry, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: getStatusBarColor(entry.to), flexShrink: 0 }} />
                          {i < drawerClient.buildLog.length - 1 && (
                            <div style={{ width: 1, flex: 1, background: "#e2e8f0", marginTop: 4 }} />
                          )}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, color: "#0d1a2e", margin: 0, fontWeight: 600 }}>
                            {STAGE_LABELS[entry.from]} {"\u2192"} {STAGE_LABELS[entry.to]}
                          </p>
                          <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                            {entry.triggeredBy} {"\u00B7"} {timeAgo(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0" }}>
              <a
                href={`/profile/${drawerClient.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", textAlign: "center", background: "#F5C842", color: "#0d1a2e",
                  padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Open Full Profile {"\u2192"}
              </a>
            </div>
          </div>
        </>
      )}

      {/* ACTIVITY TICKER */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 32,
        background: "#0d1a2e", overflow: "hidden", zIndex: 40,
        display: "flex", alignItems: "center",
      }}>
        <div
          className="ticker-track"
          style={{
            whiteSpace: "nowrap", fontSize: 11, color: "#fff",
            animation: "ticker-scroll 30s linear infinite",
          }}
        >
          {tickerText || "No recent activity"}
        </div>
      </div>

      {/* Floating Bruno Button */}
      {!brunoOpen && (
        <button
          onClick={openBruno}
          style={{
            position: "fixed", bottom: 24 + 32, right: 24, width: 56, height: 56,
            borderRadius: "50%", background: "none", border: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, overflow: "hidden", zIndex: 50,
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"; }}
        >
          <img src="/bruno.png" alt="Bruno" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
        </button>
      )}

      {/* Bruno Chat Panel */}
      {brunoOpen && (
        <div style={{
          position: "fixed", bottom: 24 + 32, right: 24, width: 360, height: 480,
          background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column", zIndex: 50, overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/bruno.png" alt="Bruno" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
              <span style={{ fontWeight: 600, color: "#0d1a2e", fontSize: 14 }}>Bruno</span>
              <span style={{ fontSize: 10, color: "#94a3b8", padding: "2px 6px", background: "#f1f5f9", borderRadius: 4 }}>Dashboard Mode</span>
            </div>
            <button onClick={() => setBrunoOpen(false)} style={{ background: "none", border: "none", fontSize: 18, color: "#94a3b8", cursor: "pointer", padding: 0 }}>{"\u00D7"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {brunoChat.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role !== "user" && (
                  <img src="/bruno.png" alt="Bruno" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginRight: 6, flexShrink: 0 }} />
                )}
                <div style={{
                  maxWidth: "80%", padding: "8px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                  background: msg.role === "user" ? "#F5C842" : "#f1f5f9",
                  color: "#0d1a2e", whiteSpace: "pre-wrap",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {brunoLoading && (
              <div style={{ display: "flex" }}>
                <img src="/bruno.png" alt="Bruno" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginRight: 6 }} />
                <div style={{ padding: "8px 12px", borderRadius: 10, fontSize: 13, background: "#f1f5f9", color: "#94a3b8" }}>Bruno is typing...</div>
              </div>
            )}
            <div ref={brunoChatEndRef} />
          </div>
          <div style={{ padding: 10, borderTop: "1px solid #e2e8f0", display: "flex", gap: 6 }}>
            <input
              type="text"
              value={brunoInput}
              onChange={(e) => setBrunoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendBrunoDash()}
              placeholder="Ask Bruno..."
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0d1a2e", outline: "none" }}
            />
            <button
              onClick={sendBrunoDash}
              disabled={brunoLoading}
              style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: brunoLoading ? 0.5 : 1 }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
