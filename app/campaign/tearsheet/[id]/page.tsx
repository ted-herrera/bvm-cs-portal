"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { CampaignClient, CampaignDirection } from "@/lib/campaign";

export default function TearsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<CampaignClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadClient(retries = 3) {
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("campaign_clients").select("*").eq("id", id).single();
        if (data) { setClient(data as CampaignClient); setLoading(false); return; }
      }
    } catch (e) { console.error("Load error:", e); }
    if (retries > 0) { await new Promise(r => setTimeout(r, 1500)); return loadClient(retries - 1); }
    setLoading(false);
  }

  async function handleRegenerate() {
    if (!client) return;
    setRegenerating(true);
    setSelectedDir(null);

    try {
      const res = await fetch("/api/campaign/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: client.business_name,
          category: client.category,
          city: client.city,
          services: client.services,
          adSize: client.ad_size,
          tagline: client.tagline,
          sbrData: client.sbr_data,
        }),
      });
      const data = await res.json();

      if (data.directions) {
        // Update in Supabase
        const { getSupabase } = await import("@/lib/supabase");
        const sb = getSupabase();
        if (sb) {
          await sb.from("campaign_clients").update({ generated_directions: data.directions }).eq("id", id);
        }
        setClient((prev) => prev ? { ...prev, generated_directions: data.directions } : prev);
      }
    } catch (e) {
      console.error("Regenerate error:", e);
    }
    setRegenerating(false);
  }

  async function handleApprove() {
    if (!selectedDir) return;
    setApproving(true);

    try {
      await fetch(`/api/campaign/approve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: selectedDir }),
      });

      // Fire confetti
      const confetti = await import("canvas-confetti");
      confetti.default({ particleCount: 150, spread: 90, colors: ["#F5C842", "#1B2A4A", "#ffffff"] });

      setTimeout(() => router.push(`/campaign/client/${id}`), 1500);
    } catch (e) {
      console.error("Approve error:", e);
      setApproving(false);
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

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <p>Campaign not found.</p>
      </div>
    );
  }

  const sbr = (client.sbr_data || {}) as Record<string, unknown>;
  const directions = (client.generated_directions || []) as CampaignDirection[];
  const allChecked = checks.every(Boolean);

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } } @keyframes goldPulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(245,200,66,0.25); } 50% { box-shadow: 0 0 0 12px rgba(245,200,66,0.05); } }`}</style>

      {/* Hero */}
      <div style={{ padding: "60px 48px 40px", textAlign: "center", borderBottom: "1px solid rgba(245,200,66,0.15)" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, color: "#fff", margin: "0 0 8px", fontWeight: 700 }}>
          {client.business_name}
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", margin: "0 0 4px" }}>{client.city}</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#F5C842", margin: "0 0 32px" }}>
          Your Campaign Direction
        </p>

        {/* SBR Market Intelligence Cards */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", maxWidth: 900, margin: "0 auto" }}>
          {[
            { label: "Your Market", value: `${client.city}${sbr.incomeRing ? `, ${sbr.incomeRing}` : ""}` },
            { label: "Households in Your Area", value: (sbr.households as string) || "Analyzing..." },
            { label: "Opportunity Score", value: sbr.opportunityScore ? `${sbr.opportunityScore}/100` : "Analyzing..." },
            { label: "Top Local Searches", value: Array.isArray(sbr.topCategories) ? (sbr.topCategories as string[]).slice(0, 3).join(", ") : "Analyzing..." },
          ].map((card, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(245,200,66,0.15)",
              borderRadius: 12,
              padding: "16px 24px",
              minWidth: 180,
              flex: "1 1 180px",
              maxWidth: 220,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 15, color: "#F5C842", fontWeight: 700 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Three Directions */}
      <div style={{ padding: "48px 48px 32px" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", textAlign: "center", margin: "0 0 32px" }}>
          Choose Your Direction
        </h2>

        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", maxWidth: 1100, margin: "0 auto" }}>
          {directions.map((dir, i) => {
            const isSelected = selectedDir === dir.name;
            return (
              <div
                key={i}
                style={{
                  background: isSelected ? "rgba(245,200,66,0.08)" : "rgba(255,255,255,0.04)",
                  border: isSelected ? "2px solid #F5C842" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  padding: 0,
                  width: 320,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  animation: `fadeIn 0.5s ease ${i * 0.15}s both`,
                  ...(isSelected ? { boxShadow: "0 0 24px rgba(245,200,66,0.15)" } : {}),
                }}
                onClick={() => setSelectedDir(dir.name)}
              >
                {/* Image */}
                <div style={{ width: "100%", aspectRatio: "1/1", background: "#0d1a2e", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {regenerating ? (
                    <div style={{ width: 36, height: 36, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  ) : dir.imageUrl ? (
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      <img src={dir.imageUrl} alt={dir.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)", padding: "48px 16px 16px" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif" }}>{client.business_name}</div>
                        {client.tagline && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", fontStyle: "italic", marginTop: 4 }}>&ldquo;{client.tagline}&rdquo;</div>}
                        <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                          {[String((client as unknown as Record<string,unknown>).contact_phone || ""), String((client as unknown as Record<string,unknown>).contact_email || ""), String((client as unknown as Record<string,unknown>).contact_address || "")].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1B2A4A, #2d3e50)" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{dir.name}</div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", margin: 0, fontWeight: 700 }}>
                      {dir.name}
                    </h3>
                    {isSelected && (
                      <span style={{ background: "#F5C842", color: "#1B2A4A", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10 }}>
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: 0 }}>
                    {dir.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Download Ad Preview */}
        {selectedDir && (() => {
          const selDir = directions.find((d) => d.name === selectedDir);
          return selDir?.imageUrl ? (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                onClick={async () => {
                  const img = new Image();
                  img.crossOrigin = "anonymous";
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    ctx.drawImage(img, 0, 0);
                    ctx.fillStyle = "rgba(0,0,0,0.5)";
                    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 24px Playfair Display, Georgia, serif";
                    ctx.fillText(client.business_name, 20, canvas.height - 24);
                    ctx.fillStyle = "rgba(245,200,66,0.7)";
                    ctx.font = "bold 16px DM Sans, sans-serif";
                    ctx.fillText("BVM", canvas.width - 50, canvas.height - 24);
                    const link = document.createElement("a");
                    link.download = `${client.business_name.replace(/\s+/g, "_")}_CampaignPreview.png`;
                    link.href = canvas.toDataURL("image/png");
                    link.click();
                  };
                  img.src = selDir.imageUrl;
                }}
                style={{
                  background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8,
                  padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                Download Ad Preview
              </button>
            </div>
          ) : null;
        })()}

        {/* Automagic Button */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              background: "linear-gradient(135deg, #F5C842, #e6b935)",
              color: "#1B2A4A",
              border: "none",
              borderRadius: 12,
              padding: "16px 40px",
              fontSize: 16,
              fontWeight: 800,
              cursor: regenerating ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
              boxShadow: "0 4px 20px rgba(245,200,66,0.3)",
              opacity: regenerating ? 0.6 : 1,
            }}
          >
            {regenerating ? "Regenerating..." : "✨ Automagic — Regenerate Directions"}
          </button>
        </div>
      </div>

      {/* Approval Gate */}
      <div style={{ padding: "32px 48px 64px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: "0 0 20px" }}>
            Confirm & Approve
          </h3>

          {[
            "I confirm my business name is correct",
            "I confirm my primary offer/service is correct",
            "I confirm my city and market area",
            "I'm happy with my selected campaign direction",
          ].map((label, i) => (
            <label
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
                cursor: "pointer",
                fontSize: 14,
                color: checks[i] ? "#F5C842" : "rgba(255,255,255,0.6)",
              }}
            >
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() => setChecks((prev) => { const n = [...prev]; n[i] = !n[i]; return n; })}
                style={{ width: 18, height: 18, accentColor: "#F5C842" }}
              />
              {label}
            </label>
          ))}

          <button
            onClick={handleApprove}
            disabled={!allChecked || !selectedDir || approving}
            style={{
              width: "100%",
              marginTop: 20,
              background: allChecked && selectedDir ? "#F5C842" : "rgba(255,255,255,0.08)",
              color: allChecked && selectedDir ? "#1B2A4A" : "rgba(255,255,255,0.3)",
              border: "none",
              borderRadius: 10,
              padding: "14px 24px",
              fontSize: 15,
              fontWeight: 800,
              cursor: allChecked && selectedDir ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {approving ? "Approving..." : "Approve Campaign Direction →"}
          </button>
        </div>
      </div>
    </div>
  );
}
