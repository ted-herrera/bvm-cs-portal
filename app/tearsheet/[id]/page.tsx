"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  renderPrintAd,
  getSizeSpec,
  normalizeSize,
  VARIATION_LABELS,
  selectVariation,
  type PrintAdData,
  type PrintVariation,
  type PrintSize,
} from "@/lib/print-engine";
import { getPhotoSourceList } from "@/lib/photo-library";
import { detectSubType } from "@/lib/business-classifier";
import type { ClientProfile } from "@/lib/pipeline";

const FALLBACK_PHOTO = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&auto=format&fit=crop";

const NAVY = "#0C2340";
const GOLD = "#D4A843";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const TEXT2 = "#475569";

async function fetchClient(id: string): Promise<ClientProfile | null> {
  try {
    const res = await fetch(`/api/profile/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.client || data.profile || data) as ClientProfile;
  } catch {
    return null;
  }
}

function extractSbrContext(client: ClientProfile): PrintAdData["sbr"] {
  const sbr = (client.sbrData || {}) as Record<string, unknown>;
  const demographics = (sbr.demographics || {}) as Record<string, unknown>;
  const medianIncomeRaw = (demographics.medianIncome ?? sbr.medianIncome ?? "") as string | number;
  const income = typeof medianIncomeRaw === "number"
    ? medianIncomeRaw
    : parseInt(String(medianIncomeRaw || "").replace(/[^0-9]/g, ""), 10) || undefined;
  const competitors = Array.isArray(sbr.competitors) ? (sbr.competitors as unknown[]).length : undefined;
  const opportunityScore = (sbr.opportunityScore as number | string | undefined);
  const incomeTier: "low" | "middle" | "premium" | undefined = income
    ? (income >= 120000 ? "premium" : income < 55000 ? "low" : "middle")
    : undefined;
  return {
    medianIncome: income,
    opportunityScore,
    competitorDensity: competitors,
    incomeTier,
  };
}

function pickDefaultPhoto(client: ClientProfile): string {
  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  if (intake.photoUrl) return intake.photoUrl;
  try {
    const description = intake.q2 || intake.desc || "";
    const subType = detectSubType(client.business_name, description);
    const sources = getPhotoSourceList(subType, subType);
    // SBR-influenced photo ordering: premium income tier takes first option (curated lifestyle);
    // low income tier skips the most "premium" first and picks later. Middle = default first.
    const tier = extractSbrContext(client)?.incomeTier;
    const unsplash = sources.filter((s) => s.source === "unsplash").map((s) => s.url);
    if (unsplash.length === 0) return FALLBACK_PHOTO;
    if (tier === "premium") return unsplash[0];
    if (tier === "low") return unsplash[Math.min(unsplash.length - 1, 3)];
    return unsplash[0];
  } catch {
    /* fall through */
  }
  return FALLBACK_PHOTO;
}

function buildAdData(
  client: ClientProfile,
  variation: PrintVariation,
  realSize = true,
  overridePhoto?: string,
): PrintAdData {
  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  const size: PrintSize = realSize ? normalizeSize(intake.q5 || intake.printSize) : "1/4";
  const services = (intake.q3 || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const tagline = intake.q8 || (client.sbrData as { tagline?: string } | null)?.tagline || "";
  const qrType = intake.q6 === "yes" ? "url" : (intake.qrType || "none");
  const qrValue = intake.q7 || intake.qrValue || "";
  const addressRaw = (intake.address || "").trim();

  return {
    businessName: client.business_name,
    tagline,
    city: client.city,
    services,
    cta: intake.q4 || "Contact Us",
    phone: client.phone || intake.phone || "",
    address: addressRaw || undefined,
    photoUrl: overridePhoto || pickDefaultPhoto(client),
    logoUrl: client.logoUrl || intake.logoUrl || undefined,
    sbr: extractSbrContext(client),
    brandColors: { primary: NAVY, secondary: "#475569", accent: GOLD },
    size,
    variation,
    qrValue: qrType !== "none" ? qrValue : undefined,
  };
}

function PrintPreview({ data, scale = 1 }: { data: PrintAdData; scale?: number }) {
  const spec = getSizeSpec(data.size);
  const html = useMemo(() => renderPrintAd(data, { dpi: 150 }), [data]);
  return (
    <div style={{ width: spec.bleedPx150.w * scale, height: spec.bleedPx150.h * scale, position: "relative" }}>
      <div
        key={`${data.variation}-${data.photoUrl}`}
        style={{ width: spec.bleedPx150.w, height: spec.bleedPx150.h, transform: `scale(${scale})`, transformOrigin: "top left" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function clientBusinessType(client: ClientProfile): string {
  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  const desc = intake.q2 || intake.desc || "";
  return detectSubType(client.business_name, desc);
}

export default function TearsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [variation, setVariation] = useState<PrintVariation>("clean_classic");
  const [realSize, setRealSize] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [approved, setApproved] = useState(false);
  const [checks, setChecks] = useState({ a: false, b: false, c: false, d: false });
  const [note, setNote] = useState("");
  const [showCampaignInterest, setShowCampaignInterest] = useState(false);
  const [qaScore, setQaScore] = useState<number | null>(null);

  // AI-generated photo + generation state
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    fetchClient(id).then((c) => {
      setClient(c);
      setLoading(false);
      if (c) {
        // Hydrate from previously stored AI image (from intake completion)
        const intake = (c.intakeAnswers || {}) as Record<string, string>;
        if (intake.generatedImageUrl) setAiImage(intake.generatedImageUrl);
        // Apply stored selectedVariation if present, otherwise compute via selectVariation
        const stored = intake.selectedVariation as PrintVariation | undefined;
        if (stored === "clean_classic" || stored === "bold_modern" || stored === "premium_editorial") {
          setVariation(stored);
        } else {
          const subType = clientBusinessType(c);
          const size = normalizeSize(intake.q5 || intake.printSize);
          const v = selectVariation(subType, subType, size, extractSbrContext(c));
          setVariation(v);
        }
      }
    });
  }, [id]);

  // Probe whether the AI image endpoint is configured (controls button visibility).
  useEffect(() => {
    fetch("/api/image/generate")
      .then((r) => r.json())
      .then((d) => setAiAvailable(!!d?.configured))
      .catch(() => setAiAvailable(false));
  }, []);

  // If no AI image yet and key is configured, auto-generate one on first load.
  useEffect(() => {
    if (!client || !aiAvailable || aiImage || generating) return;
    const intake = (client.intakeAnswers || {}) as Record<string, string>;
    if (intake.generatedImageUrl) return;
    // Fire once.
    generateImage(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, aiAvailable]);

  useEffect(() => {
    if (!client) return;
    const intake = (client.intakeAnswers || {}) as Record<string, string>;
    let pass = 0, total = 0;
    const fieldsPass = !!client.business_name && !!client.city && !!intake.q4;
    total++; if (fieldsPass) pass++;
    const brandPass = !!intake.brandVibe || !!client.logoUrl;
    total++; if (brandPass) pass++;
    const sizePass = !!intake.q5;
    total++; if (sizePass) pass++;
    const contentPass = !!intake.q3 && !!intake.q8;
    total++; if (contentPass) pass++;
    setQaScore(Math.round((pass / total) * 100));
  }, [client]);

  const canApprove = checks.a && checks.b && checks.c && checks.d;

  async function generateImage(seed?: string | number) {
    if (!client) return;
    setGenerating(true);
    setGenError("");
    try {
      const intake = (client.intakeAnswers || {}) as Record<string, string>;
      const services = (intake.q3 || "").split(",").map((s) => s.trim()).filter(Boolean);
      const size = normalizeSize(intake.q5 || intake.printSize);
      const subType = clientBusinessType(client);
      const sbr = extractSbrContext(client);
      const tier = sbr?.incomeTier || "middle";
      const v = variation || selectVariation(subType, subType, size, sbr);
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          businessName: client.business_name,
          businessType: subType,
          services,
          city: client.city,
          adSize: size,
          incomeTier: tier,
          variation: v,
          seed: seed ?? Date.now(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setGenError(`HTTP ${res.status}: ${data?.error || "unknown error"}`);
      } else if (data?.error) {
        setGenError(
          data.error === "not configured"
            ? "OPENAI_API_KEY is not set on the server."
            : String(data.error),
        );
      } else if (data?.imageUrl) {
        setAiImage(data.imageUrl);
      } else {
        setGenError("No imageUrl returned.");
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Network error");
    }
    setGenerating(false);
  }

  async function handleApprove() {
    if (!canApprove) return;
    const res = await fetch(`/api/tearsheet/approve/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, variation }),
    });
    if (res.ok) {
      setApproved(true);
      if (client && normalizeSize((client.intakeAnswers as Record<string, string> | null)?.q5) === "cover") {
        confetti({ particleCount: 200, spread: 100, colors: ["#F5C842", "#0C2340", "#fff"] });
      } else {
        confetti({ particleCount: 120, spread: 70, colors: ["#F5C842", "#0C2340"] });
      }
    }
  }

  async function registerCampaignInterest() {
    if (!client) return;
    await fetch(`/api/upsell/interest`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, type: "full-campaign" }),
    }).catch(() => {});
    setShowCampaignInterest(true);
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  }
  if (!client) {
    return <div style={{ minHeight: "100vh", background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Tearsheet not found</div>;
  }

  const adData = buildAdData(client, variation, realSize, aiImage || undefined);
  if (!showQR) adData.qrValue = undefined;
  const hasQrFromIntake = !!((client.intakeAnswers || {}) as Record<string, string>).q7;

  const spec = getSizeSpec(adData.size);
  const viewportScale = realSize ? 1 : Math.min(0.8, 480 / spec.bleedPx150.w, 640 / spec.bleedPx150.h);
  const sbrMarket = ((client.sbrData || {}) as { marketInsight?: string; summary?: string }).marketInsight
    || ((client.sbrData || {}) as { summary?: string }).summary
    || `${client.city} is a growing market with strong engagement on print + digital.`;

  if (approved) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 56, color: "#fff", margin: 0 }}>Campaign Direction Approved ✓</h1>
        <p style={{ color: GOLD, fontSize: 18, marginTop: 16 }}>We&apos;ll take it from here.</p>
        <button onClick={() => router.push(`/client/${id}`)} style={{ marginTop: 24, background: GOLD, color: NAVY, border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>See Your Dashboard →</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb", color: TEXT }}>
      {/* Hero */}
      <div style={{ background: NAVY, color: "#fff", padding: "60px 40px 48px", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", margin: 0 }}>BVM Client Success · Print Campaign Direction</p>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 64, margin: "16px 0 8px", fontWeight: 700 }}>{client.business_name}</h1>
        {adData.tagline && <p style={{ fontSize: 18, color: "#cbd5e1", fontStyle: "italic", margin: 0 }}>&ldquo;{adData.tagline}&rdquo;</p>}
        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 12 }}>{client.city}</p>
      </div>

      {/* Preview */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: TEXT2, margin: 0 }}>Variation</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0", color: TEXT }}>{VARIATION_LABELS[variation]}</h2>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setRealSize((s) => !s)} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: TEXT }}>{realSize ? "Fit to screen" : "Real size"}</button>
            {hasQrFromIntake && <button onClick={() => setShowQR((s) => !s)} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: TEXT }}>{showQR ? "Hide QR" : "Show QR"}</button>}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 520, position: "relative" }}>
          {generating && !aiImage ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 44, height: 44, border: `3px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontStyle: "italic", color: TEXT, margin: 0 }}>The BVM Art Director is building your campaign direction...</p>
              <p style={{ fontSize: 12, color: TEXT2, marginTop: 8 }}>This takes about 10–20 seconds.</p>
            </div>
          ) : (
            <PrintPreview data={adData} scale={viewportScale} />
          )}
        </div>

        {/* Surprise Me button — single CTA, replaces Automagic */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 22 }}>
          <button
            onClick={() => generateImage(Math.random().toString(36).slice(2, 10))}
            disabled={generating || !aiAvailable}
            style={{
              background: aiAvailable ? GOLD : "#e2e8f0",
              color: aiAvailable ? NAVY : "#94a3b8",
              border: "none",
              borderRadius: 10,
              padding: "14px 32px",
              fontSize: 15,
              fontWeight: 800,
              cursor: aiAvailable && !generating ? "pointer" : "not-allowed",
              letterSpacing: "0.04em",
              boxShadow: aiAvailable ? "0 4px 14px rgba(212,168,67,0.35)" : "none",
            }}
          >
            {generating ? "Generating..." : "🎲 Surprise Me"}
          </button>
        </div>
      </div>

      {/* Approval gate */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32 }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: TEXT }}>Approve campaign direction</h3>
          <p style={{ fontSize: 14, color: TEXT2, margin: "0 0 20px" }}>Once approved, our team moves straight to production. Check each item below.</p>
          {([
            ["a", "Business name, city, and contact look correct"],
            ["b", "Services, CTA, and tagline feel right"],
            ["c", "Chosen variation and print size work for me"],
            ["d", "I'm ready to hand off to production"],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: "flex", gap: 10, padding: "10px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={checks[key]} onChange={(e) => setChecks({ ...checks, [key]: e.target.checked })} style={{ marginTop: 3 }} />
              <span style={{ fontSize: 14, color: TEXT }}>{label}</span>
            </label>
          ))}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Leave a note for your rep" style={{ width: "100%", marginTop: 12, padding: 12, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, color: TEXT, background: "#fff", fontFamily: "inherit", minHeight: 80 }} />
          <button onClick={handleApprove} disabled={!canApprove} style={{ marginTop: 16, width: "100%", background: canApprove ? GOLD : "#e2e8f0", color: canApprove ? NAVY : "#94a3b8", border: "none", borderRadius: 10, padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: canApprove ? "pointer" : "not-allowed" }}>Approve & Hand Off →</button>
        </div>

        {qaScore !== null && (
          <p style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: TEXT2 }}>Post-flight QA: {qaScore}% pass</p>
        )}
      </div>

      {/* Web+Print+Digital campaign preview — visible below approval gate */}
      <div style={{ background: NAVY, color: "#fff", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Full Campaign Preview</p>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 36, margin: "8px 0 24px" }}>Print · Website · Digital — in one campaign</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "stretch" }}>
            {/* Print ad preview (left) */}
            <div style={{ background: "#fff", color: TEXT, borderRadius: 12, padding: 18, display: "flex", flexDirection: "column" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Print</p>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: 8, marginTop: 8, padding: 12, minHeight: 220 }}>
                {(() => {
                  const previewSpec = getSizeSpec(adData.size);
                  const thumbScale = Math.min(1, 240 / previewSpec.bleedPx150.w, 220 / previewSpec.bleedPx150.h);
                  return (
                    <div style={{ width: previewSpec.bleedPx150.w * thumbScale, height: previewSpec.bleedPx150.h * thumbScale }}>
                      <div
                        key={`preview-${variation}-${aiImage || "stock"}`}
                        style={{ width: previewSpec.bleedPx150.w, height: previewSpec.bleedPx150.h, transform: `scale(${thumbScale})`, transformOrigin: "top left" }}
                        dangerouslySetInnerHTML={{ __html: renderPrintAd(adData, { dpi: 150 }) }}
                      />
                    </div>
                  );
                })()}
              </div>
              <div style={{ fontSize: 11, color: TEXT2, marginTop: 8 }}>Your approved tearsheet, ready to print.</div>
            </div>

            {/* Generic website mockup (center) */}
            <div style={{ background: "#fff", color: TEXT, borderRadius: 12, padding: 18, display: "flex", flexDirection: "column" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Website</p>
              <div style={{ flex: 1, marginTop: 8, background: "#e2e8f0", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 220 }}>
                <div style={{ background: "#cbd5e1", padding: "6px 10px", display: "flex", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <div style={{ flex: 1, background: "#fff", padding: 14 }}>
                  <div style={{ height: 10, background: NAVY, borderRadius: 3, width: "45%" }} />
                  <div style={{ height: 22, background: "#1f2937", borderRadius: 4, width: "80%", marginTop: 8 }} />
                  <div style={{ height: 10, background: "#cbd5e1", borderRadius: 3, width: "100%", marginTop: 10 }} />
                  <div style={{ height: 10, background: "#cbd5e1", borderRadius: 3, width: "92%", marginTop: 6 }} />
                  <div style={{ background: "#f1f5f9", borderRadius: 6, height: 60, marginTop: 10 }} />
                  <div style={{ display: "inline-block", background: GOLD, color: NAVY, fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 4, marginTop: 10 }}>{((client.intakeAnswers || {}) as Record<string, string>).q4 || "Contact"} →</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: TEXT2, marginTop: 8 }}>Responsive, conversion-optimized.</div>
            </div>

            {/* Digital ad frame (right) */}
            <div style={{ background: "#fff", color: TEXT, borderRadius: 12, padding: 18, display: "flex", flexDirection: "column" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Digital Ad</p>
              <div style={{ flex: 1, marginTop: 8, background: NAVY, borderRadius: 8, padding: 16, minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff" }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: GOLD, textTransform: "uppercase" }}>Sponsored · Local</div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>{client.business_name}</div>
                  {adData.tagline && <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 4, fontStyle: "italic" }}>{adData.tagline}</div>}
                </div>
                <div style={{ display: "inline-block", alignSelf: "flex-start", background: GOLD, color: NAVY, fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 3 }}>{((client.intakeAnswers || {}) as Record<string, string>).q4 || "Learn More"} →</div>
              </div>
              <div style={{ fontSize: 11, color: TEXT2, marginTop: 8 }}>Targeted reach across platforms.</div>
            </div>
          </div>
          <p style={{ marginTop: 24, fontSize: 14, color: "#cbd5e1", fontStyle: "italic" }}>Bruno&apos;s market note: {sbrMarket}</p>
          {!showCampaignInterest ? (
            <button onClick={registerCampaignInterest} style={{ marginTop: 16, background: GOLD, color: NAVY, border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Talk to your rep about going full campaign →</button>
          ) : (
            <p style={{ marginTop: 16, color: GOLD, fontWeight: 600 }}>✓ Rep notified — they&apos;ll be in touch.</p>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
