"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
const BG = "#f5f7fb";

const VARIATIONS: PrintVariation[] = ["clean_classic", "bold_modern", "premium_editorial"];

const PROGRESS_STAGES = [
  { key: "tear-sheet", label: "Direction Approved" },
  { key: "building", label: "In Production" },
  { key: "qa", label: "Review" },
  { key: "delivered", label: "Delivered" },
  { key: "live", label: "Live" },
];

const UPSELL_LADDER = [
  { key: "size-upgrade", icon: "📐", title: "Size Upgrade", desc: "Go bigger — more real estate, bolder presence." },
  { key: "digital-ads", icon: "📣", title: "Digital Advertising", desc: "Geo-targeted ads that pair with your print." },
  { key: "website", icon: "🌐", title: "Website", desc: "Conversion-ready responsive site with Bruno content." },
];

const LMS_MODULES = [
  { title: "Your Campaign is Live — Now What?", href: "#" },
  { title: "How Print + Digital Work Together", href: "#" },
  { title: "Getting the Most From Your BVM Partnership", href: "#" },
];

function buildAdData(client: ClientProfile, variation: PrintVariation, sub: number): PrintAdData {
  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  const size: PrintSize = normalizeSize(intake.q5 || intake.printSize);
  const services = (intake.q3 || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const tagline = intake.q8 || (client.sbrData as { tagline?: string } | null)?.tagline || "";
  const photoUrl = intake.photoUrl || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop";
  return {
    businessName: client.business_name,
    tagline,
    city: client.city,
    services,
    cta: intake.q4 || "Contact Us",
    phone: client.phone || intake.phone || "",
    photoUrl,
    brandColors: { primary: NAVY, secondary: "#475569", accent: GOLD },
    size,
    variation,
    subVariation: sub,
    qrValue: intake.q7 || undefined,
  };
}

export default function ClientPortalPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [variation, setVariation] = useState<PrintVariation>("clean_classic");
  const [subVariation, setSubVariation] = useState(0);
  const [editText, setEditText] = useState("");
  const [editSent, setEditSent] = useState(false);
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [campaignInterest, setCampaignInterest] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [sentMessages, setSentMessages] = useState<{ text: string; time: string }[]>([]);
  const [articleTopic, setArticleTopic] = useState("");
  const [showVideo, setShowVideo] = useState(true);
  const [qrRequested, setQrRequested] = useState(false);

  useEffect(() => {
    const load = () => fetch(`/api/profile/${id}`).then((r) => r.json()).then((d) => {
      setClient(d.client || null);
      setLoading(false);
    }).catch(() => setLoading(false));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [id]);

  const stage = client?.stage;
  const isApproved = !!client && !["intake", "tear-sheet"].includes(stage || "");

  function cycleAutomagic() {
    const vIdx = VARIATIONS.indexOf(variation);
    if (subVariation < 3) setSubVariation((s) => s + 1);
    else {
      setSubVariation(0);
      setVariation(VARIATIONS[(vIdx + 1) % VARIATIONS.length]);
    }
  }

  async function sendEditRequest() {
    if (!editText.trim() || !client) return;
    await fetch(`/api/profile/revision/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText, type: "print-edit" }),
    }).catch(() => {});
    setEditSent(true);
    setEditText("");
  }

  async function toggleInterest(productKey: string) {
    if (interests.has(productKey) || !client) return;
    setInterests(new Set([...interests, productKey]));
    await fetch(`/api/upsell/interest`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, product: productKey }),
    }).catch(() => {});
  }

  async function sendMessage() {
    if (!replyInput.trim() || !client) return;
    const now = new Date().toISOString();
    setSentMessages((p) => [...p, { text: replyInput, time: now }]);
    await fetch(`/api/profile/message/${client.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyInput, from: "client" }),
    }).catch(() => {});
    setReplyInput("");
  }

  async function sendArticleTopic() {
    if (!articleTopic.trim() || !client) return;
    await fetch(`/api/upsell/interest`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, product: "article", type: articleTopic }),
    }).catch(() => {});
    setArticleTopic("");
  }

  async function requestQR() {
    if (!client) return;
    await fetch(`/api/upsell/interest`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, product: "qr-update" }),
    }).catch(() => {});
    setQrRequested(true);
  }

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  if (!client) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>Client not found</div>;

  // STATE 1: pre-approval
  if (!isApproved) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 32px", borderBottom: `1px solid ${BORDER}`, background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: NAVY, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>B</div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: TEXT2, margin: 0, textTransform: "uppercase" }}>BVM Client Success Portal</p>
            <p style={{ fontSize: 12, color: TEXT2, margin: 0 }}>{client.business_name}</p>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ maxWidth: 540, textAlign: "center" }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 42, color: TEXT, margin: "0 0 12px" }}>{client.business_name}</h1>
            <p style={{ fontSize: 17, color: TEXT2, margin: "0 0 32px" }}>Your campaign direction is ready for review.</p>
            <button onClick={() => router.push(`/tearsheet/${id}`)} style={{ background: GOLD, color: NAVY, border: "none", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Review Your Campaign Direction →</button>
            <div style={{ marginTop: 40 }}>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ width: 40, height: 4, borderRadius: 2, background: i === 1 ? GOLD : "#e2e8f0" }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: TEXT2, marginTop: 10 }}>Step 1 of 5</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE 2: post-approval full dashboard
  const adData = buildAdData(client, variation, subVariation);
  const spec = getSizeSpec(adData.size);
  const previewHtml = renderPrintAd(adData, { dpi: 150 });
  const previewScale = Math.min(1, 460 / spec.bleedPx150.w);

  const sbr = (client.sbrData || {}) as { marketInsight?: string; summary?: string; medianIncome?: number; opportunityScore?: number };
  const brunoInsight = sbr.marketInsight || sbr.summary || `${client.city} market — strong engagement on print + digital.`;

  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  const printSize = intake.q5 || intake.printSize || "quarter";
  const zipForReach = parseInt(client.zip || "0", 10) || 74103;
  const estReach = (printSize === "cover" || printSize === "full") ? 28000 : printSize === "half" ? 18000 : printSize === "third" ? 15000 : printSize === "quarter" ? 12000 : 8000;
  const estCPI = 0.048;
  const digitalMultiplier = 3.2;

  const stageIdx = PROGRESS_STAGES.findIndex((s) => s.key === stage) + 1 || 1;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>
      {/* Header */}
      <div style={{ padding: "18px 32px", borderBottom: `1px solid ${BORDER}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: NAVY, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>B</div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: TEXT2, margin: 0, textTransform: "uppercase" }}>BVM Client Success Portal</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, fontWeight: 600 }}>{client.business_name}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${BORDER}`, padding: "20px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {PROGRESS_STAGES.map((s, i) => {
              const active = i < stageIdx;
              const current = i === stageIdx - 1;
              return (
                <div key={s.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ height: 6, width: "100%", borderRadius: 4, background: active ? GOLD : "#e2e8f0", boxShadow: current ? "0 0 0 3px rgba(212,168,67,0.25)" : "none", animation: current ? "pulse 2s infinite" : "none" }} />
                  <p style={{ fontSize: 11, color: active ? TEXT : TEXT2, marginTop: 8, fontWeight: current ? 700 : 500, textAlign: "center" }}>{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Onboarding video */}
        {showVideo && (
          <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: TEXT }}>Welcome — watch this first</h3>
              <button onClick={() => setShowVideo(false)} style={{ background: "transparent", border: "none", color: TEXT2, fontSize: 13, cursor: "pointer" }}>Skip →</button>
            </div>
            <div style={{ background: "#0f172a", borderRadius: 10, aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "#cbd5e1" }}>
                <div style={{ fontSize: 40, marginBottom: 6 }}>▶</div>
                <p style={{ fontSize: 12, margin: 0 }}>Onboarding video (placeholder)</p>
              </div>
            </div>
          </section>
        )}

        {/* LMS modules */}
        <section>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: TEXT }}>Learn as you go</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {LMS_MODULES.map((m) => (
              <a key={m.title} href={m.href} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, padding: 16, textDecoration: "none", color: TEXT }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>{m.title}</p>
                <p style={{ fontSize: 11, color: TEXT2, marginTop: 6 }}>Watch →</p>
              </a>
            ))}
          </div>
        </section>

        {/* Print ad preview */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: TEXT }}>Your approved print ad</h3>
              <p style={{ fontSize: 12, color: TEXT2, marginTop: 2 }}>{VARIATION_LABELS[variation]} — sub {subVariation + 1}/4</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: TEXT, cursor: "pointer" }}>
                Upload New Photo →
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result !== "string") return;
                    fetch(`/api/profile/update/${client.id}`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ intakeAnswers: { ...intake, photoUrl: reader.result } }),
                    }).catch(() => {});
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>
              <button onClick={cycleAutomagic} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⚡ Automagic</button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: 12, background: BG, borderRadius: 10 }}>
            <div style={{ width: spec.bleedPx150.w * previewScale, height: spec.bleedPx150.h * previewScale }}>
              <div style={{ width: spec.bleedPx150.w, height: spec.bleedPx150.h, transform: `scale(${previewScale})`, transformOrigin: "top left" }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </section>

        {/* Campaign preview */}
        <section style={{ background: NAVY, color: "#fff", borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Full Campaign Preview</p>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, margin: "6px 0 14px" }}>Print · Website · Digital</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div style={{ background: "#fff", color: TEXT, borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Print</p>
              <p style={{ fontSize: 13, fontWeight: 700, margin: "4px 0 0", color: TEXT }}>{client.business_name}</p>
            </div>
            <div style={{ background: "#fff", color: TEXT, borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Website</p>
              <div style={{ background: "#f1f5f9", borderRadius: 6, height: 60, marginTop: 4 }} />
            </div>
            <div style={{ background: "#fff", color: TEXT, borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Digital</p>
              <div style={{ background: "#f1f5f9", borderRadius: 6, height: 60, marginTop: 4 }} />
            </div>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, fontStyle: "italic", color: "#cbd5e1" }}>{brunoInsight}</p>
          {!campaignInterest ? (
            <button onClick={async () => { await fetch("/api/upsell/interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: client.id, product: "full-campaign" }) }); setCampaignInterest(true); }} style={{ marginTop: 14, background: GOLD, color: NAVY, border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Talk to your rep →</button>
          ) : (
            <p style={{ marginTop: 14, color: GOLD, fontSize: 13, fontWeight: 600 }}>✓ Rep notified</p>
          )}
        </section>

        {/* ROI Calculator */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: TEXT }}>Your ROI Snapshot</h3>
          <p style={{ fontSize: 12, color: TEXT2, margin: "0 0 16px" }}>Based on your ZIP ({client.zip || "—"}) and {printSize} size</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <div style={{ background: BG, borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>Estimated reach</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: "4px 0 0" }}>{estReach.toLocaleString()}</p>
            </div>
            <div style={{ background: BG, borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>Cost per impression</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: "4px 0 0" }}>${estCPI.toFixed(3)}</p>
            </div>
            <div style={{ background: BG, borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>Digital multiplier</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: GOLD, margin: "4px 0 0" }}>{digitalMultiplier}×</p>
            </div>
          </div>
          <p style={{ fontSize: 11, color: TEXT2, marginTop: 10, fontStyle: "italic" }}>Bruno: with {zipForReach % 100} households in target and consistent placement, this ad earns compounding attention.</p>
        </section>

        {/* Edit request */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: TEXT }}>Need a change?</h3>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Describe what you'd like changed on your print ad..." style={{ width: "100%", padding: 12, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, color: TEXT, background: "#fff", minHeight: 90, fontFamily: "inherit", boxSizing: "border-box" }} />
          {!editSent ? (
            <button onClick={sendEditRequest} disabled={!editText.trim()} style={{ marginTop: 10, background: editText.trim() ? GOLD : "#e2e8f0", color: editText.trim() ? NAVY : "#94a3b8", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: editText.trim() ? "pointer" : "not-allowed" }}>Submit Edit →</button>
          ) : (
            <p style={{ marginTop: 10, color: "#16a34a", fontSize: 13, fontWeight: 600 }}>✓ Sent to your rep</p>
          )}
        </section>

        {/* Upsell ladder */}
        <section>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: TEXT }}>Grow your campaign</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {UPSELL_LADDER.map((u) => {
              const picked = interests.has(u.key);
              return (
                <div key={u.key} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: 18 }}>
                  <div style={{ fontSize: 28 }}>{u.icon}</div>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px", color: TEXT }}>{u.title}</p>
                  <p style={{ fontSize: 12, color: TEXT2, margin: "0 0 12px" }}>{u.desc}</p>
                  <button onClick={() => toggleInterest(u.key)} disabled={picked} style={{ width: "100%", background: picked ? "#f1f5f9" : GOLD, color: picked ? "#16a34a" : NAVY, border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: picked ? "default" : "pointer" }}>
                    {picked ? "✓ Rep notified" : "I'm Interested →"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Content production */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: 18 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Business Profile Highlight</p>
            <p style={{ fontSize: 13, color: TEXT, margin: "8px 0", lineHeight: 1.6 }}>
              {client.business_name} has become a trusted name in {client.city} — built on relationships, reputation, and the kind of quality neighbors talk about. Whether it's {(client.intakeAnswers?.q3 || "").split(",").slice(0, 2).join(" or ") || "their signature offerings"}, the standard stays high. Local owners. Local roots. A growing brand shaped by the community it serves.
            </p>
            <span style={{ fontSize: 11, color: TEXT2, fontWeight: 600 }}>Status: Draft — awaiting client review</span>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: 18 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Expert Contributor Article</p>
            <p style={{ fontSize: 12, color: TEXT2, margin: "8px 0" }}>Suggested topics:</p>
            <ul style={{ fontSize: 12, color: TEXT, paddingLeft: 18, margin: 0 }}>
              <li>Three questions every {client.city} neighbor should ask before hiring</li>
              <li>Seasonal guide: what to know before {new Date().toLocaleString("default", { month: "long" })}</li>
              <li>Our team's favorite local partners and why</li>
            </ul>
            <textarea value={articleTopic} onChange={(e) => setArticleTopic(e.target.value)} placeholder="Or propose your own topic..." style={{ width: "100%", marginTop: 10, padding: 10, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: TEXT, background: "#fff", minHeight: 60, fontFamily: "inherit", boxSizing: "border-box" }} />
            <button onClick={sendArticleTopic} disabled={!articleTopic.trim()} style={{ marginTop: 8, background: articleTopic.trim() ? GOLD : "#e2e8f0", color: articleTopic.trim() ? NAVY : "#94a3b8", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: articleTopic.trim() ? "pointer" : "not-allowed" }}>Submit Topic →</button>
          </div>
        </section>

        {/* Territory Intelligence */}
        <section style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Territory intelligence</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: "4px 0 2px" }}>{client.city} {client.zip}</p>
            <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>
              Median income ${sbr.medianIncome?.toLocaleString() || "—"} · Opportunity {sbr.opportunityScore || "—"} · Competitors low
            </p>
          </div>
          <a href="https://bruno-bvm.vercel.app" target="_blank" rel="noopener noreferrer" style={{ background: NAVY, color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Full Market Report →</a>
        </section>

        {/* Message thread */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: TEXT }}>Message your rep</h3>
          <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {(client.messages || []).map((m, i) => (
              <div key={`msg-${i}`} style={{ display: "flex", justifyContent: m.from === "client" ? "flex-end" : "flex-start" }}>
                <div style={{ background: m.from === "client" ? GOLD : BG, color: TEXT, padding: "8px 12px", borderRadius: 10, fontSize: 13, maxWidth: "72%" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: TEXT2, marginBottom: 2 }}>{m.from === "client" ? "You" : "Your rep"}</div>
                  {m.text}
                </div>
              </div>
            ))}
            {sentMessages.map((m, i) => (
              <div key={`sent-${i}`} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: GOLD, color: TEXT, padding: "8px 12px", borderRadius: 10, fontSize: 13, maxWidth: "72%" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: TEXT2, marginBottom: 2 }}>You</div>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="text" value={replyInput} onChange={(e) => setReplyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: "#fff" }} />
            <button onClick={sendMessage} disabled={!replyInput.trim()} style={{ background: replyInput.trim() ? GOLD : "#e2e8f0", color: replyInput.trim() ? NAVY : "#94a3b8", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: replyInput.trim() ? "pointer" : "not-allowed" }}>Send →</button>
          </div>
        </section>

        {/* QR Request */}
        <section style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: 18 }}>
          {!qrRequested ? (
            <button onClick={requestQR} style={{ background: "transparent", color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Want to add or update your QR code? →</button>
          ) : (
            <p style={{ color: "#16a34a", fontSize: 13, fontWeight: 600, margin: 0 }}>✓ Rep notified — they'll be in touch.</p>
          )}
        </section>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </div>
  );
}
