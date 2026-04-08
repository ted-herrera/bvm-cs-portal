import Link from "next/link";

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
    <div className="gold-top-bar min-h-screen bg-navy-dark text-white">
      {/* Sticky Header */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "12px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: "4px",
          zIndex: 100,
        }}
      >
        <span
          style={{
            color: "#0d1a2e",
            fontWeight: "bold",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          BVM DESIGN CENTER
        </span>
        <img src="/bvm_logo.png" alt="BVM Logo" style={{ height: "36px", width: "auto" }} />
      </header>

      {/* Hero — Two Column */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 48px 64px",
          gap: "48px",
          maxWidth: "1200px",
          margin: "0 auto",
          flexWrap: "wrap",
        }}
      >
        {/* Left Column 55% */}
        <div style={{ flex: "0 1 55%", minWidth: "320px" }}>
          <p
            style={{
              color: "#F5C842",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginBottom: "12px",
              fontWeight: 600,
            }}
          >
            BVM
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "72px",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.0,
              marginBottom: "20px",
            }}
          >
            Design Center
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "18px",
              color: "rgba(255,255,255,0.7)",
              maxWidth: "480px",
              lineHeight: 1.7,
              marginBottom: "32px",
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
                backgroundColor: "#F5C842",
                color: "#0d1a2e",
                padding: "14px 32px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "15px",
                textDecoration: "none",
                transition: "opacity 0.2s",
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
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#ffffff",
                padding: "14px 32px",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "15px",
                textDecoration: "none",
                background: "transparent",
                transition: "border-color 0.2s",
              }}
            >
              View QA Demo &rarr;
            </Link>
          </div>

          {/* Trust Stats */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span>4-Pass QA</span>
            <span style={{ color: "#F5C842", fontSize: "10px" }}>&bull;</span>
            <span>Auto-Fix</span>
            <span style={{ color: "#F5C842", fontSize: "10px" }}>&bull;</span>
            <span>Self-Contained</span>
          </div>
        </div>

        {/* Right Column 45% — Video */}
        <div style={{ flex: "0 1 45%", minWidth: "320px" }}>
          <video
            src="/overview.mp4"
            controls
            style={{
              width: "100%",
              borderRadius: "16px",
              border: "1px solid rgba(245,200,66,0.3)",
              boxShadow: "0 12px 48px rgba(10,20,40,0.6)",
              display: "block",
            }}
          />
        </div>
      </section>

      {/* Feature Cards */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 48px 64px" }}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                flex: "1 1 300px",
                background: "#ffffff",
                borderRadius: "16px",
                borderLeft: "4px solid #F5C842",
                padding: "32px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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

              {/* Title */}
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#0d1a2e",
                  marginBottom: "8px",
                }}
              >
                {f.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  color: "#64748b",
                  lineHeight: 1.7,
                  marginBottom: "16px",
                }}
              >
                {f.description}
              </p>

              {/* Bullets */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
                {f.bullets.map((b) => (
                  <li
                    key={b}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: "#64748b",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ color: "#F5C842", fontSize: "8px" }}>&#9679;</span>
                    {b}
                  </li>
                ))}
              </ul>

              {/* CTA Link */}
              <div style={{ marginTop: "auto", textAlign: "right" }}>
                <Link
                  href={f.href}
                  style={{
                    color: "#F5C842",
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

      {/* Stats Row */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 48px 56px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0",
          }}
        >
          {stats.map((s, i) => (
            <div key={s.value + s.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center", padding: "0 32px" }}>
                <div
                  style={{
                    color: "#F5C842",
                    fontSize: "20px",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginTop: "4px",
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
                    background: "rgba(245,200,66,0.4)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* About Bruno */}
      <section className="px-6 pt-16 pb-8">
        <div className="mx-auto max-w-lg">
          <div className="mx-auto mb-6 h-px w-24 bg-[#334155]" />
          <div className="flex flex-col items-center text-center">
            <img
              src="/bruno.png"
              alt="Bruno"
              className="mb-4 rounded-full"
              style={{ width: 80, height: 80, objectFit: "cover" }}
            />
            <p
              className="mb-4 font-semibold text-gold"
              style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }}
            >
              About Bruno
            </p>
            <p className="text-[#64748b]" style={{ fontSize: 13, lineHeight: 1.8, maxWidth: 500 }}>
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

      {/* Footer */}
      <footer className="border-t border-[#1e293b] py-8 text-center text-sm text-[#64748b]">
        Conceived and directed by Ted Herrera. Built with Claude.
      </footer>
    </div>
  );
}
