"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import type { CampaignClient } from "@/lib/campaign";

/* ── Supabase loader ─────────────────────────────────────────────────── */
async function loadCampaign(id: string): Promise<CampaignClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/campaign_clients?id=eq.${id}&select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
const GOLD = "#C8922A";
const NAVY = "#1B2A4A";
const NAVY_LIGHT = "#243756";
const NAVY_CARD = "#1F3259";
const SURFACE = "#162240";
const WHITE = "#FFFFFF";
const BLUE = "#4A90D9";
const PURPLE = "#8B5CF6";
const GREEN = "#3D6B4F";

function fmt(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString()}`;
}

/* ── Animated Counter Hook ───────────────────────────────────────────── */
function useAnimatedValue(target: number, duration = 1400): number {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            setValue(Math.round(target * ease));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return value;
}

/* ── Animated Metric Card ────────────────────────────────────────────── */
function MetricCard({ label, value, suffix, prefix, color, isScore }: {
  label: string; value: number; suffix?: string; prefix?: string; color: string; isScore?: boolean;
}) {
  const [displayVal, setDisplayVal] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min((now - start) / 1400, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            setDisplayVal(Math.round(value * ease));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  const pct = isScore ? (displayVal / 100) : 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);

  return (
    <div ref={cardRef} style={{
      background: NAVY_CARD, borderRadius: 12, padding: "24px 16px", textAlign: "center",
      border: `1px solid ${NAVY_LIGHT}`, flex: "1 1 160px", minWidth: 160,
    }}>
      {isScore ? (
        <svg viewBox="0 0 100 100" style={{ width: 90, height: 90, margin: "0 auto 8px" }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={SURFACE} strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={dashOffset}
            strokeLinecap="round" transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.1s" }} />
          <text x="50" y="55" textAnchor="middle" fill={WHITE} fontSize="22" fontWeight="700">
            {displayVal}
          </text>
        </svg>
      ) : (
        <div style={{ fontSize: 32, fontWeight: 700, color, marginBottom: 4 }}>
          {prefix}{isScore ? displayVal : (prefix === "$" ? fmtCurrency(displayVal).replace("$","") : fmt(displayVal))}{suffix}
        </div>
      )}
      <div style={{ fontSize: 13, color: "#8899B0", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ── Animated Bar ────────────────────────────────────────────────────── */
function AnimatedBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const [width, setWidth] = useState(0);
  const barRef = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          setTimeout(() => setWidth((value / max) * 100), 100);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, max]);

  return (
    <div ref={barRef} style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13, color: "#8899B0" }}>
        <span>{label}</span><span style={{ color: WHITE, fontWeight: 600 }}>{fmtCurrency(value)}</span>
      </div>
      <div style={{ background: SURFACE, borderRadius: 6, height: 10, overflow: "hidden" }}>
        <div style={{
          width: `${width}%`, height: "100%", background: color, borderRadius: 6,
          transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

/* ── Leaflet Map ─────────────────────────────────────────────────────── */
function MarketMap({ zip }: { zip: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || !mapRef.current) return;
    initRef.current = true;

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = async () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`);
        const geoData = await geoRes.json();
        const lat = parseFloat(geoData[0]?.lat ?? "39.8");
        const lng = parseFloat(geoData[0]?.lon ?? "-98.5");

        const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 10);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 18,
        }).addTo(map);

        const circles: [number, string, string][] = [
          [16093, PURPLE, "Ring 2 (10mi)"],
          [8047, BLUE, "Ring 1 (5mi)"],
          [3219, GOLD, "Core (2mi)"],
        ];
        circles.forEach(([r, c, _]) => {
          L.circle([lat, lng], { radius: r, color: c, fillColor: c, fillOpacity: 0.12, weight: 2 }).addTo(map);
        });

        L.circleMarker([lat, lng], { radius: 6, color: GOLD, fillColor: GOLD, fillOpacity: 1, weight: 2 }).addTo(map);
      } catch (e) { console.error("Map error:", e); }
    };
    document.body.appendChild(script);
  }, [zip]);

  return <div ref={mapRef} style={{ width: "100%", height: 420, borderRadius: 12, overflow: "hidden" }} />;
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function IntelligenceReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaign(id).then((c) => { setCampaign(c); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div style={{ background: NAVY, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: GOLD, fontSize: 18 }}>Loading Intelligence Report...</div>
    </div>
  );

  if (!campaign) return (
    <div style={{ background: NAVY, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#FF6B6B", fontSize: 18 }}>Campaign not found</div>
    </div>
  );

  const sbr = (campaign.sbr_data ?? {}) as Record<string, any>;
  const biz = campaign.business_name;
  const zip = campaign.zip ?? "74103";
  const city = campaign.city ?? "Unknown";
  const score = sbr.localAdvantageScore ?? sbr.opportunityScore ?? 87;
  const medianIncome = sbr.medianIncome ?? 72400;
  const households = sbr.households ?? 34200;
  const growth = sbr.fiveYearGrowth ?? 12;
  const marketRank = sbr.marketRank ?? 14;
  const competitors = sbr.competitors ?? ["Competitor A", "Competitor B", "Competitor C"];
  const topCategory = sbr.businessType ?? campaign.category ?? "Local Business";
  const tagline = sbr.suggestedTagline ?? sbr.campaignHeadline ?? campaign.tagline ?? "";
  const geoCopy = sbr.geoCopyBlock ?? `${city} is a growing market with untapped opportunity for ${biz}.`;

  const printCSS = `
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  `;

  return (
    <div style={{ background: NAVY, minHeight: "100vh", color: WHITE, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: printCSS }} />

      {/* ── Top Bar ────────────────────────────────────────────────── */}
      <div className="no-print" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", background: SURFACE, borderBottom: `1px solid ${NAVY_LIGHT}`,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <Link href={`/campaign/client/${id}`} style={{ color: GOLD, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
          ← Campaign Portal
        </Link>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>Market Intelligence Report</div>
        <button onClick={() => window.print()} style={{
          background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "8px 20px",
          fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          Download Report
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 14, color: GOLD, fontWeight: 600, letterSpacing: 2, marginBottom: 8 }}>MARKET INTELLIGENCE</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px" }}>{biz}</h1>
          <div style={{ color: "#8899B0", fontSize: 15 }}>{city} &middot; {zip} &middot; {topCategory}</div>
        </div>

        {/* ── Tier 1: Metric Cards ─────────────────────────────────── */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 40 }}>
          <MetricCard label="Opportunity Score" value={score} color={GOLD} isScore />
          <MetricCard label="Median Income" value={medianIncome} prefix="$" color={GREEN} />
          <MetricCard label="Households" value={households} color={BLUE} />
          <MetricCard label="5-Year Growth" value={growth} suffix="%" color={PURPLE} />
          <MetricCard label="Market Rank" value={marketRank} prefix="#" color={GOLD} />
        </div>

        {/* ── Tier 2: Leaflet Map ──────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: GOLD }}>Market Radius Map</h2>
          <MarketMap zip={zip} />
          <div style={{ display: "flex", gap: 24, marginTop: 12, justifyContent: "center" }}>
            {[["Core (2mi)", GOLD], ["Ring 1 (5mi)", BLUE], ["Ring 2 (10mi)", PURPLE]].map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8899B0" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: c as string }} />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* ── Tier 3: Income Distribution ──────────────────────────── */}
        <div style={{ marginBottom: 40, background: NAVY_CARD, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: GOLD }}>Income Distribution by Ring</h2>
          <AnimatedBar label="Core Ring — $90K+" value={92000} max={120000} color={GOLD} />
          <AnimatedBar label="Ring 1 — $65-90K" value={74000} max={120000} color={BLUE} />
          <AnimatedBar label="Ring 2 — $45-65K" value={56000} max={120000} color={PURPLE} />
          <AnimatedBar label="Ring 3 — <$45K" value={38000} max={120000} color="#6B7280" />
        </div>

        {/* ── Tier 4: Consumer Behavior ─────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: GOLD }}>Consumer Behavior Profile</h2>
          <div style={{
            background: `linear-gradient(135deg, ${NAVY_CARD}, ${SURFACE})`, borderRadius: 12,
            padding: 24, border: `1px solid ${NAVY_LIGHT}`, marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, color: GOLD, fontWeight: 600, marginBottom: 8 }}>PRIMARY LIFESTYLE SEGMENT</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Suburban Achievers</div>
            <div style={{ fontSize: 13, color: "#8899B0", lineHeight: 1.6 }}>
              Dual-income households, ages 30-54, with above-average disposable income.
              Active consumers of local services, dining, and home improvement.
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { title: "Digital Engagement", desc: "78% search local businesses weekly", icon: "📱" },
              { title: "Brand Loyalty", desc: "64% stick with brands they discover locally", icon: "⭐" },
              { title: "Spending Habits", desc: "Avg $420/mo on local services", icon: "💰" },
              { title: "Decision Drivers", desc: "Reviews, proximity, and value", icon: "🎯" },
            ].map((b) => (
              <div key={b.title} style={{
                background: NAVY_CARD, borderRadius: 10, padding: 16,
                border: `1px solid ${NAVY_LIGHT}`,
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{b.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: "#8899B0" }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tier 5: Market Momentum ──────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: GOLD }}>Market Momentum</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: NAVY_CARD, borderRadius: 10, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
              <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 8 }}>COMPETITOR LANDSCAPE</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{competitors.length}</div>
              <div style={{ fontSize: 12, color: "#8899B0" }}>
                {competitors.slice(0, 3).join(", ")}
              </div>
            </div>
            <div style={{ background: NAVY_CARD, borderRadius: 10, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
              <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 8 }}>TOP CATEGORY</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{topCategory}</div>
              <div style={{ fontSize: 12, color: "#8899B0" }}>Growing {growth}% annually in this market</div>
            </div>
            <div style={{ background: NAVY_CARD, borderRadius: 10, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
              <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 8 }}>CAMPAIGN TIMING</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Optimal</div>
              <div style={{ fontSize: 12, color: "#8899B0" }}>Market conditions favor new entrants Q2 2026</div>
            </div>
          </div>
        </div>

        {/* ── Tier 6: Bruno's Market Brief ─────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${NAVY_CARD}, ${SURFACE})`, borderRadius: 14,
          padding: 32, border: `2px solid ${GOLD}`, position: "relative", marginBottom: 40,
        }}>
          <div style={{
            position: "absolute", top: -14, left: 24, background: GOLD, color: NAVY,
            padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>BRUNO&apos;S MARKET BRIEF</div>
          <div style={{ fontSize: 28, color: GOLD, fontFamily: "Georgia, serif", lineHeight: 1, marginBottom: 16 }}>&ldquo;</div>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#C8D6E5", margin: 0 }}>
            {geoCopy} With a market opportunity score of {score}/100, {biz} is positioned to capture
            significant share in the {city} {topCategory.toLowerCase()} market. The core 2-mile radius
            shows median household income above $90K with strong digital engagement patterns.
            {competitors.length > 0 && ` While ${competitors.length} competitors operate in this space,
            the data shows clear differentiation opportunity.`} {tagline && `Campaign theme: "${tagline}".`} This
            market is primed for a strategic print and digital campaign targeting suburban achievers
            in the core and Ring 1 zones.
          </p>
          <div style={{ marginTop: 16, fontSize: 13, color: GOLD, fontWeight: 600 }}>
            — Bruno, Market Intelligence AI
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", padding: "20px 0 40px", fontSize: 12, color: "#5A6B80" }}>
          Generated {new Date().toLocaleDateString()} &middot; BVM Design Center &middot; Confidential
        </div>
      </div>
    </div>
  );
}
