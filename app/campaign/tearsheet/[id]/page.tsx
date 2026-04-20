"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { CampaignClient } from "@/lib/campaign";
import { createClient } from "@supabase/supabase-js";
import confetti from "canvas-confetti";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchCampaignWithRetry(id: string, attempts = 3, delay = 1500): Promise<CampaignClient | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase
      .from("campaign_clients")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) return data as CampaignClient;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

export default function TearsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<CampaignClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDir, setSelectedDir] = useState<number>(0);
  const [generating, setGenerating] = useState(false);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchCampaignWithRetry(id).then((c) => {
      setClient(c);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#C8A951", fontSize: 18 }}>Loading tearsheet...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontSize: 48, color: "#C8A951", fontFamily: "Playfair Display, Georgia, serif" }}>Campaign Coming Soon</div>
        <div style={{ color: "#ffffffaa", fontSize: 16 }}>This campaign is being prepared. Check back shortly.</div>
      </div>
    );
  }

  const directions = client.generated_directions || [];
  const sbr = client.sbr_data || {};

  const contactPhone = (client as unknown as Record<string, unknown>).contact_phone as string | undefined;
  const contactEmail = (client as unknown as Record<string, unknown>).contact_email as string | undefined;
  const contactAddress = (client as unknown as Record<string, unknown>).contact_address as string | undefined;

  function buildContact(): string {
    return [contactPhone, contactEmail, contactAddress].filter(Boolean).join(" \u00B7 ");
  }

  async function handleAutomagic() {
    setGenerating(true);
    try {
      const res = await fetch("/api/campaign/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: client!.business_name,
          category: client!.category,
          city: client!.city,
          services: client!.services,
          adSize: client!.ad_size,
          tagline: client!.tagline,
          sbrData: client!.sbr_data,
        }),
      });
      const data = await res.json();
      if (data.directions) {
        setClient((prev) => prev ? { ...prev, generated_directions: data.directions } : prev);
        setSelectedDir(0);
      }
    } catch { /* silent */ }
    setGenerating(false);
  }

  async function handleApprove() {
    if (!checks.every(Boolean)) return;
    const dir = directions[selectedDir];
    if (!dir) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/campaign/approve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: dir.name }),
      });
      if (res.ok) {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        setTimeout(() => router.push(`/campaign/client/${id}`), 2000);
      }
    } catch { /* silent */ }
    setApproving(false);
  }

  const toggleCheck = (i: number) => setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const checkLabels = [
    "I approve the selected creative direction",
    "The business name and contact info are correct",
    "The tagline represents my brand accurately",
    "I understand production will begin after approval",
  ];

  const sbrCards: { label: string; key: string; fallback: string }[] = [
    { label: "Opportunity Score", key: "opportunity_score", fallback: "N/A" },
    { label: "Households", key: "households", fallback: "--" },
    { label: "Avg Income", key: "median_income", fallback: "--" },
    { label: "Top Categories", key: "top_categories", fallback: "--" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 24px 24px" }}>
        <h1 style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 36, color: "#C8A951", margin: 0 }}>
          {client.business_name}
        </h1>
        <div style={{ color: "#ffffffcc", fontSize: 16, marginTop: 4 }}>{client.city}</div>
        <div style={{ color: "#ffffffaa", fontSize: 14, marginTop: 8, letterSpacing: 2, textTransform: "uppercase" }}>
          Your Campaign Direction
        </div>
      </div>

      {/* SBR Cards */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", padding: "0 24px 32px" }}>
        {sbrCards.map((card) => (
          <div key={card.key} style={{ background: "#223556", borderRadius: 12, padding: "16px 24px", minWidth: 140, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#C8A951", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {String((sbr as Record<string, unknown>)[card.key] ?? card.fallback)}
            </div>
          </div>
        ))}
      </div>

      {/* Direction Cards */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", padding: "0 24px 24px" }}>
        {directions.map((dir, i) => (
          <div
            key={i}
            onClick={() => setSelectedDir(i)}
            style={{
              width: 320,
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
              cursor: "pointer",
              border: selectedDir === i ? "3px solid #C8A951" : "3px solid transparent",
              transition: "border 0.2s",
            }}
          >
            {dir.imageUrl ? (
              <img
                src={dir.imageUrl}
                alt={dir.name}
                style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{
                width: "100%",
                aspectRatio: "1/1",
                background: "linear-gradient(135deg, #1B2A4A 0%, #C8A951 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
              }}>
                {dir.name}
              </div>
            )}
            {/* Overlay */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
              padding: "48px 16px 16px",
            }}>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "Georgia, serif" }}>
                {client.business_name}
              </div>
              {client.tagline && (
                <div style={{ color: "#fff", fontSize: 13, fontStyle: "italic", marginTop: 4 }}>
                  {client.tagline}
                </div>
              )}
              {buildContact() && (
                <div style={{ color: "#fff", fontSize: 11, marginTop: 6 }}>{buildContact()}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Direction name + description below */}
      {directions.length > 0 && (
        <div style={{ textAlign: "center", padding: "0 24px 24px", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#C8A951" }}>{directions[selectedDir]?.name}</div>
          <div style={{ fontSize: 14, color: "#ffffffaa", marginTop: 8 }}>{directions[selectedDir]?.description}</div>
        </div>
      )}

      {/* Automagic Button */}
      <div style={{ textAlign: "center", padding: "16px 24px 32px" }}>
        <button
          onClick={handleAutomagic}
          disabled={generating}
          style={{
            background: "#C8A951",
            color: "#1B2A4A",
            border: "none",
            borderRadius: 8,
            padding: "14px 32px",
            fontSize: 16,
            fontWeight: 700,
            cursor: generating ? "wait" : "pointer",
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? "Generating..." : "Automagic \u2728"}
        </button>
      </div>

      {/* Approval Gate */}
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 24px 64px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#C8A951", marginBottom: 16 }}>Approval Gate</div>
        {checkLabels.map((label, i) => (
          <label
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer", fontSize: 14, color: "#ffffffcc" }}
          >
            <input
              type="checkbox"
              checked={checks[i]}
              onChange={() => toggleCheck(i)}
              style={{ accentColor: "#C8A951", width: 18, height: 18 }}
            />
            {label}
          </label>
        ))}
        <button
          onClick={handleApprove}
          disabled={!checks.every(Boolean) || approving}
          style={{
            marginTop: 16,
            width: "100%",
            background: checks.every(Boolean) ? "#C8A951" : "#555",
            color: checks.every(Boolean) ? "#1B2A4A" : "#999",
            border: "none",
            borderRadius: 8,
            padding: "14px",
            fontSize: 16,
            fontWeight: 700,
            cursor: checks.every(Boolean) ? "pointer" : "not-allowed",
          }}
        >
          {approving ? "Approving..." : "Approve Campaign"}
        </button>
      </div>
    </div>
  );
}
