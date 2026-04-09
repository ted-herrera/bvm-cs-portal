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

  useEffect(() => {
    fetch(`/api/profile/${id}`).then((r) => r.json()).then((d) => {
      setClient(d.client || null);
      setLoading(false);
      if (d.client && !localStorage.getItem(`bvm_welcomed_${id}`)) setShowWelcome(true);
    }).catch(() => setLoading(false));
  }, [id]);

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

  if (loading) return <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "2px solid #0d1a2e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!client) return <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#64748b" }}>Client not found.</p></div>;

  const isPreApproval = client.stage === "intake" || client.stage === "tear-sheet";
  const currentIdx = PORTAL_STAGES.indexOf(client.stage as PipelineStage);
  const effectiveIdx = client.stage === "delivered" ? 3 : currentIdx >= 0 ? currentIdx : 0;

  // ── PRE-APPROVAL STATE ────────────────────────────────────────────────
  if (isPreApproval) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 4, background: "#F5C842" }} />
        <nav style={{ height: 56, padding: "0 32px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center" }}>
          <img src="/bvm_logo.png" alt="BVM" style={{ height: 32, width: "auto" }} />
        </nav>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 500 }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 900, color: "#0d1a2e", margin: "0 0 12px" }}>{client.business_name}</h1>
            <p style={{ fontSize: 16, color: "#64748b", marginBottom: 32 }}>Your campaign direction is ready for review.</p>
            <a href={`/tearsheet/${client.id}`} style={{ display: "inline-block", background: "#F5C842", color: "#0d1a2e", padding: "16px 40px", borderRadius: 10, fontSize: 16, fontWeight: 800, textDecoration: "none" }}>Review & Approve Your Campaign →</a>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 40 }}>
              {PORTAL_STAGES.slice(0, 5).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: i === 0 ? "#F5C842" : "#e2e8f0" }} />
                  {i < 4 && <div style={{ width: 24, height: 2, background: "#e2e8f0" }} />}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Step 1 of 5</p>
          </div>
        </div>
      </div>
    );
  }

  // ── POST-APPROVAL STATE ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ height: 4, background: "#F5C842" }} />

      {/* Welcome overlay */}
      {showWelcome && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,26,46,0.95)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 480, width: "90%", textAlign: "center" }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#0d1a2e", margin: "0 0 12px" }}>Welcome to BVM, {client.business_name}! 🎉</h2>
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

      {/* Progress */}
      <section style={{ padding: "32px 48px" }}>
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
      <section style={{ padding: "0 48px 40px" }}>
        <video src="/claire-onboarding.mp4" controls preload="metadata" style={{ borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxWidth: 700, width: "100%", display: "block" }} />
      </section>

      {/* Site Preview */}
      <section style={{ padding: "0 48px 40px" }}>
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
      <section style={{ padding: "0 48px 40px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>✏️ Request a Change</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 700 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>Web Edit</p>
            {!editSent ? (
              <>
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Describe what you'd like changed..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, resize: "none", boxSizing: "border-box" }} rows={3} />
                <button onClick={async () => { if (!editText.trim()) return; await postInterest("web-edit", { note: editText }); setEditSent(true); }} style={{ marginTop: 8, background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Submit Web Edit →</button>
              </>
            ) : <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>✅ Your rep has been notified.</p>}
          </div>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>Print Request</p>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>Want to update your print campaign?</p>
            {!interests.has("print-request") ? (
              <button onClick={() => postInterest("print-request")} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Talk to Your Rep →</button>
            ) : <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>✅ Your rep will reach out.</p>}
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Your BVM rep will reach out to discuss print options.</p>
          </div>
        </div>
      </section>

      {/* Print Builder */}
      <section style={{ padding: "0 48px 40px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>Your Print Campaign</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, maxWidth: 700 }}>
          {[{ id: "eighth", label: "1/8 Page", desc: "Brand Awareness" }, { id: "quarter", label: "1/4 Page", desc: "Most Popular" }, { id: "half", label: "1/2 Page", desc: "Dominant" }, { id: "full_page", label: "Full Page", desc: "Max Impact" }, { id: "front_cover", label: "Front Cover", desc: "Exclusive 👑" }].map((s) => (
            <button key={s.id} onClick={() => { setPrintSize(s.id); setPrintSent(false); }} style={{ background: printSize === s.id ? "#fffbeb" : "#fff", border: printSize === s.id ? "2px solid #F5C842" : "2px solid #e2e8f0", borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0d1a2e", margin: "0 0 2px" }}>{s.label}</p>
              <p style={{ fontSize: 9, color: "#64748b", margin: 0 }}>{s.desc}</p>
            </button>
          ))}
        </div>
        {printSize && !printSent && (
          <button onClick={async () => { await postInterest("print", { size: printSize }); setPrintSent(true); }} style={{ marginTop: 12, background: "#F5C842", color: "#0d1a2e", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{printSize === "front_cover" ? "👑 Request Featured Placement →" : "Send to My Rep →"}</button>
        )}
        {printSent && <p style={{ marginTop: 12, fontSize: 13, color: "#22c55e", fontWeight: 600 }}>✅ Your rep has been notified!</p>}
      </section>

      {/* Upsell Ladder */}
      <section style={{ padding: "0 48px 40px", borderTop: "1px solid #f1f5f9", paddingTop: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>Grow Your Campaign</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {UPSELLS.map((u) => (
            <div key={u.product} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{u.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>{u.title}</h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 16px" }}>{u.desc}</p>
              {!interests.has(u.product) ? (
                <button onClick={() => postInterest(u.product)} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>I&apos;m Interested →</button>
              ) : <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>✓ Rep notified</span>}
            </div>
          ))}
        </div>
      </section>

      {/* LMS */}
      <section style={{ padding: "0 48px 40px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 16 }}>Get the Most From Your Site</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[{ title: "Your Site is Live — Now What?", desc: "Learn how to share your site and start getting traffic." }, { title: "How to Share Your Site", desc: "Facebook, Instagram, Google — where to post and what to say." }, { title: "Getting Found on Google", desc: "Simple steps to make sure customers find you first." }].map((m) => (
            <div key={m.title} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0d1a2e", margin: "0 0 8px" }}>{m.title}</h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: "0 0 12px" }}>{m.desc}</p>
              <a href="/qa-demo" style={{ fontSize: 13, color: "#F5C842", fontWeight: 600, textDecoration: "none" }}>Start Module →</a>
            </div>
          ))}
        </div>
      </section>

      {/* Messages */}
      {client.messages.length > 0 && (
        <section style={{ padding: "0 48px 40px" }}>
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

      {/* Contact */}
      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Questions? Your BVM rep is {client.assigned_rep}.</p>
        <a href={`mailto:therrera@bestversionmedia.com?subject=${encodeURIComponent(`Question about ${client.business_name}`)}`} style={{ background: "#0d1a2e", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Contact Rep →</a>
      </footer>
    </div>
  );
}
