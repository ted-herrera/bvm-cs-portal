"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import type { ClientProfile, PipelineStage, BuildLogEntry } from "@/lib/pipeline";

const PORTAL_STAGES: PipelineStage[] = ["tear-sheet", "building", "qa", "delivered", "live"];
const STAGE_LABELS_MAP = ["Direction", "Building", "QA", "Review", "Live"];

const UPSELLS: {
  icon: string;
  title: string;
  product: string;
  desc: string;
  price: string;
  preview?: string;
}[] = [
  { icon: "🌐", title: "Custom Web Development", product: "custom-web", desc: "Premium custom build beyond your Bruno-generated site", price: "Talk to your rep" },
  { icon: "📱", title: "Social Media Management", product: "social-media", desc: "30 AI-generated posts/month, Facebook + Instagram + Google Business", price: "Talk to your rep", preview: "social" },
  { icon: "🔍", title: "Search Engine Optimization", product: "seo", desc: "Local SEO, Google Business optimization, monthly ranking report", price: "Talk to your rep" },
  { icon: "📣", title: "Digital Advertising", product: "digital-ads", desc: "Geo-targeted ads across Google, Facebook & Instagram", price: "Talk to your rep" },
  { icon: "📧", title: "Email Marketing", product: "email-marketing", desc: "Monthly Bruno-written campaign to your customer list", price: "Talk to your rep" },
  { icon: "⭐", title: "Reputation Management", product: "reputation", desc: "Monitor and respond to Google reviews, monthly report", price: "Talk to your rep" },
  { icon: "🔄", title: "Site Refresh", product: "site-refresh", desc: "Annual content update, new photos, seasonal messaging", price: "Talk to your rep" },
  { icon: "👑", title: "Premier Upgrade", product: "premier-upgrade", desc: "Review ticker, featured badge, animated stats", price: "Talk to your rep" },
];

const LOOK_OPTIONS = [
  { id: "warm_bold", label: "Local", accent: "#c2692a", desc: "Warm, inviting — food & hospitality", sampleUrl: "https://evergreen-landscapes.bvmlocal.com/" },
  { id: "professional", label: "Community", accent: "#185fa5", desc: "Trustworthy — healthcare, dental, legal", sampleUrl: "https://hurstroofers-examplesite.bvmlocal.com/" },
  { id: "bold_modern", label: "Premier", accent: "#F5C842", desc: "Bold & premium — home services, construction", sampleUrl: "https://bestoishimedia-examplesite.bvmlocal.com/" },
];

const CHECK_LABELS = [
  "My business name is correct",
  "My phone number is correct",
  "My services listed are accurate",
  "Domain",
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
  const [checks, setChecks] = useState([false, false, false, false, false]);
  const [selectedLook, setSelectedLook] = useState<string | null>(null);
  const [domainOption, setDomainOption] = useState<"has" | "needs" | null>(null);
  const [domainUrl, setDomainUrl] = useState("");
  const [upsellsOpen, setUpsellsOpen] = useState(false);
  const [domainSearch, setDomainSearch] = useState("");
  const [domainResults, setDomainResults] = useState<{ domain: string; available: boolean; price: string }[]>([]);
  const [domainSearching, setDomainSearching] = useState(false);
  const domainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [siteHtml, setSiteHtml] = useState("");
  const [logoSkipped, setLogoSkipped] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLiveBanner, setShowLiveBanner] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("bvm_onboarding_seen")) setShowOnboarding(true);
  }, []);

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

        // Fire confetti on first view after going live
        if (c.stage === "live" && !c.confettiFired) {
          setShowLiveBanner(true);
          import("canvas-confetti").then((mod) => {
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
            const fire = mod.default.create(canvas, { resize: true });
            fire({
              particleCount: 200,
              spread: 100,
              startVelocity: 45,
              origin: { y: 0.5 },
              colors: ["#F5C842", "#fbbf24", "#fde68a", "#ffffff"],
            });
            setTimeout(() => canvas.remove(), 5000);
          });
          fetch(`/api/profile/update/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confettiFired: true }),
          }).catch(() => {});
          setTimeout(() => setShowLiveBanner(false), 5000);
        }
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
    await fetch(`/api/profile/update/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intakeAnswers: { ...client.intakeAnswers, q9: domainUrl || "needs-help" }
      }),
    });
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

  function handleDomainSearch(name: string) {
    setDomainSearch(name);
    setDomainResults([]);
    if (domainTimerRef.current) clearTimeout(domainTimerRef.current);
    const clean = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!clean) return;
    domainTimerRef.current = setTimeout(() => {
      setDomainSearching(true);
      const exts = [".com", ".net", ".co", ".org"];
      // Simulate availability check — in production this would hit a real API
      const results = exts.map((ext) => {
        const full = clean + ext;
        // Simple heuristic: short common names likely taken
        const taken = clean.length <= 3 || ["google", "amazon", "facebook", "apple"].includes(clean);
        return {
          domain: full,
          available: !taken,
          price: ext === ".com" ? "$9.77/yr" : ext === ".net" ? "$12.17/yr" : ext === ".co" ? "$11.99/yr" : "$10.17/yr",
        };
      });
      setDomainResults(results);
      setDomainSearching(false);
    }, 600);
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#0d1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!client) return <div style={{ minHeight: "100vh", background: "#0d1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "rgba(255,255,255,0.5)" }}>Client not found.</p></div>;

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

  // Initials from business name
  const initials = client.business_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join("");

  const keyframes = `
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
  `;

  return (
    <div style={{ minHeight: "100vh", background: "#0d1a2e", display: "flex", flexDirection: "column" }}>
      <style>{keyframes}</style>

      {/* Gold top bar */}
      <div style={{ height: 4, background: "#F5C842" }} />

      {/* Live banner */}
      {showLiveBanner && (
        <div
          style={{
            background: "linear-gradient(90deg, #F5C842, #fbbf24)",
            color: "#0d1a2e",
            padding: "14px 32px",
            textAlign: "center",
            fontWeight: 800,
            fontSize: 16,
            fontFamily: "'Playfair Display', Georgia, serif",
            animation: "fadeIn 0.4s",
            position: "relative",
            zIndex: 50,
          }}
        >
          🎉 Your site is live!
        </div>
      )}

      {/* ── ONBOARDING VIDEO MODAL ─────────────────────────────────────── */}
      {showOnboarding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,26,46,0.92)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 640, width: "90%", textAlign: "center" }}>
            <video src="/claire-onboarding.mp4" controls autoPlay preload="auto" style={{ width: "100%", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }} />
            <button onClick={() => { localStorage.setItem("bvm_onboarding_seen", "true"); setShowOnboarding(false); }} style={{ marginTop: 20, background: "#F5C842", color: "#0d1a2e", border: "none", padding: "14px 40px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Got it, let&apos;s go →</button>
          </div>
        </div>
      )}

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
                    <div key={l.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={async () => {
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
                    }} style={{ background: sel ? "#fffbeb" : "#fff", border: isPremier || sel ? "2px solid #F5C842" : "2px solid #e2e8f0", borderRadius: 16, padding: 0, cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden", transition: "all 0.2s", boxShadow: sel ? "0 4px 20px rgba(245,200,66,0.3)" : "none", transform: sel ? "scale(1.03)" : "scale(1)", width: "100%" }}>
                      {isPremier && <div style={{ position: "absolute", top: 10, right: 10, background: "#F5C842", color: "#0d1a2e", fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>Most Popular</div>}
                      <div style={{ height: 6, background: l.accent }} />
                      <div style={{ padding: "20px 16px" }}>
                        {sel && <span style={{ position: "absolute", top: 16, left: 12, width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0d1a2e" }}>✓</span>}
                        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: "#0d1a2e", margin: "0 0 4px" }}>{l.label}</p>
                        <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{l.desc}</p>
                      </div>
                    </button>
                    <a
                      href={l.sampleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "#0091ae", fontWeight: 600, textDecoration: "none", textAlign: "center" }}
                    >
                      View Sample Site →
                    </a>
                    </div>
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
                {[...CHECK_LABELS.slice(0, 3), `My call-to-action button says what I want ("${cta}")`].map((label, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", fontSize: 14, color: "#475569" }}>
                    <input type="checkbox" checked={checks[i]} onChange={() => setChecks((p) => p.map((v, j) => j === i ? !v : v))} style={{ width: 18, height: 18, accentColor: "#F5C842" }} />{label}
                  </label>
                ))}
                {/* Domain checkbox */}
                <div style={{ padding: "12px 0 4px", borderTop: "1px solid #e2e8f0", marginTop: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: "0 0 10px" }}>Domain</p>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer", fontSize: 14, color: "#475569" }}>
                    <input type="radio" name="domain" checked={domainOption === "has"} onChange={() => { setDomainOption("has"); setChecks((p) => p.map((v, j) => j === 4 ? true : v)); }} style={{ accentColor: "#F5C842" }} />I have a domain
                  </label>
                  {domainOption === "has" && (
                    <input type="text" value={domainUrl} onChange={(e) => setDomainUrl(e.target.value)} placeholder="e.g. www.mybusiness.com" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, marginTop: 6, marginBottom: 6, boxSizing: "border-box" }} />
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer", fontSize: 14, color: "#475569" }}>
                    <input type="radio" name="domain" checked={domainOption === "needs"} onChange={() => { setDomainOption("needs"); setDomainUrl(""); setChecks((p) => p.map((v, j) => j === 4 ? true : v)); }} style={{ accentColor: "#F5C842" }} />I need help getting one
                  </label>
                  {domainOption === "needs" && (
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0 28px" }}>Your rep will help you find the right domain</p>
                  )}
                </div>
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

      {/* Welcome overlay */}
      {showWelcome && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,26,46,0.95)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1a2740", border: "1px solid #243454", borderRadius: 20, padding: 40, maxWidth: 480, width: "90%", textAlign: "center" }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>Welcome to BVM, {client.business_name}!</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 24 }}>Your site is being built. Here&apos;s what happens next.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 24 }}>
              {["Rep reviews", "Bruno builds", "You go live"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#0d1a2e" }}>{i + 1}</div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{s}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { localStorage.setItem(`bvm_welcomed_${id}`, "true"); setShowWelcome(false); }} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "14px 0", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}>Let&apos;s See It →</button>
          </div>
        </div>
      )}

      {/* ── SIDEBAR + MAIN WRAPPER ──────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1 }}>

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside style={{ width: 220, flexShrink: 0, background: "#0d1a2e", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>

          {/* Avatar + identity */}
          <div style={{ padding: "24px 20px 16px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#0d1a2e", margin: "0 auto 10px" }}>
              {initials}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px", lineHeight: 1.3 }}>{client.business_name}</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>{client.city}, {client.zip}</p>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "0 0 8px" }} />

          {/* Nav */}
          <nav style={{ flex: 1 }}>
            <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", fontSize: 13, color: "#F5C842", borderLeft: "3px solid #F5C842", background: "rgba(245,200,66,0.08)", textDecoration: "none" }}>
              <span>🏠</span> Home
            </a>
            <a href="#my-site" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", fontSize: 13, color: "rgba(255,255,255,0.6)", borderLeft: "3px solid transparent", textDecoration: "none" }}>
              <span>🌐</span> My Site
            </a>
            <a href="#campaign" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", fontSize: 13, color: "rgba(255,255,255,0.6)", borderLeft: "3px solid transparent", textDecoration: "none" }}>
              <span>📢</span> Campaign
            </a>
            <a href="#learning" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", fontSize: 13, color: "rgba(255,255,255,0.6)", borderLeft: "3px solid transparent", textDecoration: "none" }}>
              <span>📚</span> Learning
            </a>
            <a href="#messages" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", fontSize: 13, color: "rgba(255,255,255,0.6)", borderLeft: "3px solid transparent", textDecoration: "none" }}>
              <span>💬</span> Messages
            </a>
          </nav>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Rep card */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{client.assigned_rep}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>Your BVM Rep</p>
            <a href={`mailto:therrera@bestversionmedia.com?subject=${encodeURIComponent(`Question about ${client.business_name}`)}`} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#F5C842", fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "6px 0", width: "100%", textAlign: "center", textDecoration: "none", display: "block", marginTop: 8 }}>Contact Rep</a>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <main style={{ flex: 1, background: "#0d1a2e", display: "flex", flexDirection: "column" }} id="top">

          {/* Top Hero Bar */}
          <div style={{ padding: "24px 32px", borderBottom: "1px solid #243454", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* Left: name + stage badge */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 900, color: "#fff", margin: 0 }}>{client.business_name}</h1>
              <span style={{ display: "inline-block", background: "#F5C842", color: "#0d1a2e", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 999, marginLeft: 12 }}>{STAGE_LABELS_MAP[effectiveIdx]}</span>
            </div>
            {/* Right: stat pills */}
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "Site", status: client.stage === "live" ? "Indexed" : client.stage === "delivered" || client.stage === "review" ? "Submitted" : "Not Submitted" },
                { label: "QA", status: client.qaReport?.passed ? `Passed (${client.qaReport.score})` : "Pending" },
                { label: "Stage", status: client.stage.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) },
              ].map((s) => (
                <div key={s.label} style={{ background: "#1a2740", border: "1px solid #243454", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: s.status === "Not Submitted" || s.status === "Pending" ? "#64748b" : "#F5C842", fontWeight: 600 }}>
                  {s.label}: {s.status}
                </div>
              ))}
            </div>
          </div>

          {/* Below hero: two-column layout */}
          <div style={{ display: "flex", padding: "24px 32px", gap: 24, flex: 1 }}>

            {/* ── LEFT/CENTER COLUMN ──────────────────────────────────── */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* 1. Progress stepper card */}
              <div style={{ background: "#1a2740", border: "1px solid #243454", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", margin: "0 0 16px" }}>Project Progress</p>
                <div style={{ maxWidth: 500, display: "flex", alignItems: "center" }}>
                  {PORTAL_STAGES.map((_, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", flex: i === 4 ? "0 0 auto" : 1 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: i <= effectiveIdx ? "#F5C842" : "#334155", boxShadow: i === effectiveIdx ? "0 0 0 4px rgba(245,200,66,0.25)" : "none", animation: i === effectiveIdx ? "pulse 2s infinite" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {i < effectiveIdx && <span style={{ fontSize: 10, color: "#0d1a2e", fontWeight: 700 }}>✓</span>}
                      </div>
                      {i < 4 && <div style={{ flex: 1, height: 2, background: i < effectiveIdx ? "#F5C842" : "#334155", margin: "0 4px" }} />}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 32, fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{STAGE_LABELS_MAP.map((l) => <span key={l}>{l}</span>)}</div>
              </div>

              {/* Domain Status */}
              <div style={{ background: "#1a2740", border: "1px solid #243454", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5C842", margin: "0 0 16px" }}>Domain</p>
                {client.intakeAnswers?.q9 && client.intakeAnswers.q9 !== "needs-help" ? (
                  /* STATE 1: Confirmed */
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>{client.intakeAnswers.q9}</span>
                  </div>
                ) : (
                  /* STATE 2: Search */
                  <div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 12px" }}>Find the perfect domain for your business.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={domainSearch}
                        onChange={(e) => handleDomainSearch(e.target.value)}
                        placeholder="Type your business name..."
                        style={{ flex: 1, background: "#0d1a2e", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#fff", outline: "none", boxSizing: "border-box" }}
                      />
                      {domainSearching && <div style={{ width: 20, height: 20, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", alignSelf: "center", flexShrink: 0 }} />}
                    </div>
                    {domainResults.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                        {domainResults.map((r) => (
                          <div key={r.domain} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d1a2e", border: `1px solid ${r.available ? "rgba(245,200,66,0.3)" : "#243454"}`, borderRadius: 8, padding: "10px 14px" }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: r.available ? "#fff" : "rgba(255,255,255,0.3)" }}>{r.domain}</span>
                              {r.available && <span style={{ fontSize: 12, color: "#F5C842", marginLeft: 10, fontWeight: 600 }}>{r.price}</span>}
                              {!r.available && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: 10 }}>Taken</span>}
                            </div>
                            {r.available ? (
                              <a
                                href={`https://domains.cloudflare.com/?search=${encodeURIComponent(r.domain)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, fontWeight: 700, color: "#0d1a2e", background: "#F5C842", padding: "6px 14px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}
                              >
                                Buy Now →
                              </a>
                            ) : (
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>—</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action cards grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

                {/* My Site card */}
                <div style={{ background: "#1a2740", border: "1px solid #243454", borderRadius: 12, padding: 24 }} id="my-site">
                  <div style={{ fontSize: 28 }}>🌐</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "8px 0 16px" }}>My Site</h3>
                  {siteHtml ? (
                    <>
                      <div style={{ background: "#374151", borderRadius: "10px 10px 0 0", padding: "8px 12px 0" }}>
                        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>{["#ef4444", "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}</div>
                        <div style={{ background: "#fff", borderRadius: "4px 4px 0 0", height: 300, overflow: "hidden" }}>
                          <iframe srcDoc={siteHtml || ""} style={{ width: "250%", height: 900, border: "none", transform: "scale(0.4)", transformOrigin: "top left", pointerEvents: "none" }} title="Site" />
                        </div>
                      </div>
                      <div style={{ background: "#4b5563", height: 12, borderRadius: "0 0 6px 6px", marginBottom: 12 }} />
                      <button onClick={() => { const w = window.open("", "_blank"); if (w && siteHtml) { w.document.write(siteHtml); w.document.close(); } }} style={{ fontSize: 12, color: "#F5C842", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>View Full Size →</button>
                    </>
                  ) : (
                    <div style={{ background: "#1a2740", borderRadius: 10, padding: 40, textAlign: "center" }}>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>Your site is being prepared.</p>
                    </div>
                  )}
                </div>

                {/* Web Edit card */}
                <div style={{ background: "#1a2740", border: "1px solid #243454", borderRadius: 12, padding: 24 }} id="campaign">
                  <div style={{ fontSize: 28 }}>✏️</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "8px 0 16px" }}>Request a Change</h3>
                  {!editSent ? (
                    <>
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Describe what you'd like changed..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #243454", fontSize: 13, resize: "none", boxSizing: "border-box", background: "#0d1a2e", color: "#e2e8f0" }} rows={4} />
                      <button onClick={async () => { if (!editText.trim()) return; await postInterest("web-edit", { note: editText }); setEditSent(true); }} style={{ marginTop: 10, background: "#F5C842", color: "#0d1a2e", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Submit Web Edit →</button>
                    </>
                  ) : <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>Your rep has been notified.</p>}
                </div>

                {/* Print Campaign card */}
                <div style={{ background: "#1a2740", border: "1px solid #243454", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 28 }}>📰</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "8px 0 16px" }}>Print Campaign</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 14 }}>
                    {[{ id: "eighth", label: "1/8 Page", desc: "Brand Awareness" }, { id: "quarter", label: "1/4 Page", desc: "Most Popular" }, { id: "half", label: "1/2 Page", desc: "Dominant" }, { id: "full_page", label: "Full Page", desc: "Max Impact" }, { id: "front_cover", label: "Front Cover", desc: "Exclusive" }].map((s) => (
                      <button key={s.id} onClick={() => { setPrintSize(s.id); setPrintSent(false); }} style={{ background: printSize === s.id ? "rgba(245,200,66,0.1)" : "#0d1a2e", border: printSize === s.id ? "2px solid #F5C842" : "2px solid #243454", borderRadius: 10, padding: "10px 6px", cursor: "pointer", textAlign: "center" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0", margin: "0 0 2px" }}>{s.label}</p>
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", margin: 0 }}>{s.desc}</p>
                      </button>
                    ))}
                  </div>
                  {printSize && !printSent && (
                    <button onClick={async () => { await postInterest("print", { size: printSize }); setPrintSent(true); }} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>{printSize === "front_cover" ? "Request Featured Placement →" : "Send to My Rep →"}</button>
                  )}
                  {printSent && <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600, margin: "0 0 10px" }}>Your rep has been notified!</p>}
                  <div style={{ paddingTop: 12, borderTop: "1px solid #243454" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Print Request</p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 10px" }}>Want to update your print campaign?</p>
                    {!interests.has("print-request") ? (
                      <button onClick={() => postInterest("print-request")} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Talk to Your Rep →</button>
                    ) : <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600, margin: 0 }}>Your rep will reach out.</p>}
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8, marginBottom: 0 }}>Your BVM rep will reach out to discuss print options.</p>
                  </div>
                </div>

              </div>

              {/* ── GROW YOUR CAMPAIGN — single toggle ───────────── */}
              <div style={{ marginBottom: 24 }} id="grow">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: upsellsOpen ? 12 : 0 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0, display: "inline-block", paddingBottom: 6, borderBottom: "3px solid #0091ae" }}>
                    Grow Your Campaign
                  </h2>
                  <button
                    onClick={() => setUpsellsOpen(!upsellsOpen)}
                    style={{ background: "transparent", border: "1px solid #243454", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#F5C842", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {upsellsOpen ? "Hide Options" : "View Options →"}
                    <span style={{ display: "inline-block", transition: "transform 0.35s ease-in-out", transform: upsellsOpen ? "rotate(90deg)" : "rotate(0deg)", fontSize: 10 }}>▶</span>
                  </button>
                </div>
                <div style={{ maxHeight: upsellsOpen ? 1200 : 0, overflow: "hidden", transition: "max-height 0.35s ease-in-out" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                    {UPSELLS.map((u) => {
                      const interested = interests.has(u.product);
                      return (
                        <div key={u.product} style={{ background: "#1a2740", border: "1px solid #243454", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ fontSize: 22, flexShrink: 0, width: 28, textAlign: "center" }}>{u.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{u.title}</p>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "2px 0 0" }}>{u.desc}</p>
                            {u.preview === "social" && (
                              <a href={`/social/${id}`} target="_blank" rel="noopener" style={{ fontSize: 11, color: "#0091ae", fontWeight: 600, textDecoration: "none", marginTop: 4, display: "inline-block" }}>Preview Content →</a>
                            )}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#0091ae", flexShrink: 0, whiteSpace: "nowrap" }}>{u.price}</span>
                          {interested ? (
                            <span style={{ fontSize: 12, color: "#00bda5", fontWeight: 700, flexShrink: 0 }}>✓ Rep notified</span>
                          ) : (
                            <button
                              onClick={() => postInterest(u.product)}
                              style={{ background: "#ff7a59", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                            >
                              I&apos;m Interested →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>{/* end left/center column */}

            {/* ── RIGHT PANEL ──────────────────────────────────────────── */}
            <div style={{ width: 280, flexShrink: 0, background: "#1a2740", borderRadius: 12, border: "1px solid #243454", padding: 0, overflow: "hidden", alignSelf: "flex-start" }} id="messages">

              {/* Activity header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #243454", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.85)" }}>
                Activity
              </div>

              {/* Activity feed */}
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Build log entries */}
                {client.buildLog.map((entry: BuildLogEntry, i: number) => (
                  <div key={`bl-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F5C842", flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: "0 0 2px" }}>Stage: {entry.from} → {entry.to}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }}>{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {/* Message entries */}
                {client.messages.map((m, i) => (
                  <div key={`msg-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.from === "rep" ? "#3b82f6" : "#0891b2", flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: "0 0 2px" }}>{m.text.length > 60 ? m.text.slice(0, 60) + "…" : m.text}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }}>{new Date(m.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {client.buildLog.length === 0 && client.messages.length === 0 && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>No activity yet.</p>
                )}
              </div>

              {/* Messages section divider */}
              <div style={{ borderTop: "1px solid #243454", padding: "16px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.85)" }}>
                Messages
              </div>

              {/* Full message thread */}
              <div style={{ padding: "0 16px 12px" }}>
                <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
                  {client.messages.length > 0 ? client.messages.map((m, i) => (
                    <div key={i} style={{ background: "#0d1a2e", border: "1px solid #243454", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{m.from === "rep" ? "Your BVM Rep" : "You"}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{new Date(m.timestamp).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>{m.text}</p>
                    </div>
                  )) : (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>No messages yet.</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="text" value={replyInput} onChange={(e) => setReplyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Send to rep..." style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid #243454", fontSize: 12, background: "#0d1a2e", color: "#e2e8f0" }} />
                  <button onClick={sendReply} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{replySent ? "Sent!" : "Send →"}</button>
                </div>
              </div>
            </div>

          </div>{/* end two-column below hero */}

        </main>
      </div>{/* end sidebar + main wrapper */}

      {/* ── LMS — Windows 95 Style (full-bleed navy) ─────────────────── */}
      <div style={{ borderTop: "3px solid #F5C842" }} id="learning" />
      <section style={{ background: "#1a2e3b", padding: "48px 32px" }}>
        <div style={{ maxWidth: 896, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5C842", marginBottom: 16 }}>Get the Most From Your Site</p>

          <style>{`@keyframes pulseGlow{0%,100%{box-shadow:0 0 8px rgba(245,200,66,0.3)}50%{box-shadow:0 0 24px rgba(245,200,66,0.6)}}`}</style>

          <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "flex-start" }}>

            {/* ── MODULE 0 — ONBOARDING ──────────────────── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: "#F5C842", margin: "0 0 10px" }}>Module 0 — Onboarding</p>
              <div style={{ height: 420, background: "#c0c0c0", border: "2px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080, 2px 2px 8px rgba(0,0,0,0.15)", fontFamily: "'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif", display: "flex", flexDirection: "column" }}>
                <div style={{ background: "linear-gradient(90deg, #0d1a2e, #1a3a5c)", padding: "3px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", letterSpacing: "0.02em" }}>BVM Learning Center v1.0</span>
                  <div style={{ display: "flex", gap: 2 }}>
                    {["_", "□", "x"].map((b) => (
                      <div key={`m0-${b}`} style={{ width: 16, height: 14, background: "#c0c0c0", border: "1px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#000", lineHeight: 1 }}>{b}</div>
                    ))}
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid #808080", padding: "2px 6px", fontSize: 11, color: "#000", display: "flex", gap: 12, flexShrink: 0 }}>
                  <span style={{ textDecoration: "underline" }}>File</span>
                  <span style={{ textDecoration: "underline" }}>View</span>
                  <span style={{ textDecoration: "underline" }}>Help</span>
                </div>
                <div style={{ padding: 8, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "#000", border: "2px solid #808080", borderRightColor: "#fff", borderBottomColor: "#fff", height: 240, flexShrink: 0 }}>
                    <video src="/claire-onboarding.mp4" controls preload="metadata" style={{ width: "100%", height: 240, display: "block", background: "#000" }} />
                  </div>
                  <div style={{ marginTop: 8, padding: "6px 4px", flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#000", margin: "0 0 4px" }}>Welcome to BVM Digital with Claire</p>
                    <p style={{ fontSize: 11, color: "#444", margin: 0, lineHeight: 1.4 }}>Your onboarding walkthrough — play any time to revisit how BVM works.</p>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #808080", padding: "2px 6px", fontSize: 10, color: "#444", flexShrink: 0 }}>Module 0 of 3</div>
              </div>
            </div>

            {/* ── MODULE 1 — THE BUILDER DO-ER ────────────── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: "#F5C842", margin: "0 0 10px" }}>Module 1 — The Builder Do-er</p>
              <div style={{ height: 420, background: "#c0c0c0", border: "2px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080, 2px 2px 8px rgba(0,0,0,0.15)", fontFamily: "'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif", display: "flex", flexDirection: "column" }}>
                <div style={{ background: "linear-gradient(90deg, #0d1a2e, #1a3a5c)", padding: "3px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", letterSpacing: "0.02em" }}>BVM Learning Center v1.0</span>
                  <div style={{ display: "flex", gap: 2 }}>
                    {["_", "□", "x"].map((b) => (
                      <div key={`m1-${b}`} style={{ width: 16, height: 14, background: "#c0c0c0", border: "1px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#000", lineHeight: 1 }}>{b}</div>
                    ))}
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid #808080", padding: "2px 6px", fontSize: 11, color: "#000", display: "flex", gap: 12, flexShrink: 0 }}>
                  <span style={{ textDecoration: "underline" }}>File</span>
                  <span style={{ textDecoration: "underline" }}>View</span>
                  <span style={{ textDecoration: "underline" }}>Help</span>
                </div>
                <div style={{ padding: 8, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "#000", border: "2px solid #808080", borderRightColor: "#fff", borderBottomColor: "#fff", height: 240, flexShrink: 0, position: "relative" }}>
                    <iframe src="https://www.youtube.com/embed/WkJpEG4KbN4?si=7bgkmqiGzNnRY77o" title="The Builder Do-er" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} />
                  </div>
                  <div style={{ marginTop: 8, padding: "6px 4px", flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#000", margin: "0 0 4px" }}>The Builder Do-er</p>
                    <p style={{ fontSize: 11, color: "#444", margin: 0, lineHeight: 1.4 }}>How to think like a builder and take action every day.</p>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #808080", padding: "2px 6px", fontSize: 10, color: "#444", flexShrink: 0 }}>Module 1 of 3</div>
              </div>
            </div>

            {/* ── MODULE 2 — COACH BRUNO UNLOCKED ─────────── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: "#F5C842", margin: "0 0 10px" }}>Module 2 — Coach Bruno Unlocked</p>
              <div style={{ height: 420, background: "#c0c0c0", border: "2px solid #F5C842", borderRightColor: "#808080", borderBottomColor: "#808080", fontFamily: "'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif", position: "relative", animation: "pulseGlow 2.5s ease-in-out infinite", display: "flex", flexDirection: "column" }}>
                <span style={{ position: "absolute", top: -10, right: -10, background: "#F5C842", color: "#0d1a2e", fontSize: 8, fontWeight: 800, padding: "3px 10px", borderRadius: 4, letterSpacing: "0.1em", textTransform: "uppercase", zIndex: 1 }}>Available Now</span>
                <div style={{ background: "linear-gradient(90deg, #0d1a2e, #1a3a5c)", padding: "3px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#F5C842", letterSpacing: "0.02em" }}>BVM Learning Center v1.0</span>
                  <div style={{ display: "flex", gap: 2 }}>
                    {["_", "□", "x"].map((b) => (
                      <div key={`m2-${b}`} style={{ width: 16, height: 14, background: "#c0c0c0", border: "1px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#000", lineHeight: 1 }}>{b}</div>
                    ))}
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid #808080", padding: "2px 6px", fontSize: 11, color: "#000", display: "flex", gap: 12, flexShrink: 0 }}>
                  <span style={{ textDecoration: "underline" }}>File</span>
                  <span style={{ textDecoration: "underline" }}>View</span>
                  <span style={{ textDecoration: "underline" }}>Help</span>
                </div>
                <div style={{ padding: 16, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240 }}>
                  <p style={{ fontSize: 28, margin: "0 0 8px" }}>🤖</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#000", margin: "0 0 4px" }}>Coach Bruno Unlocked</p>
                  <p style={{ fontSize: 11, color: "#444", margin: "0 0 16px", lineHeight: 1.4 }}>Your AI coach is ready. Ask anything about your campaign, your market, your next move.</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <a href="https://coach-bruno-next.vercel.app" target="_blank" rel="noopener noreferrer" style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "none", borderRadius: 0, fontFamily: "inherit" }}>Launch Coach Bruno →</a>
                    <a href="https://coach-bruno-next.vercel.app" target="_blank" rel="noopener noreferrer" style={{ background: "#c0c0c0", border: "2px solid #fff", borderRightColor: "#808080", borderBottomColor: "#808080", padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "none", color: "#000", fontFamily: "inherit" }}>Ask Bruno a Question →</a>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #808080", padding: "2px 6px", fontSize: 10, color: "#444", flexShrink: 0 }}>Module 2 of 3 — AI Coach</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0d1a2e", borderTop: "1px solid #243454", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>Questions? Your BVM rep is {client.assigned_rep}.</p>
        <a href={`mailto:therrera@bestversionmedia.com?subject=${encodeURIComponent(`Question about ${client.business_name}`)}`} style={{ background: "#0d1a2e", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Contact Rep →</a>
      </footer>

    </div>
  );
}
