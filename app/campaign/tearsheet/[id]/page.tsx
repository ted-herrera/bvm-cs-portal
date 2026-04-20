"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CampaignClient } from "@/lib/campaign";
import { createClient } from "@supabase/supabase-js";
import confetti from "canvas-confetti";
import {
  renderPrintAd,
  getSizeSpec,
  normalizeSize,
  SIZE_LABELS,
  SIZE_DESCRIPTIONS,
  VARIATION_LABELS,
  VARIATION_DESCRIPTIONS,
  type PrintAdData,
  type PrintVariation,
  type PrintSize,
} from "@/lib/print-engine";

const NAVY = "#0C2340";
const NAVY_MID = "#1a2f50";
const GOLD = "#D4A843";
const GOLD_LIGHT = "#f5e6c4";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const TEXT2 = "#475569";

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
    const { data, error } = await supabase.from("campaign_clients").select("*").eq("id", id).single();
    if (!error && data) return data as CampaignClient;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

const VARIATIONS: PrintVariation[] = ["clean_classic", "bold_modern", "premium_editorial"];

const DEFAULT_PHOTOS: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200",
  healthcare: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200",
  legal: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200",
  home: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200",
  fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200",
  automotive: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200",
  default: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200",
};

function categoryPhoto(cat: string | null | undefined, fallback?: string): string {
  if (fallback) return fallback;
  const k = (cat || "").toLowerCase();
  if (k.includes("restaurant") || k.includes("food")) return DEFAULT_PHOTOS.restaurant;
  if (k.includes("dent") || k.includes("health") || k.includes("medical")) return DEFAULT_PHOTOS.healthcare;
  if (k.includes("legal") || k.includes("law")) return DEFAULT_PHOTOS.legal;
  if (k.includes("roof") || k.includes("home") || k.includes("construction")) return DEFAULT_PHOTOS.home;
  if (k.includes("fitness") || k.includes("yoga") || k.includes("gym")) return DEFAULT_PHOTOS.fitness;
  if (k.includes("auto")) return DEFAULT_PHOTOS.automotive;
  return DEFAULT_PHOTOS.default;
}

function brandFromCategory(cat: string | null | undefined): { primary: string; secondary: string; accent: string } {
  const k = (cat || "").toLowerCase();
  if (k.includes("restaurant") || k.includes("food")) return { primary: "#c0392b", secondary: "#f39c12", accent: "#2c3e50" };
  if (k.includes("dent") || k.includes("health")) return { primary: "#2980b9", secondary: "#ecf0f1", accent: "#1abc9c" };
  if (k.includes("roof") || k.includes("home")) return { primary: "#2c3e50", secondary: "#e74c3c", accent: "#f1c40f" };
  if (k.includes("fitness") || k.includes("yoga")) return { primary: "#16a34a", secondary: "#fbbf24", accent: "#0C2340" };
  return { primary: NAVY, secondary: TEXT2, accent: GOLD };
}

export default function TearsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<CampaignClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVar, setSelectedVar] = useState<PrintVariation>("clean_classic");
  const [subVariation, setSubVariation] = useState<number>(0);
  const [cycling, setCycling] = useState(false);
  const [showBleed, setShowBleed] = useState(false);
  const [showRealSize, setShowRealSize] = useState(false);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [note, setNote] = useState("");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [webInterest, setWebInterest] = useState(false);

  useEffect(() => {
    fetchCampaignWithRetry(id).then((c) => {
      setClient(c);
      setLoading(false);
      if (c?.stage === "approved" || c?.stage === "production" || c?.stage === "delivered") {
        setApproved(true);
      }
    });
  }, [id]);

  const adData = useMemo<PrintAdData | null>(() => {
    if (!client) return null;
    const services = (client.services || "")
      .split(/[,;·•]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    const size = normalizeSize(client.ad_size);
    const photo = categoryPhoto(client.category);
    return {
      businessName: client.business_name,
      tagline: client.tagline || "",
      city: client.city || "",
      services: services.length ? services : [client.category || "Our Services"],
      cta: extractCTA(client.tagline) || "Visit Us Today",
      phone: client.contact_phone || "",
      website: client.contact_email ? undefined : undefined,
      photoUrl: photo,
      brandColors: brandFromCategory(client.category),
      size,
      variation: selectedVar,
      subVariation,
    };
  }, [client, selectedVar, subVariation]);

  const sizeSpec = useMemo(() => (adData ? getSizeSpec(adData.size) : null), [adData]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: GOLD, fontSize: 18 }}>Loading tearsheet...</div>
      </div>
    );
  }

  if (!client || !adData || !sizeSpec) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#fff" }}>
        <div style={{ fontSize: 48, color: GOLD, fontFamily: "Playfair Display, Georgia, serif" }}>Campaign Coming Soon</div>
        <div style={{ color: "#ffffffaa", fontSize: 16 }}>This campaign is being prepared. Check back shortly.</div>
      </div>
    );
  }

  function handleAutomagic() {
    if (!client) return;
    setCycling(true);
    setSubVariation((prev) => (prev + 1) % 4);
    setTimeout(() => setCycling(false), 600);
  }

  async function handleApprove() {
    if (!checks.every(Boolean)) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/campaign/approve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: VARIATION_LABELS[selectedVar] }),
      });
      if (res.ok) {
        setApproved(true);
        if (client?.ad_size && normalizeSize(client.ad_size) === "cover") {
          confetti({ particleCount: 250, spread: 100, origin: { y: 0.6 } });
        } else {
          confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
        }
        if (note.trim()) {
          fetch(`/api/campaign/revision/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "approval_note", note: note.trim() }),
          }).catch(() => {});
        }
        setTimeout(() => router.push(`/campaign/client/${id}`), 3000);
      }
    } catch { /* silent */ }
    setApproving(false);
  }

  async function logWebInterest() {
    setWebInterest(true);
    try {
      await fetch(`/api/campaign/upsell/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: id, product: "web_campaign", notes: "Interested in Web + Print from tearsheet" }),
      });
    } catch { /* silent */ }
  }

  const toggleCheck = (i: number) => setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const allChecked = checks.every(Boolean);

  const checkLabels = [
    "Business name and contact info are correct",
    "Services and CTA represent my business accurately",
    "I approve this design direction for my print campaign",
    "I understand my rep will finalize the artwork",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf7", color: TEXT, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Gold top bar */}
      <div style={{ height: 4, background: GOLD }} />

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "56px 24px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD, fontWeight: 700, marginBottom: 14 }}>
          Your Campaign Direction
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 56, color: NAVY, margin: 0, lineHeight: 1, fontWeight: 700 }}>
          {client.business_name}
        </h1>
        {client.tagline && (
          <p style={{ fontSize: 18, color: TEXT2, marginTop: 14, fontStyle: "italic" }}>{client.tagline}</p>
        )}
        <div style={{ color: TEXT2, fontSize: 14, marginTop: 12 }}>
          {client.city}{sizeSpec ? ` · ${sizeSpec.label} · ${sizeSpec.trimInches.w}" × ${sizeSpec.trimInches.h}"` : ""}
        </div>
      </div>

      {/* Variations row */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", gap: 32, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
          {VARIATIONS.map((v) => {
            const isSelected = selectedVar === v;
            const previewData: PrintAdData = { ...adData, variation: v, subVariation: isSelected ? subVariation : 0 };
            const spec = getSizeSpec(previewData.size);
            const targetW = 280;
            const scale = targetW / spec.trimPx150.w;
            const frameH = Math.round(spec.trimPx150.h * scale);
            return (
              <div
                key={v}
                onClick={() => { setSelectedVar(v); setSubVariation(0); }}
                style={{
                  cursor: "pointer",
                  transform: isSelected ? "scale(1.04)" : "scale(1)",
                  transition: "transform 0.28s ease",
                  width: targetW + 24,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: 10,
                    border: isSelected ? `3px solid ${GOLD}` : `1px solid ${BORDER}`,
                    boxShadow: isSelected ? "0 20px 40px -16px rgba(212,168,67,0.45)" : "0 4px 12px rgba(15,23,42,0.06)",
                    opacity: isSelected ? 1 : 0.78,
                    transition: "all 0.28s ease",
                  }}
                >
                  <div style={{ width: targetW, height: frameH, overflow: "hidden", background: "#fafaf7", borderRadius: 6, position: "relative" }}>
                    <div
                      style={{
                        width: spec.trimPx150.w,
                        height: spec.trimPx150.h,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        transition: cycling && isSelected ? "opacity 0.2s" : undefined,
                        opacity: cycling && isSelected ? 0.6 : 1,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderPrintAd(previewData, { dpi: 150, showBleed: false }),
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: isSelected ? GOLD : TEXT2, fontWeight: 700 }}>
                    Variation {VARIATIONS.indexOf(v) + 1}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginTop: 4 }}>
                    {VARIATION_LABELS[v]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", color: TEXT2, fontSize: 13, marginTop: 24, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          {VARIATION_DESCRIPTIONS[selectedVar]}
        </p>

        {/* Automagic */}
        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <button
            onClick={handleAutomagic}
            disabled={cycling}
            style={{
              background: GOLD,
              color: NAVY,
              border: "none",
              borderRadius: 999,
              padding: "16px 32px",
              fontSize: 16,
              fontWeight: 700,
              cursor: cycling ? "wait" : "pointer",
              boxShadow: "0 10px 24px -8px rgba(212,168,67,0.6)",
              letterSpacing: "0.02em",
            }}
          >
            ⚡ Automagic
          </button>
          <div style={{ fontSize: 12, color: TEXT2, marginTop: 10 }}>
            Style {(subVariation % 4) + 1} of 4 — click to cycle through color & layout variations
          </div>
        </div>

        {/* Size indicator + bleed toggle */}
        <div style={{
          marginTop: 32,
          padding: 20,
          background: "#fff",
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: GOLD, fontWeight: 700 }}>Print Size</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginTop: 4 }}>
              {sizeSpec.label} — {sizeSpec.trimInches.w}&rdquo; × {sizeSpec.trimInches.h}&rdquo;
            </div>
            <div style={{ fontSize: 12, color: TEXT2 }}>
              With bleed: {sizeSpec.bleedInches.w}&rdquo; × {sizeSpec.bleedInches.h}&rdquo; · {SIZE_DESCRIPTIONS[adData.size]}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT2, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showBleed}
                onChange={(e) => setShowBleed(e.target.checked)}
                style={{ accentColor: GOLD, width: 16, height: 16 }}
              />
              Show bleed
            </label>
            <button
              onClick={() => setShowRealSize(true)}
              style={{
                background: NAVY,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              View Actual Size →
            </button>
          </div>
        </div>

        {/* Large preview of selected */}
        <div style={{ marginTop: 24, background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: Math.min(sizeSpec.bleedPx150.w, 720),
              height: (Math.min(sizeSpec.bleedPx150.w, 720) / sizeSpec.bleedPx150.w) * sizeSpec.bleedPx150.h,
              overflow: "hidden",
              position: "relative",
            }}>
              <div
                style={{
                  width: sizeSpec.bleedPx150.w,
                  height: sizeSpec.bleedPx150.h,
                  transform: `scale(${Math.min(sizeSpec.bleedPx150.w, 720) / sizeSpec.bleedPx150.w})`,
                  transformOrigin: "top left",
                }}
                dangerouslySetInnerHTML={{
                  __html: renderPrintAd(adData, { dpi: 150, showBleed, showSafeZone: showBleed, showTrimMarks: showBleed }),
                }}
              />
            </div>
          </div>
        </div>

        {/* Approval gate or approved state */}
        {!approved ? (
          <div style={{ marginTop: 40, maxWidth: 620, margin: "40px auto 0", padding: 28, background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: GOLD, fontWeight: 700, marginBottom: 14 }}>
              Approve Your Direction
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {checkLabels.map((label, i) => (
                <label key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: TEXT, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() => toggleCheck(i)}
                    style={{ accentColor: GOLD, width: 18, height: 18 }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: TEXT2, marginBottom: 6 }}>Leave a note for your rep (optional)</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything your rep should know before production..."
                style={{
                  width: "100%",
                  minHeight: 72,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  color: TEXT,
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={handleApprove}
              disabled={!allChecked || approving}
              style={{
                width: "100%",
                background: allChecked ? GOLD : "#e2e8f0",
                color: allChecked ? NAVY : "#94a3b8",
                border: "none",
                borderRadius: 10,
                padding: 14,
                fontSize: 15,
                fontWeight: 700,
                cursor: allChecked ? "pointer" : "not-allowed",
              }}
            >
              {approving ? "Approving..." : `Approve ${VARIATION_LABELS[selectedVar]} →`}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 40, textAlign: "center", padding: 32, background: GOLD_LIGHT, borderRadius: 16, maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
            <div style={{ fontSize: 44, fontFamily: "'Playfair Display', Georgia, serif", color: NAVY, margin: 0 }}>
              Campaign Direction Approved ✓
            </div>
            <p style={{ color: NAVY_MID, marginTop: 10 }}>Redirecting to your campaign portal...</p>
          </div>
        )}

        {/* Reveal panels */}
        <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {/* Print-only panel */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: NAVY, fontWeight: 700 }}>
              Your Print Campaign
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: NAVY, margin: "8px 0 12px" }}>
              Your print ad is locked in
            </h3>
            <div style={{
              width: "100%",
              aspectRatio: `${sizeSpec.trimInches.w} / ${sizeSpec.trimInches.h}`,
              overflow: "hidden",
              background: "#f8f7f2",
              borderRadius: 8,
              position: "relative",
              marginBottom: 14,
            }}>
              <div
                style={{
                  width: sizeSpec.trimPx150.w,
                  height: sizeSpec.trimPx150.h,
                  transformOrigin: "top left",
                }}
                ref={(el) => {
                  if (el && el.parentElement) {
                    const pw = el.parentElement.clientWidth;
                    el.style.transform = `scale(${pw / sizeSpec.trimPx150.w})`;
                  }
                }}
                dangerouslySetInnerHTML={{ __html: renderPrintAd(adData, { dpi: 150 }) }}
              />
            </div>
            <div style={{ fontSize: 12, color: TEXT2 }}>
              Status: {approved ? "Production begins now" : "Pending approval"}
            </div>
          </div>

          {/* Web + Print upsell */}
          <div style={{
            background: "linear-gradient(135deg, #0C2340 0%, #1a2f50 100%)",
            borderRadius: 16,
            padding: 24,
            border: `2px solid ${GOLD}`,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 800, textTransform: "uppercase", background: GOLD, color: NAVY, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.12em" }}>
              Upgrade
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>
              Web + Print Campaign
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, margin: "8px 0 12px", color: "#fff" }}>
              See what your full campaign could look like
            </h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
              {/* mini web mock */}
              <div style={{ flex: 1.4, aspectRatio: "16/10", background: "#fff", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                <div style={{ height: 14, background: adData.brandColors.primary, display: "flex", alignItems: "center", padding: "0 6px", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: 0.85 }} />
                  <div style={{ fontSize: 6, color: "#fff", fontWeight: 700 }}>{client.business_name}</div>
                </div>
                <div style={{ height: "40%", background: `url('${adData.photoUrl}') center/cover` }} />
                <div style={{ padding: 6 }}>
                  <div style={{ fontSize: 7, fontWeight: 700, color: NAVY }}>{client.business_name}</div>
                  <div style={{ fontSize: 5, color: TEXT2, marginTop: 2 }}>{client.tagline || "Professional services"}</div>
                  <div style={{ fontSize: 5, background: adData.brandColors.accent, color: "#fff", padding: "2px 4px", display: "inline-block", marginTop: 4, fontWeight: 700 }}>
                    {adData.cta}
                  </div>
                </div>
              </div>
              {/* mini print */}
              <div style={{ flex: 1, aspectRatio: `${sizeSpec.trimInches.w} / ${sizeSpec.trimInches.h}`, background: "#fff", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                <div
                  style={{ width: sizeSpec.trimPx150.w, height: sizeSpec.trimPx150.h, transformOrigin: "top left" }}
                  ref={(el) => {
                    if (el && el.parentElement) {
                      const pw = el.parentElement.clientWidth;
                      el.style.transform = `scale(${pw / sizeSpec.trimPx150.w})`;
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: renderPrintAd(adData, { dpi: 150 }) }}
                />
              </div>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 14 }}>
              Your brand across print and digital — consistent, professional, always on.
            </p>
            <button
              onClick={logWebInterest}
              disabled={webInterest}
              style={{
                width: "100%",
                background: webInterest ? "#16a34a" : GOLD,
                color: webInterest ? "#fff" : NAVY,
                border: "none",
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: webInterest ? "default" : "pointer",
              }}
            >
              {webInterest ? "✓ Your rep has been notified" : "Talk to your rep about adding digital →"}
            </button>
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>

      {/* Real-size modal */}
      {showRealSize && (
        <div
          onClick={() => setShowRealSize(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(12,35,64,0.92)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflow: "auto",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: "100%", maxHeight: "100%", overflow: "auto", position: "relative" }}>
            <button
              onClick={() => setShowRealSize(false)}
              style={{ position: "absolute", top: 12, right: 12, background: NAVY, color: "#fff", border: "none", borderRadius: 999, width: 32, height: 32, fontSize: 16, fontWeight: 700, cursor: "pointer", zIndex: 10 }}
            >
              ×
            </button>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>
                Actual Size Preview
              </div>
              <div style={{ fontSize: 14, color: TEXT2, marginTop: 4 }}>
                {sizeSpec.label} at 300 DPI — {sizeSpec.bleedPx300.w} × {sizeSpec.bleedPx300.h} px
              </div>
            </div>
            <div
              style={{ display: "inline-block", background: "#f8f7f2" }}
              dangerouslySetInnerHTML={{ __html: renderPrintAd(adData, { dpi: 300, showBleed: true, showSafeZone: true, showTrimMarks: true }) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function extractCTA(tagline: string | null | undefined): string | null {
  if (!tagline) return null;
  const t = tagline.trim();
  const verbs = ["Order", "Visit", "Call", "Schedule", "Book", "Try", "Get", "Shop"];
  for (const v of verbs) if (t.toLowerCase().startsWith(v.toLowerCase())) return t;
  return null;
}
