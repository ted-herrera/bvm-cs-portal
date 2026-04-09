"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientProfile } from "@/lib/pipeline";
import { STAGE_LABELS } from "@/lib/pipeline";

const DEV_USERNAME = "dev";

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function hoursSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
}

export default function BuildQueuePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());
  const [selectedBuild, setSelectedBuild] = useState<ClientProfile | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const i = setInterval(() => setClock(new Date()), 1000);
    const poll = setInterval(() => { fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.clients || [])).catch(() => {}); }, 10000);
    return () => { clearInterval(i); clearInterval(poll); };
  }, []);

  const buildingClients = clients.filter((c) => c.stage === "building");
  const unassigned = buildingClients.filter((c) => !c.assignedDev);
  const myBuilds = buildingClients.filter((c) => c.assignedDev === DEV_USERNAME);
  const completedThisMonth = clients.filter((c) => {
    if (!c.delivered_at) return false;
    const d = new Date(c.delivered_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const qaClients = clients.filter((c) => c.qaReport);
  const avgQA = qaClients.length ? Math.round(qaClients.reduce((s, c) => s + (c.qaReport?.score || 0), 0) / qaClients.length) : 0;

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

  async function sendDevMsg() {
    if (!msgInput.trim() || !selectedBuild) return;
    await fetch(`/api/profile/message/${selectedBuild.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msgInput, from: "dev" }),
    });
    const updated = { ...selectedBuild, messages: [...selectedBuild.messages, { from: "dev", text: msgInput, timestamp: new Date().toISOString() }] };
    setSelectedBuild(updated);
    setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    setMsgInput("");
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedBuild?.messages.length]);

  const mono = "'DM Mono', 'Fira Code', 'SF Mono', monospace";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <div style={{ fontFamily: mono, color: "#00d4ff", fontSize: 14 }}>LOADING BUILDS...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", flexDirection: "column", fontFamily: mono }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <nav style={{ background: "#000", borderBottom: "1px solid #00d4ff30", height: 48, display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#00d4ff", fontSize: 14, fontWeight: 500, letterSpacing: "0.12em" }}>BVM BUILD QUEUE</span>
          <span style={{ color: "#00d4ff30", fontSize: 12 }}>|</span>
          <span style={{ color: "#00d4ff80", fontSize: 11 }}>v2.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#00d4ff", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            {clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </span>
          <span style={{ color: "#00d4ff40" }}>|</span>
          <span style={{ color: "#00d4ff80", fontSize: 11 }}>
            {clock.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <span style={{ color: "#00d4ff40" }}>|</span>
          <span style={{ background: "#00d4ff15", border: "1px solid #00d4ff40", borderRadius: 4, padding: "2px 10px", fontSize: 11, color: "#00d4ff" }}>DEV: {DEV_USERNAME}</span>
          <button onClick={handleSignOut} style={{ background: "none", border: "1px solid #ff3b3b40", borderRadius: 4, padding: "2px 10px", fontSize: 11, color: "#ff3b3b", cursor: "pointer", fontFamily: mono }}>LOGOUT</button>
        </div>
      </nav>

      {/* ── THREE COLUMNS ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT: Unassigned Builds ─────────────────────────────────── */}
        <div style={{ flex: 1, borderRight: "1px solid #00d4ff15", overflowY: "auto", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ color: "#00d4ff", fontSize: 11, letterSpacing: "0.12em", fontWeight: 500 }}>UNASSIGNED BUILDS</span>
            <span style={{ color: "#00d4ff60", fontSize: 11 }}>{unassigned.length}</span>
          </div>

          {unassigned.length === 0 ? (
            <div style={{ border: "1px dashed #00d4ff30", borderRadius: 8, padding: 24, textAlign: "center" }}>
              <p style={{ color: "#00d4ff40", fontSize: 12, margin: 0 }}>NO BUILDS AVAILABLE</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {unassigned.map((c) => {
                const days = daysSince(c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at);
                const urgent = !!c.interests?.featured_placement;
                return (
                  <div key={c.id} onClick={() => setSelectedBuild(c)} style={{
                    background: "#000", border: `1px solid ${urgent ? "#ff3b3b" : "#00d4ff40"}`,
                    borderRadius: 8, padding: "16px 18px", cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}>
                    {urgent && (
                      <div style={{ background: "#ff3b3b", color: "#000", fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 3, display: "inline-block", marginBottom: 8 }}>URGENT — FEATURED PLACEMENT</div>
                    )}
                    <p style={{ fontSize: 16, fontWeight: 500, color: "#fff", margin: "0 0 4px" }}>{c.business_name}</p>
                    <p style={{ fontSize: 11, color: "#00d4ff80", margin: "0 0 8px" }}>{c.city}, {c.zip}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: "#00d4ff10", border: "1px solid #00d4ff30", color: "#00d4ff" }}>{c.selectedLook?.replace(/_/g, " ") || "—"}</span>
                      {c.intakeAnswers?.q3?.split(",").map((s) => (
                        <span key={s.trim()} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: "#00d4ff08", border: "1px solid #00d4ff20", color: "#00d4ff80" }}>{s.trim()}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: days > 3 ? "#ff3b3b" : days > 1 ? "#f59e0b" : "#00d4ff60" }}>{days}d waiting</span>
                      {c.qaReport && <span style={{ fontSize: 10, color: "#00d4ff60" }}>QA: {c.qaReport.score}</span>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); claimBuild(c.id); }} style={{
                      width: "100%", marginTop: 12, background: "transparent", border: "1px solid #00d4ff",
                      color: "#00d4ff", padding: "8px 0", borderRadius: 6, fontSize: 12, fontWeight: 500,
                      cursor: "pointer", fontFamily: mono, letterSpacing: "0.06em",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#00d4ff"; e.currentTarget.style.color = "#000"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#00d4ff"; }}
                    >
                      CLAIM BUILD →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CENTER: My Builds ───────────────────────────────────────── */}
        <div style={{ flex: 1, borderRight: "1px solid #00d4ff15", overflowY: "auto", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ color: "#f59e0b", fontSize: 11, letterSpacing: "0.12em", fontWeight: 500 }}>MY BUILDS</span>
            <span style={{ color: "#f59e0b60", fontSize: 11 }}>{myBuilds.length}</span>
          </div>

          {myBuilds.length === 0 ? (
            <div style={{ border: "1px dashed #f59e0b30", borderRadius: 8, padding: 24, textAlign: "center" }}>
              <p style={{ color: "#f59e0b40", fontSize: 12, margin: 0 }}>NO ACTIVE BUILDS — CLAIM ONE</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {myBuilds.map((c) => {
                const hrs = hoursSince(c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at);
                return (
                  <div key={c.id} onClick={() => setSelectedBuild(c)} style={{
                    background: "#000", border: "1px solid #f59e0b40",
                    borderRadius: 8, padding: "16px 18px", cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <p style={{ fontSize: 16, fontWeight: 500, color: "#fff", margin: 0 }}>{c.business_name}</p>
                      <span style={{ fontSize: 10, color: "#f59e0b", background: "#f59e0b15", border: "1px solid #f59e0b30", borderRadius: 3, padding: "2px 8px" }}>IN PROGRESS</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#00d4ff80", margin: "0 0 8px" }}>{c.city} · {c.selectedLook?.replace(/_/g, " ") || "—"}</p>
                    <p style={{ fontSize: 11, color: "#f59e0b80", margin: "0 0 12px" }}>{hrs}h since claimed</p>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); downloadBrief(c); }} style={{
                        flex: 1, background: "transparent", border: "1px solid #f59e0b",
                        color: "#f59e0b", padding: "7px 0", borderRadius: 6, fontSize: 11, fontWeight: 500,
                        cursor: "pointer", fontFamily: mono, letterSpacing: "0.04em",
                      }}>
                        DOWNLOAD DEV PACK
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); markReady(c.id); }} style={{
                        flex: 1, background: "transparent", border: "1px solid #00d4ff",
                        color: "#00d4ff", padding: "7px 0", borderRadius: 6, fontSize: 11, fontWeight: 500,
                        cursor: "pointer", fontFamily: mono, letterSpacing: "0.04em",
                      }}>
                        MARK READY FOR QA →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Communications ───────────────────────────────────── */}
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #00d4ff15" }}>
            <span style={{ color: "#fff", fontSize: 11, letterSpacing: "0.12em", fontWeight: 500 }}>COMMUNICATIONS</span>
            {selectedBuild && (
              <p style={{ fontSize: 11, color: "#00d4ff80", margin: "4px 0 0" }}>VIEWING: {selectedBuild.business_name}</p>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {!selectedBuild ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <p style={{ color: "#00d4ff30", fontSize: 12 }}>SELECT A BUILD TO VIEW THREAD</p>
              </div>
            ) : (
              <>
                {selectedBuild.messages.length === 0 && (
                  <p style={{ color: "#00d4ff30", fontSize: 12, textAlign: "center", padding: "20px 0" }}>NO MESSAGES YET</p>
                )}
                {selectedBuild.messages.map((m, i) => {
                  const isRep = m.from === "rep";
                  const isDev = m.from === "dev";
                  const badgeColor = isRep ? "#f59e0b" : isDev ? "#00d4ff" : "#22c55e";
                  const badgeLabel = isRep ? "REP" : isDev ? "DEV" : "CLIENT";
                  return (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", color: "#000", background: badgeColor, padding: "1px 6px", borderRadius: 3 }}>{badgeLabel}</span>
                        <span style={{ fontSize: 10, color: "#00d4ff40" }}>{new Date(m.timestamp).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#fff", margin: 0, lineHeight: 1.6 }}>{m.text}</p>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {selectedBuild && (
            <div style={{ padding: "10px 14px", borderTop: "1px solid #00d4ff15", display: "flex", gap: 8 }}>
              <input
                type="text" value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendDevMsg()}
                placeholder="Message..."
                style={{ flex: 1, background: "#000", border: "1px solid #00d4ff30", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "#fff", outline: "none", fontFamily: mono, caretColor: "#00d4ff" }}
              />
              <button onClick={sendDevMsg} disabled={!msgInput.trim()} style={{
                background: "#00d4ff", color: "#000", border: "none", borderRadius: 6,
                padding: "7px 14px", fontSize: 11, fontWeight: 500, cursor: "pointer",
                fontFamily: mono, opacity: msgInput.trim() ? 1 : 0.3,
              }}>SEND</button>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid #00d4ff20", padding: "10px 24px", display: "flex", gap: 32, justifyContent: "center", flexShrink: 0 }}>
        {[
          { label: "TOTAL BUILDS", value: buildingClients.length },
          { label: "UNASSIGNED", value: unassigned.length },
          { label: "MY ACTIVE", value: myBuilds.length },
          { label: "COMPLETED/MO", value: completedThisMonth },
          { label: "AVG QA", value: `${avgQA}%` },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#00d4ff" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "#00d4ff50", letterSpacing: "0.1em", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
