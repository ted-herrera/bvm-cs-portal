"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import type { CampaignClient } from "@/lib/campaign";
import { createClient } from "@supabase/supabase-js";
import confetti from "canvas-confetti";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchCampaignWithRetry(id: string, attempts = 3, delay = 1500): Promise<CampaignClient | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase
      .from("campaign_clients")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) return data as CampaignClient;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

const GOLD = "#C8A951";
const NAVY = "#1B2A4A";
const DARK_BG = "#0F1B33";

const STAGES = ["approved", "production", "review", "delivered"] as const;
const STAGE_LABELS: Record<string, string> = { approved: "Approved", production: "In Production", review: "Under Review", delivered: "Delivered" };

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: GOLD, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>
      {children}
    </div>
  );
}

const NAV_ITEMS = [
  { emoji: "\uD83D\uDCCA", label: "Market Intel", section: "intel" },
  { emoji: "\uD83C\uDFA8", label: "Your Campaign", section: "campaign" },
  { emoji: "\uD83D\uDCE6", label: "Full Suite", section: "suite" },
  { emoji: "\uD83D\uDCAC", label: "Messages", section: "messages" },
  { emoji: "\uD83C\uDF93", label: "Learning", section: "learning" },
];

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<CampaignClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("intel");
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [taglineEdit, setTaglineEdit] = useState("");
  const [editingTagline, setEditingTagline] = useState(false);
  const [changeRequest, setChangeRequest] = useState("");
  const [submittingChange, setSubmittingChange] = useState(false);
  const [showYouTube, setShowYouTube] = useState<string | null>(null);
  const confettiFired = useRef(false);
  const msgRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchCampaignWithRetry(id).then((c) => {
      setClient(c);
      setLoading(false);
      if (c?.tagline) setTaglineEdit(c.tagline);
    });
  }, [id]);

  // Confetti on first load if approved
  useEffect(() => {
    if (client && ["approved", "production", "review", "delivered"].includes(client.stage) && !confettiFired.current) {
      confettiFired.current = true;
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }
  }, [client]);

  // Auto-refresh messages every 30s
  useEffect(() => {
    if (!client || !["approved", "production", "review", "delivered"].includes(client.stage)) return;
    async function refreshMessages() {
      try {
        const res = await fetch(`/api/campaign/message/${id}`);
        const data = await res.json();
        if (data.messages) {
          setClient((prev) => prev ? { ...prev, messages: data.messages } : prev);
        }
      } catch { /* silent */ }
    }
    msgRefreshRef.current = setInterval(refreshMessages, 30000);
    return () => { if (msgRefreshRef.current) clearInterval(msgRefreshRef.current); };
  }, [client?.stage, id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: GOLD, fontSize: 18 }}>Loading...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#fff", fontSize: 18 }}>Campaign not found.</div>
      </div>
    );
  }

  // PRE-APPROVAL
  if (client.stage === "intake" || client.stage === "tearsheet") {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        {/* BVM Monogram */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 900, color: NAVY, fontFamily: "Georgia, serif", marginBottom: 24,
        }}>
          BVM
        </div>
        <h1 style={{ fontSize: 28, fontFamily: "Playfair Display, Georgia, serif", margin: "0 0 8px", textAlign: "center" }}>
          Your campaign direction is ready
        </h1>
        <p style={{ color: "#ffffffaa", fontSize: 14, margin: "0 0 32px" }}>Review and approve your creative direction</p>
        <Link
          href={`/campaign/tearsheet/${id}`}
          style={{
            background: GOLD, color: NAVY, padding: "14px 32px", borderRadius: 8, fontSize: 16, fontWeight: 700,
            textDecoration: "none", display: "inline-block",
          }}
        >
          Review Your Campaign &rarr;
        </Link>
        {/* Progress */}
        <div style={{ marginTop: 48, display: "flex", gap: 24, alignItems: "center" }}>
          {["Review", "Approve", "Production", "Delivered"].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i === 0 ? GOLD : "#334466",
                color: i === 0 ? NAVY : "#ffffff66",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 12, color: i === 0 ? GOLD : "#ffffff66" }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // POST-APPROVAL
  const directions = client.generated_directions || [];
  const approvedDir = directions.find((d) => d.name === client.selected_direction) || directions[0];
  const messages = client.messages || [];
  const stageIndex = STAGES.indexOf(client.stage as (typeof STAGES)[number]);

  const contactPhone = (client as unknown as Record<string, unknown>).contact_phone as string | undefined;
  const contactEmail = (client as unknown as Record<string, unknown>).contact_email as string | undefined;
  const contactAddress = (client as unknown as Record<string, unknown>).contact_address as string | undefined;
  const contactLine = [contactPhone, contactEmail, contactAddress].filter(Boolean).join(" \u00B7 ");

  async function sendMessage() {
    if (!msgInput.trim()) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/api/campaign/message/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "client", content: msgInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setClient((prev) => prev ? { ...prev, messages: [...(prev.messages || []), data.message] } : prev);
        setMsgInput("");
      }
    } catch { /* silent */ }
    setSendingMsg(false);
  }

  async function saveTagline() {
    try {
      await fetch(`/api/campaign/revision/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tagline", value: taglineEdit }),
      });
      setClient((prev) => prev ? { ...prev, tagline: taglineEdit } : prev);
      setEditingTagline(false);
    } catch { /* silent */ }
  }

  async function submitChange() {
    if (!changeRequest.trim()) return;
    setSubmittingChange(true);
    try {
      await fetch(`/api/campaign/revision/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "change_request", note: changeRequest.trim() }),
      });
      setChangeRequest("");
    } catch { /* silent */ }
    setSubmittingChange(false);
  }

  async function requestRevision(type: string) {
    try {
      await fetch(`/api/campaign/revision/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note: `Client requested ${type} update` }),
      });
    } catch { /* silent */ }
  }

  const scrollToSection = (section: string) => {
    setActiveNav(section);
    document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: "smooth" });
  };

  const suiteCards = [
    { label: "Print Ad", status: "active", color: GOLD },
    { label: "Web Landing Page", status: "available", color: "#667" },
    { label: "Digital Campaign", status: "available", color: "#667" },
  ];

  const onboardingSteps = [
    { title: "Welcome to Your Campaign", desc: "Learn how we build your brand presence." },
    { title: "Understanding Your Market", desc: "See the data behind your ad placement." },
    { title: "Making the Most of Your Ad", desc: "Tips to maximize your campaign ROI." },
  ];

  const lmsModules = [
    { title: "Brand Fundamentals", videoId: "dQw4w9WgXcQ" },
    { title: "Ad Design Principles", videoId: "dQw4w9WgXcQ" },
    { title: "Marketing Your Business", videoId: "dQw4w9WgXcQ" },
  ];

  const repName = client.rep_id || "BVM Rep";
  const repInitials = getInitials(repName);

  return (
    <div style={{ minHeight: "100vh", background: NAVY, color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100, height: 72, background: DARK_BG,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px",
        borderBottom: "1px solid #ffffff11",
      }}>
        <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 20, color: GOLD, fontWeight: 700 }}>
          {client.business_name}
        </div>
        {/* Progress Nodes */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {STAGES.map((s, i) => {
            const isActive = i <= stageIndex;
            const isCurrent = i === stageIndex;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  background: isActive ? GOLD : "#334466",
                  boxShadow: isCurrent ? `0 0 8px ${GOLD}` : "none",
                  animation: isCurrent ? "pulse 2s infinite" : "none",
                }} />
                <span style={{ fontSize: 11, color: isActive ? GOLD : "#ffffff55" }}>{STAGE_LABELS[s]}</span>
              </div>
            );
          })}
        </div>
        <div style={{
          background: GOLD, color: NAVY, padding: "6px 16px", borderRadius: 20,
          fontSize: 12, fontWeight: 700, textTransform: "uppercase",
        }}>
          {STAGE_LABELS[client.stage] || client.stage}
        </div>
      </header>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        {/* Left Nav */}
        <nav style={{ width: 220, background: DARK_BG, padding: "24px 0", position: "sticky", top: 72, height: "calc(100vh - 72px)", overflowY: "auto", flexShrink: 0 }}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.section}
              onClick={() => scrollToSection(item.section)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 20", cursor: "pointer",
                color: activeNav === item.section ? GOLD : "#ffffffaa",
                background: activeNav === item.section ? "#ffffff08" : "transparent",
                borderLeft: activeNav === item.section ? `3px solid ${GOLD}` : "3px solid transparent",
                fontSize: 14, fontWeight: activeNav === item.section ? 700 : 400,
              }}
            >
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              {item.label}
            </div>
          ))}
          {/* Rep Card */}
          <div style={{ margin: "auto 16px 16px", marginTop: "auto", padding: 16, background: "#ffffff08", borderRadius: 12, position: "absolute", bottom: 16, left: 16, right: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: GOLD, color: NAVY,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
              }}>
                {repInitials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{repName}</div>
                <div style={{ fontSize: 11, color: "#ffffffaa" }}>Your Rep</div>
              </div>
            </div>
          </div>
        </nav>

        {/* Center Content */}
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>

          {/* MARKET INTELLIGENCE */}
          <section id="section-intel" style={{ marginBottom: 48 }}>
            <Eyebrow>Market Intelligence</Eyebrow>
            <div style={{ background: "#ffffff08", borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Your Market at a Glance</h3>
              <p style={{ color: "#ffffffaa", fontSize: 14, margin: "0 0 16px" }}>
                Explore the SBR data powering your campaign strategy.
              </p>
              <Link
                href={`/campaign/intelligence/${id}`}
                style={{ color: GOLD, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
              >
                Explore Your Market &rarr;
              </Link>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Opportunity Score", "Households", "Avg Income", "Top Category"].map((label) => (
                <div key={label} style={{
                  background: "#223556", borderRadius: 20, padding: "8px 16px",
                  fontSize: 12, color: "#ffffffcc",
                }}>
                  {label}
                </div>
              ))}
            </div>
          </section>

          {/* YOUR CAMPAIGN */}
          <section id="section-campaign" style={{ marginBottom: 48 }}>
            <Eyebrow>Your Campaign</Eyebrow>
            {/* Approved Ad with Overlay */}
            {approvedDir && (
              <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", maxWidth: 480, marginBottom: 16 }}>
                {approvedDir.imageUrl ? (
                  <img src={approvedDir.imageUrl} alt="Approved direction" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1/1", background: `linear-gradient(135deg, ${NAVY} 0%, ${GOLD} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>
                    {approvedDir.name}
                  </div>
                )}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                  padding: "48px 16px 16px",
                }}>
                  <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "Georgia, serif" }}>{client.business_name}</div>
                  {client.tagline && <div style={{ color: "#fff", fontSize: 13, fontStyle: "italic", marginTop: 4 }}>{client.tagline}</div>}
                  {contactLine && <div style={{ color: "#fff", fontSize: 11, marginTop: 6 }}>{contactLine}</div>}
                </div>
              </div>
            )}

            {/* Tagline Edit */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#ffffffaa", marginBottom: 4 }}>Tagline</div>
              {editingTagline ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={taglineEdit}
                    onChange={(e) => setTaglineEdit(e.target.value)}
                    style={{ flex: 1, background: "#223556", border: "1px solid #ffffff22", borderRadius: 6, padding: "8px 12px", color: "#fff", fontSize: 14 }}
                  />
                  <button onClick={saveTagline} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}>Save</button>
                  <button onClick={() => { setEditingTagline(false); setTaglineEdit(client.tagline); }} style={{ background: "#334466", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div onClick={() => setEditingTagline(true)} style={{ cursor: "pointer", fontSize: 16, color: "#fff", padding: "8px 0", borderBottom: "1px dashed #ffffff33" }}>
                  {client.tagline || "Click to add tagline"} <span style={{ color: GOLD, fontSize: 12 }}>edit</span>
                </div>
              )}
            </div>

            {/* Status Card */}
            <div style={{ background: "#ffffff08", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: GOLD, marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{STAGE_LABELS[client.stage] || client.stage}</div>
              {client.approved_at && <div style={{ fontSize: 12, color: "#ffffffaa", marginTop: 4 }}>Approved: {new Date(client.approved_at).toLocaleDateString()}</div>}
            </div>

            {/* Asset Upload Zones */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              {["Logo Upload", "Photo Upload"].map((label) => (
                <div key={label} style={{
                  flex: 1, border: "2px dashed #ffffff22", borderRadius: 12, padding: 32,
                  textAlign: "center", color: "#ffffff66", fontSize: 14, cursor: "pointer",
                }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Change Request */}
            <div>
              <textarea
                placeholder="Request a change..."
                value={changeRequest}
                onChange={(e) => setChangeRequest(e.target.value)}
                style={{ width: "100%", background: "#223556", border: "1px solid #ffffff22", borderRadius: 8, padding: 12, color: "#fff", fontSize: 14, minHeight: 80, resize: "vertical", boxSizing: "border-box" }}
              />
              <button
                onClick={submitChange}
                disabled={submittingChange || !changeRequest.trim()}
                style={{
                  marginTop: 8, background: GOLD, color: NAVY, border: "none", borderRadius: 6,
                  padding: "10px 24px", fontWeight: 700, cursor: changeRequest.trim() ? "pointer" : "not-allowed",
                  opacity: changeRequest.trim() ? 1 : 0.5,
                }}
              >
                {submittingChange ? "Submitting..." : "Submit Change Request"}
              </button>
            </div>
          </section>

          {/* CAMPAIGN SUITE */}
          <section id="section-suite" style={{ marginBottom: 48 }}>
            <Eyebrow>Campaign Suite</Eyebrow>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              {suiteCards.map((card) => (
                <div key={card.label} style={{
                  flex: "1 1 200px", background: "#ffffff08", borderRadius: 12, padding: 20,
                  border: card.status === "active" ? `2px solid ${GOLD}` : "2px solid transparent",
                }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: card.status === "active" ? GOLD : "#ffffffaa" }}>{card.label}</div>
                  <div style={{ fontSize: 12, color: card.status === "active" ? GOLD : "#ffffff55", marginTop: 4, textTransform: "uppercase" }}>{card.status}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#ffffff08", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#ffffffaa", marginBottom: 8 }}>Expand your campaign reach with digital and web placements</div>
              <button style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}>
                Upgrade Your Suite
              </button>
            </div>
          </section>

          {/* MESSAGES */}
          <section id="section-messages" style={{ marginBottom: 48 }}>
            <Eyebrow>Messages</Eyebrow>
            <div style={{ background: "#ffffff08", borderRadius: 12, padding: 16, maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
              {messages.length === 0 && <div style={{ color: "#ffffff55", fontSize: 14, textAlign: "center", padding: 24 }}>No messages yet</div>}
              {messages.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: 12, padding: 10, borderRadius: 8,
                  background: msg.role === "client" ? "#1a3a5c" : "#223556",
                  marginLeft: msg.role === "client" ? 40 : 0,
                  marginRight: msg.role !== "client" ? 40 : 0,
                }}>
                  <div style={{ fontSize: 11, color: GOLD, marginBottom: 4, textTransform: "capitalize" }}>{msg.role}</div>
                  <div style={{ fontSize: 14 }}>{msg.content}</div>
                  <div style={{ fontSize: 10, color: "#ffffff44", marginTop: 4 }}>{new Date(msg.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                style={{ flex: 1, background: "#223556", border: "1px solid #ffffff22", borderRadius: 6, padding: "10px 14px", color: "#fff", fontSize: 14 }}
              />
              <button
                onClick={sendMessage}
                disabled={sendingMsg || !msgInput.trim()}
                style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}
              >
                {sendingMsg ? "..." : "Send"}
              </button>
            </div>
          </section>

          {/* BUSINESS PROFILE */}
          <section style={{ marginBottom: 48 }}>
            <Eyebrow>Business Profile</Eyebrow>
            <div style={{ background: "#ffffff08", borderRadius: 12, padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#ffffffaa", marginBottom: 12 }}>Update your business profile to enhance your campaign</div>
              <button
                onClick={() => requestRevision("business_profile")}
                style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}
              >
                Update Business Profile
              </button>
            </div>
          </section>

          {/* EXPERT CONTRIBUTOR */}
          <section style={{ marginBottom: 48 }}>
            <Eyebrow>Expert Contributor</Eyebrow>
            <div style={{ background: "#ffffff08", borderRadius: 12, padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#ffffffaa", marginBottom: 12 }}>Become a featured expert contributor in your edition</div>
              <button
                onClick={() => requestRevision("expert_contributor")}
                style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}
              >
                Become a Contributor
              </button>
            </div>
          </section>

          {/* LEARNING CENTER */}
          <section id="section-learning" style={{ marginBottom: 48 }}>
            <Eyebrow>Learning Center</Eyebrow>
            {/* Onboarding */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Onboarding</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {onboardingSteps.map((step, i) => (
                  <div key={i} style={{ flex: "1 1 200px", background: "#ffffff08", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Step {i + 1}: {step.title}</div>
                    <div style={{ fontSize: 12, color: "#ffffffaa" }}>{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* LMS Modules */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Learning Modules</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {lmsModules.map((mod, i) => (
                  <div
                    key={i}
                    onClick={() => setShowYouTube(mod.videoId)}
                    style={{ flex: "1 1 200px", background: "#ffffff08", borderRadius: 12, padding: 16, cursor: "pointer", border: `1px solid ${GOLD}33` }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{mod.title}</div>
                    <div style={{ fontSize: 12, color: GOLD, marginTop: 4 }}>Watch &rarr;</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Right Sidebar */}
        <aside style={{ width: 260, background: DARK_BG, padding: 20, position: "sticky", top: 72, height: "calc(100vh - 72px)", overflowY: "auto", flexShrink: 0 }}>
          {/* Approved Ad Image */}
          {approvedDir && (
            <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              {approvedDir.imageUrl ? (
                <img src={approvedDir.imageUrl} alt="Ad preview" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", aspectRatio: "1/1", background: `linear-gradient(135deg, ${NAVY}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                  {approvedDir.name}
                </div>
              )}
            </div>
          )}

          {/* Stage Card */}
          <div style={{
            background: "#ffffff08", borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "center",
            border: `1px solid ${GOLD}44`,
          }}>
            <div style={{ fontSize: 11, color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Stage</div>
            <div style={{ fontSize: 16, fontWeight: 700, animation: "pulse 2s infinite" }}>{STAGE_LABELS[client.stage] || client.stage}</div>
          </div>

          {/* Download Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <button style={{ background: "#223556", color: "#fff", border: "1px solid #ffffff22", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>
              Download Proof PDF
            </button>
            <button style={{ background: "#223556", color: "#fff", border: "1px solid #ffffff22", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>
              Download Hi-Res Image
            </button>
          </div>

          {/* Rep Card */}
          <div style={{ background: "#ffffff08", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: GOLD, color: NAVY,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
              }}>
                {repInitials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{repName}</div>
                <div style={{ fontSize: 11, color: "#ffffffaa" }}>Your Rep</div>
              </div>
            </div>
          </div>

          {/* Compact Messages */}
          <div style={{ background: "#ffffff08", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Recent Messages</div>
            {messages.length === 0 && <div style={{ fontSize: 12, color: "#ffffff44" }}>No messages</div>}
            {messages.slice(-3).map((msg, i) => (
              <div key={i} style={{ marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: GOLD, textTransform: "capitalize" }}>{msg.role}: </span>
                <span style={{ color: "#ffffffcc" }}>{msg.content.length > 60 ? msg.content.slice(0, 60) + "..." : msg.content}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* YouTube Modal */}
      {showYouTube && (
        <div
          onClick={() => setShowYouTube(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "80%", maxWidth: 800, aspectRatio: "16/9" }}>
            <iframe
              src={`https://www.youtube.com/embed/${showYouTube}?autoplay=1`}
              style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
