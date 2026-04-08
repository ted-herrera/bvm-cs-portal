"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import type { ClientProfile } from "@/lib/pipeline";
import { STAGE_ORDER, STAGE_LABELS, STAGE_COLORS } from "@/lib/pipeline";

type Tab = "overview" | "qa" | "communication" | "buildlog";

export default function ProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [noteInput, setNoteInput] = useState("");
  const [brunoInput, setBrunoInput] = useState("");
  const [brunoChat, setBrunoChat] = useState<{ role: string; text: string }[]>([]);
  const [brunoLoading, setBrunoLoading] = useState(false);
  const [expandedPass, setExpandedPass] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [campaignLook, setCampaignLook] = useState<string>("professional");
  const [customRequested, setCustomRequested] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/profile/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data.client || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function sendReply() {
    if (!replyInput.trim() || !client) return;
    setReplySending(true);
    setReplySent(false);
    try {
      await fetch(`/api/profile/message/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyInput, from: "rep", repName: "Ted" }),
      });
      const newMsg = { from: "rep", text: replyInput, timestamp: new Date().toISOString() };
      setClient({ ...client, messages: [...client.messages, newMsg] });
      setReplyInput("");
      setReplySent(true);
      setTimeout(() => setReplySent(false), 4000);
    } catch { /* ignore */ }
    setReplySending(false);
  }

  // Initialize campaignLook from client
  useEffect(() => {
    if (client?.selectedLook) setCampaignLook(client.selectedLook);
  }, [client?.selectedLook]);

  const CAMPAIGN_LOOKS = ["warm_bold", "professional", "bold_modern"] as const;
  const CAMPAIGN_LOOK_STYLES: Record<string, { accent: string; bg: string }> = {
    warm_bold: { accent: "#D4531A", bg: "#D4531A" },
    professional: { accent: "#1a5276", bg: "#1a5276" },
    bold_modern: { accent: "#F5C842", bg: "#0d1a2e" },
  };
  const CAMPAIGN_LOOK_LABELS: Record<string, string> = {
    warm_bold: "Warm & Bold",
    professional: "Clean & Professional",
    bold_modern: "Bold & Modern",
  };

  function cycleCampaignLook() {
    setCampaignLook((prev) => {
      const idx = CAMPAIGN_LOOKS.indexOf(prev as typeof CAMPAIGN_LOOKS[number]);
      return CAMPAIGN_LOOKS[(idx + 1) % CAMPAIGN_LOOKS.length];
    });
  }

  async function requestCustomEnhancement() {
    if (!client) return;
    setCustomRequested(true);
    await fetch("/api/upsell/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, product: "custom-enhancement" }),
    });
  }

  async function addNote() {
    if (!noteInput.trim() || !client) return;
    const newNote = {
      from: "rep",
      text: noteInput,
      timestamp: new Date().toISOString(),
    };
    setClient({ ...client, internalNotes: [...client.internalNotes, newNote] });
    setNoteInput("");
  }

  async function sendBruno() {
    if (!brunoInput.trim() || !client) return;
    const userMsg = { role: "user", text: brunoInput };
    setBrunoChat((prev) => [...prev, userMsg]);
    setBrunoInput("");
    setBrunoLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Bruno, support assistant for BVM Design Center. You know everything about this client: ${client.business_name} in ${client.city}. Stage: ${client.stage}. Services: ${client.intakeAnswers?.q3 || "N/A"}. Selected look: ${client.selectedLook || "N/A"}. Help the rep with questions about this client's build, market data, and next steps.`,
          messages: [
            ...brunoChat.map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.text,
            })),
            { role: "user", content: brunoInput },
          ],
        }),
      });
      const data = await res.json();
      setBrunoChat((prev) => [
        ...prev,
        { role: "bruno", text: data.response || "Sorry, I couldn't process that." },
      ]);
    } catch {
      setBrunoChat((prev) => [
        ...prev,
        { role: "bruno", text: "Connection error. Try again." },
      ]);
    }
    setBrunoLoading(false);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [brunoChat]);

  function downloadBuildLog() {
    if (!client) return;
    const lines = client.buildLog.map(
      (e) =>
        `${new Date(e.timestamp).toLocaleString()}  |  ${STAGE_LABELS[e.from]} → ${STAGE_LABELS[e.to]}  |  by ${e.triggeredBy}`
    );
    const txt = `Build Log — ${client.business_name}\n${"=".repeat(50)}\n\n${lines.join("\n")}`;
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `build-log-${client.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d1a2e" }}>
        <TopNav activePage="dashboard" />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
          <div style={{ width: 32, height: 32, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d1a2e" }}>
        <TopNav activePage="dashboard" />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
          <p style={{ color: "#94a3b8" }}>Client not found.</p>
        </div>
      </div>
    );
  }

  const stageIdx = STAGE_ORDER.indexOf(client.stage as (typeof STAGE_ORDER)[number]);
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "qa", label: "QA Report" },
    { id: "communication", label: "Communication" },
    { id: "buildlog", label: "Build Log" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d1a2e", display: "flex", flexDirection: "column" }}>
      <TopNav activePage="clients" />

      <div style={{ display: "flex", flex: 1 }}>
        {/* Stage Timeline Panel */}
        <aside
          style={{
            width: 280,
            background: "#1a2740",
            padding: "24px 20px",
            borderRight: "1px solid #243454",
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          <Link
            href="/dashboard"
            style={{ fontSize: 13, color: "#64748b", textDecoration: "none", display: "block", marginBottom: 20 }}
          >
            ← Back to Dashboard
          </Link>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#F5C842",
              marginBottom: 16,
            }}
          >
            Build Progress
          </h3>

          {/* Horizontal progress bar */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 20, padding: "0 4px" }}>
            {STAGE_ORDER.map((stage, i) => {
              const isCurrent = client.stage === stage;
              const isCompleted = stageIdx >= 0 && i < stageIdx;
              const isLast = i === STAGE_ORDER.length - 1;
              return (
                <div key={stage} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                    background: isCurrent ? "#F5C842" : isCompleted ? "#F5C842" : "#334155",
                    boxShadow: isCurrent ? "0 0 0 4px rgba(245,200,66,0.3)" : "none",
                    animation: isCurrent ? "pulse 2s infinite" : "none",
                  }} />
                  {!isLast && (
                    <div style={{ flex: 1, height: 2, background: isCompleted ? "#F5C842" : "#334155" }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {STAGE_ORDER.map((stage, i) => {
              const isCurrent = client.stage === stage;
              const isCompleted = stageIdx >= 0 && i < stageIdx;
              const logEntry = client.buildLog.find((e) => e.to === stage);

              return (
                <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      background: isCurrent
                        ? "#F5C842"
                        : isCompleted
                          ? "#22c55e"
                          : "#334155",
                      color: isCurrent
                        ? "#0d1a2e"
                        : isCompleted
                          ? "#fff"
                          : "#64748b",
                      boxShadow: isCurrent ? "0 0 0 4px rgba(245,200,66,0.25)" : "none",
                      animation: isCurrent ? "pulse 2s infinite" : "none",
                    }}
                  >
                    {isCompleted ? "✓" : i + 1}
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isCurrent ? 700 : 400,
                        color: isCurrent ? "#ffffff" : isCompleted ? "#22c55e" : "#64748b",
                      }}
                    >
                      {STAGE_LABELS[stage]}
                    </span>
                    {isCurrent && (
                      <p style={{ fontSize: 10, color: "#F5C842", margin: "2px 0 0", fontStyle: "italic" }}>In progress...</p>
                    )}
                    {logEntry && (
                      <p style={{ fontSize: 10, color: "#475569", margin: "2px 0 0" }}>
                        {new Date(logEntry.timestamp).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {client.stage === "revision-requested" && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    background: "#ef4444",
                    color: "#fff",
                  }}
                >
                  !
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>
                  Revision Requested
                </span>
              </div>
            )}
          </div>

          {/* Client Portal Link */}
          <div style={{ marginTop: 20, background: "#0d1a2e", border: "1px solid #243454", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", margin: "0 0 8px" }}>
              Client Portal Link
            </p>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              /client/{client.id}
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/client/${client.id}`)}
                style={{ background: "#243454", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Copy Client Link
              </button>
              <a
                href={`/client/${client.id}`}
                target="_blank"
                style={{ background: "none", border: "1px solid #F5C842", color: "#F5C842", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
              >
                Open Client View →
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, overflow: "auto" }}>
          {/* Header */}
          <div style={{ background: "#0d1a2e", borderBottom: "1px solid #e2e8f0", padding: "24px 32px" }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>
              {client.business_name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, background: "#243454", color: "#94a3b8", fontWeight: 500 }}>
                {client.assigned_rep}
              </span>
              <span
                className={STAGE_COLORS[client.stage]}
                style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, color: "#fff", fontWeight: 600 }}
              >
                {STAGE_LABELS[client.stage]}
              </span>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {client.city}
              </span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginTop: 20 }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px 8px 0 0",
                    fontSize: 13,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: tab === t.id ? "#1a2740" : "transparent",
                    color: tab === t.id ? "#F5C842" : "#64748b",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 32, background: "#ffffff", minHeight: "calc(100vh - 200px)" }}>
            {/* Overview Tab */}
            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", margin: 0 }}>
                      Tear Sheet
                    </p>
                    <Link href={`/tearsheet/${client.id}`} style={{ fontSize: 13, color: "#F5C842", textDecoration: "none", display: "block", marginTop: 8 }}>
                      View Tear Sheet →
                    </Link>
                    <a href={`/api/site/generate?clientId=${client.id}&lookKey=${client.selectedLook || "warm_bold"}`} target="_blank" style={{ fontSize: 12, color: "#F5C842", textDecoration: "none", display: "block", marginTop: 4, opacity: 0.7 }}>
                      Preview Full Site →
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/site/generate?clientId=${client.id}&lookKey=${client.selectedLook || "warm_bold"}`);
                          const html = await res.text();
                          const blob = new Blob([html], { type: "text/html" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${client.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}-tear-sheet.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch { /* ignore */ }
                      }}
                      style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "block", marginTop: 8 }}
                    >
                      Download Tear Sheet
                    </button>
                  </div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", margin: 0 }}>
                      Build Package
                    </p>
                    {client.qa_passed_at ? (
                      <a href={`/api/build/package?clientId=${client.id}`} style={{ fontSize: 13, color: "#F5C842", display: "block", marginTop: 8, textDecoration: "none" }}>
                        Download Package →
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <span style={{ color: "#F5C842" }}>🔒</span> QA stamp required
                      </span>
                    )}
                  </div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", margin: 0 }}>
                      Published URL
                    </p>
                    {client.published_url ? (
                      <a href={client.published_url} target="_blank" style={{ fontSize: 13, color: "#F5C842", display: "block", marginTop: 8 }}>
                        {client.published_url}
                      </a>
                    ) : (
                      <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 0" }}>Not yet published</p>
                    )}
                  </div>
                </div>

                {/* Dev Status */}
                {client.stage === "building" && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", margin: "0 0 8px" }}>
                      Developer Status
                    </p>
                    {client.assignedDev ? (
                      <p style={{ fontSize: 13, color: "#0d1a2e", margin: 0 }}>
                        Assigned to: <strong>{client.assignedDev}</strong>
                        {(() => {
                          const claimEntry = client.buildLog.find((e) => e.triggeredBy === client.assignedDev);
                          return claimEntry ? <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>Claimed {new Date(claimEntry.timestamp).toLocaleDateString()}</span> : null;
                        })()}
                      </p>
                    ) : (
                      <p style={{ fontSize: 13, color: "#f59e0b", margin: 0 }}>
                        Unassigned — <a href="/build-queue" style={{ color: "#F5C842", textDecoration: "none" }}>in build queue</a>
                      </p>
                    )}
                  </div>
                )}

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0d1a2e", marginBottom: 16 }}>Key Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: "#64748b" }}>Look: </span>
                      <span style={{ color: "#fff", textTransform: "capitalize" }}>{client.selectedLook?.replace(/_/g, " ") || "—"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>CTA: </span>
                      <span style={{ color: "#fff" }}>{client.intakeAnswers?.q4 || "—"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Services: </span>
                      <span style={{ color: "#fff" }}>{client.intakeAnswers?.q3 || "—"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Occasion: </span>
                      <span style={{ color: "#fff" }}>{client.intakeAnswers?.q8 || "—"}</span>
                    </div>
                  </div>
                </div>

                {client.sbrData && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0d1a2e", marginBottom: 16 }}>SBR Analysis</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                      {Object.entries(client.sbrData).map(([key, val]) => (
                        <div key={key}>
                          <span style={{ color: "#64748b", textTransform: "capitalize" }}>
                            {key.replace(/([A-Z])/g, " $1").trim()}:{" "}
                          </span>
                          <span style={{ color: "#fff" }}>
                            {typeof val === "string" ? val : Array.isArray(val) ? val.join(", ") : JSON.stringify(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campaign Preview */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: "#0d1a2e", margin: "0 0 4px", textAlign: "center" }}>Campaign Preview</h3>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", textAlign: "center", margin: "0 0 20px" }}>Client sees this same preview in their portal.</p>

                  <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "flex-start" }}>
                    {/* Laptop */}
                    <div>
                      <div style={{ background: "#374151", borderRadius: "10px 10px 0 0", padding: "6px 10px 0" }}>
                        <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                        </div>
                        <div style={{ background: "#fff", borderRadius: "3px 3px 0 0", width: 320, height: 200, overflow: "hidden", position: "relative" }}>
                          <iframe
                            src={`/api/site/generate?clientId=${client.id}&lookKey=${campaignLook}`}
                            style={{ width: 1300, height: 850, border: "none", transform: "scale(0.246)", transformOrigin: "top left", pointerEvents: "none" }}
                            title="Website preview"
                          />
                        </div>
                      </div>
                      <div style={{ background: "#4b5563", height: 12, borderRadius: "0 0 3px 3px" }} />
                      <div style={{ background: "#6b7280", height: 4, width: "60%", margin: "0 auto", borderRadius: "0 0 6px 6px" }} />
                      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>Website</p>
                    </div>

                    {/* Print Ad */}
                    <div>
                      <div style={{ background: "#374151", borderRadius: 10, padding: 10, width: 180 }}>
                        <div style={{ background: "#fff", borderRadius: 6, width: 160, height: 220, overflow: "hidden", padding: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", transition: "all 0.4s" }}>
                          <div style={{ height: 3, width: 40, background: CAMPAIGN_LOOK_STYLES[campaignLook]?.accent || "#1a5276", margin: "0 auto 10px", transition: "background 0.4s" }} />
                          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, fontWeight: 700, color: "#0d1a2e", margin: 0 }}>{client.business_name}</p>
                          <p style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>{(client.sbrData as Record<string, unknown>)?.suggestedTagline as string || ""}</p>
                          {client.intakeAnswers?.q3?.split(",").slice(0, 3).map((s: string, i: number) => (
                            <p key={i} style={{ fontSize: 8, color: CAMPAIGN_LOOK_STYLES[campaignLook]?.accent || "#1a5276", margin: "1px 0 0", transition: "color 0.4s" }}>{s.trim()}</p>
                          ))}
                          <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 6 }}>{client.phone}</p>
                          <div style={{ height: 1, width: 30, background: "#F5C842", margin: "6px auto" }} />
                          <p style={{ fontSize: 7, color: "#94a3b8" }}>BVM Studio</p>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>Print Ad</p>
                    </div>

                    {/* Digital Ad */}
                    <div>
                      <div style={{ background: "#374151", borderRadius: 16, padding: 6, width: 130 }}>
                        <div style={{ width: 24, height: 3, background: "#4b5563", borderRadius: 2, margin: "0 auto 4px" }} />
                        <div style={{ background: "#fff", borderRadius: 10, width: 118, height: 210, overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.4s" }}>
                          <div style={{ height: 36, background: CAMPAIGN_LOOK_STYLES[campaignLook]?.accent || "#1a5276", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.4s" }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{client.business_name}</span>
                          </div>
                          <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                            <div style={{ width: 80, height: 48, borderRadius: 6, background: `${CAMPAIGN_LOOK_STYLES[campaignLook]?.accent || "#1a5276"}22`, transition: "background 0.4s" }} />
                            <p style={{ fontSize: 9, color: "#0d1a2e", marginTop: 6, fontWeight: 600 }}>{client.intakeAnswers?.q3?.split(",")[0]?.trim() || ""}</p>
                            <div style={{ background: CAMPAIGN_LOOK_STYLES[campaignLook]?.accent || "#1a5276", color: "#fff", fontSize: 8, padding: "3px 10px", borderRadius: 3, marginTop: 6, fontWeight: 600, transition: "background 0.4s" }}>
                              {client.intakeAnswers?.q4 || "Contact Us"}
                            </div>
                          </div>
                        </div>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #4b5563", margin: "4px auto 2px" }} />
                      </div>
                      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>Digital Ad</p>
                    </div>
                  </div>

                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <button
                      onClick={cycleCampaignLook}
                      style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "10px 28px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      ✨ {CAMPAIGN_LOOK_LABELS[campaignLook] || "Professional"}
                    </button>
                    <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 8 }}>
                      Click to cycle through campaign looks
                    </p>
                  </div>
                </div>

                {/* Custom Enhancement Upsell */}
                <div style={{ border: "2px solid #F5C842", borderRadius: 12, padding: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#F5C842", margin: "0 0 6px" }}>⚡ Custom Enhancement Available</p>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 12px" }}>
                    Need something beyond the template? Custom features, integrations, or unique layouts — your BVM rep can scope it.
                  </p>
                  {!customRequested ? (
                    <button
                      onClick={requestCustomEnhancement}
                      style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      Request Custom Enhancement →
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>✓ Request received — your rep will be in touch.</span>
                  )}
                </div>
              </div>
            )}

            {/* QA Report Tab */}
            {tab === "qa" && (
              <div>
                {client.qaReport ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#fff",
                          background: client.qaReport.score >= 80 ? "#22c55e" : client.qaReport.score >= 50 ? "#f59e0b" : "#ef4444",
                        }}
                      >
                        {client.qaReport.score}
                      </div>
                      <div>
                        <p style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0 }}>
                          {client.qaReport.passed ? "QA Passed" : "QA Failed"}
                        </p>
                        <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
                          Run at {new Date(client.qaReport.runAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {client.qaReport.passes.map((pass) => (
                      <div key={pass.name} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                        <button
                          onClick={() => setExpandedPass(expandedPass === pass.name ? null : pass.name)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 20px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            borderBottom: expandedPass === pass.name ? "1px solid #243454" : "none",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ color: pass.passed ? "#22c55e" : "#ef4444", fontSize: 14 }}>
                              {pass.passed ? "✓" : "✕"}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#0d1a2e" }}>{pass.name}</span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              {pass.checks.filter((c) => c.passed).length}/{pass.checks.length}
                            </span>
                          </div>
                          <span style={{ color: "#64748b", fontSize: 12 }}>
                            {expandedPass === pass.name ? "▲" : "▼"}
                          </span>
                        </button>
                        {expandedPass === pass.name && (
                          <div>
                            {pass.checks.map((check) => (
                              <div
                                key={check.name}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "10px 20px",
                                  borderBottom: "1px solid #f1f5f9",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ color: check.passed ? "#22c55e" : "#ef4444", fontSize: 13 }}>
                                    {check.passed ? "✓" : "✕"}
                                  </span>
                                  <div>
                                    <p style={{ fontSize: 13, color: "#0d1a2e", margin: 0 }}>{check.name}</p>
                                    <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>{check.message}</p>
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      background:
                                        check.severity === "blocker"
                                          ? "rgba(239,68,68,0.15)"
                                          : check.severity === "warning"
                                            ? "rgba(245,158,11,0.15)"
                                            : "rgba(59,130,246,0.15)",
                                      color:
                                        check.severity === "blocker"
                                          ? "#ef4444"
                                          : check.severity === "warning"
                                            ? "#f59e0b"
                                            : "#3b82f6",
                                    }}
                                  >
                                    {check.severity}
                                  </span>
                                  {check.autofix && (
                                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                                      ⚡ auto-fix
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      style={{
                        background: "#F5C842",
                        color: "#0d1a2e",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      Download Report
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <p style={{ color: "#94a3b8", fontSize: 15, margin: "0 0 4px" }}>No QA report yet.</p>
                    <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 16px" }}>Run QA to continue.</p>
                    <Link
                      href="/qa"
                      style={{
                        background: "#F5C842",
                        color: "#0d1a2e",
                        padding: "10px 24px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Run QA →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Communication Tab */}
            {tab === "communication" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Bruno Chat */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0d1a2e", margin: 0 }}>Bruno Chat</h3>
                    <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>Bruno knows this client&apos;s context</p>
                  </div>
                  <div style={{ height: 260, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {brunoChat.length === 0 && (
                      <p style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: "40px 0" }}>
                        Ask Bruno anything about this client.
                      </p>
                    )}
                    {brunoChat.map((msg, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        {msg.role !== "user" && (
                          <img src="/bruno.png" alt="Bruno" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginRight: 8, flexShrink: 0 }} />
                        )}
                        <div
                          style={{
                            maxWidth: "75%",
                            padding: "8px 14px",
                            borderRadius: 12,
                            fontSize: 13,
                            background: msg.role === "user" ? "#F5C842" : "#243454",
                            color: msg.role === "user" ? "#0d1a2e" : "#fff",
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {brunoLoading && (
                      <div style={{ display: "flex" }}>
                        <img src="/bruno.png" alt="Bruno" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginRight: 8 }} />
                        <div style={{ padding: "8px 14px", borderRadius: 12, fontSize: 13, background: "#243454", color: "#64748b" }}>
                          Bruno is typing...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ padding: 12, borderTop: "1px solid #e2e8f0", display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={brunoInput}
                      onChange={(e) => setBrunoInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendBruno()}
                      placeholder="Ask Bruno..."
                      style={{
                        flex: 1,
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#0d1a2e",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={sendBruno}
                      disabled={brunoLoading}
                      style={{
                        background: "#F5C842",
                        color: "#0d1a2e",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: brunoLoading ? 0.5 : 1,
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Internal Notes */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0d1a2e", margin: 0 }}>Internal Notes</h3>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 9999, background: "#fef2f2", color: "#dc2626", fontWeight: 600 }}>Rep Only</span>
                    </div>
                  </div>
                  <div>
                    {client.internalNotes.length === 0 && (
                      <p style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: "24px 0" }}>
                        No internal notes yet.
                      </p>
                    )}
                    {client.internalNotes.map((n, i) => (
                      <div key={i} style={{ padding: "10px 20px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#F5C842" }}>{n.from}</span>
                          <span style={{ fontSize: 11, color: "#475569" }}>{new Date(n.timestamp).toLocaleString()}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>{n.text}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: 12, borderTop: "1px solid #e2e8f0", display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addNote()}
                      placeholder="Add note..."
                      style={{
                        flex: 1,
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#0d1a2e",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={addNote}
                      style={{
                        background: "#243454",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Client Messages */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0d1a2e", margin: 0 }}>Client Messages</h3>
                  </div>
                  <div>
                    {client.messages.length === 0 && (
                      <p style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: "24px 0" }}>
                        No client messages yet.
                      </p>
                    )}
                    {client.messages.map((msg, i) => (
                      <div key={i} style={{ padding: "10px 20px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 9999, background: msg.from === "rep" ? "#eff6ff" : "#fffbeb", color: msg.from === "rep" ? "#3b82f6" : "#d97706" }}>
                            {msg.from === "rep" ? "From rep" : "From client"}
                          </span>
                          <span style={{ fontSize: 11, color: "#475569" }}>{new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply to client */}
                  <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 6px" }}>Reply to client</p>
                    <textarea
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder={`Type a message to ${client.contact_name}...`}
                      style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0d1a2e", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                      {replySent && (
                        <span style={{ fontSize: 12, color: "#22c55e" }}>Message sent — client will receive an email notification.</span>
                      )}
                      <button
                        onClick={sendReply}
                        disabled={replySending || !replyInput.trim()}
                        style={{
                          background: "#F5C842", color: "#0d1a2e", border: "none", padding: "8px 18px",
                          borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: replySending || !replyInput.trim() ? "not-allowed" : "pointer",
                          opacity: replySending || !replyInput.trim() ? 0.5 : 1,
                        }}
                      >
                        {replySending ? "Sending..." : "Send Message →"}
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 6 }}>
                      Client will receive an email with a link to view this message in their portal.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Build Log Tab */}
            {tab === "buildlog" && (
              <div>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0d1a2e", margin: 0 }}>Build Log</h3>
                    <button
                      onClick={downloadBuildLog}
                      style={{
                        background: "#F5C842",
                        color: "#0d1a2e",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Download Build Log
                    </button>
                  </div>
                  <div>
                    {client.buildLog.length === 0 && (
                      <p style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: "32px 0" }}>
                        No build log entries.
                      </p>
                    )}
                    {client.buildLog.map((entry, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          padding: "12px 20px",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#F5C842",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12, color: "#475569", width: 160, flexShrink: 0 }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                        <span style={{ fontSize: 13, color: "#fff" }}>
                          {STAGE_LABELS[entry.from]} → {STAGE_LABELS[entry.to]}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          by {entry.triggeredBy}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
