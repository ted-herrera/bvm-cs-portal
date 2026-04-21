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
import { getPhotoSourceList } from "@/lib/photo-library";
import { detectSubType } from "@/lib/business-classifier";
import type { ClientProfile } from "@/lib/pipeline";

const FALLBACK_PHOTO = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&auto=format&fit=crop";

function pickDefaultPhoto(client: ClientProfile): string {
  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  if (intake.photoUrl) return intake.photoUrl;
  try {
    const description = intake.q2 || intake.desc || "";
    const subType = detectSubType(client.business_name, description);
    const sources = getPhotoSourceList(subType, subType);
    const firstUnsplash = sources.find((s) => s.source === "unsplash");
    if (firstUnsplash?.url) return firstUnsplash.url;
  } catch {
    /* fall through */
  }
  return FALLBACK_PHOTO;
}

const NAVY = "#0C2340";
const NAVY_MID = "#1a2f50";
const GOLD = "#D4A843";
const WHEAT = "#F5DEB3";
const WHEAT_DARK = "#C9B584";
const PANEL_DARK = "#1e3764";
const BORDER = "rgba(255,255,255,0.12)";
const TEXT = "#ffffff";
const TEXT2 = "#cbd5e1";
const BG = "#0C2340";

const VARIATIONS: PrintVariation[] = ["clean_classic", "bold_modern", "premium_editorial"];

const PROGRESS_STAGES = [
  { key: "tear-sheet", label: "Direction Approved" },
  { key: "building", label: "In Production" },
  { key: "qa", label: "Review" },
  { key: "delivered", label: "Delivered" },
  { key: "live", label: "Live" },
];

const STAGE_BADGES: Record<string, string> = {
  intake: "Intake",
  "tear-sheet": "Tearsheet",
  building: "In Production",
  qa: "Review",
  review: "Review",
  delivered: "Delivered",
  live: "Live",
};

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

const SIDEBAR_NAV = [
  { key: "campaign", label: "Campaign", anchor: "#campaign" },
  { key: "content", label: "Content", anchor: "#content" },
  { key: "grow", label: "Grow", anchor: "#grow" },
  { key: "messages", label: "Messages", anchor: "#messages" },
];

function buildAdData(client: ClientProfile, variation: PrintVariation, sub: number): PrintAdData {
  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  const size: PrintSize = normalizeSize(intake.q5 || intake.printSize);
  const services = (intake.q3 || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const tagline = intake.q8 || (client.sbrData as { tagline?: string } | null)?.tagline || "";
  const photoUrl = pickDefaultPhoto(client);
  const addressRaw = (intake.address || "").trim();
  return {
    businessName: client.business_name,
    tagline,
    city: client.city,
    services,
    cta: intake.q4 || "Contact Us",
    phone: client.phone || intake.phone || "",
    address: addressRaw || undefined,
    photoUrl,
    brandColors: { primary: NAVY, secondary: "#475569", accent: GOLD },
    size,
    variation,
    subVariation: sub,
    qrValue: intake.q7 || undefined,
  };
}

interface ProfileContent {
  headline: string;
  paragraphs: string[];
  quote: string;
  quoteAttribution: string;
  cta: string;
  status: "Draft" | "In Review" | "Published";
}

interface ArticleTopic {
  title: string;
  hook: string;
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
  const [showVideo, setShowVideo] = useState(true);
  const [qrRequested, setQrRequested] = useState(false);

  // Content unlock + production state
  const [contentUnlocked, setContentUnlocked] = useState(false);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState(false);
  const [profileContent, setProfileContent] = useState<ProfileContent | null>(null);
  const [profileStatus, setProfileStatus] = useState<"Draft" | "In Review" | "Published">("Draft");
  const [profileLoading, setProfileLoading] = useState(false);
  const [articleTopics, setArticleTopics] = useState<ArticleTopic[]>([]);
  const [articleStatus, setArticleStatus] = useState<"Topic Selection" | "In Production" | "In Review" | "Published">("Topic Selection");
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [customTopic, setCustomTopic] = useState("");

  useEffect(() => {
    const load = () => fetch(`/api/profile/${id}`).then((r) => r.json()).then((d) => {
      const c = d.client as ClientProfile | null;
      setClient(c || null);
      if (c && (c.buildNotes || []).includes("content-unlocked")) setContentUnlocked(true);
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
    if (subVariation < 3) {
      setSubVariation((s) => s + 1);
    } else {
      const nextV = VARIATIONS[(vIdx + 1) % VARIATIONS.length];
      setVariation(nextV);
      setSubVariation(0);
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

  async function submitTopic(topic: string) {
    if (!topic.trim() || !client) return;
    await fetch(`/api/upsell/interest`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, product: "article", type: topic }),
    }).catch(() => {});
    setSelectedTopic(topic);
    setArticleStatus("In Production");
    setCustomTopic("");
  }

  async function requestQR() {
    if (!client) return;
    await fetch(`/api/upsell/interest`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, product: "qr-update" }),
    }).catch(() => {});
    setQrRequested(true);
  }

  async function attemptUnlock() {
    if (!unlockInput.trim() || !client) return;
    const res = await fetch(`/api/content/unlock`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, code: unlockInput.trim() }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (data?.success) {
      setContentUnlocked(true);
      setUnlockError(false);
      setUnlockInput("");
      loadProfileContent();
      loadTopics();
    } else {
      setUnlockError(true);
    }
  }

  async function loadProfileContent() {
    if (!client) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/content/profile/${client.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (data?.content) {
        setProfileContent(data.content as ProfileContent);
      } else if (data?.headline) {
        setProfileContent(data as ProfileContent);
      } else {
        setProfileContent(fallbackProfile(client));
      }
    } catch {
      setProfileContent(fallbackProfile(client));
    }
    setProfileLoading(false);
  }

  async function loadTopics() {
    if (!client) return;
    setTopicsLoading(true);
    try {
      const res = await fetch(`/api/content/topics/${client.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.topics)) {
        setArticleTopics(data.topics as ArticleTopic[]);
      } else {
        setArticleTopics(fallbackTopics(client));
      }
    } catch {
      setArticleTopics(fallbackTopics(client));
    }
    setTopicsLoading(false);
  }

  useEffect(() => {
    if (contentUnlocked && client && !profileContent) loadProfileContent();
    if (contentUnlocked && client && articleTopics.length === 0) loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentUnlocked, client]);

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  if (!client) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>Client not found</div>;

  // STATE 1: pre-approval
  if (!isApproved) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 32px", borderBottom: `1px solid ${BORDER}`, background: PANEL_DARK, display: "flex", alignItems: "center", gap: 12 }}>
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
  const stageBadge = STAGE_BADGES[stage || "intake"] || stage || "—";

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "flex" }}>
      {/* Wheat sidebar */}
      <aside style={{ width: 240, minWidth: 240, background: WHEAT, color: NAVY, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "24px 20px", borderBottom: `1px solid ${WHEAT_DARK}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: NAVY, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: WHEAT, fontWeight: 800, fontSize: 14 }}>B</div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: NAVY, margin: 0, textTransform: "uppercase" }}>BVM CS Portal</p>
          </div>
        </div>
        <div style={{ padding: "20px", borderBottom: `1px solid ${WHEAT_DARK}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#8a6e2c", textTransform: "uppercase", margin: 0 }}>Business</p>
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: NAVY, margin: "6px 0 10px", lineHeight: 1.2 }}>{client.business_name}</p>
          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: NAVY, color: WHEAT, borderRadius: 999, padding: "3px 10px" }}>{stageBadge}</span>
        </div>
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {SIDEBAR_NAV.map((n) => (
            <a key={n.key} href={n.anchor} style={{ display: "block", padding: "10px 12px", borderRadius: 8, color: NAVY, fontSize: 13, textDecoration: "none", fontWeight: 500 }}>{n.label}</a>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: `1px solid ${WHEAT_DARK}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#8a6e2c", textTransform: "uppercase", margin: 0 }}>Your rep</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: NAVY, margin: "6px 0 2px" }}>{client.assigned_rep || "BVM CS"}</p>
          <p style={{ fontSize: 11, color: "#6b5a2a", margin: 0 }}>Reach out anytime below.</p>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Progress bar */}
        <div style={{ background: PANEL_DARK, borderBottom: `1px solid ${BORDER}`, padding: "20px 32px" }}>
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
            <section style={{ background: PANEL_DARK, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, margin: 0, color: TEXT }}>Welcome — watch this first</h3>
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
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, margin: "0 0 12px", color: TEXT }}>Learn as you go</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {LMS_MODULES.map((m) => (
                <a key={m.title} href={m.href} style={{ background: PANEL_DARK, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 16, textDecoration: "none", color: TEXT }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>{m.title}</p>
                  <p style={{ fontSize: 11, color: TEXT2, marginTop: 6 }}>Watch →</p>
                </a>
              ))}
            </div>
          </section>

          {/* Print ad preview */}
          <section id="campaign" style={{ background: PANEL_DARK, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Campaign</p>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, margin: "4px 0 2px", color: TEXT }}>Your approved print ad</h3>
                <p style={{ fontSize: 12, color: TEXT2, margin: 0 }}>{VARIATION_LABELS[variation]} — sub {subVariation + 1}/4</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ background: PANEL_DARK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: TEXT, cursor: "pointer" }}>
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
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: 12, background: BG, borderRadius: 10 }}>
              <div style={{ width: spec.bleedPx150.w * previewScale, height: spec.bleedPx150.h * previewScale }}>
                <div
                  key={`${variation}-${subVariation}`}
                  style={{ width: spec.bleedPx150.w, height: spec.bleedPx150.h, transform: `scale(${previewScale})`, transformOrigin: "top left" }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
              <button onClick={cycleAutomagic} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em", boxShadow: "0 4px 14px rgba(212,168,67,0.35)" }}>⚡ Automagic — next variation</button>
            </div>
          </section>

          {/* Campaign preview */}
          <section style={{ background: NAVY, color: "#fff", borderRadius: 14, padding: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Full Campaign Preview</p>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, margin: "6px 0 14px" }}>Print · Website · Digital</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div style={{ background: PANEL_DARK, color: TEXT, borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Print</p>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "4px 0 0", color: TEXT }}>{client.business_name}</p>
              </div>
              <div style={{ background: PANEL_DARK, color: TEXT, borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Website</p>
                <div style={{ background: "#f1f5f9", borderRadius: 6, height: 60, marginTop: 4 }} />
              </div>
              <div style={{ background: PANEL_DARK, color: TEXT, borderRadius: 10, padding: 14 }}>
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
          <section style={{ background: PANEL_DARK, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>ROI</p>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, margin: "4px 0 6px", color: TEXT }}>Your ROI Snapshot</h3>
            <p style={{ fontSize: 12, color: TEXT2, margin: "0 0 16px" }}>Based on your ZIP ({client.zip || "—"}) and {printSize} size</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <div style={{ background: BG, borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>Estimated reach</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: WHEAT, margin: "4px 0 0" }}>{estReach.toLocaleString()}</p>
              </div>
              <div style={{ background: BG, borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>Cost per impression</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: WHEAT, margin: "4px 0 0" }}>${estCPI.toFixed(3)}</p>
              </div>
              <div style={{ background: BG, borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>Digital multiplier</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: GOLD, margin: "4px 0 0" }}>{digitalMultiplier}×</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: TEXT2, marginTop: 10, fontStyle: "italic" }}>Bruno: with {zipForReach % 100} households in target and consistent placement, this ad earns compounding attention.</p>
          </section>

          {/* Edit request */}
          <section style={{ background: PANEL_DARK, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Revision</p>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, margin: "4px 0 12px", color: TEXT }}>Need a change?</h3>
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Describe what you'd like changed on your print ad..." style={{ width: "100%", padding: 12, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, color: TEXT, background: PANEL_DARK, minHeight: 90, fontFamily: "inherit", boxSizing: "border-box" }} />
            {!editSent ? (
              <button onClick={sendEditRequest} disabled={!editText.trim()} style={{ marginTop: 10, background: editText.trim() ? GOLD : "#e2e8f0", color: editText.trim() ? NAVY : "#94a3b8", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: editText.trim() ? "pointer" : "not-allowed" }}>Submit Edit →</button>
            ) : (
              <p style={{ marginTop: 10, color: "#16a34a", fontSize: 13, fontWeight: 600 }}>✓ Sent to your rep</p>
            )}
          </section>

          {/* Upsell ladder — DO NOT TOUCH */}
          <section id="grow">
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: TEXT }}>Grow your campaign</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {UPSELL_LADDER.map((u) => {
                const picked = interests.has(u.key);
                return (
                  <div key={u.key} style={{ background: PANEL_DARK, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 18 }}>
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
          <section id="content" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Business Profile Highlight */}
            <div style={{ background: PANEL_DARK, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Editorial Feature</p>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, margin: "4px 0 6px", color: TEXT }}>Your Story, Told by BVM</h3>
              <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 16px", lineHeight: 1.5 }}>A professionally written business profile that runs as editorial content in your community magazine alongside your ad.</p>
              {!contentUnlocked ? (
                <div style={{ background: BG, borderRadius: 10, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 30, color: GOLD }}>🔒</div>
                  <p style={{ fontSize: 13, color: TEXT, margin: "8px 0 14px", fontWeight: 600 }}>Locked — enter eligibility code to unlock</p>
                  <input type="text" value={unlockInput} onChange={(e) => { setUnlockInput(e.target.value); setUnlockError(false); }} placeholder="Eligibility code" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, textAlign: "center", letterSpacing: "0.12em", color: TEXT, background: PANEL_DARK, boxSizing: "border-box", marginBottom: 10 }} />
                  <button onClick={attemptUnlock} disabled={!unlockInput.trim()} style={{ width: "100%", background: unlockInput.trim() ? GOLD : "#e2e8f0", color: unlockInput.trim() ? NAVY : "#94a3b8", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: unlockInput.trim() ? "pointer" : "not-allowed" }}>Enter eligibility code →</button>
                  {unlockError && <p style={{ fontSize: 11, color: "#dc2626", margin: "8px 0 0" }}>Invalid code. Please try again or contact your rep.</p>}
                </div>
              ) : (
                <div>
                  {profileLoading && <p style={{ fontSize: 12, color: TEXT2, fontStyle: "italic" }}>Bruno is writing your profile…</p>}
                  {profileContent && (
                    <article style={{ background: NAVY_MID, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
                      <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: TEXT, margin: "0 0 14px", lineHeight: 1.2 }}>{profileContent.headline}</h4>
                      {profileContent.paragraphs.map((p, i) => (
                        <p key={i} style={{ fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.65, color: TEXT, margin: "0 0 12px" }}>{p}</p>
                      ))}
                      {profileContent.quote && (
                        <blockquote style={{ fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic", color: TEXT, borderLeft: `3px solid ${GOLD}`, padding: "4px 0 4px 16px", margin: "14px 0" }}>
                          “{profileContent.quote}”
                          {profileContent.quoteAttribution && <div style={{ fontSize: 11, fontStyle: "normal", color: TEXT2, marginTop: 6 }}>— {profileContent.quoteAttribution}</div>}
                        </blockquote>
                      )}
                      {profileContent.cta && <p style={{ fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.65, color: TEXT, margin: 0, fontWeight: 600 }}>{profileContent.cta}</p>}
                    </article>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: profileStatus === "Published" ? "#dcfce7" : profileStatus === "In Review" ? "#fef3c7" : "#e2e8f0", color: profileStatus === "Published" ? "#16a34a" : profileStatus === "In Review" ? "#a16207" : TEXT2, borderRadius: 999, padding: "4px 10px" }}>{profileStatus}</span>
                    <button onClick={() => { setProfileStatus("In Review"); submitTopic(`Profile revision requested`); }} style={{ background: "transparent", color: WHEAT, border: `1px solid ${WHEAT}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Request Changes →</button>
                  </div>
                </div>
              )}
            </div>

            {/* Expert Contributor Article */}
            <div style={{ background: PANEL_DARK, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Contributor Article</p>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, margin: "4px 0 6px", color: TEXT }}>Share Your Expertise</h3>
              <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 16px", lineHeight: 1.5 }}>A 300-500 word expert article published under your name in your community magazine.</p>
              {!contentUnlocked ? (
                <div style={{ background: BG, borderRadius: 10, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 30, color: GOLD }}>🔒</div>
                  <p style={{ fontSize: 13, color: TEXT, margin: "8px 0 14px", fontWeight: 600 }}>Locked — enter eligibility code to unlock</p>
                  <input type="text" value={unlockInput} onChange={(e) => { setUnlockInput(e.target.value); setUnlockError(false); }} placeholder="Eligibility code" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, textAlign: "center", letterSpacing: "0.12em", color: TEXT, background: PANEL_DARK, boxSizing: "border-box", marginBottom: 10 }} />
                  <button onClick={attemptUnlock} disabled={!unlockInput.trim()} style={{ width: "100%", background: unlockInput.trim() ? GOLD : "#e2e8f0", color: unlockInput.trim() ? NAVY : "#94a3b8", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: unlockInput.trim() ? "pointer" : "not-allowed" }}>Enter eligibility code →</button>
                </div>
              ) : (
                <div>
                  {topicsLoading && <p style={{ fontSize: 12, color: TEXT2, fontStyle: "italic" }}>Bruno is pulling topic ideas…</p>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                    {articleTopics.map((t, i) => {
                      const active = selectedTopic === t.title;
                      return (
                        <button key={`${t.title}-${i}`} onClick={() => submitTopic(t.title)} style={{ textAlign: "left", background: active ? NAVY_MID : PANEL_DARK, border: `1px solid ${active ? GOLD : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer" }}>
                          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 700, margin: 0, color: TEXT }}>{t.title}</p>
                          <p style={{ fontSize: 12, color: TEXT2, margin: "4px 0 0", lineHeight: 1.5 }}>{t.hook}</p>
                        </button>
                      );
                    })}
                  </div>
                  <textarea value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="Or propose your own topic..." style={{ width: "100%", padding: 10, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: TEXT, background: PANEL_DARK, minHeight: 60, fontFamily: "inherit", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => submitTopic(customTopic)} disabled={!customTopic.trim()} style={{ background: customTopic.trim() ? GOLD : "#e2e8f0", color: customTopic.trim() ? NAVY : "#94a3b8", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: customTopic.trim() ? "pointer" : "not-allowed" }}>Submit My Topic →</button>
                    <button onClick={loadTopics} style={{ background: "transparent", color: WHEAT, border: `1px solid ${WHEAT}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Let Bruno Suggest Topics →</button>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: articleStatus === "Published" ? "#dcfce7" : articleStatus === "In Review" || articleStatus === "In Production" ? "#fef3c7" : "#e2e8f0", color: articleStatus === "Published" ? "#16a34a" : articleStatus === "In Review" || articleStatus === "In Production" ? "#a16207" : TEXT2, borderRadius: 999, padding: "4px 10px" }}>{articleStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Territory Intelligence */}
          <section style={{ background: PANEL_DARK, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Territory intelligence</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: "4px 0 2px" }}>{client.city} {client.zip}</p>
              <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>
                Median income ${sbr.medianIncome?.toLocaleString() || "—"} · Opportunity {sbr.opportunityScore || "—"} · Competitors low
              </p>
            </div>
            <a href="https://bruno-bvm.vercel.app" target="_blank" rel="noopener noreferrer" style={{ background: GOLD, color: NAVY, padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Full Market Report →</a>
          </section>

          {/* Message thread — DO NOT TOUCH */}
          <section id="messages" style={{ background: PANEL_DARK, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
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
              <input type="text" value={replyInput} onChange={(e) => setReplyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: PANEL_DARK }} />
              <button onClick={sendMessage} disabled={!replyInput.trim()} style={{ background: replyInput.trim() ? GOLD : "#e2e8f0", color: replyInput.trim() ? NAVY : "#94a3b8", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: replyInput.trim() ? "pointer" : "not-allowed" }}>Send →</button>
            </div>
          </section>

          {/* QR Request */}
          <section style={{ background: PANEL_DARK, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 18 }}>
            {!qrRequested ? (
              <button onClick={requestQR} style={{ background: "transparent", color: WHEAT, border: `1px solid ${WHEAT}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Want to add or update your QR code? →</button>
            ) : (
              <p style={{ color: "#16a34a", fontSize: 13, fontWeight: 600, margin: 0 }}>✓ Rep notified — they'll be in touch.</p>
            )}
          </section>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </div>
  );
}

function fallbackProfile(client: ClientProfile): ProfileContent {
  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  const services = (intake.q3 || "").split(",").map((s) => s.trim()).filter(Boolean);
  const first = services[0] || "their signature offering";
  const descriptor = intake.q2 || "a local favorite";
  return {
    headline: `${client.business_name}: ${descriptor}`,
    paragraphs: [
      `Tucked into the ${client.city} community, ${client.business_name} has built a reputation on the kind of work neighbors tell each other about. Owners with deep local roots have built the business slowly and deliberately — one customer, one story at a time.`,
      `The team is known for ${services.slice(0, 3).join(", ") || first}. Every visit feels like walking in somewhere that remembers you, and every detail — from the first hello to the follow-up after the job — reflects a standard the owners refuse to lower.`,
      `What keeps ${client.business_name} growing isn't just the product. It's the way the team shows up for the ${client.city} community: supporting local causes, partnering with neighboring small businesses, and treating every customer like a friend worth keeping.`,
    ],
    quote: `We're not trying to be the biggest. We're trying to be the best — for the people who walk through our door.`,
    quoteAttribution: `Owner, ${client.business_name}`,
    cta: `Stop in or call today — and find out why so many of your neighbors already did.`,
    status: "Draft",
  };
}

function fallbackTopics(client: ClientProfile): ArticleTopic[] {
  const intake = (client.intakeAnswers || {}) as Record<string, string>;
  const svc = (intake.q3 || "").split(",")[0]?.trim() || "our industry";
  return [
    { title: `Three Questions Every ${client.city} Neighbor Should Ask Before Hiring`, hook: `A simple checklist that separates great providers from the rest — from someone who sees it every day.` },
    { title: `What Most People Get Wrong About ${svc}`, hook: `The honest truth about the details that actually matter — and the myths worth ignoring.` },
    { title: `How ${client.business_name} Got Its Start in ${client.city}`, hook: `The founding story, the early lessons, and what it taught us about building trust locally.` },
  ];
}
