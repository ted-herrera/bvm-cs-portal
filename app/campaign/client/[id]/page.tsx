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
  if (score > 90) return "Top 8%";
  if (score > 80) return "Top 15%";
  if (score > 70) return "Top 30%";
  if (score > 60) return "Top 45%";
  return "Top 60%";
}

function growthOutlook(score: number): string {
  if (score > 80) return "+12-18%";
  if (score > 60) return "+6-12%";
  return "+2-6%";
}

function lifestyleSegment(income: number, score: number): { name: string; desc: string } {
  if (income >= 90000 && score > 80) return { name: "Established Affluent", desc: "High-income households with strong purchasing power, brand loyalty, and preference for premium local services. These consumers value quality, trust established businesses, and respond well to print media in their homes." };
  if (income >= 65000 && score > 70) return { name: "Suburban Achievers", desc: "Upper-middle income families focused on home improvement, education, and local dining. Active in community events, these households are highly responsive to neighborhood-focused advertising." };
  if (income >= 45000 && score > 60) return { name: "Community Builders", desc: "Middle-income households with strong neighborhood ties. They prioritize value, local businesses, and community involvement. Print media is a trusted source for discovering new services." };
  return { name: "Local Market", desc: "A diverse mix of households representing the broader community. These consumers respond to clear value propositions and consistent local presence." };
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

/* ─── Animated Counter Hook ────────────────────────────────────────────────── */

function useAnimatedCounter(target: number, duration = 1200): [number, React.RefObject<HTMLDivElement | null>] {
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

  return [value, ref];
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

/* ─── Animated Bar Hook ───────────────────────────────────────────────────── */

function useAnimatedBar(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Metric Card ──────────────────────────────────────────────────────────── */

function MetricCard({ label, subtext, children }: { label: string; subtext?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#243454", borderRadius: 12, padding: "24px 20px 18px",
      borderLeft: "3px solid #F5C842",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {children}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 8 }}>{label}</div>
      {subtext && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{subtext}</div>}
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

/* ─── Opportunity Score SVG Arc ─────────────────────────────────────────────── */

function OpportunityArc({ score, animatedScore }: { score: number; animatedScore: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={scoreColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.1s linear" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span className="metric-val" style={{ fontSize: 80, fontWeight: 800, color: scoreColor(score), lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>
          {animatedScore}
        </span>
      </div>
    </div>
  );
}

/* ─── Income Distribution Bar ──────────────────────────────────────────────── */

function IncomeBar({ label, range, color, pct }: { label: string; range: string; color: string; pct: number }) {
  const [ref, visible] = useAnimatedBar();
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 70, fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</div>
      <div style={{ width: 90, fontSize: 12, color: color, fontWeight: 600 }}>{range}</div>
      <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: visible ? `${pct}%` : "0%", background: color, borderRadius: 5,
          transition: "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }} />
      </div>
      <div style={{ width: 40, fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "right" }}>{pct}%</div>
    </div>
  );
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

  // Sidebar messages expand
  const [sidebarMsgsExpanded, setSidebarMsgsExpanded] = useState(false);

  // Locked section CTAs
  const [bizProfileSent, setBizProfileSent] = useState(false);
  const [bizProfileSending, setBizProfileSending] = useState(false);
  const [expertContribSent, setExpertContribSent] = useState(false);
  const [expertContribSending, setExpertContribSending] = useState(false);

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
      script.onload = () => geocodeAndBuild();
      document.head.appendChild(script);
    } else {
      geocodeAndBuild();
    }

    async function geocodeAndBuild() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      let lat = 36.15;
      let lng = -95.99;

      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${client!.zip}&country=US&format=json`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch {
        // Fallback to ZIP-derived coords
        lat = 36.15 + (parseInt(client!.zip || "0") % 100) * 0.01;
        lng = -95.99 + (parseInt(client!.zip || "0") % 50) * 0.01;
      }

      const map = L.map(mapRef.current, {
        center: [lat, lng], zoom: 12, zoomControl: false, attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

      // Three concentric circles
      L.circle([lat, lng], { radius: 16093, color: "#8B5CF6", fillColor: "#8B5CF6", fillOpacity: 0.12, weight: 1 }).addTo(map);
      L.circle([lat, lng], { radius: 8046, color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.20, weight: 1 }).addTo(map);
      L.circle([lat, lng], { radius: 3218, color: "#F5C842", fillColor: "#F5C842", fillOpacity: 0.35, weight: 1 }).addTo(map);

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
  const topCats = Array.isArray(sbr.topCategories) ? (sbr.topCategories as string[]) : [];
  const competitorGap = (sbr.competitorGap as string) || "";
  const marketBrief = (sbr.marketBrief as string) || "";
  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const coreHouseholds = Math.round(householdsNum * 0.30);
  const ring1Households = Math.round(householdsNum * 0.45);
  const ring2Households = Math.round(householdsNum * 0.25);

  const incomeRings = [
    { label: "Core $90K+", color: "#F5C842", pct: oppScore > 80 ? 38 : oppScore > 60 ? 28 : 18 },
    { label: "Ring 1 $65-90K", color: "#3B82F6", pct: oppScore > 80 ? 30 : oppScore > 60 ? 32 : 30 },
    { label: "Ring 2 $45-65K", color: "#f59e0b", pct: oppScore > 80 ? 20 : oppScore > 60 ? 25 : 30 },
    { label: "Below $45K", color: "#64748b", pct: oppScore > 80 ? 12 : oppScore > 60 ? 15 : 22 },
  ];

  const targetRing = incomeRings[0].pct >= 30 ? "Core $90K+" : incomeRings[1].pct >= 30 ? "Ring 1 $65-90K" : "Ring 2 $45-65K";

  const segment = lifestyleSegment(medianIncomeNum, oppScore);

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

      {/* ── TWO COLUMN LAYOUT ──────────────────────────────────────────── */}
      <div style={{ display: "flex" }}>

        {/* ── LEFT COLUMN (65%, scrollable) ────────────────────────────── */}
        <div style={{
          flex: "0 0 65%", overflowY: "auto", padding: 24,
          maxHeight: "calc(100vh - 72px)",
        }}>

          {/* ── ONBOARDING ──────────────────────────────────────────────── */}
          {showOnboarding && (
            <>
              <Eyebrow text="GETTING STARTED" />
              <Section>
                <div style={{ borderLeft: "3px solid #F5C842", paddingLeft: 24 }}>
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
                  }}>Got it &rarr;</button>
                </div>
              </Section>
            </>
          )}

          {/* ── LMS -- Campaign Success Guide ──────────────────────────── */}
          {!showOnboarding && (
            <>
              <Eyebrow text="LEARNING" />
              <Section>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5C842" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
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
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "24px 0 8px", fontFamily: "'DM Sans', sans-serif" }}>{mod.title}</h3>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: "0 0 16px" }}>{mod.desc}</p>
                      <button onClick={() => setLmsModal(mod.title)} style={{
                        background: "transparent", border: "none", color: "#F5C842",
                        fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0,
                      }}>Start Module &rarr;</button>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* ── TERRITORY INTELLIGENCE ──────────────────────────────────── */}
          <Eyebrow text="TERRITORY INTELLIGENCE" />
          <Section id="market-report">

            {/* HEADER */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#fff", margin: "0 0 8px" }}>
                  Your Market Intelligence Report
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
                    Powered by Bruno
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                  Generated for {client.business_name} &middot; {client.city} &middot; {todayStr}
                </p>
              </div>
              <button onClick={handlePrintReport} style={{
                background: "linear-gradient(135deg, #F5C842, #e6b935)", color: "#1B2A4A",
                border: "none", borderRadius: 10, padding: "12px 28px",
                fontSize: 13, fontWeight: 800, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(245,200,66,0.3)", whiteSpace: "nowrap",
              }}>Download Market Report</button>
            </div>

            {/* TIER 1 -- 5 HERO METRIC CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, margin: "32px 0 32px" }}>

              {/* Card 1: Opportunity Score */}
              <OpportunityScoreCard score={oppScore} />

              {/* Card 2: Median Income */}
              <MedianIncomeCard target={medianIncomeNum} />

              {/* Card 3: Total Households */}
              <HouseholdsCard target={householdsNum} />

              {/* Card 4: 5-Year Growth */}
              <MetricCard label="5-Year Market Outlook">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                  <span className="metric-val" style={{ fontSize: 28, fontWeight: 800, color: "#22c55e", lineHeight: 1 }}>{growthOutlook(oppScore)}</span>
                </div>
              </MetricCard>

              {/* Card 5: Market Rank */}
              <MetricCard label="National Market Ranking">
                <div className="metric-val" style={{ fontSize: 28, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>{marketRank(oppScore)}</div>
              </MetricCard>
            </div>

            {/* TIER 2 -- LEAFLET MAP */}
            <div ref={mapRef} style={{ height: 420, borderRadius: 12, background: "#0d1a2e", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16, overflow: "hidden" }} />

            {/* Ring Legend */}
            <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              {[
                { label: "Core (2 mi)", color: "#F5C842", households: coreHouseholds },
                { label: "Ring 1 (5 mi)", color: "#3B82F6", households: ring1Households },
                { label: "Ring 2 (10 mi)", color: "#8B5CF6", households: ring2Households },
              ].map((ring) => (
                <div key={ring.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: ring.color }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{ring.label}</span>
                  <span style={{ fontSize: 12, color: ring.color, fontWeight: 700 }}>{ring.households.toLocaleString()} households</span>
                </div>
              ))}
            </div>

            {/* TIER 3 -- INCOME DISTRIBUTION */}
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", margin: "0 0 16px" }}>Income Distribution</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {incomeRings.map((ring) => (
                <IncomeBar key={ring.label} label={ring.label} range={`${ring.pct}%`} color={ring.color} pct={ring.pct} />
              ))}
            </div>
            <div style={{
              background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.15)",
              borderRadius: 10, padding: "14px 18px", marginBottom: 32,
            }}>
              <p style={{ fontSize: 13, color: "#F5C842", margin: 0, fontWeight: 600 }}>
                Your campaign targets the <strong>{targetRing}</strong> market -- the highest-value households in your distribution area.
              </p>
            </div>

            {/* TIER 4 -- CONSUMER BEHAVIOR PROFILE */}
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", margin: "0 0 8px" }}>Your Neighborhood Profile</h3>

            {/* Lifestyle Segment Card */}
            <div style={{
              background: "rgba(245,200,66,0.04)", border: "1px solid rgba(245,200,66,0.15)",
              borderRadius: 12, padding: "20px 24px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ background: "#F5C842", color: "#1B2A4A", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6 }}>
                  PRIMARY SEGMENT
                </span>
              </div>
              <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: "0 0 8px" }}>{segment.name}</h4>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>{segment.desc}</p>
            </div>

            {/* 4 Behavior Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 32 }}>
              {[
                { title: "Top Spending Categories", items: topCats.length > 0 ? topCats.slice(0, 3).join(", ") : "Home services, dining, healthcare" },
                { title: "Media Consumption", items: "Print magazines, local news, social media, neighborhood apps" },
                { title: "Purchase Decision Style", items: oppScore > 70 ? "Quality-driven, brand-loyal, referral-based" : "Value-conscious, comparison shoppers, deal-seekers" },
                { title: "Business Opportunity", items: `${client.category} demand is ${oppScore > 70 ? "strong" : "growing"} in ${client.city}. Local print presence builds trust.` },
              ].map((card) => (
                <div key={card.title} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "16px 18px",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{card.title}</div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: 0 }}>{card.items}</p>
                </div>
              ))}
            </div>

            {/* TIER 5 -- MARKET MOMENTUM */}
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", margin: "0 0 16px" }}>Market Momentum</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 32 }}>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16, borderLeft: "3px solid #F5C842" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>Competitor Landscape</div>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{competitorGap || `Limited ${client.category} advertisers in ${client.city} -- opportunity to own the space`}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16, borderLeft: "3px solid #3B82F6" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>Top Business Category</div>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>
                  {topCats[0] ? `"${topCats[0]}" is the #1 searched service in your area` : `${client.category} is a high-demand category`}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16, borderLeft: "3px solid #8B5CF6" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>Campaign Timing</div>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>Your market is in an active growth cycle -- ideal time to establish print presence</div>
              </div>
            </div>

            {/* TIER 6 -- BRUNO'S MARKET BRIEF */}
            <div style={{
              background: "rgba(245,200,66,0.04)", borderLeft: "4px solid #F5C842",
              borderRadius: "0 12px 12px 0", padding: "24px 28px", marginBottom: 24,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", background: "#F5C842",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, color: "#1B2A4A", fontSize: 16,
                }}>B</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", margin: 0 }}>Bruno&apos;s Market Brief</h3>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                {marketBrief || `${client.business_name} is positioned in ${client.city}, a market with ${oppScore > 70 ? "strong" : "growing"} demand for ${client.category} services. With ${households} households in the distribution area and a median income of ${medianIncome}, the local consumer base has significant purchasing power. The ${oppScore > 70 ? "limited" : "moderate"} competition in the ${client.category} space means ${client.business_name} has a clear opportunity to establish dominant local brand awareness through consistent print presence. The ${segment.name} demographic profile of this market responds exceptionally well to magazine-based advertising.`}
              </p>
            </div>

            {/* Download Market Report (bottom) */}
            <div style={{ textAlign: "center" }}>
              <button onClick={handlePrintReport} style={{
                background: "linear-gradient(135deg, #F5C842, #e6b935)", color: "#1B2A4A",
                border: "none", borderRadius: 10, padding: "14px 36px",
                fontSize: 14, fontWeight: 800, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(245,200,66,0.3)",
              }}>Download Market Report</button>
            </div>
          </Section>

          {/* ── YOUR CAMPAIGN -- "Your Ad Direction" ───────────────────── */}
          <Eyebrow text="YOUR CAMPAIGN" />
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
                  <button onClick={() => setEditingTagline(true)} style={{ background: "transparent", border: "none", color: "#F5C842", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 20, display: "block" }}>Add Your Tagline &rarr;</button>
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
              <h3 style={{ fontSize: 16, color: "#fff", margin: "0 0 12px", fontWeight: 700 }}>Request a Change</h3>
              <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="Describe what you'd like changed..." style={{ width: "100%", minHeight: 80, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 14, fontSize: 14, color: "#fff", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <button onClick={submitRevision} disabled={!revisionNote.trim() || revisionSending} style={{ marginTop: 8, background: revisionNote.trim() ? "#F5C842" : "rgba(255,255,255,0.08)", color: revisionNote.trim() ? "#1B2A4A" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: revisionNote.trim() ? "pointer" : "not-allowed" }}>
                {revisionSending ? "Sending..." : "Submit Change Request"}
              </button>
              {revisionSent && <p style={{ fontSize: 13, color: "#22c55e", margin: "8px 0 0" }}>Change request submitted -- your rep will be in touch.</p>}
            </div>
          </Section>

          {/* ── FULL CAMPAIGN PREVIEW ───────────────────────────────────── */}
          <Eyebrow text="CAMPAIGN SUITE" />
          <Section>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#fff", margin: "0 0 4px" }}>See Your Complete BVM Campaign</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "0 0 4px" }}>This is what a full print + digital + web campaign looks like for {client.business_name}.</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "0 0 28px" }}>Your current campaign includes {client.ad_size} print. The preview below shows the complete suite.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 28 }}>
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
          </Section>

          {/* ── BUSINESS PROFILE (locked) ───────────────────────────────── */}
          <Eyebrow text="PREMIUM" />
          <Section>
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
          </Section>

          {/* ── EXPERT CONTRIBUTOR (locked) ──────────────────────────────── */}
          <Eyebrow text="PREMIUM" />
          <Section>
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
          </Section>

        </div>{/* END LEFT COLUMN */}

        {/* ── RIGHT COLUMN (35%, sticky sidebar) ──────────────────────── */}
        <div style={{
          flex: "0 0 35%", position: "sticky", top: 72,
          height: "calc(100vh - 72px)", overflowY: "auto",
          background: "#0d1a2e", padding: 20,
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}>

          {/* Approved Ad Image */}
          {approvedDir?.imageUrl ? (
            <div style={{ width: "100%", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <img src={approvedDir.imageUrl} alt={approvedDir.name} style={{ width: "100%", display: "block" }} />
            </div>
          ) : (
            <div style={{
              width: "100%", height: 220, background: "rgba(255,255,255,0.04)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.2)", fontSize: 13, marginBottom: 16,
            }}>No ad preview available</div>
          )}

          {/* Ad size badge + tagline */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              background: "rgba(245,200,66,0.15)", color: "#F5C842",
              fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
            }}>{client.ad_size?.toUpperCase() || "AD"}</span>
            {client.tagline ? (
              <p style={{ fontSize: 16, color: "#F5C842", fontStyle: "italic", fontFamily: "'Playfair Display', serif", margin: "10px 0 0" }}>
                &ldquo;{client.tagline}&rdquo;
              </p>
            ) : (
              <button onClick={() => setEditingTagline(true)} style={{
                background: "transparent", border: "none", color: "#F5C842",
                fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0,
                marginTop: 10, display: "block",
              }}>Add tagline &rarr;</button>
            )}
          </div>

          {/* Stage Card */}
          <div style={{
            background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: 16, marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%", background: "#F5C842",
                animation: "goldPulse 2s ease infinite",
              }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {STAGE_LABELS[client.stage] || client.stage}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
              {nextStepText}
            </p>
          </div>

          {/* Download Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {approvedDir?.imageUrl ? (
              <a href={approvedDir.imageUrl} download={`${client.business_name}-campaign.png`} style={{
                display: "block", textAlign: "center", textDecoration: "none",
                background: "#F5C842", color: "#1B2A4A", borderRadius: 10,
                padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer",
              }}>Download Ad Preview</a>
            ) : (
              <button disabled style={{
                background: "rgba(245,200,66,0.3)", color: "#1B2A4A", border: "none", borderRadius: 10,
                padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "not-allowed", opacity: 0.5,
              }}>Download Ad Preview</button>
            )}
            <button onClick={handlePrintReport} style={{
              background: "rgba(255,255,255,0.1)", color: "#F5C842", border: "none", borderRadius: 10,
              padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer",
            }}>Download Market Report</button>
          </div>

          {/* Rep Card */}
          <div style={{
            background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: 16, marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", background: "#F5C842",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, color: "#1B2A4A", fontSize: 18, flexShrink: 0,
              }}>TH</div>
              <div>
                <div style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>Ted Herrera</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Your BVM Account Executive</div>
              </div>
            </div>
            <button
              onClick={() => document.getElementById("messages-section")?.scrollIntoView({ behavior: "smooth" })}
              style={{
                background: "transparent", border: "none", color: "#F5C842",
                fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0,
              }}
            >Send a Message</button>
          </div>

          {/* Messages Section (compact sidebar) */}
          <div id="messages-section" style={{
            background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: 16,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>Messages</h3>

            <div style={{ marginBottom: 12 }}>
              {chatMessages.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>No messages yet. Start the conversation!</p>
              ) : (
                <>
                  {sidebarMessages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#fff", padding: "1px 6px", borderRadius: 4,
                          background: m.role === "rep" ? "#2d3e50" : "#0891b2",
                        }}>{m.role === "rep" ? "REP" : "YOU"}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#fff", margin: 0, lineHeight: 1.4 }}>{m.content}</p>
                    </div>
                  ))}
                  {chatMessages.length > 3 && (
                    <button
                      onClick={() => setSidebarMsgsExpanded(!sidebarMsgsExpanded)}
                      style={{
                        background: "transparent", border: "none", color: "#F5C842",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, marginTop: 4,
                      }}
                    >{sidebarMsgsExpanded ? "Show Less" : `View All (${chatMessages.length})`}</button>
                  )}
                </>
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
                  borderRadius: 8, padding: 10, fontSize: 12, color: "#fff", resize: "none", outline: "none", boxSizing: "border-box",
                }}
              />
              <button
                onClick={sendClientMessage}
                disabled={!clientMsgInput.trim() || clientMsgSending}
                style={{
                  background: clientMsgInput.trim() ? "#F5C842" : "rgba(255,255,255,0.08)",
                  color: clientMsgInput.trim() ? "#1B2A4A" : "rgba(255,255,255,0.3)",
                  border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12,
                  fontWeight: 700, cursor: clientMsgInput.trim() ? "pointer" : "not-allowed",
                  alignSelf: "flex-end",
                }}
              >{clientMsgSending ? "..." : "Send"}</button>
            </div>
          </div>

        </div>{/* END RIGHT COLUMN */}

      </div>{/* END TWO COLUMN LAYOUT */}
    </div>
  );
}

/* ─── Animated Metric Sub-Components ──────────────────────────────────────── */

function OpportunityScoreCard({ score }: { score: number }) {
  const [animatedScore, ref] = useAnimatedCounter(score, 1400);
  return (
    <div ref={ref} style={{
      background: "#243454", borderRadius: 12, padding: "24px 20px 18px",
      borderLeft: "3px solid #F5C842", border: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <OpportunityArc score={score} animatedScore={animatedScore} />
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 8 }}>Opportunity Score</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
        {score > 90 ? "Top 8% nationally" : score > 80 ? "Top 15% nationally" : score > 70 ? "Top 30% nationally" : score > 60 ? "Top 45% nationally" : "Top 60% nationally"}
      </div>
    </div>
  );
}

function MedianIncomeCard({ target }: { target: number }) {
  const [value, ref] = useAnimatedCounter(target, 1200);
  return (
    <div ref={ref}>
      <MetricCard label="Median Household Income">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 20, color: "#F5C842" }}>$</span>
          <span className="metric-val" style={{ fontSize: 28, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>
            {value > 0 ? `$${value.toLocaleString()}` : "--"}
          </span>
        </div>
      </MetricCard>
    </div>
  );
}

function HouseholdsCard({ target }: { target: number }) {
  const [value, ref] = useAnimatedCounter(target, 1200);
  return (
    <div ref={ref}>
      <MetricCard label="Households in Distribution Area" subtext="Your magazine reaches these homes">
        <span className="metric-val" style={{ fontSize: 28, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>
          {value > 0 ? value.toLocaleString() : "--"}
        </span>
      </MetricCard>
    </div>
  );
}
