"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { ClientProfile, PipelineStage } from "@/lib/pipeline";

const PORTAL_STAGES: PipelineStage[] = ["tear-sheet", "building", "qa", "delivered", "live"];

export default function TearSheetPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [selectedLook, setSelectedLook] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneType, setDoneType] = useState<"approved" | "note" | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [siteHtml, setSiteHtml] = useState("");
  const [logoSkipped, setLogoSkipped] = useState(false);

  useEffect(() => {
    fetch(`/api/profile/${id}`).then((r) => r.json()).then((d) => { setClient(d.client || null); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (client?.selectedLook) setSelectedLook(client.selectedLook); }, [client?.selectedLook]);

  // Fetch site preview when look changes
  useEffect(() => {
    if (!client || !selectedLook) return;
    fetch(`/api/site/generate?clientId=${client.id}&lookKey=${selectedLook}`)
      .then((r) => r.text())
      .then((html) => setSiteHtml(html))
      .catch(() => {});
  }, [client?.id, selectedLook]);

  const allChecked = checks.every(Boolean);
  const lookSelected = selectedLook !== null;
  const logoResolved = client?.hasLogo || logoSkipped;
  const canApprove = allChecked && lookSelected && logoResolved;

  async function handleApprove() {
    if (!canApprove || !client) return;
    setSubmitting(true);
    await fetch(`/api/profile/approve/${id}`, { method: "POST" });
    setDoneType("approved");
    setSubmitting(false);
  }

  async function handleRevision() {
    if (!note.trim()) return;
    setSubmitting(true);
    await fetch(`/api/profile/revision/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    setDoneType("note");
    setSubmitting(false);
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!client) return <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#64748b" }}>Tear sheet not found.</p></div>;

  if (doneType) return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 4, background: "#F5C842" }} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#0d1a2e", margin: "0 auto 20px", fontWeight: 700 }}>✓</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#0d1a2e", margin: "0 0 12px" }}>{doneType === "approved" ? "Direction Approved" : "Note Received"}</h1>
          <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6 }}>{doneType === "approved" ? "Your rep has been notified. We'll be in touch shortly." : "Note received — your rep will review and follow up."}</p>
        </div>
      </div>
    </div>
  );

  const sbr = client.sbrData as Record<string, unknown> | null;
  const tagline = (sbr?.suggestedTagline as string) || (sbr?.tagline as string) || (sbr?.geoCopyBlock as string) || "";
  const cta = client.intakeAnswers?.q4 || "Contact Us";
  const isTearSheet = client.stage === "tear-sheet";
  const currentIdx = PORTAL_STAGES.indexOf(client.stage as PipelineStage);
  const effectiveIdx = currentIdx >= 0 ? currentIdx : 0;
  const encodedName = encodeURIComponent(client.business_name);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ height: 4, background: "#F5C842" }} />

      {/* Nav */}
      <header style={{ padding: "12px 32px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/marketing" style={{ fontSize: 12, color: "#94a3b8", textDecoration: "none" }}>← BVM Design Center</a>
      </header>

      {/* Progress */}
      <section style={{ padding: "40px 40px 0", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {PORTAL_STAGES.map((stage, i) => {
            const done = i < effectiveIdx;
            const current = i === effectiveIdx;
            const last = i === PORTAL_STAGES.length - 1;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: last ? "0 0 auto" : 1 }}>
                <div style={{ width: current ? 28 : 20, height: current ? 28 : 20, borderRadius: "50%", background: done || current ? "#F5C842" : "#e2e8f0", boxShadow: current ? "0 0 0 6px rgba(245,200,66,0.25)" : "none", animation: current ? "pulse 2s infinite" : "none", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                  {done && <span style={{ fontSize: 11, color: "#0d1a2e", fontWeight: 700 }}>✓</span>}
                </div>
                {!last && <div style={{ flex: 1, height: 3, background: done ? "#F5C842" : "#e2e8f0", margin: "0 4px", borderRadius: 2 }} />}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11, color: "#94a3b8" }}>
          {["Direction", "Building", "QA", "Delivery", "Live"].map((l) => <span key={l}>{l}</span>)}
        </div>
      </section>

      {/* Hero */}
      <div style={{ width: "100%", minHeight: 340, position: "relative", background: "radial-gradient(ellipse at center, #1a2740 0%, #0d1a2e 70%)", marginTop: 32 }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#F5C842" }} />
        <div style={{ textAlign: "center", padding: "72px 40px", position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#F5C842", margin: "0 0 16px" }}>CAMPAIGN DIRECTION</p>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 56, fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1 }}>{client.business_name}</h2>
          {tagline && <p style={{ fontSize: 18, color: "rgba(255,255,255,0.65)", marginTop: 12, maxWidth: 600, margin: "12px auto 0" }}>{tagline}</p>}
          <div style={{ height: 2, width: 60, background: "#F5C842", margin: "20px auto" }} />
          <p style={{ fontSize: 13, color: "#F5C842", margin: 0 }}>{client.city}, {client.zip}</p>
        </div>
      </div>

      {/* Site Preview */}
      <div style={{ maxWidth: 900, margin: "32px auto 0", padding: "0 40px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16, textAlign: "center" }}>Your Site Preview</p>
        {siteHtml ? (
          <div>
            <div style={{ background: "#374151", borderRadius: "12px 12px 0 0", padding: "8px 12px 0" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              </div>
              <div style={{ background: "#fff", borderRadius: "4px 4px 0 0", width: "100%", height: 380, overflow: "hidden" }}>
                <iframe srcDoc={siteHtml} style={{ width: "250%", height: 950, border: "none", transform: "scale(0.4)", transformOrigin: "top left", pointerEvents: "none" }} title="Site preview" />
              </div>
            </div>
            <div style={{ background: "#4b5563", height: 14, borderRadius: "0 0 4px 4px" }} />
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <a href={`/api/site/generate?clientId=${client.id}&lookKey=${selectedLook || "warm_bold"}`} target="_blank" style={{ fontSize: 13, color: "#F5C842", fontWeight: 600, textDecoration: "none" }}>View Full Size →</a>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>Select a look below to see your site preview</div>
        )}
      </div>

      {/* Look Selector */}
      {isTearSheet && (
        <div style={{ maxWidth: 900, margin: "32px auto 0", padding: "0 40px" }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 16, textAlign: "center" }}>Choose Your Campaign Direction</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { id: "warm_bold", label: "Local", accent: "#c2692a", desc: "Warm, inviting — food & hospitality" },
              { id: "professional", label: "Community", accent: "#185fa5", desc: "Trustworthy — healthcare, dental, legal" },
              { id: "bold_modern", label: "Premier ⭐", accent: "#F5C842", desc: "Bold & premium — home services, construction" },
            ].map((l) => {
              const sel = selectedLook === l.id;
              const isPremier = l.id === "bold_modern";
              return (
                <button key={l.id} onClick={async () => {
                  setSelectedLook(l.id);
                  if (isPremier) {
                    const confetti = (await import("canvas-confetti")).default;
                    confetti({ particleCount: 120, spread: 80, colors: ["#F5C842", "#0d1a2e", "#ffffff"] });
                  }
                }} style={{ background: sel ? "#fffbeb" : "#fff", border: isPremier ? "2px solid #F5C842" : sel ? "2px solid #F5C842" : "2px solid #e2e8f0", borderRadius: 16, padding: 0, cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden", transition: "all 0.2s", boxShadow: sel ? "0 4px 20px rgba(245,200,66,0.3)" : "none", transform: sel ? "scale(1.03)" : "scale(1)" }}>
                  {isPremier && <div style={{ position: "absolute", top: 10, right: 10, background: "#F5C842", color: "#0d1a2e", fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>Most Popular</div>}
                  <div style={{ height: 6, background: l.accent }} />
                  <div style={{ padding: "20px 16px" }}>
                    {sel && <span style={{ position: "absolute", top: 16, left: 12, width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0d1a2e" }}>✓</span>}
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: "#0d1a2e", margin: "0 0 4px" }}>{l.label}</p>
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{l.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Logo */}
      {!client.hasLogo && isTearSheet && (
        <div style={{ maxWidth: 600, margin: "32px auto 0", padding: "0 40px" }}>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "24px" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#92400e", margin: "0 0 8px" }}>We&apos;ll need your logo for the final build.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
              <div style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: "20px 12px", textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", margin: "0 0 8px" }}>Upload Logo</p>
                <label style={{ color: "#F5C842", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Browse files<input type="file" accept=".png,.jpg,.jpeg" style={{ display: "none" }} /></label>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "20px 12px", textAlign: "center" }}>
                <a href={`https://bvm-studio-app.vercel.app/studio-v2/brand?name=${encodedName}&mode=logo`} target="_blank" style={{ fontSize: 13, fontWeight: 700, color: "#F5C842", textDecoration: "none" }}>Generate a Logo →</a>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>Download and upload here after.</p>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer", fontSize: 13, color: "#78716c" }}>
              <input type="checkbox" checked={logoSkipped} onChange={() => setLogoSkipped(!logoSkipped)} style={{ accentColor: "#F5C842" }} />I&apos;ll provide my logo later
            </label>
          </div>
        </div>
      )}

      {/* Checklist */}
      {isTearSheet && (
        <div style={{ maxWidth: 600, margin: "32px auto 0", padding: "0 40px" }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px 28px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0d1a2e", margin: "0 0 16px" }}>Before you approve, please confirm:</h3>
            {["My business name is correct", "My phone number is correct", "My services listed are accurate", `My call-to-action button says what I want ("${cta}")`].map((label, i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", fontSize: 14, color: "#475569" }}>
                <input type="checkbox" checked={checks[i]} onChange={() => setChecks((p) => p.map((v, j) => j === i ? !v : v))} style={{ width: 18, height: 18, accentColor: "#F5C842" }} />{label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: isTearSheet ? 120 : 40 }} />

      {/* Sticky Approve Bar */}
      {isTearSheet && (
        <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #e2e8f0", padding: "16px 32px", zIndex: 50, boxShadow: "0 -4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <span style={{ color: allChecked ? "#22c55e" : "#ef4444" }}>{allChecked ? "✓" : "✗"} Confirmed</span>
              <span style={{ color: lookSelected ? "#22c55e" : "#ef4444" }}>{lookSelected ? "✓" : "✗"} Look selected</span>
              <span style={{ color: logoResolved ? "#22c55e" : "#ef4444" }}>{logoResolved ? "✓" : "✗"} Logo</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {!showNote ? (
                <button onClick={() => setShowNote(true)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Leave a note first</button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should we change?" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, resize: "none", width: 280 }} rows={2} />
                  <button onClick={handleRevision} disabled={submitting || !note.trim()} style={{ background: "#0d1a2e", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: submitting || !note.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}>Submit Note</button>
                </div>
              )}
              <button onClick={handleApprove} disabled={submitting || !canApprove} style={{ background: canApprove ? "#F5C842" : "#d1d5db", color: canApprove ? "#0d1a2e" : "#9ca3af", border: "none", padding: "12px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: canApprove ? "pointer" : "not-allowed" }}>
                {submitting ? "Submitting..." : "Approve This Direction →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ padding: "20px 32px", textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Questions? Contact your BVM rep</p>
      </footer>
    </div>
  );
}
