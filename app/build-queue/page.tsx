"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { QAReport } from "@/lib/pipeline";

const DEV_USERNAME = "dev";

interface BuildRecord {
  id: string;
  clientId: string;
  businessName: string;
  city: string;
  zip: string;
  services: string[];
  look: string;
  tagline: string;
  cta: string;
  sbrData: Record<string, unknown> | null;
  generatedSiteHTML: string;
  status: "unassigned" | "claimed" | "ready-for-qa" | "live";
  assignedDev: string | null;
  createdAt: string;
  claimedAt: string | null;
  readyAt: string | null;
  liveAt: string | null;
  liveUrl: string | null;
  qaReport: QAReport | null;
}

interface BuildMessage {
  id: string;
  buildId: string;
  from: "rep" | "dev";
  text: string;
  timestamp: string;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function hoursSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
}

function severityColor(sev: string): string {
  if (sev === "blocker") return "#ff3b3b";
  if (sev === "warning") return "#f59e0b";
  return "#00d4ff";
}

export default function BuildQueuePage() {
  const router = useRouter();
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());
  const [selectedBuild, setSelectedBuild] = useState<BuildRecord | null>(null);
  const [claimToast, setClaimToast] = useState("");

  // QA Engine state
  const [uploadedHtml, setUploadedHtml] = useState<string>("");
  const [uploadedFilename, setUploadedFilename] = useState<string>("");
  const [qaReport, setQaReport] = useState<QAReport | null>(null);
  const [qaRunning, setQaRunning] = useState(false);
  const [autofixing, setAutofixing] = useState(false);
  const [liveUrlInput, setLiveUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Communications
  const [messages, setMessages] = useState<BuildMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadBuilds = useCallback(async () => {
    try {
      const res = await fetch("/api/build/list");
      const data = (await res.json()) as { builds?: BuildRecord[] };
      setBuilds(data.builds || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBuilds();
  }, [loadBuilds]);

  useEffect(() => {
    const clockInterval = setInterval(() => setClock(new Date()), 1000);
    const pollInterval = setInterval(() => loadBuilds(), 10000);
    return () => {
      clearInterval(clockInterval);
      clearInterval(pollInterval);
    };
  }, [loadBuilds]);

  const loadMessages = useCallback(async (buildId: string) => {
    try {
      const res = await fetch(`/api/build/messages?buildId=${encodeURIComponent(buildId)}`);
      const data = (await res.json()) as { messages?: BuildMessage[] };
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (selectedBuild) {
      loadMessages(selectedBuild.id);
    } else {
      setMessages([]);
    }
  }, [selectedBuild, loadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const unassigned = builds
    .filter((b) => b.status === "unassigned")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const myBuilds = builds.filter(
    (b) =>
      (b.status === "claimed" || b.status === "ready-for-qa") &&
      b.assignedDev === DEV_USERNAME,
  );

  async function claimBuild(build: BuildRecord) {
    setBuilds((prev) =>
      prev.map((b) =>
        b.id === build.id
          ? { ...b, status: "claimed", assignedDev: DEV_USERNAME, claimedAt: new Date().toISOString() }
          : b,
      ),
    );
    setSelectedBuild({
      ...build,
      status: "claimed",
      assignedDev: DEV_USERNAME,
      claimedAt: new Date().toISOString(),
    });
    setClaimToast(`Build claimed — ${build.businessName}`);
    setTimeout(() => setClaimToast(""), 3000);
    try {
      await fetch("/api/build/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: build.clientId, buildId: build.id, devUsername: DEV_USERNAME }),
      });
    } catch {
      /* optimistic already applied */
    }
  }

  async function markReadyForQA() {
    if (!selectedBuild) return;
    try {
      await fetch("/api/build/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedBuild.clientId }),
      });
    } catch {
      /* ignore */
    }
    setBuilds((prev) =>
      prev.map((b) =>
        b.id === selectedBuild.id ? { ...b, status: "ready-for-qa", readyAt: new Date().toISOString() } : b,
      ),
    );
    setSelectedBuild({ ...selectedBuild, status: "ready-for-qa", readyAt: new Date().toISOString() });
  }

  async function markBuildComplete() {
    if (!selectedBuild) return;
    try {
      await fetch("/api/build/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId: selectedBuild.id,
          clientId: selectedBuild.clientId,
          liveUrl: liveUrlInput.trim() || null,
        }),
      });
    } catch {
      /* ignore */
    }
    setBuilds((prev) =>
      prev.map((b) =>
        b.id === selectedBuild.id
          ? { ...b, status: "live", liveAt: new Date().toISOString(), liveUrl: liveUrlInput || b.liveUrl }
          : b,
      ),
    );
    setClaimToast(`${selectedBuild.businessName} marked live — rep notified`);
    setTimeout(() => setClaimToast(""), 4000);
    setSelectedBuild(null);
    setQaReport(null);
    setUploadedHtml("");
    setUploadedFilename("");
    setLiveUrlInput("");
  }

  function downloadDevPack(build: BuildRecord) {
    window.location.href = `/api/build/package?clientId=${build.clientId}`;
  }

  async function runQaOnUpload(html: string) {
    setQaRunning(true);
    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: html }),
      });
      const data = (await res.json()) as { report?: QAReport };
      setQaReport(data.report || null);
    } catch {
      /* ignore */
    }
    setQaRunning(false);
  }

  async function handleFileUpload(file: File) {
    const text = await file.text();
    setUploadedHtml(text);
    setUploadedFilename(file.name);
    await runQaOnUpload(text);
  }

  async function autofixUpload() {
    if (!uploadedHtml) return;
    setAutofixing(true);
    try {
      const res = await fetch("/api/qa/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent: uploadedHtml,
          autofix: true,
          businessName: selectedBuild?.businessName,
        }),
      });
      const data = (await res.json()) as { report?: QAReport; fixedHtml?: string };
      if (data.fixedHtml) {
        setUploadedHtml(data.fixedHtml);
        setQaReport(data.report || null);
        // Download the fixed HTML
        const blob = new Blob([data.fixedHtml], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fixed-${uploadedFilename || "index.html"}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* ignore */
    }
    setAutofixing(false);
  }

  function downloadQaReport() {
    if (!qaReport) return;
    const blob = new Blob([JSON.stringify(qaReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-report-${selectedBuild?.businessName || "build"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function sendDevMsg() {
    if (!msgInput.trim() || !selectedBuild || msgSending) return;
    setMsgSending(true);
    try {
      const res = await fetch("/api/build/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildId: selectedBuild.id, from: "dev", text: msgInput }),
      });
      const data = (await res.json()) as { message?: BuildMessage };
      if (data.message) {
        setMessages((prev) => [...prev, data.message as BuildMessage]);
      }
      setMsgInput("");
    } catch {
      /* ignore */
    }
    setMsgSending(false);
  }

  function handleSignOut() {
    document.cookie = "dc_session=; path=/; max-age=0";
    router.push("/login");
  }

  const mono = "'DM Mono', 'Fira Code', 'SF Mono', monospace";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <div style={{ fontFamily: mono, color: "#00d4ff", fontSize: 14 }}>LOADING BUILDS...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        fontFamily: mono,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <nav
        style={{
          background: "#000",
          borderBottom: "1px solid #00d4ff30",
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#00d4ff", fontSize: 14, fontWeight: 500, letterSpacing: "0.12em" }}>
            BVM BUILD QUEUE
          </span>
          <span style={{ color: "#00d4ff30", fontSize: 12 }}>|</span>
          <span style={{ color: "#00d4ff80", fontSize: 11 }}>v3.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#00d4ff", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            {clock.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          <span style={{ color: "#00d4ff40" }}>|</span>
          <span
            style={{
              background: "#00d4ff15",
              border: "1px solid #00d4ff40",
              borderRadius: 4,
              padding: "2px 10px",
              fontSize: 11,
              color: "#00d4ff",
            }}
          >
            DEV: {DEV_USERNAME}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              background: "none",
              border: "1px solid #ff3b3b40",
              borderRadius: 4,
              padding: "2px 10px",
              fontSize: 11,
              color: "#ff3b3b",
              cursor: "pointer",
              fontFamily: mono,
            }}
          >
            LOGOUT
          </button>
        </div>
      </nav>

      {claimToast && (
        <div
          style={{
            position: "fixed",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#00d4ff",
            color: "#000",
            padding: "8px 20px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.06em",
            zIndex: 500,
            fontFamily: mono,
            boxShadow: "0 4px 20px rgba(0,212,255,0.4)",
          }}
        >
          ✓ {claimToast}
        </div>
      )}

      {/* ── THREE COLUMNS ─────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── LEFT: BUILD QUEUE ───────────────────────── */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            borderRight: "1px solid #00d4ff15",
            overflowY: "auto",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span style={{ color: "#00d4ff", fontSize: 11, letterSpacing: "0.12em", fontWeight: 500 }}>
              BUILD QUEUE
            </span>
            <span style={{ color: "#00d4ff60", fontSize: 11 }}>{unassigned.length}</span>
          </div>

          {unassigned.length === 0 ? (
            <div style={{ border: "1px dashed #00d4ff30", borderRadius: 8, padding: 20, textAlign: "center" }}>
              <p style={{ color: "#00d4ff40", fontSize: 11, margin: 0 }}>NO BUILDS AVAILABLE</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unassigned.map((b) => {
                const days = daysSince(b.createdAt);
                const urgent = days > 3;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBuild(b)}
                    style={{
                      background: "#000",
                      border: `1px solid ${urgent ? "#ff3b3b" : selectedBuild?.id === b.id ? "#00d4ff" : "#00d4ff40"}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {urgent && (
                      <div
                        style={{
                          background: "#ff3b3b",
                          color: "#000",
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          padding: "2px 6px",
                          borderRadius: 3,
                          display: "inline-block",
                          marginBottom: 6,
                        }}
                      >
                        URGENT
                      </div>
                    )}
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#fff", margin: "0 0 3px" }}>
                      {b.businessName}
                    </p>
                    <p style={{ fontSize: 10, color: "#00d4ff80", margin: "0 0 4px" }}>
                      {b.city}
                    </p>
                    <p style={{ fontSize: 10, color: "#00d4ff60", margin: "0 0 6px" }}>
                      {b.look.replace(/_/g, " ")}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 10, color: urgent ? "#ff3b3b" : "#00d4ff60" }}>
                        {days}d waiting
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        claimBuild(b);
                      }}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "1px solid #00d4ff",
                        color: "#00d4ff",
                        padding: "6px 0",
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: mono,
                        letterSpacing: "0.06em",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#00d4ff";
                        e.currentTarget.style.color = "#000";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#00d4ff";
                      }}
                    >
                      CLAIM BUILD →
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* My Builds section */}
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{ color: "#f59e0b", fontSize: 11, letterSpacing: "0.12em", fontWeight: 500 }}
              >
                MY BUILDS
              </span>
              <span style={{ color: "#f59e0b60", fontSize: 11 }}>{myBuilds.length}</span>
            </div>
            {myBuilds.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #f59e0b30",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#f59e0b40", fontSize: 10, margin: 0 }}>CLAIM ONE TO START</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myBuilds.map((b) => {
                  const hrs = b.claimedAt ? hoursSince(b.claimedAt) : 0;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBuild(b)}
                      style={{
                        background: "#000",
                        border: `1px solid ${selectedBuild?.id === b.id ? "#f59e0b" : "#f59e0b40"}`,
                        borderRadius: 8,
                        padding: "12px 14px",
                        cursor: "pointer",
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#fff", margin: "0 0 3px" }}>
                        {b.businessName}
                      </p>
                      <p style={{ fontSize: 10, color: "#00d4ff80", margin: "0 0 4px" }}>{b.city}</p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "#f59e0b80" }}>{hrs}h in progress</span>
                        <span
                          style={{
                            fontSize: 9,
                            color: "#f59e0b",
                            background: "#f59e0b15",
                            border: "1px solid #f59e0b30",
                            borderRadius: 3,
                            padding: "1px 6px",
                          }}
                        >
                          {b.status === "ready-for-qa" ? "READY" : "ACTIVE"}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadDevPack(b);
                        }}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "1px solid #f59e0b",
                          color: "#f59e0b",
                          padding: "6px 0",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: mono,
                          letterSpacing: "0.04em",
                        }}
                      >
                        DOWNLOAD DEV PACK
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: QA ENGINE ─────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ color: "#00d4ff", fontSize: 16, letterSpacing: "0.16em", fontWeight: 500 }}>
              QA ENGINE
            </span>
            {selectedBuild && (
              <>
                <span style={{ color: "#00d4ff30" }}>|</span>
                <span style={{ color: "#fff", fontSize: 13 }}>{selectedBuild.businessName}</span>
              </>
            )}
          </div>

          {!selectedBuild ? (
            <div
              style={{
                border: "1px dashed #00d4ff30",
                borderRadius: 12,
                padding: 60,
                textAlign: "center",
              }}
            >
              <p style={{ color: "#00d4ff60", fontSize: 13 }}>SELECT A BUILD TO RUN QA</p>
            </div>
          ) : (
            <>
              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) await handleFileUpload(file);
                }}
                style={{
                  border: "2px dashed #00d4ff40",
                  borderRadius: 12,
                  padding: "32px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  marginBottom: 24,
                  background: "#00d4ff05",
                }}
              >
                <p style={{ color: "#00d4ff", fontSize: 13, margin: "0 0 4px", fontWeight: 500 }}>
                  {uploadedFilename ? `✓ ${uploadedFilename}` : "DROP HTML FILE OR CLICK TO UPLOAD"}
                </p>
                <p style={{ color: "#00d4ff50", fontSize: 11, margin: 0 }}>
                  The QA engine will run automatically
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleFileUpload(file);
                  }}
                />
              </div>

              {qaRunning && (
                <div
                  style={{
                    background: "#000",
                    border: "1px solid #00d4ff40",
                    borderRadius: 8,
                    padding: 20,
                    textAlign: "center",
                    color: "#00d4ff",
                    fontSize: 12,
                  }}
                >
                  RUNNING QA...
                </div>
              )}

              {qaReport && (
                <>
                  {/* Score header */}
                  <div
                    style={{
                      background: "#000",
                      border: `1px solid ${
                        qaReport.score >= 90
                          ? "#22c55e"
                          : qaReport.score >= 70
                            ? "#f59e0b"
                            : "#ff3b3b"
                      }`,
                      borderRadius: 12,
                      padding: 24,
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 10,
                          color: "#00d4ff80",
                          letterSpacing: "0.12em",
                          margin: "0 0 8px",
                        }}
                      >
                        OVERALL SCORE
                      </p>
                      <p
                        style={{
                          fontSize: 40,
                          fontWeight: 500,
                          color:
                            qaReport.score >= 90
                              ? "#22c55e"
                              : qaReport.score >= 70
                                ? "#f59e0b"
                                : "#ff3b3b",
                          margin: 0,
                          lineHeight: 1,
                        }}
                      >
                        {qaReport.score}
                      </p>
                      <p style={{ fontSize: 11, color: "#00d4ff60", margin: "4px 0 0" }}>
                        {qaReport.passed ? "PASSING" : "NEEDS WORK"}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <button
                        onClick={autofixUpload}
                        disabled={autofixing || !uploadedHtml}
                        style={{
                          background: "#00d4ff",
                          color: "#000",
                          border: "none",
                          padding: "8px 20px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: mono,
                          letterSpacing: "0.06em",
                          opacity: autofixing || !uploadedHtml ? 0.5 : 1,
                        }}
                      >
                        {autofixing ? "FIXING..." : "AUTO-FIX ↓"}
                      </button>
                      <button
                        onClick={downloadQaReport}
                        style={{
                          background: "transparent",
                          color: "#00d4ff",
                          border: "1px solid #00d4ff40",
                          padding: "6px 16px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: mono,
                          letterSpacing: "0.06em",
                        }}
                      >
                        DOWNLOAD REPORT
                      </button>
                    </div>
                  </div>

                  {/* Four passes */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    {qaReport.passes.map((pass) => (
                      <div
                        key={pass.name}
                        style={{
                          background: "#000",
                          border: `1px solid ${pass.passed ? "#22c55e40" : "#ff3b3b40"}`,
                          borderRadius: 8,
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: "#fff",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {pass.name.toUpperCase()}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: pass.passed ? "#22c55e" : "#ff3b3b",
                            }}
                          >
                            {pass.checks.filter((c) => c.passed).length}/{pass.checks.length}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {pass.checks.map((check, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: 10,
                                color: check.passed ? "#00d4ff80" : severityColor(check.severity),
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 6,
                                lineHeight: 1.4,
                              }}
                            >
                              <span style={{ flexShrink: 0 }}>{check.passed ? "✓" : "✗"}</span>
                              <div style={{ minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: 8,
                                    padding: "1px 4px",
                                    borderRadius: 2,
                                    background: severityColor(check.severity) + "20",
                                    color: severityColor(check.severity),
                                    marginRight: 4,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {check.severity}
                                </span>
                                {check.message}
                                {check.autofix && !check.passed && (
                                  <div style={{ color: "#00d4ff60", fontSize: 9, marginTop: 2 }}>
                                    → {check.autofix}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button
                      onClick={markReadyForQA}
                      disabled={qaReport.score < 70 || selectedBuild.status === "ready-for-qa"}
                      style={{
                        width: "100%",
                        background: qaReport.score >= 70 ? "#00d4ff" : "#00d4ff20",
                        color: qaReport.score >= 70 ? "#000" : "#00d4ff40",
                        border: "none",
                        padding: "12px 0",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: "0.12em",
                        cursor: qaReport.score >= 70 ? "pointer" : "not-allowed",
                        fontFamily: mono,
                      }}
                    >
                      MARK READY FOR QA {qaReport.score < 70 && "(NEED ≥70)"}
                    </button>
                    {qaReport.score >= 70 && (
                      <div
                        style={{
                          background: "#000",
                          border: "1px solid #22c55e40",
                          borderRadius: 8,
                          padding: 16,
                        }}
                      >
                        <p
                          style={{
                            color: "#22c55e",
                            fontSize: 11,
                            letterSpacing: "0.12em",
                            margin: "0 0 10px",
                          }}
                        >
                          READY TO GO LIVE
                        </p>
                        <input
                          type="url"
                          value={liveUrlInput}
                          onChange={(e) => setLiveUrlInput(e.target.value)}
                          placeholder="https://client-site.vercel.app"
                          style={{
                            width: "100%",
                            background: "#000",
                            border: "1px solid #22c55e40",
                            borderRadius: 6,
                            padding: "8px 12px",
                            fontSize: 11,
                            color: "#fff",
                            outline: "none",
                            fontFamily: mono,
                            marginBottom: 8,
                            boxSizing: "border-box",
                          }}
                        />
                        <button
                          onClick={markBuildComplete}
                          style={{
                            width: "100%",
                            background: "#22c55e",
                            color: "#000",
                            border: "none",
                            padding: "10px 0",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            letterSpacing: "0.12em",
                            cursor: "pointer",
                            fontFamily: mono,
                          }}
                        >
                          MARK BUILD COMPLETE →
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: COMMUNICATIONS ──────────────── */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            borderLeft: "1px solid #00d4ff15",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #00d4ff15" }}>
            <p
              style={{
                color: "#fff",
                fontSize: 11,
                letterSpacing: "0.12em",
                fontWeight: 500,
                margin: 0,
              }}
            >
              COMMUNICATIONS
            </p>
            {selectedBuild && (
              <p style={{ fontSize: 10, color: "#00d4ff80", margin: "4px 0 0" }}>
                VIEWING: {selectedBuild.businessName}
              </p>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {!selectedBuild ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <p style={{ color: "#00d4ff30", fontSize: 11 }}>SELECT A BUILD</p>
              </div>
            ) : messages.length === 0 ? (
              <p
                style={{
                  color: "#00d4ff30",
                  fontSize: 11,
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                NO MESSAGES YET
              </p>
            ) : (
              messages.map((m) => {
                const isRep = m.from === "rep";
                const badgeColor = isRep ? "#f59e0b" : "#00d4ff";
                const badgeLabel = isRep ? "REP" : "DEV";
                return (
                  <div key={m.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: "#000",
                          background: badgeColor,
                          padding: "1px 6px",
                          borderRadius: 3,
                        }}
                      >
                        {badgeLabel}
                      </span>
                      <span style={{ fontSize: 9, color: "#00d4ff40" }}>
                        {new Date(m.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#fff",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {m.text}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {selectedBuild && (
            <div
              style={{
                padding: "10px 14px",
                borderTop: "1px solid #00d4ff15",
                display: "flex",
                gap: 8,
              }}
            >
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendDevMsg()}
                placeholder="Message..."
                style={{
                  flex: 1,
                  background: "#000",
                  border: "1px solid #00d4ff30",
                  borderRadius: 6,
                  padding: "7px 10px",
                  fontSize: 11,
                  color: "#fff",
                  outline: "none",
                  fontFamily: mono,
                  caretColor: "#00d4ff",
                }}
              />
              <button
                onClick={sendDevMsg}
                disabled={!msgInput.trim() || msgSending}
                style={{
                  background: "#00d4ff",
                  color: "#000",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 14px",
                  fontSize: 10,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: mono,
                  opacity: msgInput.trim() && !msgSending ? 1 : 0.3,
                }}
              >
                SEND
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
