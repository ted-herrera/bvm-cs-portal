"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { ClientProfile, PipelineStage } from "@/lib/pipeline";

const PORTAL_STAGES: PipelineStage[] = ["tear-sheet", "building", "qa", "delivered", "live"];
const STAGE_LABELS_MAP = ["Direction", "Building", "QA", "Review", "Live"];

const UPSELLS = [
  { icon: "📈", title: "Digital Advertising", product: "digital-ads", desc: "Drive traffic with Google Ads, social campaigns, and geofenced ads." },
  { icon: "📱", title: "Social Media", product: "social-media", desc: "We manage your social so you can focus on your business." },
  { icon: "⭐", title: "Reputation Management", product: "reputation", desc: "Protect and grow your Google rating." },
  { icon: "📧", title: "Email Marketing", product: "email-marketing", desc: "Stay in front of customers every month." },
  { icon: "🔄", title: "Site Refresh", product: "site-refresh", desc: "Keep your site fresh every 6-12 months." },
  { icon: "⚡", title: "Custom Enhancement", product: "custom-enhancement", desc: "Custom features, integrations, or unique layouts." },
];

const LOOK_OPTIONS = [
  { id: "warm_bold", label: "Local", accent: "#c2692a", desc: "Warm, inviting — food & hospitality" },
  { id: "professional", label: "Community", accent: "#185fa5", desc: "Trustworthy — healthcare, dental, legal" },
  { id: "bold_modern", label: "Premier", accent: "#F5C842", desc: "Bold & premium — home services, construction" },
];

const CHECK_LABELS = [
  "My business name is correct",
  "My phone number is correct",
  "My services listed are accurate",
];

export default function ClientPortalPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [editText, setEditText] = useState("");
  const [editSent, setEditSent] = useState(false);
  const [printSize, setPrintSize] = useState<string | null>(null);
  const [printSent, setPrintSent] = useState(false);
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [replyInput, setReplyInput] = useState("");
  const [replySent, setReplySent] = useState(false);

  // Tearsheet modal state
  const [approved, setApproved] = useState(false);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [selectedLook, setSelectedLook] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [siteHtml, setSiteHtml] = useState("");
  const [logoSkipped, setLogoSkipped] = useState(false);

  useEffect(() => {
    fetch(`/api/profile/${id}`).then((r) => r.json()).then((d) => {
      const c = d.client || null;
      setClient(c);
      setLoading(false);
      if (c) {
        const isPost = c.stage !== "intake" && c.stage !== "tear-sheet";
        setApproved(isPost);
        if (isPost && !localStorage.getItem(`bvm_welcomed_${id}`)) setShowWelcome(true);
        if (c.selectedLook) setSelectedLook(c.selectedLook);
      }
    }).catch(() => setLoading(false));
  }, [id]);

  // Fetch site preview for tearsheet modal
  useEffect(() => {
    if (!client || !selectedLook) return;
    fetch(`/api/site/generate?clientId=${client.id}&lookKey=${selectedLook}`)
      .then((r) => r.text())
      .then((html) => setSiteHtml(html))
      .catch(() => {});
  }, [client?.id, selectedLook]);

  async function postInterest(type: string, extra?: Record<string, string>) {
    await fetch("/api/upsell/interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: id, type, ...extra }) });
    setInterests((p) => new Set(p).add(type));
  }

  async function sendReply() {
    if (!replyInput.trim() || !client) return;
    await fetch(`/api/profile/message/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: replyInput, from: "client" }) });
    setClient({ ...client, messages: [...client.messages, { from: "client", text: replyInput, timestamp: new Date().toISOString() }] });
    setReplyInput("");
    setReplySent(true);
    setTimeout(() => setReplySent(false), 3000);
  }

  async function handleApprove() {
    if (!client) return;
    const allChecked = checks.every(Boolean);
    const lookSelected = selectedLook !== null;
    const logoResolved = client.hasLogo || logoSkipped;
    if (!allChecked || !lookSelected || !logoResolved) return;
    setSubmitting(true);
    await fetch(`/api/profile/approve/${id}`, { method: "POST" });
    setApproved(true);
    setClient({ ...client, stage: "building" });
    setSubmitting(false);
    if (!localStorage.getItem(`bvm_welcomed_${id}`)) setShowWelcome(true);
  }

  async function handleRevision() {
    if (!note.trim()) return;
    setSubmitting(true);
    await fetch(`/api/profile/revision/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    setNote("");
    setShowNote(false);
    setSubmitting(false);
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "2px solid #0d1a2e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!client) return <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#64748b" }}>Client not found.</p></div>;

  const isPreApproval = !approved && (client.stage === "intake" || client.stage === "tear-sheet");
  const currentIdx = PORTAL_STAGES.indexOf(client.stage as PipelineStage);
  const effectiveIdx = client.stage === "delivered" ? 3 : currentIdx >= 0 ? currentIdx : 0;

  const allChecked = checks.every(Boolean);
  const lookSelected = selectedLook !== null;
  const logoResolved = client.hasLogo || logoSkipped;
  const canApprove = allChecked && lookSelected && logoResolved;
  const sbr = client.sbrData as Record<string, unknown> | null;
  const tagline = (sbr?.suggestedTagline as string) || (sbr?.tagline as string) || (sbr?.geoCopyBlock as string) || "";
  const cta = client.intakeAnswers?.q4 || "Contact Us";
  const encodedName = encodeURIComponent(client.business_name);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ height: 4, background: "#F5C842" }} />

      {/* ── TEARSHEET MODAL ──────────────────────────────────────────────── */}
      {isPreApproval && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,26,46,0.85)", zIndex: 200, overflowY: "auto" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 120px" }}>

            {/* Hero */}
            <div style={{ width: "100%", minHeight: 280, position: "relative", background: "radial-gradient(ellipse at center, #1a2740 0%, #0d1a2e 70%)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#F5C842" }} />
              <div style={{ textAlign: "center", padding: "60px 40px", position: "relative", zIndex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#F5C842", margin: "0 0 16px" }}>CAMPAIGN DIRECTION</p>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 48, fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1 }}>{client.business_name}</h2>
                {tagline && <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", marginTop: 12, maxWidth: 600, margin: "12px auto 0" }}>{tagline}</p>}
                <div style={{ height: 2, width: 60, background: "#F5C842", margin: "20px auto" }} />
                <p style={{ fontSize: 13, color: "#F5C842", margin: 0 }}>{client.city}, {client.zip}</p>
              </div>
            </div>

            {/* Site Preview */}
            <div style={{ marginTop: 32 }}>
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
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>Select a look below to see your site preview</div>
              )}
            </div>

            {/* Look Selector */}
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16, textAlign: "center" }}>Choose Your Campaign Direction</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {LOOK_OPTIONS.map((l) => {
                  const sel = selectedLook === l.id;
                  const isPremier = l.id === "bold_modern";
                  return (
                    <button key={l.id} onClick={async () => {
                      setSelectedLook(l.id);
                      if (isPremier) {
                        const confettiMod = await import("canvas-confetti");
                        // Create canvas that sits above the modal (zIndex 200)
                        const canvas = document.createElement("canvas");
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                        canvas.style.position = "fixed";
                        canvas.style.top = "0";
                        canvas.style.left = "0";
                        canvas.style.width = "100vw";
                        canvas.style.height = "100vh";
                        canvas.style.pointerEvents = "none";
                        canvas.style.zIndex = "99999";
                        document.body.appendChild(canvas);
                        const fire = confettiMod.create(canvas, { resize: true });
                        await fire({ particleCount: 150, spread: 90, startVelocity: 35, origin: { y: 0.6 }, colors: ["#F5C842", "#0d1a2e", "#ffffff"] });
                        canvas.remove();
                      }
                    }} style={{ background: sel ? "#fffbeb" : "#fff", border: isPremier || sel ? "2px solid #F5C842" : "2px solid #e2e8f0", borderRadius: 16, padding: 0, cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden", transition: "all 0.2s", boxShadow: sel ? "0 4px 20px rgba(245,200,66,0.3)" : "none", transform: sel ? "scale(1.03)" : "scale(1)" }}>
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

            {/* Logo */}
            {!client.hasLogo && (
              <div style={{ maxWidth: 600, margin: "32px auto 0" }}>
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 24 }}>
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
            <div style={{ maxWidth: 600, margin: "32px auto 0" }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px 28px" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0d1a2e", margin: "0 0 16px" }}>Before you approve, please confirm:</h3>
                {[...CHECK_LABELS, `My call-to-action button says what I want ("${cta}")`].map((label, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", fontSize: 14, color: "#475569" }}>
                    <input type="checkbox" checked={checks[i]} onChange={() => setChecks((p) => p.map((v, j) => j === i ? !v : v))} style={{ width: 18, height: 18, accentColor: "#F5C842" }} />{label}
                  </label>
                ))}
              </div>
            </div>

            {/* Sticky Approve Bar */}
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e2e8f0", padding: "16px 32px", zIndex: 250, boxShadow: "0 -4px 12px rgba(0,0,0,0.1)" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
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
          </div>
        </div>
      )}

      {/* ── POST-APPROVAL DASHBOARD ──────────────────────────────────────── */}

      {/* Welcome overlay */}
      {showWelcome && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,26,46,0.95)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 480, width: "90%", textAlign: "center" }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#0d1a2e", margin: "0 0 12px" }}>Welcome to BVM, {client.business_name}!</h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 24 }}>Your site is being built. Here&apos;s what happens next.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 24 }}>
              {["Rep reviews", "Bruno builds", "You go live"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#0d1a2e" }}>{i + 1}</div>
                  <span style={{ fontSize: 13, color: "#334155" }}>{s}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { localStorage.setItem(`bvm_welcomed_${id}`, "true"); setShowWelcome(false); }} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "14px 0", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}>Let&apos;s See It →</button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ height: 56, padding: "0 32px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 32, width: "auto" }} />
        <span style={{ fontSize: 13, color: "#94a3b8" }}>{client.business_name}</span>
      </nav>

      {/* Centered container */}
      <div style={{ maxWidth: 896, margin: "0 auto", padding: "0 24px", width: "100%" }}>

      {/* Progress */}
      <section style={{ padding: "32px 0" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 900, color: "#0d1a2e", margin: "0 0 4px" }}>{client.business_name}</h1>
        <div style={{ maxWidth: 500, margin: "20px 0", display: "flex", alignItems: "center" }}>
          {PORTAL_STAGES.map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i === 4 ? "0 0 auto" : 1 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: i <= effectiveIdx ? "#F5C842" : "#e2e8f0", boxShadow: i === effectiveIdx ? "0 0 0 4px rgba(245,200,66,0.25)" : "none", animation: i === effectiveIdx ? "pulse 2s infinite" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i < effectiveIdx && <span style={{ fontSize: 10, color: "#0d1a2e", fontWeight: 700 }}>✓</span>}
              </div>
              {i < 4 && <div style={{ flex: 1, height: 2, background: i < effectiveIdx ? "#F5C842" : "#e2e8f0", margin: "0 4px" }} />}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 32, fontSize: 11, color: "#94a3b8" }}>{STAGE_LABELS_MAP.map((l) => <span key={l}>{l}</span>)}</div>
      </section>

      {/* Welcome video */}
      <section style={{ paddingBottom: 40 }}>
        <video src="/claire-onboarding.mp4" controls preload="metadata" style={{ borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxWidth: 700, width: "100%", display: "block" }} />
      </section>

      {/* Site Preview */}
      <section style={{ paddingBottom: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>Your Site</p>
        <div style={{ background: "#374151", borderRadius: "12px 12px 0 0", padding: "8px 12px 0", maxWidth: 800 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>{["#ef4444", "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}</div>
          <div style={{ background: "#fff", borderRadius: "4px 4px 0 0", height: 340, overflow: "hidden" }}>
            <iframe src={`/api/site/generate?clientId=${client.id}&lookKey=${client.selectedLook || "warm_bold"}`} style={{ width: "250%", height: 900, border: "none", transform: "scale(0.4)", transformOrigin: "top left", pointerEvents: "none" }} title="Site" />
          </div>
        </div>
        <div style={{ background: "#4b5563", height: 14, borderRadius: "0 0 4px 4px", maxWidth: 800 }} />
        <a href={`/api/site/generate?clientId=${client.id}&lookKey=${client.selectedLook || "warm_bold"}`} target="_blank" style={{ display: "inline-block", marginTop: 12, fontSize: 13, color: "#F5C842", fontWeight: 600, textDecoration: "none" }}>View Full Size →</a>
      </section>

      {/* Edit Requests */}
      <section style={{ paddingBottom: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>Request a Change</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 700 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>Web Edit</p>
            {!editSent ? (
              <>
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Describe what you'd like changed..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, resize: "none", boxSizing: "border-box" }} rows={3} />
                <button onClick={async () => { if (!editText.trim()) return; await postInterest("web-edit", { note: editText }); setEditSent(true); }} style={{ marginTop: 8, background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Submit Web Edit →</button>
              </>
            ) : <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>Your rep has been notified.</p>}
          </div>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>Print Request</p>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>Want to update your print campaign?</p>
            {!interests.has("print-request") ? (
              <button onClick={() => postInterest("print-request")} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Talk to Your Rep →</button>
            ) : <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>Your rep will reach out.</p>}
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Your BVM rep will reach out to discuss print options.</p>
          </div>
        </div>
      </section>

      {/* Print Builder */}
      <section style={{ paddingBottom: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>Your Print Campaign</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, maxWidth: 700 }}>
          {[{ id: "eighth", label: "1/8 Page", desc: "Brand Awareness" }, { id: "quarter", label: "1/4 Page", desc: "Most Popular" }, { id: "half", label: "1/2 Page", desc: "Dominant" }, { id: "full_page", label: "Full Page", desc: "Max Impact" }, { id: "front_cover", label: "Front Cover", desc: "Exclusive" }].map((s) => (
            <button key={s.id} onClick={() => { setPrintSize(s.id); setPrintSent(false); }} style={{ background: printSize === s.id ? "#fffbeb" : "#fff", border: printSize === s.id ? "2px solid #F5C842" : "2px solid #e2e8f0", borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0d1a2e", margin: "0 0 2px" }}>{s.label}</p>
              <p style={{ fontSize: 9, color: "#64748b", margin: 0 }}>{s.desc}</p>
            </button>
          ))}
        </div>
        {printSize && !printSent && (
          <button onClick={async () => { await postInterest("print", { size: printSize }); setPrintSent(true); }} style={{ marginTop: 12, background: "#F5C842", color: "#0d1a2e", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{printSize === "front_cover" ? "Request Featured Placement →" : "Send to My Rep →"}</button>
        )}
        {printSent && <p style={{ marginTop: 12, fontSize: 13, color: "#22c55e", fontWeight: 600 }}>Your rep has been notified!</p>}
      </section>

      {/* Upsell Ladder */}
      <section style={{ paddingBottom: 40, borderTop: "1px solid #f1f5f9", paddingTop: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>Grow Your Campaign</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {UPSELLS.map((u) => (
            <div key={u.product} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{u.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>{u.title}</h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 16px" }}>{u.desc}</p>
              {!interests.has(u.product) ? (
                <button onClick={() => postInterest(u.product)} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>I&apos;m Interested →</button>
              ) : <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>Rep notified</span>}
            </div>
          ))}
        </div>
      </section>

      </div>{/* end centered container */}

      {/* ── LMS — Windows 95 Style (full-bleed navy) ─────────────────────── */}
      <div style={{ borderTop: "3px solid #F5C842" }} />
      <section style={{ background: "#1a2e3b", padding: "48px 24px" }}>
        <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5C842", marginBottom: 16 }}>Get the Most From Your Site</p>

        {/* Windows 95 Frame */}
        <div style={{ maxWidth: 380, background: "#c0c0c0", border: "2px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080, 2px 2px 8px rgba(0,0,0,0.15)", fontFamily: "'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif" }}>
          {/* Title bar */}
          <div style={{ background: "linear-gradient(90deg, #0d1a2e, #1a3a5c)", padding: "3px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", letterSpacing: "0.02em" }}>BVM Learning Center v1.0</span>
            <div style={{ display: "flex", gap: 2 }}>
              {["_", "□", "x"].map((b) => (
                <div key={b} style={{ width: 16, height: 14, background: "#c0c0c0", border: "1px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#000", lineHeight: 1 }}>{b}</div>
              ))}
            </div>
          </div>

          {/* Menu bar */}
          <div style={{ borderBottom: "1px solid #808080", padding: "2px 6px", fontSize: 11, color: "#000", display: "flex", gap: 12 }}>
            <span style={{ textDecoration: "underline" }}>File</span>
            <span style={{ textDecoration: "underline" }}>View</span>
            <span style={{ textDecoration: "underline" }}>Help</span>
          </div>

          {/* Content area */}
          <div style={{ padding: 8 }}>
            {/* Video player */}
            <div style={{ background: "#000", border: "2px solid #808080", borderRightColor: "#fff", borderBottomColor: "#fff", maxWidth: 320 }}>
              <iframe
                src="https://drive.google.com/file/d/1bx0wVHya0a6LbvzvZOOu_PfyI4SIDGP6/preview"
                style={{ width: "100%", height: 180, border: "none", display: "block" }}
                allow="autoplay"
                title="BVM Learning Video"
              />
            </div>

            {/* Lesson info */}
            <div style={{ marginTop: 8, padding: "6px 4px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#000", margin: "0 0 4px" }}>Your Campaign is Live — Now What?</p>
              <p style={{ fontSize: 11, color: "#444", margin: "0 0 8px", lineHeight: 1.4 }}>Learn how to share your new site, drive traffic, and make the most of your BVM campaign.</p>
            </div>

            {/* Search bar */}
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <input type="text" placeholder="Search lessons..." style={{ flex: 1, padding: "3px 6px", fontSize: 11, border: "2px solid #808080", borderRightColor: "#fff", borderBottomColor: "#fff", background: "#fff", outline: "none", fontFamily: "inherit" }} />
              <button style={{ background: "#c0c0c0", border: "2px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", padding: "2px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Go</button>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ borderTop: "1px solid #808080", padding: "2px 6px", fontSize: 10, color: "#444" }}>
            1 of 3 lessons completed
          </div>
        </div>

        {/* Other LMS module cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 20 }}>
          {[{ title: "How to Share Your Site", desc: "Facebook, Instagram, Google — where to post and what to say." }, { title: "Getting Found on Google", desc: "Simple steps to make sure customers find you first." }, { title: "Tracking Your Results", desc: "Understanding your dashboard analytics and traffic." }].map((m) => (
            <div key={m.title} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>{m.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: "0 0 12px" }}>{m.desc}</p>
              <span style={{ fontSize: 13, color: "#F5C842", fontWeight: 600 }}>Start Module →</span>
            </div>
          ))}
        </div>
        </div>{/* end inner centered container */}
      </section>

      {/* Centered container for remaining sections */}
      <div style={{ maxWidth: 896, margin: "0 auto", padding: "0 24px", width: "100%" }}>

      {/* Messages */}
      {client.messages.length > 0 && (
        <section style={{ paddingTop: 40, paddingBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>Messages</p>
          {client.messages.map((m, i) => (
            <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0d1a2e" }}>{m.from === "rep" ? "Your BVM Rep" : "You"}</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(m.timestamp).toLocaleString()}</span>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{m.text}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input type="text" value={replyInput} onChange={(e) => setReplyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Send to rep..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <button onClick={sendReply} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{replySent ? "Sent!" : "Send →"}</button>
          </div>
        </section>
      )}

      </div>{/* end centered container */}

      {/* Contact */}
      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Questions? Your BVM rep is {client.assigned_rep}.</p>
        <a href={`mailto:therrera@bestversionmedia.com?subject=${encodeURIComponent(`Question about ${client.business_name}`)}`} style={{ background: "#0d1a2e", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Contact Rep →</a>
      </footer>
    </div>
  );
}
