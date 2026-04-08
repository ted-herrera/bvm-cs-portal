import Link from "next/link";

const BG      = "#0d1a2e";
const CARD_BG = "#1a2740";
const NAVY    = "#0d1a2e";
const WHITE   = "#ffffff";
const GOLD    = "#F5C842";

const features = [
  {
    title: "Bruno Intake",
    href: "/intake",
    description:
      "Rep runs guided intake, client profile created automatically.",
    icon: "\u{1F4CB}",
    bullets: [
      "Guided AI conversation",
      "ZIP market scan",
      "Profile created automatically",
      "Tear sheet generated",
    ],
  },
  {
    title: "Build & Deliver",
    href: "/dashboard",
    description:
      "One active build per client, three campaign looks, downloadable HTML package.",
    icon: "\u{1F3D7}\uFE0F",
    bullets: [
      "Three campaign looks",
      "Developer review sandbox",
      "Confidence score routing",
      "Downloadable HTML package",
    ],
  },
  {
    title: "Automated QA",
    href: "/qa",
    description:
      "Any HTML file, four-pass validation, auto-fix, downloadable report.",
    icon: "\u2705",
    bullets: [
      "Four-pass validation",
      "ADA compliance check",
      "Auto-fix where possible",
      "Downloadable QA report",
    ],
  },
];

const stats = [
  { value: "4-Pass", label: "QA Pipeline" },
  { value: "10", label: "Simultaneous Tests" },
  { value: "Auto-Fix", label: "Where Possible" },
  { value: "Self", label: "Contained" },
];

export default function MarketingPage() {
  return (
    <div style={{ minHeight: "100vh", background: BG, color: WHITE }}>
      {/* Gold top bar */}
      <div style={{ height: 4, background: GOLD, flexShrink: 0 }} />

      {/* Sticky Header — white */}
      <header
        style={{
          background: WHITE,
          borderBottom: "1px solid #e2e8f0",
          padding: "12px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/bvm_logo.png" alt="BVM Logo" style={{ height: "36px", width: "auto" }} />
          <span
            style={{
              color: NAVY,
              fontWeight: "bold",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            BVM DESIGN CENTER
          </span>
        </div>
        <nav style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: GOLD, textDecoration: "none" }}>Login</Link>
          <Link href="/qa-demo" style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", textDecoration: "none" }}>QA Demo</Link>
        </nav>
      </header>

      {/* Hero — Two Column, dark navy */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 48px 80px",
          gap: "56px",
          maxWidth: "1200px",
          margin: "0 auto",
          flexWrap: "wrap",
        }}
      >
        {/* Left Column — headline + CTAs */}
        <div style={{ flex: "0 1 55%", minWidth: "320px" }}>
          <p
            style={{
              color: GOLD,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginBottom: "12px",
              fontWeight: 700,
            }}
          >
            INTERNAL PRODUCTION TOOL
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "56px",
              fontWeight: 900,
              color: WHITE,
              lineHeight: 1.08,
              marginBottom: "20px",
              letterSpacing: "-1.5px",
            }}
          >
            BVM<br />Design Center
          </h1>
          <p
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.65)",
              maxWidth: "480px",
              lineHeight: 1.75,
              marginBottom: "36px",
            }}
          >
            The internal web production tool that builds, QAs, and delivers
            client sites — faster.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "28px" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: GOLD,
                color: NAVY,
                padding: "14px 32px",
                borderRadius: "999px",
                fontWeight: 800,
                fontSize: "15px",
                textDecoration: "none",
                boxShadow: "0 4px 24px rgba(245,200,66,0.30)",
              }}
            >
              Open Design Center &rarr;
            </Link>
            <Link
              href="/qa-demo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(255,255,255,0.3)",
                color: WHITE,
                padding: "14px 32px",
                borderRadius: "999px",
                fontWeight: 700,
                fontSize: "15px",
                textDecoration: "none",
                background: "transparent",
              }}
            >
              View QA Demo &rarr;
            </Link>
          </div>

          {/* Trust Stats inline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <span>4-Pass QA</span>
            <span style={{ color: GOLD, fontSize: "10px" }}>&bull;</span>
            <span>Auto-Fix</span>
            <span style={{ color: GOLD, fontSize: "10px" }}>&bull;</span>
            <span>Self-Contained</span>
          </div>
        </div>

        {/* Right Column — Video */}
        <div style={{ flex: "0 1 45%", minWidth: "320px" }}>
          <video
            src="/overview.mp4"
            controls
            playsInline
            style={{
              width: "100%",
              borderRadius: "12px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              display: "block",
            }}
          />
        </div>
      </section>

      {/* Stats Row — dark navy, gold values */}
      <section style={{ padding: "60px 48px", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {stats.map((s, i) => (
            <div key={s.value + s.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center", padding: "0 32px" }}>
                <div
                  style={{
                    color: GOLD,
                    fontSize: "22px",
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </div>
              </div>
              {i < stats.length - 1 && (
                <div
                  style={{
                    width: "1px",
                    height: "36px",
                    background: "rgba(255,255,255,0.12)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards — dark card bg, gold top border */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>
            PLATFORM FEATURES
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 38, fontWeight: 900, color: WHITE, letterSpacing: "-0.8px" }}>
            Everything your reps need. One platform.
          </h2>
        </div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                flex: "1 1 300px",
                background: CARD_BG,
                borderRadius: "16px",
                borderTop: `3px solid ${GOLD}`,
                padding: "36px 32px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "rgba(245,200,66,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  marginBottom: "20px",
                }}
              >
                {f.icon}
              </div>

              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: WHITE,
                  marginBottom: "8px",
                }}
              >
                {f.title}
              </h3>

              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.7,
                  marginBottom: "16px",
                }}
              >
                {f.description}
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
                {f.bullets.map((b) => (
                  <li
                    key={b}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: "rgba(255,255,255,0.55)",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ color: GOLD, fontSize: "8px" }}>&#9679;</span>
                    {b}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: "auto", textAlign: "right" }}>
                <Link
                  href={f.href}
                  style={{
                    color: GOLD,
                    fontWeight: 600,
                    fontSize: "14px",
                    textDecoration: "none",
                  }}
                >
                  Explore &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* QA Demo Section */}
      <section style={{ background: BG, padding: "96px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 56, flexWrap: "wrap" }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 340 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>
              BUILT-IN QUALITY ASSURANCE
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 38, fontWeight: 900, color: WHITE, letterSpacing: "-0.8px", marginBottom: 28, lineHeight: 1.1 }}>
              Every site gets a senior dev review. Automatically.
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
              <div style={{ fontSize: 15, color: WHITE }}>&#10003; Catches JavaScript errors before they crash your site</div>
              <div style={{ fontSize: 15, color: WHITE }}>&#10003; Flags SEO traps that get you penalized by Google</div>
              <div style={{ fontSize: 15, color: WHITE }}>&#10003; Validates schema, mobile, accessibility in one pass</div>
            </div>
            <Link href="/qa-demo" style={{
              display: "inline-block", background: GOLD, color: NAVY,
              padding: "14px 32px", borderRadius: 999, fontSize: 15, fontWeight: 800,
              textDecoration: "none", boxShadow: "0 4px 24px rgba(245,200,66,0.30)",
            }}>
              See QA Demo &rarr;
            </Link>
          </div>

          {/* Right — Mock QA Report */}
          <div style={{ flex: 1, minWidth: 340 }}>
            <div style={{ background: CARD_BG, borderRadius: 12, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>QA Score</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: "#ef4444", lineHeight: 1 }}>23<span style={{ fontSize: 20, color: "rgba(255,255,255,0.3)" }}>/100</span></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Test Business</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Tulsa OK</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, color: "#ef4444" }}>&#9888; Hidden white text detected &mdash; Google penalty risk</div>
                <div style={{ fontSize: 13, color: "#ef4444" }}>&#9888; JavaScript errors: getElementByID (case sensitive)</div>
                <div style={{ fontSize: 13, color: "#ef4444" }}>&#9888; Broken viewport &mdash; site not mobile responsive</div>
                <div style={{ fontSize: 13, color: "#f59e0b" }}>&#9889; Duplicate element IDs found</div>
                <div style={{ fontSize: 13, color: "#f59e0b" }}>&#9889; Deprecated HTML tags: marquee</div>
                <div style={{ fontSize: 13, color: "#22c55e" }}>&#10003; Contact information present</div>
              </div>
              <div style={{ marginTop: 20 }}>
                <Link href="/qa-demo" style={{ display: "inline-block", background: GOLD, color: NAVY, padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  View Full Report &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Benchmarks */}
      <section style={{ background: BG, padding: "96px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>
              PERFORMANCE AT SCALE
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 38, fontWeight: 900, color: WHITE, letterSpacing: "-0.8px" }}>
              What happens when every rep runs at 10x?
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { value: "10x", label: "Sites Per Rep Per Month", sub: "From 4-6 to 40-60 \u2014 same rep, same hours" },
              { value: "97%", label: "Reduction in Production Cost", sub: "From $300-500 per site to ~$12 in API costs" },
              { value: "48,000", label: "QA Hours Saved Monthly", sub: "Across 1,219 reps \u2014 zero manual QA" },
            ].map((s) => (
              <div key={s.value} style={{ background: CARD_BG, borderTop: `3px solid ${GOLD}`, borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginTop: 12 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 8, lineHeight: 1.5 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <p style={{ fontSize: 18, color: WHITE, maxWidth: 700, margin: "0 auto 32px", lineHeight: 1.6 }}>
              1,219 reps. 10x output. Same headcount. That&apos;s not an efficiency gain &mdash; that&apos;s a different business.
            </p>
            <Link href="/intake" style={{
              display: "inline-block", background: GOLD, color: NAVY,
              padding: "16px 40px", borderRadius: 999, fontSize: 16, fontWeight: 800,
              textDecoration: "none", boxShadow: "0 4px 24px rgba(245,200,66,0.30)",
            }}>
              See How It Works &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Bruno Easter Egg — white background section */}
      <section style={{ padding: "80px 24px", background: WHITE }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
          <div style={{ flexShrink: 0 }}>
            <img
              src="/bruno-login.png"
              alt="Bruno"
              style={{
                width: 280,
                height: "auto",
                objectFit: "contain",
                mixBlendMode: "multiply",
                background: "transparent",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
                color: GOLD,
                marginBottom: 16,
              }}
            >
              About Bruno
            </p>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 900, color: NAVY, marginBottom: 16, lineHeight: 1.15 }}>
              Your AI Brand Director
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#64748b" }}>
              Bruno started as an internal tool — a way to help BVM account managers run smarter
              client conversations. He learned the SBR playbook, memorized every market, and got
              very good at asking the right questions. Somewhere along the way he stopped being a
              tool and started being a teammate. He&apos;s read more campaign briefs than most humans.
              He never forgets a ZIP code. And he genuinely cares whether your site looks right.
              Bruno is the engine behind BVM Design Center.
            </p>
          </div>
        </div>
      </section>

      {/* Footer — dark navy */}
      <footer style={{ background: BG, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "40px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}>
            <img src="/bvm_logo.png" alt="BVM" style={{ height: 28, width: "auto", opacity: 0.5 }} />
          </div>
          BVM Design Center — Internal Production Tool<br />
          Conceived and directed by Ted Herrera. Built with Claude.
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
      `}</style>
    </div>
  );
}
