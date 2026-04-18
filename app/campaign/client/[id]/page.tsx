"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
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
  if (score > 90) return "Top 10%";
  if (score > 80) return "Top 20%";
  if (score > 70) return "Top 35%";
  return "Top 50%";
}

function formatIncome(raw: string): string {
  const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return raw || "—";
  return "$" + num.toLocaleString();
}

function formatHouseholds(raw: string): string {
  const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return raw || "—";
  return num.toLocaleString();
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Animated Counter Hook ────────────────────────────────────────────────── */

function useAnimatedCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || target <= 0) return;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  return value;
}

/* ─── Section Fade-In Hook ─────────────────────────────────────────────────── */

function useFadeIn(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Metric Card ──────────────────────────────────────────────────────────── */

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#243454", borderRadius: 12, padding: "20px 20px 16px",
      borderLeft: "3px solid #F5C842",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {children}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 6 }}>{label}</div>
    </div>
  );
}

/* ─── Section Wrapper ──────────────────────────────────────────────────────── */

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      id={id}
      style={{
        background: "#243454",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 32,
        marginBottom: 24,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      {children}
    </div>
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
          }}>✕</button>
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);
  const [repMessage, setRepMessage] = useState("");
  const [repMsgSending, setRepMsgSending] = useState(false);
  const [repMsgSent, setRepMsgSent] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // LMS
  const [lmsModal, setLmsModal] = useState<string | null>(null);

  // Messages
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string; timestamp: string }>>([]);
  const [clientMsgInput, setClientMsgInput] = useState("");
  const [clientMsgSending, setClientMsgSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    if (client && client.stage === "approved" && !confettiFired) {
      setConfettiFired(true);
      import("canvas-confetti").then((mod) => {
        mod.default({ particleCount: 150, spread: 90, colors: ["#F5C842", "#1B2A4A", "#ffffff"], origin: { y: 0.3 } });
        setTimeout(() => {
          mod.default({ particleCount: 80, spread: 70, colors: ["#F5C842", "#3B82F6", "#ffffff"], origin: { x: 0.3, y: 0.5 } });
        }, 400);
        setTimeout(() => {
          mod.default({ particleCount: 80, spread: 70, colors: ["#F5C842", "#8B5CF6", "#ffffff"], origin: { x: 0.7, y: 0.5 } });
        }, 700);
      });
    }
  }, [client, confettiFired]);

  // Initialize Leaflet map
  const initMap = useCallback(() => {
    if (mapLoaded || !mapRef.current || !client?.zip) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!(window as unknown as Record<string, unknown>).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => buildMap();
      document.head.appendChild(script);
    } else {
      buildMap();
    }

    function buildMap() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const lat = 36.15 + (parseInt(client!.zip || "0") % 100) * 0.01;
      const lng = -95.99 + (parseInt(client!.zip || "0") % 50) * 0.01;

      const map = L.map(mapRef.current, {
        center: [lat, lng], zoom: 12, zoomControl: false, attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

      L.circle([lat, lng], { radius: 16093, color: "#8B5CF6", fillColor: "#8B5CF6", fillOpacity: 0.1, weight: 1 }).addTo(map).bindTooltip("Full Distribution", { permanent: false });
      L.circle([lat, lng], { radius: 8046, color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.2, weight: 1 }).addTo(map).bindTooltip("Extended Reach", { permanent: false });
      L.circle([lat, lng], { radius: 3218, color: "#F5C842", fillColor: "#F5C842", fillOpacity: 0.3, weight: 1 }).addTo(map).bindTooltip("Core Market", { permanent: false });

      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#F5C842;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px rgba(245,200,66,0.6)"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10], className: "",
      });
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<b style="color:#1B2A4A">${client!.business_name}</b>`);

      setMapLoaded(true);
    }
  }, [client, mapLoaded]);

  useEffect(() => {
    if (client && !loading) {
      const timer = setTimeout(initMap, 500);
      return () => clearTimeout(timer);
    }
  }, [client, loading, initMap]);

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

  async function sendRepMessageFromPortal() {
    if (!repMessage.trim()) return;
    setRepMsgSending(true);
    try {
      const res = await fetch(`/api/campaign/message/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "client", content: repMessage }),
      });
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
      setRepMsgSent(true);
      setRepMessage("");
      setTimeout(() => setRepMsgSent(false), 3000);
    } catch (e) { console.error("Message error:", e); }
    setRepMsgSending(false);
  }

  function dismissOnboarding() {
    localStorage.setItem(`campaign_onboarded_${id}`, "true");
    setShowOnboarding(false);
  }

  function handlePrintReport() {
    window.print();
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
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <p>Campaign not found.</p>
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
          Review Your Campaign →
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

  /* ─── STATE 2: Post-Approval (Main Portal) ─────────────────────────────── */

  const sbr = (client.sbr_data || {}) as Record<string, unknown>;
  const currentStage = stageIndex(client.stage);
  const approvedDir = (client.generated_directions || []).find(
    (d: CampaignDirection) => d.name === client.selected_direction
  );
  const oppScore = (sbr.opportunityScore as number) || 0;
  const medianIncome = formatIncome((sbr.medianIncome as string) || "");
  const households = formatHouseholds((sbr.households as string) || "");
  const topCats = Array.isArray(sbr.topCategories) ? (sbr.topCategories as string[]) : [];
  const competitorGap = (sbr.competitorGap as string) || "";
  const marketBrief = (sbr.marketBrief as string) || "";

  const incomeRings = [
    { label: "Core", range: "$90K+", color: "#F5C842", pct: oppScore > 80 ? 35 : oppScore > 60 ? 25 : 15 },
    { label: "Ring 1", range: "$65–90K", color: "#3B82F6", pct: 30 },
    { label: "Ring 2", range: "$45–65K", color: "#f59e0b", pct: 22 },
    { label: "Ring 3", range: "Below $45K", color: "#64748b", pct: 13 },
  ];

  const LMS_MODULES = [
    { num: 1, title: "Understanding Your Market Report", desc: "Learn what your opportunity score means and how BVM uses it to position your campaign." },
    { num: 2, title: "Getting Results From Print", desc: "Best practices for local print advertising — what works, what doesn't, and how to measure it." },
    { num: 3, title: "Growing With BVM", desc: "Explore how print + digital + web work together to build a dominant local presence." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes goldPulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(245,200,66,0.25); } 50% { box-shadow: 0 0 0 12px rgba(245,200,66,0.05); } }
        @media print {
          body * { visibility: hidden; }
          #market-report, #market-report * { visibility: visible; }
          #market-report { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #1a2332 !important; padding: 40px !important; }
          #market-report h2, #market-report h3 { color: #1B2A4A !important; }
          #market-report .metric-val { color: #1B2A4A !important; }
        }
      `}</style>

      {/* LMS Modal */}
      {lmsModal && <LmsModal title={lmsModal} onClose={() => setLmsModal(null)} />}

      {/* Top bar */}
      <div style={{ height: 56, background: "#2d3e50", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.25)", position: "sticky", top: 0, zIndex: 40 }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{client.business_name}</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ── HERO + PROGRESS ────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, color: "#fff", margin: "0 0 8px", fontWeight: 700 }}>
            {client.business_name}
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", margin: "0 0 36px" }}>
            {client.city} · {client.category}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
            {STAGES.map((stage, i) => (
              <div key={stage} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: i <= currentStage ? "#F5C842" : "rgba(255,255,255,0.1)",
                    color: i <= currentStage ? "#1B2A4A" : "rgba(255,255,255,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800,
                    ...(i === currentStage ? { animation: "goldPulse 2s ease infinite" } : {}),
                  }}>
                    {i < currentStage ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: i <= currentStage ? "#F5C842" : "rgba(255,255,255,0.3)", marginTop: 8, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {STAGE_LABELS[stage]}
                  </div>
                </div>
                {i < STAGES.length - 1 && (
                  <div style={{ width: 80, height: 2, background: i < currentStage ? "#F5C842" : "rgba(255,255,255,0.1)", margin: "0 8px", marginBottom: 24 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── ONBOARDING ─────────────────────────────────────────────────── */}
        {showOnboarding && (
          <Section>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#fff", margin: "0 0 8px" }}>
                  Welcome to your Campaign Portal
                </h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 28px", lineHeight: 1.6 }}>
                  Your campaign is being built by our team. Here&apos;s what happens next.
                </p>

                {[
                  { num: 1, title: "We're building your ad", desc: "Our design team is producing your campaign based on the direction you approved." },
                  { num: 2, title: "You'll review and confirm", desc: "We'll notify you when your ad is ready for final review." },
                  { num: 3, title: "Your campaign goes live", desc: "Your ad runs in the next available edition in your market." },
                ].map((step) => (
                  <div key={step.num} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#F5C842",
                      color: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, flexShrink: 0,
                    }}>{step.num}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{step.title}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}

                <button onClick={dismissOnboarding} style={{
                  background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8,
                  padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 8,
                }}>Got it →</button>
              </div>
            </div>
          </Section>
        )}

        {/* ── LMS — Campaign Success Guide ───────────────────────────────── */}
        {!showOnboarding && (
          <Section>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 20 }}>📑</span>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: 0 }}>
                Campaign Success Guide
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {LMS_MODULES.map((mod) => (
                <div key={mod.num} style={{
                  background: "#1B2A4A", borderRadius: 12, padding: "20px 20px 16px",
                  borderLeft: "3px solid #F5C842", border: "1px solid rgba(255,255,255,0.08)",
                  position: "relative",
                }}>
                  <span style={{
                    position: "absolute", top: 12, left: 12,
                    background: "rgba(245,200,66,0.15)", color: "#F5C842",
                    fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
                  }}>Module {mod.num}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "24px 0 8px" }}>{mod.title}</h3>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: "0 0 16px" }}>{mod.desc}</p>
                  <button onClick={() => setLmsModal(mod.title)} style={{
                    background: "transparent", border: "none", color: "#F5C842",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0,
                  }}>Start Module →</button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── TERRITORY INTELLIGENCE ─────────────────────────────────────── */}
        <Section id="market-report">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: 0 }}>
              Your Market Intelligence
            </h2>
            <span style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
              Powered by Bruno
            </span>
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "4px 0 28px", lineHeight: 1.5 }}>
            Here&apos;s what we know about your market — and why your campaign is positioned to win.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
            <MetricCard label="Market Opportunity Score">
              <div className="metric-val" style={{ fontSize: 40, fontWeight: 800, color: scoreColor(oppScore), lineHeight: 1 }}>
                <AnimatedNumber target={oppScore} />
              </div>
            </MetricCard>
            <MetricCard label="Median Household Income">
              <div className="metric-val" style={{ fontSize: 22, fontWeight: 700, color: "#F5C842", lineHeight: 1.2 }}>{medianIncome}</div>
            </MetricCard>
            <MetricCard label="Households in Your Area">
              <div className="metric-val" style={{ fontSize: 22, fontWeight: 700, color: "#F5C842", lineHeight: 1.2 }}>{households}</div>
            </MetricCard>
            <MetricCard label="Your Market Rank">
              <div className="metric-val" style={{ fontSize: 22, fontWeight: 700, color: "#F5C842", lineHeight: 1.2 }}>{marketRank(oppScore)}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>of markets nationally</div>
            </MetricCard>
          </div>

          <div ref={mapRef} style={{ height: 320, borderRadius: 12, background: "#0d1a2e", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 28, overflow: "hidden" }} />

          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#fff", margin: "0 0 16px" }}>Income Distribution by Ring</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {incomeRings.map((ring) => (
              <div key={ring.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 60, fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{ring.label}</div>
                <div style={{ width: 90, fontSize: 12, color: ring.color, fontWeight: 600 }}>{ring.range}</div>
                <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${ring.pct}%`, background: ring.color, borderRadius: 4, transition: "width 1s ease" }} />
                </div>
                <div style={{ width: 40, fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "right" }}>{ring.pct}%</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#fff", margin: "0 0 16px" }}>Competitor Landscape</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 28 }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16, borderLeft: "3px solid #F5C842" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>Top Category</div>
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>
                {topCats[0] ? `"${topCats[0]}" is the #1 searched service in your area` : "Analyzing market..."}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16, borderLeft: "3px solid #3B82F6" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>Competitor Gap</div>
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{competitorGap || "Opportunity to own this market"}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16, borderLeft: "3px solid #8B5CF6" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>Campaign Angle</div>
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{marketBrief || `${client.business_name} is positioned to lead in ${client.city}`}</div>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={handlePrintReport} style={{
              background: "linear-gradient(135deg, #F5C842, #e6b935)", color: "#1B2A4A",
              border: "none", borderRadius: 10, padding: "14px 36px",
              fontSize: 14, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(245,200,66,0.3)",
            }}>Download Market Report</button>
          </div>
        </Section>

        {/* ── YOUR CAMPAIGN ──────────────────────────────────────────────── */}
        <Section>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 24px" }}>Your Ad Direction</h2>
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              {approvedDir?.imageUrl ? (
                <div style={{ width: 320, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", display: "block" }} />
                </div>
              ) : (
                <div style={{ width: 320, height: 320, background: "rgba(255,255,255,0.04)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)" }}>No image</div>
              )}
              <span style={{ position: "absolute", top: 12, right: 12, background: "rgba(245,200,66,0.9)", color: "#1B2A4A", fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 6 }}>
                {client.ad_size?.toUpperCase() || "AD"}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: "0 0 12px" }}>{client.selected_direction || "Campaign Direction"}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 16px" }}>{approvedDir?.description || ""}</p>

              {client.tagline ? (
                <p style={{ fontSize: 18, color: "#F5C842", fontStyle: "italic", fontFamily: "'Playfair Display', serif", margin: "0 0 20px" }}>&ldquo;{client.tagline}&rdquo;</p>
              ) : editingTagline ? (
                <div style={{ marginBottom: 20 }}>
                  <input type="text" value={taglineInput} onChange={(e) => setTaglineInput(e.target.value)} placeholder="Enter your tagline..." style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={saveTagline} disabled={taglineSaving || !taglineInput.trim()} style={{ background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{taglineSaving ? "Saving..." : "Save"}</button>
                    <button onClick={() => setEditingTagline(false)} style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingTagline(true)} style={{ background: "transparent", border: "none", color: "#F5C842", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 20 }}>Add Your Tagline →</button>
              )}

              <div style={{ background: client.stage === "production" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${client.stage === "production" ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: client.stage === "production" ? "#f59e0b" : "#22c55e", fontWeight: 600, margin: 0 }}>
                  {client.stage === "production" ? "Your campaign is in production" : client.stage === "delivered" ? "Campaign delivered!" : "Campaign approved"}
                </p>
              </div>

              {approvedDir?.imageUrl && (
                <a href={approvedDir.imageUrl} download={`${client.business_name}-campaign.png`} style={{ display: "inline-block", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Download Preview</a>
              )}
            </div>
          </div>

          <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, color: "#fff", margin: "0 0 12px", fontWeight: 700 }}>✏️ Request a Change</h3>
            <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="Describe what you'd like changed..." style={{ width: "100%", minHeight: 80, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 14, fontSize: 14, color: "#fff", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            <button onClick={submitRevision} disabled={!revisionNote.trim() || revisionSending} style={{ marginTop: 8, background: revisionNote.trim() ? "#F5C842" : "rgba(255,255,255,0.08)", color: revisionNote.trim() ? "#1B2A4A" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: revisionNote.trim() ? "pointer" : "not-allowed" }}>
              {revisionSending ? "Sending..." : "Submit Change Request"}
            </button>
            {revisionSent && <p style={{ fontSize: 13, color: "#22c55e", margin: "8px 0 0" }}>✓ Change request submitted — your rep will be in touch.</p>}
          </div>
        </Section>

        {/* ── FULL CAMPAIGN PREVIEW ──────────────────────────────────────── */}
        <Section>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 4px" }}>See Your Complete BVM Campaign</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "0 0 4px" }}>This is what a full print + digital + web campaign looks like for {client.business_name}.</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "0 0 28px" }}>Your current campaign includes {client.ad_size} print. The preview below shows the complete suite.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 28 }}>
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
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 8px" }}>WEB</p>
                <button style={{ background: "transparent", border: "none", color: "#F5C842", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Learn More →</button>
              </div>
            </div>

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
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 8px" }}>DIGITAL</p>
                <button style={{ background: "transparent", border: "none", color: "#F5C842", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Learn More →</button>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            {upsellSent ? (
              <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "16px 24px", display: "inline-block" }}>
                <p style={{ fontSize: 15, color: "#22c55e", fontWeight: 700, margin: 0 }}>Your rep has been notified — expect a call soon! 🎉</p>
              </div>
            ) : (
              <button onClick={sendUpsellInterest} disabled={upsellSending} style={{
                background: "linear-gradient(135deg, #F5C842, #e6b935)", color: "#1B2A4A",
                border: "none", borderRadius: 10, padding: "16px 40px",
                fontSize: 15, fontWeight: 800, cursor: upsellSending ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(245,200,66,0.3)", opacity: upsellSending ? 0.6 : 1,
              }}>{upsellSending ? "Sending..." : "Talk to Your Rep About the Full Suite →"}</button>
            )}
          </div>
        </Section>

        {/* ── YOUR REP + MESSAGES ────────────────────────────────────────── */}
        <Section>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 20px" }}>Your Rep</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 18 }}>TH</div>
            <div>
              <div style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>Ted Herrera</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Your BVM Account Executive</div>
            </div>
          </div>

          {/* Messages Thread */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>Messages</h3>
            <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: chatMessages.length > 0 ? 14 : 0 }}>
              {chatMessages.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", padding: 14, margin: 0 }}>No messages yet. Start the conversation!</p>
              ) : chatMessages.map((m, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "#fff", padding: "1px 6px", borderRadius: 4,
                      background: m.role === "rep" ? "#2d3e50" : "#0891b2",
                    }}>{m.role === "rep" ? "REP" : "YOU"}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{timeAgo(m.timestamp)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#fff", margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={clientMsgInput}
                onChange={(e) => setClientMsgInput(e.target.value)}
                placeholder="Type your message..."
                rows={2}
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12, fontSize: 13, color: "#fff", resize: "none", outline: "none", boxSizing: "border-box" }}
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
        </Section>
      </div>
    </div>
  );
}

/* ─── Animated Number Component ────────────────────────────────────────────── */

function AnimatedNumber({ target }: { target: number }) {
  const value = useAnimatedCounter(target);
  return <>{value}</>;
}
