"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { CampaignClient, CampaignDirection } from "@/lib/campaign";

const STAGES = ["approved", "production", "review", "delivered"] as const;
const STAGE_LABELS: Record<string, string> = {
  approved: "Campaign Approved",
  production: "In Production",
  review: "Review",
  delivered: "Delivered",
};

function stageIndex(stage: string): number {
  const idx = STAGES.indexOf(stage as typeof STAGES[number]);
  return idx >= 0 ? idx : 0;
}

function scoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export default function CampaignClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<CampaignClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionSending, setRevisionSending] = useState(false);
  const [revisionSent, setRevisionSent] = useState(false);

  useEffect(() => {
    loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadClient() {
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("campaign_clients").select("*").eq("id", id).single();
        if (data) setClient(data as CampaignClient);
      }
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  }

  async function submitRevision() {
    if (!revisionNote.trim()) return;
    setRevisionSending(true);
    try {
      await fetch(`/api/campaign/revision/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: revisionNote }),
      });
      setRevisionSent(true);
      setRevisionNote("");
      setTimeout(() => setRevisionSent(false), 3000);
    } catch (e) {
      console.error("Revision error:", e);
    }
    setRevisionSending(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <p>Campaign not found.</p>
      </div>
    );
  }

  // STATE 1 — Before approval
  if (client.stage === "intake" || client.stage === "tearsheet") {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, padding: 32 }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 40, filter: "brightness(0) invert(1)", marginBottom: 16 }} />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#fff", margin: 0, textAlign: "center" }}>
          {client.business_name}
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", margin: 0 }}>
          Your campaign direction is ready.
        </p>
        <Link
          href={`/campaign/tearsheet/${id}`}
          style={{
            background: "#F5C842",
            color: "#1B2A4A",
            borderRadius: 10,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 800,
            textDecoration: "none",
            marginTop: 8,
          }}
        >
          Review Your Campaign →
        </Link>

        {/* Progress Step 1 of 4 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32 }}>
          {[1, 2, 3, 4].map((step) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: step === 1 ? "#F5C842" : "rgba(255,255,255,0.1)",
                color: step === 1 ? "#1B2A4A" : "rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
              }}>{step}</div>
              {step < 4 && <div style={{ width: 40, height: 2, background: "rgba(255,255,255,0.1)" }} />}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>Step 1 of 4</p>
      </div>
    );
  }

  // STATE 2 — After approval
  const sbr = (client.sbr_data || {}) as Record<string, unknown>;
  const currentStage = stageIndex(client.stage);
  const approvedDir = (client.generated_directions || []).find(
    (d: CampaignDirection) => d.name === client.selected_direction
  );
  const oppScore = (sbr.opportunityScore as number) || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes goldPulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(245,200,66,0.25); } 50% { box-shadow: 0 0 0 12px rgba(245,200,66,0.05); } }`}</style>

      {/* Top bar */}
      <div style={{ height: 56, background: "#2d3e50", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{client.business_name}</span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Progress Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 48 }}>
          {STAGES.map((stage, i) => (
            <div key={stage} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: i <= currentStage ? "#F5C842" : "rgba(255,255,255,0.1)",
                  color: i <= currentStage ? "#1B2A4A" : "rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800,
                  ...(i === currentStage ? { animation: "goldPulse 2s ease infinite" } : {}),
                }}>
                  {i < currentStage ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 10, color: i <= currentStage ? "#F5C842" : "rgba(255,255,255,0.3)", marginTop: 6, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {STAGE_LABELS[stage]}
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ width: 80, height: 2, background: i < currentStage ? "#F5C842" : "rgba(255,255,255,0.1)", margin: "0 8px", marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>

        {/* SECTION 1 — Market Intelligence */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: "0 0 20px" }}>
            Your Market Intelligence
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(oppScore) }}>{oppScore || "—"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 4 }}>Opportunity Score</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#F5C842" }}>{(sbr.medianIncome as string) || "—"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 4 }}>Median Household Income</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#F5C842" }}>{(sbr.households as string) || "—"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 4 }}>Your Circulation Area</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F5C842", lineHeight: 1.5 }}>
                {Array.isArray(sbr.topCategories) ? (sbr.topCategories as string[]).slice(0, 3).join(", ") : "—"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 4 }}>Top Business Categories</div>
            </div>
          </div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", margin: "16px 0 0", textAlign: "center" }}>
            Powered by Bruno Territory Intelligence
          </p>
        </div>

        {/* SECTION 2 — Your Campaign */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: "0 0 20px" }}>
            Your Campaign
          </h2>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            {approvedDir?.imageUrl ? (
              <div style={{ width: 280, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", display: "block" }} />
              </div>
            ) : (
              <div style={{ width: 280, height: 280, background: "rgba(255,255,255,0.04)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)" }}>
                No image
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
                {client.ad_size?.toUpperCase() || "AD"}
              </span>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: "12px 0 8px" }}>
                {client.selected_direction || "Campaign Direction"}
              </h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 16px" }}>
                {approvedDir?.description || ""}
              </p>
              <p style={{ fontSize: 13, color: client.stage === "production" ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>
                {client.stage === "production" ? "Your campaign is in production" : client.stage === "delivered" ? "Campaign delivered!" : "Campaign approved"}
              </p>
              {approvedDir?.imageUrl && (
                <a
                  href={approvedDir.imageUrl}
                  download={`${client.business_name}-campaign.png`}
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Download Preview
                </a>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3 — Request a Change */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: "0 0 16px" }}>
            ✏️ Request a Change
          </h2>
          <textarea
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="Describe what you'd like changed..."
            style={{
              width: "100%",
              minHeight: 100,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 14,
              fontSize: 14,
              color: "#fff",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={submitRevision}
            disabled={!revisionNote.trim() || revisionSending}
            style={{
              marginTop: 12,
              background: revisionNote.trim() ? "#F5C842" : "rgba(255,255,255,0.08)",
              color: revisionNote.trim() ? "#1B2A4A" : "rgba(255,255,255,0.3)",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: revisionNote.trim() ? "pointer" : "not-allowed",
            }}
          >
            {revisionSending ? "Sending..." : "Submit Change Request"}
          </button>
          {revisionSent && (
            <p style={{ fontSize: 13, color: "#22c55e", margin: "8px 0 0" }}>
              ✓ Change request submitted — your rep will be in touch.
            </p>
          )}
        </div>

        {/* SECTION 4 — Your Rep */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: "0 0 16px" }}>
            Your Rep
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 16 }}>
              TH
            </div>
            <div>
              <div style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>Ted Herrera</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Your BVM Account Executive</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 16, lineHeight: 1.6 }}>
            Have questions about your campaign? Your rep is here to help with any adjustments, upgrades, or strategy changes.
          </p>
        </div>
      </div>
    </div>
  );
}
