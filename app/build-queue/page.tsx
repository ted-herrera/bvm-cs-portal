"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientProfile } from "@/lib/pipeline";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/pipeline";

const DEV_USERNAME = "dev";

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function BuildQueuePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const buildingClients = clients.filter((c) => c.stage === "building");
  const unassigned = buildingClients.filter((c) => !c.assignedDev);
  const myBuilds = buildingClients.filter((c) => c.assignedDev === DEV_USERNAME);
  const completedThisMonth = clients.filter((c) => {
    if (!c.delivered_at) return false;
    const d = new Date(c.delivered_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  async function claimBuild(clientId: string) {
    await fetch("/api/build/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, devUsername: DEV_USERNAME }),
    });
    load();
  }

  async function markReady(clientId: string) {
    await fetch("/api/build/ready", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    load();
  }

  function downloadBrief(c: ClientProfile) {
    window.location.href = `/api/build/package?clientId=${c.id}`;
  }

  function handleSignOut() {
    document.cookie = "dc_session=; path=/; max-age=0";
    router.push("/login");
  }

  const stats = [
    { label: "Available Builds", value: unassigned.length },
    { label: "My Active Builds", value: myBuilds.length },
    { label: "Completed This Month", value: completedThisMonth },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d1a2e", display: "flex", flexDirection: "column" }}>
      {/* Gold bar */}
      <div style={{ height: 4, background: "#F5C842", flexShrink: 0 }} />

      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
        <span style={{ color: "#0d1a2e", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>BVM DESIGN CENTER</span>
        <div style={{ display: "flex", gap: 4 }}>
          <Link href="/build-queue" style={{ padding: "6px 16px", borderRadius: 9999, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "#F5C842", color: "#0d1a2e" }}>Build Queue</Link>
          <Link href="/build-queue" style={{ padding: "6px 16px", borderRadius: 9999, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "transparent", color: "#0d1a2e", opacity: 0.6 }}>My Builds</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#0d1a2e", fontWeight: 500 }}>Dev Team</span>
          <button onClick={handleSignOut} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer" }}>Sign Out</button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 700, color: "#fff", margin: 0 }}>Build Queue</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>Available builds — take one to begin</p>
          <p style={{ color: "#F5C842", fontSize: 12, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{today}</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#fff", borderTop: "3px solid #0d1a2e", borderRadius: 12, padding: "20px 24px" }}>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{s.label}</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: "#0d1a2e", margin: "8px 0 0" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Unassigned */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 12 }}>AVAILABLE</h2>
          {unassigned.length === 0 ? (
            <div style={{ background: "#1a2740", borderLeft: "3px solid #f59e0b", borderRadius: 10, padding: "20px 24px", opacity: 0.5 }}>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, fontStyle: "italic" }}>No unassigned builds right now</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unassigned.map((c) => (
                <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#0d1a2e", margin: 0 }}>{c.business_name}</p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>{c.city}, {c.zip}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>Look: {c.selectedLook?.replace(/_/g, " ")}</p>
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      {c.intakeAnswers?.q3?.split(",").map((s) => (
                        <span key={s.trim()} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 9999, background: "#f1f5f9", color: "#64748b" }}>{s.trim()}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, background: "#0d1a2e", color: "#94a3b8", fontWeight: 500 }}>Rep: {c.assigned_rep}</span>
                    <span style={{ fontSize: 12, color: daysSince(c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at) > 2 ? "#f59e0b" : "#64748b" }}>
                      {daysSince(c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at)}d waiting
                    </span>
                    <span className={STAGE_COLORS[c.stage]} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, color: "#fff", fontWeight: 600 }}>{STAGE_LABELS[c.stage]}</span>
                    <button onClick={() => claimBuild(c.id)} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      Take This Build
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Builds */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#3b82f6", textTransform: "uppercase", marginBottom: 12 }}>MY BUILDS</h2>
          {myBuilds.length === 0 ? (
            <div style={{ background: "#1a2740", borderLeft: "3px solid #3b82f6", borderRadius: 10, padding: "20px 24px", opacity: 0.5 }}>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, fontStyle: "italic" }}>No builds claimed yet — take one from above</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myBuilds.map((c) => (
                <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#0d1a2e", margin: 0 }}>{c.business_name}</p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>{c.city}, {c.zip}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>Look: {c.selectedLook?.replace(/_/g, " ")}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {daysSince(c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at)}d in my queue
                    </span>
                    <button onClick={() => downloadBrief(c)} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Download Build Package
                    </button>
                    <button onClick={() => markReady(c.id)} style={{ background: "#0d1a2e", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Mark Ready for QA →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
