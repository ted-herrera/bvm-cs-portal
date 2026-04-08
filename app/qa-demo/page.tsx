import Link from "next/link";

interface DemoCheck { name: string; passed: boolean; severity: string; message: string; autofix?: boolean; }

const checks: Record<string, DemoCheck[]> = {
  structure: [
    { name: "HTML lang attribute", passed: true, severity: "Blocker", message: "html lang attribute present" },
    { name: "Title tag", passed: true, severity: "Blocker", message: "Title tag found: Hanks Hamburgers" },
    { name: "Meta description", passed: false, severity: "Warning", message: "No meta description found", autofix: true },
    { name: "Canonical link", passed: false, severity: "Warning", message: "No canonical link found", autofix: true },
    { name: "og:title", passed: false, severity: "Optimization", message: "No Open Graph title tag found" },
    { name: "og:description", passed: false, severity: "Optimization", message: "No Open Graph description found" },
  ],
  compliance: [
    { name: "Image alt texts", passed: true, severity: "Blocker", message: "All images have alt attributes" },
    { name: "Button labels", passed: true, severity: "Blocker", message: "All buttons have accessible labels" },
    { name: "Color contrast", passed: true, severity: "Warning", message: "Contrast ratios within acceptable range (manual review recommended)" },
    { name: "Heading hierarchy", passed: true, severity: "Warning", message: "Heading hierarchy is valid — h1 → h2 → h3" },
  ],
  performance: [
    { name: "Inline styles", passed: true, severity: "Optimization", message: "1 inline style found — acceptable" },
    { name: "Images without dimensions", passed: false, severity: "Warning", message: "1 image missing width/height attributes", autofix: true },
    { name: "Scripts in head", passed: false, severity: "Warning", message: "1 blocking script in head — add defer or async attribute" },
  ],
  content: [
    { name: "Placeholder text", passed: true, severity: "Blocker", message: "No placeholder text detected" },
    { name: "Phone number", passed: true, severity: "Warning", message: "Phone number found: 918-222-4555" },
    { name: "Physical address", passed: false, severity: "Warning", message: "No physical address detected in content" },
    { name: "CTA button", passed: true, severity: "Blocker", message: "Primary CTA button found: Order Now" },
  ],
};

const passes = [
  { name: "Structure", passed: true, checks: checks.structure },
  { name: "Compliance", passed: true, checks: checks.compliance },
  { name: "Performance", passed: false, checks: checks.performance },
  { name: "Content", passed: true, checks: checks.content },
];

function Badge({ severity }: { severity: string }) {
  const bg = severity === "Blocker" ? "rgba(239,68,68,0.12)" : severity === "Warning" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.12)";
  const color = severity === "Blocker" ? "#dc2626" : severity === "Warning" ? "#d97706" : "#2563eb";
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: bg, color, fontWeight: 600 }}>{severity}</span>;
}

export default function QADemoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 4, background: "#F5C842", flexShrink: 0 }} />
      <header style={{ padding: "12px 32px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, background: "#fff" }}>
        <span style={{ color: "#0d1a2e", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>BVM Design Center</span>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 32, width: "auto" }} />
      </header>

      {/* Hero */}
      <section style={{ background: "#0d1a2e", padding: "60px 48px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 48, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>QA Engine Demo</h1>
        <p style={{ fontSize: 18, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
          See exactly what our automated quality system catches — before your client ever sees the site.
        </p>
      </section>

      {/* Report */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: "#0d1a2e", marginBottom: 4 }}>
          Sample QA Report — Hanks Hamburgers, Tulsa OK
        </h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 32 }}>Report generated: April 7, 2026</p>

        {/* Score */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#f59e0b", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#fff" }}>61</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>/100</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#f59e0b", marginTop: 8 }}>PASSED WITH WARNINGS</p>
        </div>

        {/* Passes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {passes.map((pass) => (
            <div key={pass.name} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: pass.passed ? "#22c55e" : "#f59e0b", fontSize: 16 }}>{pass.passed ? "✓" : "⚠"}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#0d1a2e" }}>Pass — {pass.name}</span>
                </div>
                <span style={{ fontSize: 12, color: pass.passed ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
                  {pass.passed ? "Passed" : "Warning"}
                </span>
              </div>
              <div>
                {pass.checks.map((check) => (
                  <div key={check.name} style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: check.passed ? "#22c55e" : "#ef4444", fontSize: 14 }}>{check.passed ? "✓" : "✕"}</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "#0d1a2e", margin: 0 }}>{check.name}</p>
                        <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{check.message}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Badge severity={check.severity} />
                      {check.autofix && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 600 }}>⚡ Auto-fix</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 32, textAlign: "center", marginTop: 32 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#22c55e", margin: "0 0 6px" }}>⚡ 3 issues would be auto-fixed before delivery</p>
          <p style={{ fontSize: 13, color: "#f59e0b", margin: "0 0 6px" }}>2 items flagged for developer review</p>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>This QA runs automatically on every BVM Design Center build.</p>
        </div>

        {/* CTAs */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/login" style={{ display: "inline-block", background: "#F5C842", color: "#0d1a2e", padding: "14px 36px", borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
            Run QA on Your Own Site →
          </Link>
          <p style={{ marginTop: 12 }}>
            <Link href="/login" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>Already have access? Sign in →</Link>
          </p>
        </div>
      </section>

      <div style={{ flexGrow: 1 }} />
      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px 48px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Conceived and directed by Ted Herrera. Built with Claude.</p>
      </footer>
    </div>
  );
}
