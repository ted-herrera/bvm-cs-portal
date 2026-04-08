"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { ClientProfile, PipelineStage } from "@/lib/pipeline";

const LOOK_STYLES: Record<string, { accent: string; bg: string; text: string }> = {
  warm_bold: { accent: "#D4531A", bg: "#D4531A", text: "#ffffff" },
  professional: { accent: "#1a5276", bg: "#1a5276", text: "#ffffff" },
  bold_modern: { accent: "#F5C842", bg: "#0d1a2e", text: "#ffffff" },
};

const LOOK_CYCLE = ["warm_bold", "professional", "bold_modern"];
const LOOK_LABELS: Record<string, string> = { warm_bold: "Warm & Bold", professional: "Clean & Professional", bold_modern: "Bold & Modern" };

const PORTAL_STAGES: PipelineStage[] = ["tear-sheet", "building", "qa", "review", "live"];
const STAGE_LABEL_MAP = ["Direction Approved", "Building", "Quality Check", "Final Review", "Live"];

const STATUS_MSG: Record<string, string> = {
  "tear-sheet": "Your campaign direction is ready — please review and approve",
  building: "Your site is being built by our team",
  qa: "Your site is going through quality review",
  review: "Almost there — final review in progress",
  delivered: "Your site is ready to launch",
  live: "Your site is live!",
  intake: "Your profile is being created",
  "revision-requested": "Your feedback has been received — we're on it",
};

function UpsellCard({ clientId, icon, title, product, audio, desc }: {
  clientId: string; icon: string; title: string; product: string; audio: string; desc: string;
}) {
  const [showAudio, setShowAudio] = useState(false);
  const [interested, setInterested] = useState(false);
  const [showCta, setShowCta] = useState(false);

  async function handleInterest() {
    await fetch("/api/upsell/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, product }),
    });
    setInterested(true);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 16px" }}>{desc}</p>

      {!showAudio ? (
        <button onClick={() => setShowAudio(true)} style={{ background: "none", border: "none", color: "#F5C842", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 12 }}>
          🎧 Hear how it works
        </button>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <audio
            src={audio}
            controls
            onTimeUpdate={(e) => {
              if ((e.target as HTMLAudioElement).currentTime >= 5) setShowCta(true);
            }}
            style={{ width: "100%", height: 36 }}
          />
          {showCta && (
            <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 8, fontWeight: 500, animation: "fadeIn 0.5s" }}>Talk to your rep →</p>
          )}
        </div>
      )}

      {!interested ? (
        <button onClick={handleInterest} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          I&apos;m interested →
        </button>
      ) : (
        <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>✓ Your rep has been notified</span>
      )}
    </div>
  );
}

export default function ClientPortalPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [campaignLook, setCampaignLook] = useState("professional");
  const [customInterested, setCustomInterested] = useState(false);

  useEffect(() => {
    fetch(`/api/profile/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data.client || null);
        setLoading(false);
        if (data.client?.selectedLook) setCampaignLook(data.client.selectedLook);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!client) return;
    const key = `bvm_welcomed_${id}`;
    if (!localStorage.getItem(key)) setShowWelcome(true);
  }, [client, id]);

  function cycleLook() {
    setCampaignLook((prev) => {
      const idx = LOOK_CYCLE.indexOf(prev);
      return LOOK_CYCLE[(idx + 1) % LOOK_CYCLE.length];
    });
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #0d1a2e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b" }}>Client not found.</p>
      </div>
    );
  }

  const sbr = client.sbrData as Record<string, unknown> | null;
  const services = client.intakeAnswers?.q3?.split(",").map((s: string) => s.trim()) || [];
  const tagline = (sbr?.suggestedTagline as string) || "";
  const accent = LOOK_STYLES[client.selectedLook || "professional"]?.accent || "#1a5276";
  const showUpload = !client.hasLogo && (client.stage === "tear-sheet" || client.stage === "building");
  const encodedName = encodeURIComponent(client.business_name);

  // Progress bar
  const currentIdx = PORTAL_STAGES.indexOf(client.stage as PipelineStage);
  // delivered maps to between review and live
  const effectiveIdx = client.stage === "delivered" ? 3 : currentIdx >= 0 ? currentIdx : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Gold bar */}
      <div style={{ height: 4, background: "#F5C842", flexShrink: 0 }} />

      {/* Welcome Overlay */}
      {showWelcome && client && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(13,26,46,0.95)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 480, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
            <img src="/bruno.png" alt="Bruno" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", margin: "0 auto 20px", display: "block" }} />
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>Welcome to BVM</h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: "0 0 24px" }}>
              Hi {client.contact_name} — your campaign direction has been approved and your site is now being built. You can track every step right here.
            </p>
            <button
              onClick={() => { localStorage.setItem(`bvm_welcomed_${id}`, "true"); setShowWelcome(false); }}
              style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "14px 0", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}
            >
              Let&apos;s See It →
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ height: 56, padding: "0 32px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/marketing" style={{ fontSize: 12, color: "#94a3b8", textDecoration: "none" }}>← BVM Design Center</a>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 32, width: "auto" }} />
      </nav>

      {/* Progress Bar */}
      <section style={{ padding: "32px 48px", background: "#fff" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 20 }}>
          Your Build Progress
        </p>

        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center" }}>
          {PORTAL_STAGES.map((stage, i) => {
            const isCompleted = i < effectiveIdx;
            const isCurrent = i === effectiveIdx;
            const isLast = i === PORTAL_STAGES.length - 1;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: isCompleted || isCurrent ? "#F5C842" : "transparent",
                    border: isCompleted || isCurrent ? "none" : "2px solid #d1d5db",
                    boxShadow: isCurrent ? "0 0 0 6px rgba(245,200,66,0.25)" : "none",
                    animation: isCurrent ? "pulse 2s infinite" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isCompleted && <span style={{ fontSize: 10, color: "#0d1a2e", fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ position: "absolute", top: "100%", marginTop: 8, fontSize: 11, fontWeight: isCurrent ? 700 : 400, color: isCurrent || isCompleted ? "#0d1a2e" : "#94a3b8", whiteSpace: "nowrap", textAlign: "center" }}>
                    {STAGE_LABEL_MAP[i]}
                  </span>
                </div>
                {!isLast && (
                  <div style={{ flex: 1, height: 3, background: isCompleted ? "#F5C842" : "#e2e8f0", margin: "0 4px", borderRadius: 2 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Status message */}
        <p style={{ textAlign: "center", marginTop: 48, fontSize: 15, fontWeight: 500, color: "#F5C842", fontStyle: "italic" }}>
          {STATUS_MSG[client.stage] || "Processing..."}
        </p>

        {/* Live URL button */}
        {client.stage === "live" && client.published_url && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a
              href={client.published_url}
              target="_blank"
              style={{
                display: "inline-block",
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 18,
                background: "#F5C842",
                color: "#0d1a2e",
                padding: "14px 40px",
                borderRadius: 10,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Visit Your Site →
            </a>
          </div>
        )}
      </section>

      {/* Rep Messages */}
      {client.messages.filter((m) => m.from === "rep").length > 0 && (
        <section style={{ padding: "32px 48px 0" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0d1a2e", margin: "0 0 12px" }}>Messages from your BVM team</h2>
            {client.messages
              .filter((m) => m.from === "rep")
              .map((msg, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0d1a2e" }}>Your BVM Rep</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(msg.timestamp).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{msg.text}</p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Automagic Campaign Stack */}
      <section style={{ padding: "48px 48px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: "#0d1a2e", margin: "0 0 6px", textAlign: "center" }}>Your Complete Campaign</h2>
          <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 32 }}>See how your brand looks across every channel — consistent, professional, built for your market.</p>

          <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start" }}>
            {/* Laptop */}
            <div>
              <div style={{ background: "#374151", borderRadius: "12px 12px 0 0", padding: "8px 12px 0" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <div style={{ background: "#fff", borderRadius: "4px 4px 0 0", width: 360, height: 230, overflow: "hidden", position: "relative" }}>
                  <iframe
                    src={`/api/site/generate?clientId=${client.id}&lookKey=${campaignLook}`}
                    style={{ width: 1300, height: 850, border: "none", transform: "scale(0.277)", transformOrigin: "top left", pointerEvents: "none" }}
                    title="Website preview"
                  />
                </div>
              </div>
              <div style={{ background: "#4b5563", height: 14, borderRadius: "0 0 4px 4px" }} />
              <div style={{ background: "#6b7280", height: 6, width: "60%", margin: "0 auto", borderRadius: "0 0 8px 8px" }} />
              <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>Website</p>
            </div>

            {/* Print Ad */}
            <div>
              <div style={{ background: "#374151", borderRadius: 12, padding: 12, width: 200 }}>
                <div style={{ background: "#fff", borderRadius: 8, width: 176, height: 248, overflow: "hidden", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", transition: "all 0.4s" }}>
                  <div style={{ height: 3, width: 40, background: LOOK_STYLES[campaignLook]?.accent || "#1a5276", margin: "0 auto 12px", transition: "background 0.4s" }} />
                  <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: "#0d1a2e", margin: 0 }}>{client.business_name}</p>
                  <p style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{tagline}</p>
                  {services.slice(0, 3).map((s: string, i: number) => (
                    <p key={i} style={{ fontSize: 9, color: LOOK_STYLES[campaignLook]?.accent || "#1a5276", marginTop: 2, transition: "color 0.4s" }}>{s}</p>
                  ))}
                  <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 8 }}>{client.phone}</p>
                  <div style={{ height: 1, width: 30, background: "#F5C842", margin: "8px auto" }} />
                  <p style={{ fontSize: 8, color: "#94a3b8" }}>BVM Studio</p>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>Print Ad</p>
            </div>

            {/* Digital Ad */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ background: "#374151", borderRadius: 20, padding: 8, width: 156 }}>
                <div style={{ width: 30, height: 4, background: "#4b5563", borderRadius: 2, margin: "0 auto 6px" }} />
                <div style={{ background: "#fff", borderRadius: 12, width: 140, height: 248, overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.4s" }}>
                  <div style={{ height: 40, background: LOOK_STYLES[campaignLook]?.accent || "#1a5276", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.4s" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{client.business_name}</span>
                  </div>
                  <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    <div style={{ width: 100, height: 60, borderRadius: 8, background: `${LOOK_STYLES[campaignLook]?.accent || "#1a5276"}22`, transition: "background 0.4s" }} />
                    <p style={{ fontSize: 10, color: "#0d1a2e", marginTop: 8, fontWeight: 600 }}>{services[0] || ""}</p>
                    <div style={{ background: LOOK_STYLES[campaignLook]?.accent || "#1a5276", color: "#fff", fontSize: 9, padding: "4px 12px", borderRadius: 4, marginTop: 8, fontWeight: 600, transition: "background 0.4s" }}>
                      {client.intakeAnswers?.q4 || "Contact Us"}
                    </div>
                  </div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #4b5563", margin: "6px auto 2px" }} />
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>Digital Ad</p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={cycleLook}
              style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "12px 32px", borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              ✨ {LOOK_LABELS[campaignLook] || "Professional"}
            </button>
            <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 12 }}>
              Your final site will match the direction you approved. Print and digital assets are available through your BVM rep.
            </p>
          </div>
        </div>
      </section>

      {/* Onboarding Video */}
      <section style={{ padding: "40px 48px", background: "#fff" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: "#0d1a2e", margin: "0 0 6px" }}>Welcome to BVM</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>Here&apos;s what happens next with your new site.</p>
          <video
            src="/claire-onboarding.mp4"
            controls
            preload="metadata"
            style={{ borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxWidth: 700, width: "100%", display: "block", margin: "0 auto" }}
          />
        </div>
      </section>

      {/* Real Site Preview */}
      <section style={{ borderTop: "1px solid #f1f5f9", padding: "48px 48px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 20, textAlign: "center" }}>Your Site Preview</p>
          <div style={{ background: "#374151", borderRadius: "12px 12px 0 0", padding: "8px 12px 0" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
            </div>
            <div style={{ background: "#fff", borderRadius: "4px 4px 0 0", width: "100%", height: 380, overflow: "hidden", position: "relative" }}>
              <iframe
                src={`/api/site/generate?clientId=${client.id}&lookKey=${client.selectedLook || "professional"}`}
                style={{ width: "250%", height: 950, border: "none", transform: "scale(0.4)", transformOrigin: "top left", pointerEvents: "none" }}
                title="Site preview"
              />
            </div>
          </div>
          <div style={{ background: "#4b5563", height: 14, borderRadius: "0 0 4px 4px" }} />
          <div style={{ background: "#6b7280", height: 6, width: "60%", margin: "0 auto", borderRadius: "0 0 8px 8px" }} />
        </div>
      </section>

      {/* Asset Upload */}
      {showUpload && (
        <section style={{ padding: "0 48px 40px" }}>
          <div style={{ maxWidth: 500, margin: "0 auto", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "28px 24px" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#92400e", margin: "0 0 4px" }}>We still need your logo</p>
            <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 20px" }}>Upload your logo below so we can include it in your final build.</p>
            <div style={{ border: "2px dashed #e2e8f0", borderRadius: 12, padding: "28px 20px", textAlign: "center", marginBottom: 16 }}>
              <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 8px" }}>Drop PNG or JPG here</p>
              <label style={{ display: "inline-block", color: "#F5C842", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                or click to browse
                <input type="file" accept=".png,.jpg,.jpeg" style={{ display: "none" }} />
              </label>
            </div>
            <a href={`https://bvm-studio-app.vercel.app/studio-v2/brand?name=${encodedName}&mode=logo`} target="_blank" style={{ fontSize: 13, color: "#F5C842", fontWeight: 600, textDecoration: "none" }}>
              Generate a logo instead →
            </a>
          </div>
        </section>
      )}

      {/* Upsell Product Ladder */}
      <section style={{ padding: "48px 48px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#0d1a2e", margin: "0 0 6px", textAlign: "center" }}>Grow further with BVM</h2>
          <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 32 }}>Your site is just the beginning. Here&apos;s what else we can do for you.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <UpsellCard clientId={client.id} icon="📈" title="Digital Advertising" product="digital-ads" audio="/audio/digital-ads.mp3" desc="Drive traffic to your new site with Google Ads, social campaigns, and geofenced ads targeting your local market." />
            <UpsellCard clientId={client.id} icon="📱" title="Social Media Management" product="social-media" audio="/audio/social-media.mp3" desc="We'll manage your social presence so you can focus on running your business. Consistent posting, engagement, and growth." />
            <UpsellCard clientId={client.id} icon="⭐" title="Reputation Management" product="reputation" audio="/audio/reputation.mp3" desc="Protect and grow your Google rating. We monitor reviews, craft responses, and help you build the reputation your business deserves." />
            <UpsellCard clientId={client.id} icon="📧" title="Email Marketing" product="email-marketing" audio="/audio/email-marketing.mp3" desc="Stay in front of your customers every month with professional email campaigns built around your business and local market." />
            <UpsellCard clientId={client.id} icon="🔄" title="Site Refresh" product="site-refresh" audio="/audio/site-refresh.mp3" desc="Markets change. Your site should too. Every 6-12 months, a fresh campaign direction keeps you ahead of the competition." />
            {/* Custom Enhancement */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>Custom Enhancement</h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 16px" }}>Need something unique? Custom features, integrations, booking systems, or unique layouts built specifically for your business.</p>
              {!customInterested ? (
                <button
                  onClick={async () => {
                    await fetch("/api/upsell/interest", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clientId: client.id, product: "custom-enhancement" }),
                    });
                    setCustomInterested(true);
                  }}
                  style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  I&apos;m interested →
                </button>
              ) : (
                <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>✓ Your rep has been notified</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Contact CTA */}
      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Have questions about your site or services?</p>
        <a
          href={`mailto:therrera@bestversionmedia.com?subject=${encodeURIComponent(`Question about my BVM site`)}&body=${encodeURIComponent(`Hi, I have a question about my site for ${client.business_name}.`)}`}
          style={{ background: "#0d1a2e", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          Contact Your BVM Rep →
        </a>
      </footer>
    </div>
  );
}
