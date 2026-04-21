"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  renderPrintAd,
  getSizeSpec,
  normalizeSize,
  VARIATION_LABELS,
  type PrintAdData,
  type PrintVariation,
  type PrintSize,
} from "@/lib/print-engine";
import type { ClientProfile } from "@/lib/pipeline";

const NAVY = "#0C2340";
const GOLD = "#D4A843";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const TEXT2 = "#475569";

const VARIATIONS: PrintVariation[] = ["clean_classic", "bold_modern", "premium_editorial"];

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

function pickDefaultPhoto(intake: Record<string, string> | null | undefined): string {
  if (intake?.photoUrl) return intake.photoUrl;
  return "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop";
}

function buildAdData(client: ClientProfile, variation: PrintVariation, sub: number, realSize = true, overridePhoto?: string): PrintAdData {
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
    photoUrl: overridePhoto || pickDefaultPhoto(intake),
    logoUrl: client.logoUrl || intake.logoUrl || undefined,
    brandColors: { primary: NAVY, secondary: "#475569", accent: GOLD },
    size,
    variation,
    subVariation: sub,
    qrValue: qrType !== "none" ? qrValue : undefined,
  };
}

function PrintPreview({ data, scale = 1 }: { data: PrintAdData; scale?: number }) {
  const spec = getSizeSpec(data.size);
  const html = useMemo(() => renderPrintAd(data, { dpi: 150 }), [data]);
  return (
    <div style={{ width: spec.bleedPx150.w * scale, height: spec.bleedPx150.h * scale, position: "relative" }}>
      <div
        key={`${data.variation}-${data.subVariation}`}
        style={{ width: spec.bleedPx150.w, height: spec.bleedPx150.h, transform: `scale(${scale})`, transformOrigin: "top left" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default function TearsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [variation, setVariation] = useState<PrintVariation>("clean_classic");
  const [subVariation, setSubVariation] = useState(0);
  const [realSize, setRealSize] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [approved, setApproved] = useState(false);
  const [checks, setChecks] = useState({ a: false, b: false, c: false, d: false });
  const [note, setNote] = useState("");
  const [showCampaignInterest, setShowCampaignInterest] = useState(false);
  const [qaScore, setQaScore] = useState<number | null>(null);

  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchClient(id).then((c) => { setClient(c); setLoading(false); });
  }, [id]);

  useEffect(() => {
    fetch("/api/image/generate")
      .then((r) => r.json())
      .then((d) => setAiAvailable(!!d?.configured))
      .catch(() => setAiAvailable(false));
  }, []);

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

  function cycleAutomagic() {
    const vIdx = VARIATIONS.indexOf(variation);
    if (subVariation < 3) {
      setSubVariation((s) => s + 1);
    } else {
      const nextV = VARIATIONS[(vIdx + 1) % VARIATIONS.length];
      setVariation(nextV);
      setSubVariation(0);
    }
  }

  async function handleAiTest() {
    if (!client) return;
    const pw = typeof window !== "undefined" ? window.prompt("Enter password") : "";
    if (pw !== "bvmtest") return;
    setAiModalOpen(true);
    setAiLoading(true);
    setAiImage(null);
    try {
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, prompt: "" }),
      });
      const data = await res.json().catch(() => null);
      if (data?.imageUrl) setAiImage(data.imageUrl);
    } catch {
      /* ignore */
    }
    setAiLoading(false);
  }

  async function handleApprove() {
    if (!canApprove) return;
    const res = await fetch(`/api/tearsheet/approve/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, variation, subVariation }),
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

  const adData = buildAdData(client, variation, subVariation, realSize);
  if (!showQR) adData.qrValue = undefined;
  const hasQrFromIntake = !!((client.intakeAnswers || {}) as Record<string, string>).q7;

  const spec = getSizeSpec(adData.size);
  const viewportScale = realSize ? 1 : Math.min(0.8, 480 / spec.bleedPx150.w, 640 / spec.bleedPx150.h);
  const sbrMarket = ((client.sbrData || {}) as { marketInsight?: string; summary?: string }).marketInsight
    || ((client.sbrData || {}) as { summary?: string }).summary
    || `${client.city} is a growing market with strong engagement on print + digital.`;

  const stockPhoto = pickDefaultPhoto((client.intakeAnswers || {}) as Record<string, string>);

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
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0", color: TEXT }}>{VARIATION_LABELS[variation]} <span style={{ color: TEXT2, fontSize: 14 }}>— sub {subVariation + 1}/4</span></h2>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setRealSize((s) => !s)} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: TEXT }}>{realSize ? "Fit to screen" : "Real size"}</button>
            {hasQrFromIntake && <button onClick={() => setShowQR((s) => !s)} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: TEXT }}>{showQR ? "Hide QR" : "Show QR"}</button>}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 520 }}>
          <PrintPreview data={adData} scale={viewportScale} />
        </div>

        {/* Automagic + AI test — directly below preview, centered */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 22 }}>
          <button onClick={cycleAutomagic} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 10, padding: "14px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em", boxShadow: "0 4px 14px rgba(212,168,67,0.35)" }}>⚡ Automagic — next variation</button>
          {aiAvailable && (
            <button onClick={handleAiTest} style={{ background: "#fff", color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🤖 Test AI Art</button>
          )}
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
                        key={`preview-${variation}-${subVariation}`}
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

      {/* AI Test Modal */}
      {aiModalOpen && (
        <div role="dialog" style={{ position: "fixed", inset: 0, background: "rgba(12,35,64,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 14, maxWidth: 960, width: "100%", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>AI Art Test — for rep comparison only</h3>
              <button onClick={() => setAiModalOpen(false)} style={{ background: "transparent", border: "none", color: TEXT2, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: TEXT2, margin: "0 0 16px" }}>This is a rep-facing comparison tool. Nothing auto-applies.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: GOLD, textTransform: "uppercase", margin: "0 0 8px" }}>AI Generated</p>
                <div style={{ background: "#f1f5f9", borderRadius: 10, aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {aiLoading && <p style={{ fontSize: 12, color: TEXT2 }}>Generating…</p>}
                  {aiImage && <img src={aiImage} alt="AI generated" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  {!aiLoading && !aiImage && <p style={{ fontSize: 12, color: TEXT2 }}>No image returned</p>}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: GOLD, textTransform: "uppercase", margin: "0 0 8px" }}>Current Stock Photo</p>
                <div style={{ background: "#f1f5f9", borderRadius: 10, aspectRatio: "1/1", overflow: "hidden" }}>
                  <img src={stockPhoto} alt="Current stock" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <button onClick={() => setAiModalOpen(false)} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
