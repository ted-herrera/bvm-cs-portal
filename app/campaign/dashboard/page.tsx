"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { CampaignClient, CampaignDirection } from "@/lib/campaign";

const STAGE_COLORS: Record<string, string> = {
  intake: "#3b82f6",
  tearsheet: "#f59e0b",
  approved: "#22c55e",
  production: "#8b5cf6",
  delivered: "#06b6d4",
};

const STAGE_LABELS: Record<string, string> = {
  intake: "Intake",
  tearsheet: "Tearsheet Sent",
  approved: "Approved",
  production: "Production",
  delivered: "Delivered",
};

function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export default function CampaignDashboardPage() {
  const [clients, setClients] = useState<CampaignClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CampaignClient | null>(null);
  const [brunoQuery, setBrunoQuery] = useState("");
  const [brunoResponse, setBrunoResponse] = useState("");
  const [brunoLoading, setBrunoLoading] = useState(false);
  const brunoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("campaign_clients").select("*").order("created_at", { ascending: false });
        if (data) {
          setClients(data as CampaignClient[]);
          if (data.length > 0) setSelected(data[0] as CampaignClient);
        }
      }
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  }

  async function askBruno() {
    if (!brunoQuery.trim()) return;
    setBrunoLoading(true);

    const pipelineSummary = clients.map((c) =>
      `${c.business_name} (${c.city}) — ${STAGE_LABELS[c.stage] || c.stage} — ${daysSince(c.created_at)}d ago — ${c.ad_size}`
    ).join("\n");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Bruno — the BVM campaign VA. You help reps manage their print campaign pipeline. Here is the current pipeline:\n\n${pipelineSummary}\n\nAnswer the rep's question based on this pipeline data. Be concise and actionable.`,
          messages: [{ role: "user", content: brunoQuery }],
          temperature: 0.5,
        }),
      });
      const data = await res.json();
      setBrunoResponse(data.response || "No response");
    } catch {
      setBrunoResponse("Sorry, I couldn't process that right now.");
    }
    setBrunoLoading(false);
  }

  async function updateStage(clientId: string, newStage: string) {
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        await sb.from("campaign_clients").update({ stage: newStage }).eq("id", clientId);
        setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, stage: newStage as CampaignClient["stage"] } : c));
        setSelected((prev) => prev && prev.id === clientId ? { ...prev, stage: newStage as CampaignClient["stage"] } : prev);
      }
    } catch (e) {
      console.error("Stage update error:", e);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const sbr = selected ? (selected.sbr_data || {}) as Record<string, unknown> : {};
  const approvedDir = selected?.generated_directions?.find((d: CampaignDirection) => d.name === selected.selected_direction);

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Top Nav */}
      <nav style={{
        background: "#2d3e50", height: 56, display: "flex", alignItems: "center",
        padding: "0 20px", gap: 16, flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#F5C842", fontWeight: 700 }}>
          Campaign Dashboard
        </span>
        <div style={{ flex: 1 }} />
        <Link href="/campaign/intake" style={{
          background: "#F5C842", color: "#1B2A4A", borderRadius: 6, padding: "8px 16px",
          fontSize: 12, fontWeight: 700, textDecoration: "none",
        }}>
          New Campaign →
        </Link>
        <Link href="/dashboard" style={{
          background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", borderRadius: 6,
          padding: "8px 16px", fontSize: 12, fontWeight: 600, textDecoration: "none",
          border: "1px solid rgba(255,255,255,0.12)",
        }}>
          Web Dashboard
        </Link>
      </nav>

      {/* Body — Two Panel */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT — Client List */}
        <div style={{ width: 380, borderRight: "1px solid rgba(255,255,255,0.08)", overflowY: "auto", padding: "16px 0" }}>
          {clients.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No campaigns yet.</p>
              <Link href="/campaign/intake" style={{ color: "#F5C842", fontSize: 13, fontWeight: 600 }}>
                Start your first campaign →
              </Link>
            </div>
          ) : (
            clients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  padding: "14px 20px",
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: selected?.id === c.id ? "rgba(245,200,66,0.06)" : "transparent",
                  borderLeft: selected?.id === c.id ? "3px solid #F5C842" : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{c.business_name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{c.city}</div>
                  </div>
                  <span style={{
                    background: `${STAGE_COLORS[c.stage] || "#3b82f6"}20`,
                    color: STAGE_COLORS[c.stage] || "#3b82f6",
                    fontSize: 10, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 10,
                    whiteSpace: "nowrap",
                  }}>
                    {STAGE_LABELS[c.stage] || c.stage}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  <span>{c.ad_size}</span>
                  {(sbr.opportunityScore as number) > 0 && (
                    <span>Score: {String(sbr.opportunityScore)}</span>
                  )}
                  <span>{daysSince(c.created_at)}d ago</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT — Selected Detail */}
        <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
          {selected ? (
            <>
              {/* Header */}
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#fff", margin: "0 0 4px" }}>
                  {selected.business_name}
                </h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  {selected.city} · {selected.category} · {selected.ad_size}
                </p>
              </div>

              {/* Brief */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#F5C842", margin: "0 0 12px" }}>Campaign Brief</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 13 }}>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Service: </span><span style={{ color: "#fff" }}>{selected.services}</span></div>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Tagline: </span><span style={{ color: "#fff" }}>{selected.tagline}</span></div>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>ZIP: </span><span style={{ color: "#fff" }}>{selected.zip}</span></div>
                  <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Stage: </span><span style={{ color: STAGE_COLORS[selected.stage] }}>{STAGE_LABELS[selected.stage]}</span></div>
                </div>
              </div>

              {/* Approved direction image */}
              {approvedDir?.imageUrl && (
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#F5C842", margin: "0 0 12px" }}>Approved Direction: {selected.selected_direction}</h3>
                  <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", maxWidth: 400, borderRadius: 8 }} />
                </div>
              )}

              {/* SBR Data */}
              {sbr.opportunityScore && (
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#F5C842", margin: "0 0 12px" }}>Market Intelligence</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#F5C842" }}>{String(sbr.opportunityScore)}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Opp. Score</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{String(sbr.medianIncome || "—")}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Med. Income</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{String(sbr.households || "—")}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Households</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#F5C842", margin: "0 0 12px" }}>Actions</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/tearsheet/${selected.id}`); }}
                    style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Copy Tearsheet Link
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/campaign/client/${selected.id}`); }}
                    style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Copy Portal Link
                  </button>
                  {selected.stage === "approved" && (
                    <button onClick={() => updateStage(selected.id, "production")}
                      style={{ background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      Mark In Production
                    </button>
                  )}
                  {selected.stage === "production" && (
                    <button onClick={() => updateStage(selected.id, "delivered")}
                      style={{ background: "#06b6d4", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>

              {/* Bruno VA */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#F5C842", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 9 }}>B</div>
                  Ask Bruno
                </h3>
                <textarea
                  ref={brunoRef}
                  value={brunoQuery}
                  onChange={(e) => setBrunoQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askBruno(); } }}
                  placeholder="Who needs follow up? What's the pipeline look like?"
                  style={{
                    width: "100%", minHeight: 60, background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12,
                    fontSize: 13, color: "#fff", resize: "vertical", outline: "none", boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={askBruno}
                  disabled={brunoLoading || !brunoQuery.trim()}
                  style={{
                    marginTop: 8, background: "#F5C842", color: "#1B2A4A", border: "none",
                    borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 700,
                    cursor: brunoLoading ? "not-allowed" : "pointer", opacity: brunoLoading ? 0.5 : 1,
                  }}
                >
                  {brunoLoading ? "Thinking..." : "Ask"}
                </button>
                {brunoResponse && (
                  <div style={{
                    marginTop: 12, background: "rgba(255,255,255,0.06)", borderRadius: 8,
                    padding: 16, fontSize: 13, color: "#fff", lineHeight: 1.7, whiteSpace: "pre-wrap",
                  }}>
                    {brunoResponse}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
              Select a campaign to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
