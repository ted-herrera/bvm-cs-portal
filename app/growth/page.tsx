"use client";

// Public growth page — no login required.
// Shows the four template tiers, services, how-it-works, and a CTA.

const COLORS = {
  bg: "#f5f8fa",
  white: "#ffffff",
  border: "#e7edf3",
  ink: "#1f2937",
  muted: "#516f90",
  accent: "#0091ae",
  action: "#ff7a59",
  success: "#00bda5",
  primary: "#2d3e50",
  gold: "#F5C842",
};

const TEMPLATE_CARDS = [
  {
    tier: "Local",
    badge: "#2d5a27",
    iframe: "/demos/tulsa-green-landscaping.html",
    tagline: "For trades, home services, community businesses",
    full: "/demos/tulsa-green-landscaping.html",
  },
  {
    tier: "Community",
    badge: "#1B2A4A",
    iframe: "/demos/herrera-roofing.html",
    tagline: "For professional services, medical, legal, fitness",
    full: "/demos/herrera-roofing.html",
  },
  {
    tier: "Premier",
    badge: "#C9A84C",
    iframe: "/demos/mooshu-sushi.html",
    tagline: "For restaurants, retail, premium brands",
    full: "/demos/mooshu-sushi.html",
  },
  {
    tier: "Custom",
    badge: "#8B7355",
    iframe: "/demos/hank-moo-beans.html",
    tagline: "Fully bespoke — no template",
    full: "/demos/hank-moo-beans.html",
    split: [
      { label: "Hank, Moo & Beans →", url: "/demos/hank-moo-beans.html" },
      { label: "Winkle & Co. →", url: "https://winkleandco.netlify.app" },
    ],
  },
];

const SERVICES = [
  {
    icon: "💰",
    title: "Digital Advertising",
    desc: "Geo-targeted ads across Google, Facebook & Instagram",
    price: "$299/mo",
  },
  {
    icon: "📧",
    title: "Email Marketing",
    desc: "Monthly Bruno-written campaign to your customer list",
    price: "$99/mo",
  },
  {
    icon: "⭐",
    title: "Reputation Management",
    desc: "Monitor and respond to Google reviews, monthly report",
    price: "$79/mo",
  },
];

export default function GrowthPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: COLORS.ink,
      }}
    >
      {/* Header */}
      <header
        style={{
          background: COLORS.primary,
          color: "#fff",
          padding: "50px 32px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: COLORS.gold,
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          BVM Digital
        </p>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 800,
            margin: "12px 0 8px",
          }}
        >
          What BVM Digital Builds
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", margin: 0 }}>
          Smart templates. Real sites. Live in days.
        </p>
      </header>

      {/* Section 1 — Template Showcase */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "60px 32px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
          The Templates
        </h2>
        <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 32px" }}>
          Three locked designs plus fully custom. Pick what fits.
        </p>
        <div
          className="tpl-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
          }}
        >
          {TEMPLATE_CARDS.map((card) => (
            <div
              key={card.tier}
              style={{
                background: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  background: "#1a1a1a",
                  height: 260,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <iframe
                  src={card.iframe}
                  style={{
                    width: "250%",
                    height: 780,
                    border: "none",
                    transform: "scale(0.4)",
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}
                  title={`${card.tier} template preview`}
                />
              </div>
              <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#fff",
                    background: card.badge,
                    padding: "3px 10px",
                    borderRadius: 999,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {card.tier}
                </span>
                <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 14px", flex: 1 }}>
                  {card.tagline}
                </p>
                {card.split ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {card.split.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 12,
                          color: COLORS.accent,
                          fontWeight: 600,
                          textDecoration: "none",
                          padding: "6px 10px",
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 6,
                          textAlign: "center",
                        }}
                      >
                        {s.label}
                      </a>
                    ))}
                  </div>
                ) : (
                  <a
                    href={card.full}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: COLORS.accent,
                      fontWeight: 600,
                      textDecoration: "none",
                      marginBottom: 10,
                    }}
                  >
                    See Full Example →
                  </a>
                )}
                <a
                  href="/intake"
                  style={{
                    background: COLORS.action,
                    color: "#fff",
                    textDecoration: "none",
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                >
                  Start Here →
                </a>
              </div>
            </div>
          ))}
        </div>
        <style>{`
          @media (max-width: 1024px) { .tpl-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 640px) { .tpl-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      {/* Section 2 — Services */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 32px 60px",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px" }}>
          Services
        </h2>

        {/* Social Media Management */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: "0 0 12px" }}>
            📱 Social Media Management
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 14,
            }}
          >
            {[
              { platform: "Facebook", color: "#1877f2", caption: "Proudly serving Tulsa since 2012. Come say hi at our new location…" },
              { platform: "Instagram", color: "#833ab4", caption: "That golden hour hits different when you're working on what you love…" },
              { platform: "Google Business", color: "#00bda5", caption: "This week's special: seasonal menu now live. Book your table…" },
            ].map((p) => (
              <div
                key={p.platform}
                style={{
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "#fff",
                      background: p.color,
                      padding: "2px 6px",
                      borderRadius: 3,
                    }}
                  >
                    {p.platform.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    background: "#e7edf3",
                    height: 80,
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                />
                <p style={{ fontSize: 11, color: COLORS.muted, margin: 0, lineHeight: 1.5 }}>
                  {p.caption}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
            <strong style={{ color: COLORS.ink }}>$199/mo</strong> · 30 posts/month · Bruno-generated
          </p>
        </div>

        {/* Custom Web Development */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: "0 0 12px" }}>
            🌐 Custom Web Development
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {[
              { label: "Winkle & Co.", url: "https://winkleandco.netlify.app" },
              { label: "Hank, Moo & Beans", url: "/demos/hank-moo-beans.html" },
            ].map((site) => (
              <a
                key={site.label}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#1a1a1a",
                  height: 160,
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                  display: "block",
                  textDecoration: "none",
                }}
              >
                <iframe
                  src={site.url}
                  style={{
                    width: "250%",
                    height: 500,
                    border: "none",
                    transform: "scale(0.4)",
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}
                  title={site.label}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 4,
                  }}
                >
                  {site.label} →
                </span>
              </a>
            ))}
          </div>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
            <strong style={{ color: COLORS.ink }}>From $1,499</strong> · Built for your brand · Delivered in days
          </p>
        </div>

        {/* SEO & Google Indexing */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: "0 0 14px" }}>
            🔍 SEO &amp; Google Indexing
          </h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { text: "⚪ Not Submitted", border: "#e7edf3", color: COLORS.muted },
              { text: "🟡 Submitted", border: "#f59e0b", color: "#92400e" },
              { text: "🟢 Indexed", border: COLORS.success, color: COLORS.success },
            ].map((p) => (
              <span
                key={p.text}
                style={{
                  padding: "8px 16px",
                  border: `1px solid ${p.border}`,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: p.color,
                  background: "#fff",
                }}
              >
                {p.text}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
            Included with every site · Submitted to Google on go-live
          </p>
        </div>

        {/* Simple service rows */}
        {SERVICES.map((s) => (
          <div
            key={s.title}
            style={{
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 22, width: 32, textAlign: "center" }}>{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, margin: 0 }}>{s.title}</p>
              <p style={{ fontSize: 12, color: COLORS.muted, margin: "2px 0 0" }}>{s.desc}</p>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, whiteSpace: "nowrap" }}>
              {s.price}
            </div>
            <a
              href="mailto:therrera@bestversionmedia.com"
              style={{
                background: COLORS.action,
                color: "#fff",
                textDecoration: "none",
                padding: "9px 16px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              I&apos;m Interested →
            </a>
          </div>
        ))}
      </section>

      {/* Section 3 — How It Works */}
      <section
        style={{
          background: COLORS.white,
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "60px 32px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 32px", textAlign: "center" }}>
            How It Works
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 32,
            }}
            className="hiw-grid"
          >
            {[
              { icon: "🤖", title: "Bruno asks the questions", desc: "Onboarding specialist runs intake" },
              { icon: "✓", title: "You approve the direction", desc: "Tearsheet, pick your look" },
              { icon: "🚀", title: "Your site goes live", desc: "Dev builds, QA passes, domain live" },
            ].map((step, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: COLORS.bg,
                    border: `2px solid ${COLORS.accent}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    margin: "0 auto 14px",
                  }}
                >
                  {step.icon}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink, margin: "0 0 4px" }}>
                  {i + 1}. {step.title}
                </p>
                <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <style>{`@media (max-width: 768px) { .hiw-grid { grid-template-columns: 1fr !important; } }`}</style>
      </section>

      {/* Section 4 — Footer CTA */}
      <section
        style={{
          background: COLORS.primary,
          color: "#fff",
          padding: "60px 32px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 22, color: "#fff", fontWeight: 800, margin: "0 0 20px" }}>
          Ready to see what Bruno builds for your business?
        </h2>
        <a
          href="mailto:therrera@bestversionmedia.com"
          style={{
            display: "inline-block",
            background: COLORS.gold,
            color: COLORS.primary,
            textDecoration: "none",
            padding: "14px 32px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          Talk to a BVM Rep →
        </a>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "40px 0 0", letterSpacing: "0.08em" }}>
          Powered by BVM Digital · Bruno AI · © 2026
        </p>
      </section>
    </div>
  );
}
