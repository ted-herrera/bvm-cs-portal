"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import type { CampaignClient } from "@/lib/campaign";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

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

/* ─── Animated Counter Hook ───────────────────────────────────────────────── */

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

/* ─── Opportunity Score SVG Arc ────────────────────────────────────────────── */

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

/* ─── MetricCard ──────────────────────────────────────────────────────────── */

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

/* ─── IncomeBar ───────────────────────────────────────────────────────────── */

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

/* ─── Main Page Component ─────────────────────────────────────────────────── */

export default function TerritoryIntelligencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<CampaignClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadClient() {
    if (id.startsWith("client-")) {
      setClient({
        id, created_at: new Date().toISOString(), business_name: "Ted's Pizza",
        category: "Restaurant", city: "Tulsa", zip: "74103", services: "Wood-fired pizza, craft beer, catering",
        ad_size: "1/4 page", tagline: "Tulsa's favorite slice.", rep_id: "demo",
        stage: "approved", approved_at: new Date().toISOString(),
        sbr_data: { opportunityScore: 94, medianIncome: "74200", households: "52000", topCategories: ["Restaurants", "Food", "Catering"], competitorGap: "Low competition in pizza category", incomeRing: "Ring 1 · $65-90K", marketBrief: "Strong opportunity in the Tulsa restaurant market with growing demand for quality dining. The $74K median income ring supports premium positioning." },
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

  /* ─── Leaflet Map ─────────────────────────────────────────────────────── */

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

  function handlePrintReport() {
    window.print();
  }

  /* ─── Loading ───────────────────────────────────────────────────────────── */

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
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#fff", margin: 0 }}>Your campaign portal is being set up</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>Your rep is preparing your market intelligence report.</p>
        <Link href={`/campaign/client/${id}`} style={{ background: "#F5C842", color: "#1B2A4A", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>Back to Portal</Link>
      </div>
    );
  }

  /* ─── Extract SBR Data ──────────────────────────────────────────────────── */

  const sbr = (client.sbr_data || {}) as Record<string, unknown>;
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

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes goldPulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(245,200,66,0.25); } 50% { box-shadow: 0 0 0 12px rgba(245,200,66,0.05); } }
        @media print {
          body * { visibility: hidden !important; }
          #intel-content, #intel-content * { visibility: visible !important; }
          #intel-content {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; background: #fff !important; color: #1a2332 !important;
            padding: 40px !important;
          }
          #intel-content h2, #intel-content h3, #intel-content h4 { color: #1B2A4A !important; }
          #intel-content .metric-val { color: #1B2A4A !important; }
          #intel-topbar { visibility: hidden !important; }
          #intel-content::before {
            content: "Market Intelligence Report";
            display: block; font-size: 28px; font-weight: 800;
            color: #1B2A4A; margin-bottom: 8px; font-family: 'Playfair Display', serif;
          }
          #intel-content::after {
            content: "Powered by BVM \\00b7 Bruno Analytics";
            display: block; font-size: 11px; color: #999; margin-top: 24px;
          }
        }
      `}</style>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div id="intel-topbar" style={{
        height: 64, background: "#1B2A4A", display: "flex", alignItems: "center",
        padding: "0 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        position: "sticky", top: 0, zIndex: 40,
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <Link href={`/campaign/client/${id}`} style={{
          color: "#F5C842", textDecoration: "none", fontSize: 14, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          &larr; Campaign Portal
        </Link>

        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff",
          margin: 0, fontWeight: 700, position: "absolute", left: "50%", transform: "translateX(-50%)",
        }}>
          Market Intelligence Report
        </h1>

        <button onClick={handlePrintReport} style={{
          background: "linear-gradient(135deg, #F5C842, #e6b935)", color: "#1B2A4A",
          border: "none", borderRadius: 10, padding: "10px 24px",
          fontSize: 13, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(245,200,66,0.3)",
        }}>Download Report</button>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <div id="intel-content" style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
              Powered by Bruno
            </span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#fff", margin: "0 0 8px" }}>
            Territory Intelligence: {client.business_name}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>
            {client.city} &middot; {client.zip} &middot; {todayStr}
          </p>
        </div>

        {/* ── TIER 1 -- 5 HERO METRIC CARDS ────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
          <OpportunityScoreCard score={oppScore} />
          <MedianIncomeCard target={medianIncomeNum} />
          <HouseholdsCard target={householdsNum} />
          <MetricCard label="5-Year Market Outlook">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              <span className="metric-val" style={{ fontSize: 28, fontWeight: 800, color: "#22c55e", lineHeight: 1 }}>{growthOutlook(oppScore)}</span>
            </div>
          </MetricCard>
          <MetricCard label="National Market Ranking">
            <div className="metric-val" style={{ fontSize: 28, fontWeight: 800, color: "#F5C842", lineHeight: 1 }}>{marketRank(oppScore)}</div>
          </MetricCard>
        </div>

        {/* ── TIER 2 -- LEAFLET MAP ────────────────────────────────────── */}
        <div ref={mapRef} style={{
          height: 420, borderRadius: 12, background: "#0d1a2e",
          border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16, overflow: "hidden",
        }} />

        {/* Ring Legend */}
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
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

        {/* ── TIER 3 -- INCOME DISTRIBUTION ────────────────────────────── */}
        <div style={{
          background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: 32, marginBottom: 32,
        }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", margin: "0 0 16px" }}>Income Distribution</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {incomeRings.map((ring) => (
              <IncomeBar key={ring.label} label={ring.label} range={`${ring.pct}%`} color={ring.color} pct={ring.pct} />
            ))}
          </div>
          <div style={{
            background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.15)",
            borderRadius: 10, padding: "14px 18px",
          }}>
            <p style={{ fontSize: 13, color: "#F5C842", margin: 0, fontWeight: 600 }}>
              Your campaign targets the <strong>{targetRing}</strong> market -- the highest-value households in your distribution area.
            </p>
          </div>
        </div>

        {/* ── TIER 4 -- CONSUMER BEHAVIOR PROFILE ──────────────────────── */}
        <div style={{
          background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: 32, marginBottom: 32,
        }}>
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

          {/* 4 Behavior Cards (2x2) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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
        </div>

        {/* ── TIER 5 -- MARKET MOMENTUM ────────────────────────────────── */}
        <div style={{
          background: "#243454", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: 32, marginBottom: 32,
        }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", margin: "0 0 16px" }}>Market Momentum</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
        </div>

        {/* ── TIER 6 -- BRUNO'S MARKET BRIEF ───────────────────────────── */}
        <div style={{
          background: "rgba(245,200,66,0.04)", borderLeft: "4px solid #F5C842",
          borderRadius: "0 12px 12px 0", padding: "24px 28px", marginBottom: 40,
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

        {/* Download Report (bottom) */}
        <div style={{ textAlign: "center" }}>
          <button onClick={handlePrintReport} style={{
            background: "linear-gradient(135deg, #F5C842, #e6b935)", color: "#1B2A4A",
            border: "none", borderRadius: 10, padding: "14px 36px",
            fontSize: 14, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(245,200,66,0.3)",
          }}>Download Market Report</button>
        </div>
      </div>
    </div>
  );
}
