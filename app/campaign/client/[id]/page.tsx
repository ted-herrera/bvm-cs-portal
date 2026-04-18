"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import type { CampaignClient, CampaignDirection } from "@/lib/campaign";

/* ─── Constants ────────────────────────────────────────────────────────────── */

const STAGES = ["approved", "production", "review", "delivered"] as const;
const STAGE_LABELS: Record<string, string> = {
  approved: "Campaign Approved",
  production: "In Production",
  review: "Review",
  delivered: "Delivered",
};

function stageIndex(stage: string): number {
  const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return idx >= 0 ? idx : 0;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function marketRank(score: number): string {
  if (score > 90) return "Top 8%";
  if (score > 80) return "Top 15%";
  if (score > 70) return "Top 30%";
  if (score > 60) return "Top 45%";
  return "Top 60%";
}

function formatIncome(raw: string): string {
  const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return raw || "--";
  return "$" + num.toLocaleString();
}

function formatHouseholds(raw: string): string {
  const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return raw || "--";
  return num.toLocaleString();
}

function parseNumeric(raw: string): number {
  const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Eyebrow Label ───────────────────────────────────────────────────────── */

function Eyebrow({ text }: { text: string }) {
  return (
    <div style={{
      color: "#F5C842", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.15em", marginBottom: 8,
    }}>{text}</div>
  );
}

/* ─── LMS Modal ────────────────────────────────────────────────────────────── */

function LmsModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1B2A4A", borderRadius: 16, padding: 32, width: "90%",
        maxWidth: 720, border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
            width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16,
          }}>&#x2715;</button>
        </div>
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title={title}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Nav Items ────────────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { icon: "\uD83D\uDCCA", label: "Market Intel", section: "section-market" },
  { icon: "\uD83D\uDCF0", label: "Your Campaign", section: "section-campaign" },
  { icon: "\uD83C\uDF10", label: "Full Suite", section: "section-suite" },
  { icon: "\uD83D\uDCAC", label: "Messages", section: "section-messages" },
  { icon: "\uD83C\uDF93", label: "Learning", section: "section-learning" },
];

/* ─── Main Component ───────────────────────────────────────────────────────── */

export default function CampaignClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<CampaignClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionSending, setRevisionSending] = useState(false);
  const [revisionSent, setRevisionSent] = useState(false);
  const [editingTagline, setEditingTagline] = useState(false);
  const [taglineInput, setTaglineInput] = useState("");
  const [taglineSaving, setTaglineSaving] = useState(false);
  const [upsellSent, setUpsellSent] = useState(false);
  const [upsellSending, setUpsellSending] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // LMS
  const [lmsModal, setLmsModal] = useState<string | null>(null);

  // Messages
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string; timestamp: string }>>([]);
  const [clientMsgInput, setClientMsgInput] = useState("");
  const [clientMsgSending, setClientMsgSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sidebar messages expand
  const [sidebarMsgsExpanded, setSidebarMsgsExpanded] = useState(false);

  // Locked section CTAs
  const [bizProfileSent, setBizProfileSent] = useState(false);
  const [bizProfileSending, setBizProfileSending] = useState(false);
  const [expertContribSent, setExpertContribSent] = useState(false);
  const [expertContribSending, setExpertContribSending] = useState(false);

  // Active nav section
  const [activeSection, setActiveSection] = useState("section-market");
  const centerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Check onboarding
  useEffect(() => {
    if (client && client.stage !== "intake" && client.stage !== "tearsheet") {
      const key = `campaign_onboarded_${id}`;
      if (!localStorage.getItem(key)) {
        setShowOnboarding(true);
      }
    }
  }, [client, id]);

  // Load messages
  useEffect(() => {
    if (!client) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, client]);

  // IntersectionObserver for active nav section
  useEffect(() => {
    if (!client || client.stage === "intake" || client.stage === "tearsheet") return;
    const sectionIds = NAV_ITEMS.map((n) => n.section);
    const observers: IntersectionObserver[] = [];

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    // Delay to let DOM render
    const timer = setTimeout(() => {
      sectionIds.forEach((sid) => {
        const el = document.getElementById(sid);
        if (el) {
          const observer = new IntersectionObserver(handleIntersect, {
            root: centerRef.current,
            threshold: 0.2,
          });
          observer.observe(el);
          observers.push(observer);
        }
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      observers.forEach((o) => o.disconnect());
    };
  }, [client]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/campaign/message/${id}`);
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
    } catch { /* ignore */ }
  }

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function loadClient() {
    // Demo/fallback mode for Design Center IDs
    if (id.startsWith("client-")) {
      setClient({
        id, created_at: new Date().toISOString(), business_name: "Ted's Pizza",
        category: "Restaurant", city: "Tulsa", zip: "74103", services: "Wood-fired pizza, craft beer, catering",
        ad_size: "1/4 page", tagline: "Tulsa's favorite slice.", rep_id: "demo",
        stage: "approved", approved_at: new Date().toISOString(),
        sbr_data: { opportunityScore: 94, medianIncome: "74200", households: "52000", topCategories: ["Restaurants", "Food", "Catering"], competitorGap: "Low competition in pizza category", incomeRing: "Ring 1 · $65-90K", marketBrief: "Strong opportunity in the Tulsa restaurant market." },
        generated_directions: [{ name: "Bold & Direct", imageUrl: "", description: "Strong headline, direct offer", prompt: "" }],
        selected_direction: "Bold & Direct", revisions: null,
      } as CampaignClient);
      setLoading(false);
      return;
    }
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

  // Fire confetti on first load when approved
  useEffect(() => {
    if (client && client.stage !== "intake" && client.stage !== "tearsheet" && !confettiFired) {
      setConfettiFired(true);
      import("canvas-confetti").then((mod) => {
        mod.default({ particleCount: 150, spread: 90, colors: ["#F5C842", "#1B2A4A", "#ffffff"], origin: { x: 0.5, y: 0.3 } });
        setTimeout(() => {
          mod.default({ particleCount: 80, spread: 70, colors: ["#F5C842", "#3B82F6", "#ffffff"], origin: { x: 0.25, y: 0.5 } });
        }, 400);
        setTimeout(() => {
          mod.default({ particleCount: 80, spread: 70, colors: ["#F5C842", "#8B5CF6", "#ffffff"], origin: { x: 0.75, y: 0.5 } });
        }, 700);
      });
    }
  }, [client, confettiFired]);

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
    } catch (e) { console.error("Revision error:", e); }
    setRevisionSending(false);
  }

  async function saveTagline() {
    if (!taglineInput.trim()) return;
    setTaglineSaving(true);
    try {
      await fetch(`/api/campaign/revision/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tagline", value: taglineInput.trim() }),
      });
      setClient((prev) => prev ? { ...prev, tagline: taglineInput.trim() } : prev);
      setEditingTagline(false);
      setTaglineInput("");
    } catch (e) { console.error("Tagline save error:", e); }
    setTaglineSaving(false);
  }

  async function sendUpsellInterest() {
    setUpsellSending(true);
    try {
      await fetch(`/api/campaign/revision/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Client interested in full suite", type: "upsell-interest", value: "full-suite" }),
      });
      setUpsellSent(true);
    } catch (e) { console.error("Upsell error:", e); }
    setUpsellSending(false);
  }

  async function sendBizProfileInterest() {
    setBizProfileSending(true);
    try {
      await fetch(`/api/campaign/revision/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Client interested in business profile", type: "business-profile-interest", value: "business-profile" }),
      });
      setBizProfileSent(true);
    } catch (e) { console.error("Biz profile error:", e); }
    setBizProfileSending(false);
  }

  async function sendExpertContribInterest() {
    setExpertContribSending(true);
    try {
      await fetch(`/api/campaign/revision/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Client interested in expert contributor", type: "expert-contributor-interest", value: "expert-contributor" }),
      });
      setExpertContribSent(true);
    } catch (e) { console.error("Expert contrib error:", e); }
    setExpertContribSending(false);
  }

  async function sendClientMessage() {
    if (!clientMsgInput.trim()) return;
    setClientMsgSending(true);
    try {
      const res = await fetch(`/api/campaign/message/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "client", content: clientMsgInput }),
      });
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
      setClientMsgInput("");
    } catch { /* ignore */ }
    setClientMsgSending(false);
  }

  function dismissOnboarding() {
    localStorage.setItem(`campaign_onboarded_${id}`, "true");
    setShowOnboarding(false);
  }

  function handlePrintReport() {
    window.print();
  }

  function scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  /* ─── Loading ────────────────────────────────────────────────────────────── */

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
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, padding: 32 }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 40, filter: "brightness(0) invert(1)" }} />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#fff", margin: 0, textAlign: "center" }}>
          Your campaign portal is being set up
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0, textAlign: "center", maxWidth: 400 }}>
          Your rep is preparing your campaign. You&apos;ll receive a link when everything is ready.
        </p>
        <button onClick={() => window.location.href = "mailto:support@bestversionmedia.com"} style={{
          background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 10,
          padding: "14px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 8,
        }}>
          Contact Your Rep
        </button>
      </div>
    );
  }

  /* ─── STATE 1: Before Approval ──────────────────────────────────────────── */

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
        <Link href={`/campaign/tearsheet/${id}`} style={{
          background: "#F5C842", color: "#1B2A4A", borderRadius: 10,
          padding: "14px 32px", fontSize: 15, fontWeight: 800, textDecoration: "none", marginTop: 8,
        }}>
          Review Your Campaign &rarr;
        </Link>
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

  /* ─── STATE 2: Post-Approval (Dashboard Portal) ──────────────────────── */

  const sbr = (client.sbr_data || {}) as Record<string, unknown>;
  const currentStage = stageIndex(client.stage);
  const approvedDir = (client.generated_directions || []).find(
    (d: CampaignDirection) => d.name === client.selected_direction
  );
  const oppScore = (sbr.opportunityScore as number) || 0;
  const medianIncomeRaw = (sbr.medianIncome as string) || "";
  const medianIncome = formatIncome(medianIncomeRaw);
  const medianIncomeNum = parseNumeric(medianIncomeRaw);
  const householdsRaw = (sbr.households as string) || "";
  const households = formatHouseholds(householdsRaw);
  const householdsNum = parseNumeric(householdsRaw);

  const LMS_MODULES = [
    { num: 1, title: "Understanding Your Market Report", desc: "Learn what your opportunity score means and how BVM uses it to position your campaign." },
    { num: 2, title: "Getting Results From Print", desc: "Best practices for local print advertising -- what works, what doesn't, and how to measure it." },
    { num: 3, title: "Growing With BVM", desc: "Explore how print + digital + web work together to build a dominant local presence." },
  ];

  const stageColorMap: Record<string, string> = {
    approved: "#22c55e",
    production: "#f59e0b",
    review: "#3B82F6",
    delivered: "#8B5CF6",
  };
  const stageBadgeColor = stageColorMap[client.stage] || "#F5C842";

  const nextStepText = client.stage === "approved"
    ? "Your ad is being prepared"
    : client.stage === "production"
    ? "Final review coming soon"
    : client.stage === "delivered"
    ? "Campaign complete!"
    : "Your campaign is in progress";

  const sidebarMessages = sidebarMsgsExpanded ? chatMessages : chatMessages.slice(-3);

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes goldPulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(245,200,66,0.25); } 50% { box-shadow: 0 0 0 12px rgba(245,200,66,0.05); } }
        @keyframes mapPulse { 0%, 100% { opacity: 0.6; r: 6; } 50% { opacity: 1; r: 10; } }
        @media print {
          body * { visibility: hidden !important; }
          #market-report, #market-report * { visibility: visible !important; }
          #market-report {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; background: #fff !important; color: #1a2332 !important;
            padding: 40px !important; border: none !important; border-radius: 0 !important;
          }
          #market-report h2, #market-report h3, #market-report h4 { color: #1B2A4A !important; }
          #market-report .metric-val { color: #1B2A4A !important; }
          #market-report::before {
            content: "Market Intelligence Report";
            display: block; font-size: 28px; font-weight: 800;
            color: #1B2A4A; margin-bottom: 8px; font-family: 'Playfair Display', serif;
          }
          #market-report::after {
            content: "Powered by BVM \\00b7 Bruno Analytics";
            display: block; font-size: 11px; color: #999; margin-top: 24px;
          }
        }
      `}</style>

      {/* LMS Modal */}
      {lmsModal && <LmsModal title={lmsModal} onClose={() => setLmsModal(null)} />}

      {/* ── FIXED TOP HEADER (72px) ─────────────────────────────────────── */}
      <div style={{
        height: 72, background: "#1B2A4A", display: "flex", alignItems: "center",
        padding: "0 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        position: "sticky", top: 0, zIndex: 40,
        justifyContent: "space-between",
      }}>
        {/* Left: Logo + Business Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <img src="/bvm_logo.png" alt="BVM" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#fff" }}>
            {client.business_name}
          </span>
        </div>

        {/* Center: Progress bar nodes inline */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {STAGES.map((stage, i) => (
            <div key={stage} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: i <= currentStage ? "#F5C842" : "rgba(255,255,255,0.1)",
                  color: i <= currentStage ? "#1B2A4A" : "rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800,
                  ...(i === currentStage ? { animation: "goldPulse 2s ease infinite" } : {}),
                }}>
                  {i < currentStage ? "\u2713" : i + 1}
                </div>
                <div style={{ fontSize: 9, color: i <= currentStage ? "#F5C842" : "rgba(255,255,255,0.3)", marginTop: 4, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {STAGE_LABELS[stage]}
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ width: 48, height: 2, background: i < currentStage ? "#F5C842" : "rgba(255,255,255,0.1)", margin: "0 6px", marginBottom: 18 }} />
              )}
            </div>
          ))}
        </div>

        {/* Right: Stage badge */}
        <div style={{
          background: `${stageBadgeColor}20`, color: stageBadgeColor,
          fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 20,
          border: `1px solid ${stageBadgeColor}40`, flexShrink: 0, whiteSpace: "nowrap",
        }}>
          {STAGE_LABELS[client.stage] || client.stage}
        </div>
      </div>

      {/* ── THREE COLUMN LAYOUT ────────────────────────────────────────── */}
      <div style={{ display: "flex", height: "calc(100vh - 72px)" }}>

        {/* ── LEFT COLUMN (220px, nav) ─────────────────────────────────── */}
        <div style={{
          width: 220, flexShrink: 0, background: "#0d1a2e",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          position: "sticky", top: 72, height: "calc(100vh - 72px)",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          overflowY: "auto",
        }}>
          <div>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.section}
                onClick={() => scrollToSection(item.section)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "14px 20px", width: "100%", border: "none",
                  background: "transparent", cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                  color: activeSection === item.section ? "#F5C842" : "rgba(255,255,255,0.5)",
                  borderLeft: activeSection === item.section ? "3px solid #F5C842" : "3px solid transparent",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Rep Card at bottom */}
          <div style={{ padding: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "#F5C842",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, color: "#1B2A4A", fontSize: 15, flexShrink: 0,
              }}>TH</div>
              <div>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>Ted Herrera</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Your BVM AE</div>
              </div>
            </div>
            <button
              onClick={() => scrollToSection("section-messages")}
              style={{
                background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                width: "100%",
              }}
            >Message Rep</button>
          </div>
        </div>

        {/* ── CENTER COLUMN (flex-1, scrollable) ───────────────────────── */}
        <div
          ref={centerRef}
          style={{
            flex: 1, overflowY: "auto", padding: 24,
          }}
        >

          {/* ── SECTION 1: MARKET INTELLIGENCE TEASER ──────────────────── */}
          <div id="section-market" style={{ marginBottom: 32 }}>
            <Eyebrow text="TERRITORY INTELLIGENCE" />
            <div style={{
              background: "#243454", border: "1px solid rgba(245,200,66,0.2)",
              borderRadius: 16, padding: 32,
            }}>
              <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
                {/* Left side */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 12px" }}>
                    Your Market Report
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 20px" }}>
                    See income heat maps, opportunity scores, and competitor gaps for your exact market — the same data enterprise companies pay $20,000/year for.
                  </p>

                  {/* Mini stat pills */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 14px" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(oppScore), lineHeight: 1 }}>{oppScore}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Score</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 14px" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>{medianIncome}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Income</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 14px" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>{households}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Households</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 14px" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>{marketRank(oppScore)}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Rank</div>
                    </div>
                  </div>

                  <Link href={`/campaign/intelligence/${id}`} style={{
                    display: "inline-block", background: "#F5C842", color: "#1B2A4A",
                    borderRadius: 8, padding: "12px 24px", fontWeight: 700,
                    fontSize: 14, textDecoration: "none",
                  }}>
                    Explore Your Market &rarr;
                  </Link>
                </div>

                {/* Right side: SVG map teaser */}
                <div style={{ width: 300, flexShrink: 0 }}>
                  <div style={{
                    background: "#0d1a2e", borderRadius: 12, overflow: "hidden",
                    position: "relative", height: 220,
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {/* Gradient overlay */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(135deg, rgba(27,42,74,0.3) 0%, rgba(245,200,66,0.08) 100%)",
                      zIndex: 1,
                    }} />
                    <svg width="300" height="220" viewBox="0 0 300 220" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                      {/* Grid lines (streets) */}
                      <line x1="50" y1="0" x2="50" y2="220" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <line x1="100" y1="0" x2="100" y2="220" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <line x1="150" y1="0" x2="150" y2="220" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="200" y1="0" x2="200" y2="220" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <line x1="250" y1="0" x2="250" y2="220" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <line x1="0" y1="40" x2="300" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <line x1="0" y1="110" x2="300" y2="110" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="0" y1="150" x2="300" y2="150" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <line x1="0" y1="190" x2="300" y2="190" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      {/* Concentric circles */}
                      <circle cx="150" cy="110" r="80" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                      <circle cx="150" cy="110" r="50" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="4 4" />
                      <circle cx="150" cy="110" r="25" fill="none" stroke="rgba(245,200,66,0.3)" strokeWidth="1" />
                      {/* Gold pulsing center dot */}
                      <circle cx="150" cy="110" r="4" fill="#F5C842" opacity="0.8">
                        <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="150" cy="110" r="3" fill="#F5C842" />
                    </svg>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 6, marginTop: 8,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842" }} />
                    <span style={{ fontSize: 10, color: "#F5C842", fontWeight: 600 }}>Powered by Bruno Territory Intelligence</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: YOUR CAMPAIGN ────────────────────────────────── */}
          <div id="section-campaign" style={{ marginBottom: 32 }}>
            <Eyebrow text="YOUR CAMPAIGN" />
            <div style={{
              background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 32,
            }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 24px" }}>Your Ad Direction</h2>

              {/* Approved ad image centered */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                {approvedDir?.imageUrl ? (
                  <div style={{ display: "inline-block", maxWidth: 400, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", display: "block" }} />
                  </div>
                ) : (
                  <div style={{ display: "inline-block", width: 400, height: 320, background: "rgba(255,255,255,0.04)", borderRadius: 12, lineHeight: "320px", color: "rgba(255,255,255,0.2)" }}>No image</div>
                )}
              </div>

              {/* Tagline */}
              {client.tagline ? (
                <p style={{ fontSize: 18, color: "#F5C842", fontStyle: "italic", fontFamily: "'Playfair Display', serif", margin: "0 0 16px", textAlign: "center" }}>&ldquo;{client.tagline}&rdquo;</p>
              ) : editingTagline ? (
                <div style={{ marginBottom: 16 }}>
                  <input type="text" value={taglineInput} onChange={(e) => setTaglineInput(e.target.value)} placeholder="Enter your tagline..." style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={saveTagline} disabled={taglineSaving || !taglineInput.trim()} style={{ background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{taglineSaving ? "Saving..." : "Save"}</button>
                    <button onClick={() => setEditingTagline(false)} style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <button onClick={() => setEditingTagline(true)} style={{ background: "transparent", border: "none", color: "#F5C842", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: 0 }}>Add Your Tagline &rarr;</button>
                </div>
              )}

              {/* Ad size + dimensions */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>
                  {client.ad_size?.toUpperCase() || "AD"}
                </span>
                {client.selected_direction && (
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 10 }}>{client.selected_direction}</span>
                )}
              </div>

              {/* Status card */}
              <div style={{ background: client.stage === "production" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${client.stage === "production" ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: client.stage === "production" ? "#f59e0b" : "#22c55e", fontWeight: 600, margin: 0 }}>
                  {client.stage === "production" ? "Your campaign is in production" : client.stage === "delivered" ? "Campaign delivered!" : "Campaign approved"}
                </p>
              </div>

              {/* Request a change */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
                <h3 style={{ fontSize: 16, color: "#fff", margin: "0 0 12px", fontWeight: 700 }}>Request a Change</h3>
                <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="Describe what you'd like changed..." style={{ width: "100%", minHeight: 80, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 14, fontSize: 14, color: "#fff", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                <button onClick={submitRevision} disabled={!revisionNote.trim() || revisionSending} style={{ marginTop: 8, background: revisionNote.trim() ? "#F5C842" : "rgba(255,255,255,0.08)", color: revisionNote.trim() ? "#1B2A4A" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: revisionNote.trim() ? "pointer" : "not-allowed" }}>
                  {revisionSending ? "Sending..." : "Submit Change Request"}
                </button>
                {revisionSent && <p style={{ fontSize: 13, color: "#22c55e", margin: "8px 0 0" }}>Change request submitted -- your rep will be in touch.</p>}
              </div>

              {/* Download preview */}
              {approvedDir?.imageUrl && (
                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <a href={approvedDir.imageUrl} download={`${client.business_name}-campaign.png`} style={{ display: "inline-block", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Download Preview</a>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 3: CAMPAIGN SUITE ───────────────────────────────── */}
          <div id="section-suite" style={{ marginBottom: 32 }}>
            <Eyebrow text="CAMPAIGN SUITE" />
            <div style={{
              background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 32,
            }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 4px" }}>See Your Complete BVM Campaign</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "0 0 4px" }}>This is what a full print + digital + web campaign looks like for {client.business_name}.</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "0 0 28px" }}>Your current campaign includes {client.ad_size} print. The preview below shows the complete suite.</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
                {/* Print - Active */}
                <div style={{ background: "rgba(245,200,66,0.04)", border: "2px solid rgba(245,200,66,0.3)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ height: 200, background: "#0d1a2e", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {approvedDir?.imageUrl ? <img src={approvedDir.imageUrl} alt="Print Ad" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 13 }}>Preview</div>}
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Your Magazine Ad</span>
                      <span style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>Active</span>
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>PRINT</p>
                  </div>
                </div>

                {/* Web - Available */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ height: 200, background: "#0d1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="160" height="120" viewBox="0 0 160 120">
                      <rect x="20" y="8" width="120" height="80" rx="6" fill="#243454" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                      <rect x="28" y="16" width="104" height="64" rx="2" fill="url(#webGrad)" />
                      <rect x="10" y="88" width="140" height="8" rx="4" fill="#243454" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                      <defs><linearGradient id="webGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1B2A4A" /><stop offset="100%" stopColor="#F5C842" stopOpacity="0.2" /></linearGradient></defs>
                      <text x="80" y="52" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="DM Sans">{client.business_name}</text>
                    </svg>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Your Business Website</span>
                      <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>Available</span>
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>WEB</p>
                  </div>
                </div>

                {/* Digital - Available */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ height: 200, background: "#0d1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="80" height="140" viewBox="0 0 80 140">
                      <rect x="8" y="4" width="64" height="132" rx="12" fill="#243454" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                      <rect x="14" y="20" width="52" height="100" rx="2" fill="url(#digGrad)" />
                      <defs><linearGradient id="digGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" /><stop offset="100%" stopColor="#F5C842" stopOpacity="0.2" /></linearGradient></defs>
                      <circle cx="40" cy="130" r="4" fill="rgba(255,255,255,0.1)" />
                      <text x="40" y="72" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="DM Sans">Digital Ad</text>
                    </svg>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Digital Ad Campaign</span>
                      <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>Available</span>
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>DIGITAL</p>
                  </div>
                </div>
              </div>

              {/* Upsell CTA */}
              <div style={{ textAlign: "center" }}>
                {upsellSent ? (
                  <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "16px 24px", display: "inline-block" }}>
                    <p style={{ fontSize: 15, color: "#22c55e", fontWeight: 700, margin: 0 }}>Your rep has been notified -- expect a call soon!</p>
                  </div>
                ) : (
                  <button onClick={sendUpsellInterest} disabled={upsellSending} style={{
                    background: "linear-gradient(135deg, #F5C842, #e6b935)", color: "#1B2A4A",
                    border: "none", borderRadius: 10, padding: "16px 40px",
                    fontSize: 15, fontWeight: 800, cursor: upsellSending ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 16px rgba(245,200,66,0.3)", opacity: upsellSending ? 0.6 : 1,
                  }}>{upsellSending ? "Sending..." : "Talk to Your Rep About the Full Suite \u2192"}</button>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 4: MESSAGES ─────────────────────────────────────── */}
          <div id="section-messages" style={{ marginBottom: 32 }}>
            <Eyebrow text="MESSAGES" />
            <div style={{
              background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 32,
            }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: "0 0 16px" }}>Messages</h2>

              <div style={{ marginBottom: 16, maxHeight: 400, overflowY: "auto" }}>
                {chatMessages.length === 0 ? (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>No messages yet. Start the conversation!</p>
                ) : (
                  chatMessages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#fff", padding: "1px 6px", borderRadius: 4,
                          background: m.role === "rep" ? "#2d3e50" : "#0891b2",
                        }}>{m.role === "rep" ? "REP" : "YOU"}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#fff", margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={clientMsgInput}
                  onChange={(e) => setClientMsgInput(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: 12, fontSize: 13, color: "#fff", resize: "none", outline: "none", boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={sendClientMessage}
                  disabled={!clientMsgInput.trim() || clientMsgSending}
                  style={{
                    background: clientMsgInput.trim() ? "#F5C842" : "rgba(255,255,255,0.08)",
                    color: clientMsgInput.trim() ? "#1B2A4A" : "rgba(255,255,255,0.3)",
                    border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13,
                    fontWeight: 700, cursor: clientMsgInput.trim() ? "pointer" : "not-allowed",
                    alignSelf: "flex-end",
                  }}
                >{clientMsgSending ? "..." : "Send"}</button>
              </div>
            </div>
          </div>

          {/* ── SECTION 5: LEARNING CENTER ──────────────────────────────── */}
          <div id="section-learning" style={{ marginBottom: 32 }}>
            <Eyebrow text="LEARNING CENTER" />
            <div style={{
              background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 32,
            }}>
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                {/* Left sub: Onboarding */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  {showOnboarding ? (
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: "0 0 16px" }}>Getting Started</h3>
                      <div style={{ borderLeft: "3px solid #F5C842", paddingLeft: 20 }}>
                        {[
                          { num: 1, title: "We're building your ad", desc: "Our design team is producing your campaign based on the direction you approved." },
                          { num: 2, title: "You'll review and confirm", desc: "We'll notify you when your ad is ready for final review." },
                          { num: 3, title: "Your campaign goes live", desc: "Your ad runs in the next available edition in your market." },
                        ].map((step) => (
                          <div key={step.num} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", background: "#F5C842",
                              color: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 800, flexShrink: 0,
                            }}>{step.num}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{step.title}</div>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{step.desc}</div>
                            </div>
                          </div>
                        ))}
                        <button onClick={dismissOnboarding} style={{
                          background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8,
                          padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                        }}>Got it &rarr;</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16, color: "#22c55e" }}>{"\u2713"}</span>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "rgba(255,255,255,0.5)", margin: 0 }}>Getting Started</h3>
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>Onboarding complete</p>
                    </div>
                  )}
                </div>

                {/* Right sub: LMS Modules */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: "0 0 16px" }}>Campaign Success Guide</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {LMS_MODULES.map((mod) => (
                      <div key={mod.num} style={{
                        background: "#1B2A4A", borderRadius: 12, padding: "16px 18px",
                        border: "1px solid rgba(255,255,255,0.08)", position: "relative",
                      }}>
                        <span style={{
                          position: "absolute", top: 10, left: 12,
                          background: "rgba(245,200,66,0.15)", color: "#F5C842",
                          fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
                        }}>Module {mod.num}</span>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "22px 0 6px" }}>{mod.title}</h4>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: "0 0 12px" }}>{mod.desc}</p>
                        <button onClick={() => setLmsModal(mod.title)} style={{
                          background: "transparent", border: "none", color: "#F5C842",
                          fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0,
                        }}>Start &rarr;</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── BUSINESS PROFILE (locked) ───────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <Eyebrow text="PREMIUM" />
            <div style={{
              background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 32,
            }}>
              <div style={{ borderLeft: "3px solid #F5C842", paddingLeft: 24, position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0, fontSize: 20, opacity: 0.5 }}>{"\uD83D\uDD12"}</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 8px" }}>Business Profile</h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 16px", lineHeight: 1.6 }}>
                  Share your story with your neighborhood
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px", lineHeight: 1.6 }}>
                  A Business Profile is a full-page editorial feature in your BVM magazine. It tells your story, highlights your expertise, and introduces you to thousands of households in your community. Think of it as a magazine article about your business -- written, designed, and distributed by BVM.
                </p>

                {/* Preview mockup */}
                <div style={{
                  background: "#1B2A4A", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: "24px 28px", marginBottom: 20, maxWidth: 480,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>PREVIEW</div>
                  <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: "0 0 6px" }}>
                    {client.business_name}: {client.tagline || "Your Neighborhood Partner"}
                  </h4>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 12px", lineHeight: 1.5 }}>
                    Meet the team behind {client.business_name}, serving {client.city} with quality {client.category.toLowerCase()} services...
                  </p>
                  <div style={{ height: 80, background: "rgba(255,255,255,0.03)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Full article preview</span>
                  </div>
                </div>

                <span style={{
                  display: "inline-block", background: "rgba(245,158,11,0.15)", color: "#f59e0b",
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6, marginBottom: 16,
                }}>Available with 24-month agreement</span>

                <div>
                  {bizProfileSent ? (
                    <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "14px 20px", display: "inline-block" }}>
                      <p style={{ fontSize: 14, color: "#22c55e", fontWeight: 700, margin: 0 }}>Your rep will reach out with details on Business Profiles.</p>
                    </div>
                  ) : (
                    <button onClick={sendBizProfileInterest} disabled={bizProfileSending} style={{
                      background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8,
                      padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: bizProfileSending ? "not-allowed" : "pointer",
                      opacity: bizProfileSending ? 0.6 : 1,
                    }}>{bizProfileSending ? "Sending..." : "Request Your Business Profile \u2192"}</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── EXPERT CONTRIBUTOR (locked) ──────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <Eyebrow text="PREMIUM" />
            <div style={{
              background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 32,
            }}>
              <div style={{ borderLeft: "3px solid #F5C842", paddingLeft: 24, position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0, fontSize: 20, opacity: 0.5 }}>{"\uD83D\uDD12"}</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 8px" }}>Expert Contributor</h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 16px", lineHeight: 1.6 }}>
                  Become the trusted voice in your neighborhood
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 16px", lineHeight: 1.6 }}>
                  As an Expert Contributor, you write a recurring column in your BVM magazine on topics related to your industry. This positions you as the go-to authority in your neighborhood and builds trust with thousands of local households every month.
                </p>

                {/* Primer topic bullets */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 10px", fontWeight: 600 }}>Example topics for {client.category}:</p>
                  {[
                    `Seasonal tips for ${client.category.toLowerCase()} customers`,
                    "Common mistakes homeowners make (and how to avoid them)",
                    `What to look for when choosing a ${client.category.toLowerCase()} provider`,
                    "Behind the scenes: how our team serves your neighborhood",
                  ].map((topic, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842", flexShrink: 0, marginTop: 6 }} />
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{topic}</span>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "0 0 16px", lineHeight: 1.5 }}>
                  Submissions are reviewed by the BVM editorial team. Articles should be 300-500 words, educational in nature, and free of direct promotional language. BVM reserves the right to edit for clarity and style.
                </p>

                <div>
                  {expertContribSent ? (
                    <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "14px 20px", display: "inline-block" }}>
                      <p style={{ fontSize: 14, color: "#22c55e", fontWeight: 700, margin: 0 }}>Your rep will reach out with details on becoming an Expert Contributor.</p>
                    </div>
                  ) : (
                    <button onClick={sendExpertContribInterest} disabled={expertContribSending} style={{
                      background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8,
                      padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: expertContribSending ? "not-allowed" : "pointer",
                      opacity: expertContribSending ? 0.6 : 1,
                    }}>{expertContribSending ? "Sending..." : "Become an Expert Contributor \u2192"}</button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>{/* END CENTER COLUMN */}

        {/* ── RIGHT COLUMN (260px, sticky sidebar) ─────────────────────── */}
        <div style={{
          width: 260, flexShrink: 0, position: "sticky", top: 72,
          height: "calc(100vh - 72px)", overflowY: "auto",
          background: "#0d1a2e", padding: 20,
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}>

          {/* Approved Ad Image */}
          {approvedDir?.imageUrl ? (
            <div style={{ width: "100%", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
              <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", display: "block" }} />
            </div>
          ) : (
            <div style={{
              width: "100%", height: 180, background: "rgba(255,255,255,0.04)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.2)", fontSize: 12, marginBottom: 12,
            }}>No ad preview</div>
          )}

          {/* Ad size badge */}
          <div style={{ marginBottom: 12 }}>
            <span style={{
              background: "rgba(245,200,66,0.15)", color: "#F5C842",
              fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
            }}>{client.ad_size?.toUpperCase() || "AD"}</span>
          </div>

          {/* Tagline */}
          {client.tagline && (
            <p style={{ fontSize: 15, color: "#F5C842", fontStyle: "italic", fontFamily: "'Playfair Display', serif", margin: "0 0 14px" }}>
              &ldquo;{client.tagline}&rdquo;
            </p>
          )}

          {/* Stage Card */}
          <div style={{
            background: "#243454", borderRadius: 12, padding: 16, marginBottom: 14,
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%", background: "#F5C842",
                animation: "goldPulse 2s ease infinite",
              }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                {STAGE_LABELS[client.stage] || client.stage}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
              {nextStepText}
            </p>
          </div>

          {/* Download Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {approvedDir?.imageUrl ? (
              <a href={approvedDir.imageUrl} download={`${client.business_name}-campaign.png`} style={{
                display: "block", textAlign: "center", textDecoration: "none",
                background: "#F5C842", color: "#1B2A4A", borderRadius: 10,
                padding: "10px 16px", fontSize: 12, fontWeight: 800,
              }}>Download Ad Preview</a>
            ) : (
              <button disabled style={{
                background: "rgba(245,200,66,0.3)", color: "#1B2A4A", border: "none", borderRadius: 10,
                padding: "10px 16px", fontSize: 12, fontWeight: 800, cursor: "not-allowed", opacity: 0.5,
              }}>Download Ad Preview</button>
            )}
            <button onClick={handlePrintReport} style={{
              background: "transparent", color: "#F5C842",
              border: "1px solid rgba(245,200,66,0.3)", borderRadius: 10,
              padding: "10px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}>Download Market Report</button>
          </div>

          {/* Quick Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              background: "#243454", borderRadius: 10, padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(oppScore), lineHeight: 1 }}>{oppScore}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Opportunity Score</div>
            </div>
            <div style={{
              background: "#243454", borderRadius: 10, padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>{medianIncome}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Median Income</div>
            </div>
            <div style={{
              background: "#243454", borderRadius: 10, padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>{households}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Households</div>
            </div>
          </div>

        </div>{/* END RIGHT COLUMN */}

      </div>{/* END THREE COLUMN LAYOUT */}
    </div>
  );
}
