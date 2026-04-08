"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { ClientProfile, PipelineStage } from "@/lib/pipeline";

const LOOK_STYLES: Record<string, { bg: string; accent: string; text: string; font: string; web: string; print: string; digital: string }> = {
  warm_bold: {
    bg: "#D4531A", accent: "#D4531A", text: "#ffffff", font: "Georgia, serif",
    web: "#fef3c7", print: "#D4531A", digital: "#fbbf24",
  },
  professional: {
    bg: "#1a5276", accent: "#1a5276", text: "#ffffff", font: "'DM Sans', sans-serif",
    web: "#e0f2fe", print: "#1a5276", digital: "#38bdf8",
  },
  bold_modern: {
    bg: "#0d1a2e", accent: "#F5C842", text: "#ffffff", font: "'DM Sans', sans-serif",
    web: "#0d1a2e", print: "#F5C842", digital: "#0d1a2e",
  },
};

const PORTAL_STAGES: PipelineStage[] = ["tear-sheet", "building", "qa", "delivered", "live"];

const STAGE_STATUS: Record<string, string> = {
  "tear-sheet": "Your campaign direction is ready for review",
  building: "Your site is being built",
  qa: "Your site is being reviewed",
  review: "Your site is being reviewed",
  delivered: "Your site is almost ready",
  live: "Your site is live!",
  intake: "Your profile is being created",
  "revision-requested": "Your feedback has been received — we're on it",
};

export default function TearSheetPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneType, setDoneType] = useState<"approved" | "note" | null>(null);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [selectedLook, setSelectedLook] = useState<string | null>(null);
  const [logoSkipped, setLogoSkipped] = useState(false);

  // Initialize selectedLook from client data
  useEffect(() => {
    if (client?.selectedLook) setSelectedLook(client.selectedLook);
  }, [client?.selectedLook]);

  useEffect(() => {
    fetch(`/api/profile/${id}`)
      .then((r) => r.json())
      .then((data) => { setClient(data.client || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const [siteHtml, setSiteHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch site preview when look changes
  useEffect(() => {
    if (!client || !selectedLook) return;
    setPreviewLoading(true);
    fetch(`/api/site/generate?clientId=${client.id}&lookKey=${selectedLook}`)
      .then((r) => r.text())
      .then((html) => { setSiteHtml(html); setPreviewLoading(false); })
      .catch(() => setPreviewLoading(false));
  }, [client?.id, selectedLook]);

  const allChecked = checks.every(Boolean);
  const lookSelected = selectedLook !== null;
  const logoResolved = client?.hasLogo || logoSkipped;
  const canApprove = allChecked && lookSelected && logoResolved;

  async function handleApprove() {
    if (!canApprove) return;
    setSubmitting(true);
    await fetch(`/api/profile/approve/${id}`, { method: "POST" });
    setDoneType("approved");
    setSubmitting(false);
  }

  async function handleRevision() {
    if (!note.trim()) return;
    setSubmitting(true);
    await fetch(`/api/profile/revision/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setDoneType("note");
    setSubmitting(false);
  }

  function toggleCheck(i: number) {
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #0d1a2e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b" }}>Tear sheet not found.</p>
      </div>
    );
  }

  if (doneType) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 4, background: "#F5C842" }} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#0d1a2e", margin: "0 auto 20px", fontWeight: 700 }}>✓</div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#0d1a2e", margin: "0 0 12px" }}>
              {doneType === "approved" ? "Direction Approved" : "Note Received"}
            </h1>
            <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6 }}>
              {doneType === "approved"
                ? "Your rep has been notified. We'll be in touch shortly."
                : "Note received — your rep will review and follow up."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeLook = selectedLook || client.selectedLook || "professional";
  const look = LOOK_STYLES[activeLook];
  const sbr = client.sbrData as Record<string, unknown> | null;
  const services = client.intakeAnswers?.q3?.split(",").map((s: string) => s.trim()) || [];
  const tagline = (sbr?.suggestedTagline as string) || (sbr?.geoCopyBlock as string) || "";
  const cta = client.intakeAnswers?.q4 || "Contact Us";
  const isTearSheet = client.stage === "tear-sheet";
  const encodedName = encodeURIComponent(client.business_name);

  // Progress bar logic
  const currentPortalIdx = PORTAL_STAGES.indexOf(client.stage as PipelineStage);
  const effectiveIdx = currentPortalIdx >= 0 ? currentPortalIdx : 0;
  const stageLabels = ["Direction", "Building", "QA", "Delivery", "Live"];

  const checkLabels = [
    "My business name is correct",
    "My phone number is correct",
    "My services listed are accurate",
    `My call-to-action button says what I want ("${cta}")`,
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column" }}>
      {/* Gold top bar */}
      <div style={{ height: 4, background: "#F5C842", flexShrink: 0 }} />

      {/* Nav header */}
      <header style={{ padding: "12px 32px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/marketing" style={{ fontSize: 12, color: "#94a3b8", textDecoration: "none" }}>← BVM Design Center</a>
      </header>

      {/* Rep Login — fixed bottom right */}
      <a href="/login" style={{ position: "fixed", bottom: 16, right: 16, zIndex: 40, fontSize: 11, color: "#94a3b8", opacity: 0.4, textDecoration: "none" }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; }}
      >
        Rep Login →
      </a>

      {/* Progress Node Bar */}
      <section style={{ padding: "40px 40px 0", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {PORTAL_STAGES.map((stage, i) => {
            const isCompleted = i < effectiveIdx;
            const isCurrent = i === effectiveIdx;
            const isLast = i === PORTAL_STAGES.length - 1;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
                {/* Node */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  <div
                    style={{
                      width: isCurrent ? 28 : 20,
                      height: isCurrent ? 28 : 20,
                      borderRadius: "50%",
                      background: isCompleted || isCurrent ? "#F5C842" : "#e2e8f0",
                      border: isCurrent ? "3px solid #F5C842" : "none",
                      boxShadow: isCurrent ? "0 0 0 6px rgba(245,200,66,0.25)" : "none",
                      animation: isCurrent ? "pulse 2s infinite" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s",
                    }}
                  >
                    {isCompleted && (
                      <span style={{ fontSize: 11, color: "#0d1a2e", fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                  <span
                    style={{
                      position: "absolute",
                      top: "100%",
                      marginTop: 8,
                      fontSize: 11,
                      fontWeight: isCurrent ? 700 : 400,
                      color: isCurrent ? "#0d1a2e" : isCompleted ? "#0d1a2e" : "#94a3b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stageLabels[i]}
                  </span>
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      background: isCompleted ? "#F5C842" : "#e2e8f0",
                      marginLeft: 4,
                      marginRight: 4,
                      borderRadius: 2,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Status message */}
        <div style={{ textAlign: "center", marginTop: 48, marginBottom: 8 }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#0d1a2e", margin: 0 }}>
            {STAGE_STATUS[client.stage] || "Processing..."}
          </p>
          {client.stage === "live" && client.published_url && (
            <a
              href={client.published_url}
              target="_blank"
              style={{
                display: "inline-block",
                marginTop: 16,
                background: "#F5C842",
                color: "#0d1a2e",
                padding: "14px 36px",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Visit Your Website →
            </a>
          )}
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: 900, margin: "32px auto 0", width: "100%", padding: "0 40px" }}>
        <div style={{ height: 1, background: "#e2e8f0" }} />
      </div>

      {/* Tear Sheet Preview — scrollable content */}
      <section style={{ flex: 1, overflowY: "auto" }}>
        {/* Cinematic Hero */}
        <div style={{
          width: "100%",
          minHeight: 420,
          position: "relative",
          background: "radial-gradient(ellipse at center, #1a2740 0%, #0d1a2e 70%)",
          marginTop: 32,
        }}>
          {/* Gold bar at top of hero */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#F5C842" }} />
          {/* Faint grid pattern overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(245,200,66,0.03) 0px, rgba(245,200,66,0.03) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, rgba(245,200,66,0.03) 0px, rgba(245,200,66,0.03) 1px, transparent 1px, transparent 60px)",
              pointerEvents: "none",
            }}
          />
          {/* Center content */}
          <div style={{ textAlign: "center", padding: "80px 40px", position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#F5C842", margin: "0 0 16px" }}>CAMPAIGN DIRECTION</p>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 64, fontWeight: 900, color: "#ffffff", margin: 0, lineHeight: 1.0 }}>
              {client.business_name}
            </h2>
            {tagline && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: "#ffffff", opacity: 0.65, marginTop: 12, maxWidth: 600, margin: "12px auto 0" }}>{tagline}</p>
            )}
            <div style={{ height: 2, width: 60, background: "#F5C842", margin: "20px auto" }} />
            <p style={{ fontSize: 13, color: "#F5C842", margin: 0 }}>{client.city}, {client.zip}</p>
            {selectedLook && (
              <span style={{ display: "inline-block", marginTop: 16, fontSize: 10, padding: "4px 14px", borderRadius: 9999, background: look.accent, color: look.text, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {selectedLook.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* Real Site Preview */}
        <div style={{ maxWidth: 900, margin: "32px auto 0", padding: "0 40px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 20, textAlign: "center" }}>
            Your site preview — select a look to see how it feels
          </p>

          {previewLoading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ width: 28, height: 28, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>Loading preview...</p>
            </div>
          ) : siteHtml ? (
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start" }}>
              {/* Laptop frame */}
              <div>
                <div style={{ background: "#374151", borderRadius: "12px 12px 0 0", padding: "8px 12px 0" }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  </div>
                  <div style={{ background: "#fff", borderRadius: "4px 4px 0 0", width: 520, height: 340, overflow: "hidden", position: "relative" }}>
                    <iframe
                      srcDoc={siteHtml}
                      style={{ width: 1300, height: 850, border: "none", transform: "scale(0.4)", transformOrigin: "top left", pointerEvents: "none" }}
                      title="Laptop preview"
                    />
                  </div>
                </div>
                <div style={{ background: "#4b5563", height: 16, borderRadius: "0 0 4px 4px" }} />
                <div style={{ background: "#6b7280", height: 6, width: "70%", margin: "0 auto", borderRadius: "0 0 8px 8px" }} />
                <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>Desktop</p>
              </div>

              {/* Mobile frame */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ background: "#374151", borderRadius: 20, padding: 8, width: 156 }}>
                  <div style={{ width: 30, height: 4, background: "#4b5563", borderRadius: 2, margin: "0 auto 6px" }} />
                  <div style={{ background: "#fff", borderRadius: 12, width: 140, height: 248, overflow: "hidden", position: "relative" }}>
                    <iframe
                      srcDoc={siteHtml}
                      style={{ width: 375, height: 667, border: "none", transform: "scale(0.373)", transformOrigin: "top left", pointerEvents: "none" }}
                      title="Mobile preview"
                    />
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #4b5563", margin: "6px auto 2px" }} />
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>Mobile</p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>
              Select a look below to see your site preview
            </div>
          )}
          {siteHtml && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <a
                href={`/api/site/generate?clientId=${client.id}&lookKey=${selectedLook || client.selectedLook || "warm_bold"}`}
                target="_blank"
                style={{ fontSize: 13, color: "#F5C842", fontWeight: 600, textDecoration: "none" }}
              >
                View Full Size →
              </a>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Opens your full site preview in a new tab</p>
            </div>
          )}
        </div>

        {/* Look Selector — only for tear-sheet */}
        {isTearSheet && (
          <div style={{ maxWidth: 900, margin: "32px auto 0", padding: "0 40px" }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 16, textAlign: "center" }}>Choose Your Campaign Direction</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { id: "warm_bold", label: "Warm & Bold", accent: "#c2692a", desc: "Rustic, high energy — built for food and hospitality" },
                { id: "professional", label: "Clean & Professional", accent: "#185fa5", desc: "Trustworthy and modern — perfect for healthcare, dental, legal" },
                { id: "bold_modern", label: "Bold & Modern", accent: "#7c3aed", desc: "Contemporary and strong — great for home services and construction" },
              ].map((l) => {
                const isSelected = selectedLook === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLook(l.id)}
                    style={{
                      background: isSelected ? "#fffbeb" : "#fff",
                      border: isSelected ? "2px solid #F5C842" : "2px solid #e2e8f0",
                      borderRadius: 16, padding: 0, cursor: "pointer",
                      textAlign: "left", position: "relative", transition: "all 0.2s",
                      overflow: "hidden",
                      boxShadow: isSelected ? "0 4px 20px rgba(245,200,66,0.3)" : "none",
                      transform: isSelected ? "scale(1.03)" : "scale(1)",
                    }}
                  >
                    <div style={{ height: 6, background: l.accent }} />
                    <div style={{ padding: "20px 16px" }}>
                      {isSelected && (
                        <span style={{ position: "absolute", top: 16, right: 12, width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0d1a2e" }}>✓</span>
                      )}
                      <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: "#0d1a2e", margin: "0 0 4px" }}>{l.label}</p>
                      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{l.desc}</p>
                      <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                        {LOOK_STYLES[l.id] && (
                          <>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: LOOK_STYLES[l.id].bg }} />
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: LOOK_STYLES[l.id].accent }} />
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Logo Section — only if hasLogo is false AND tear-sheet */}
        {!client.hasLogo && isTearSheet && (
          <div style={{ maxWidth: 600, margin: "32px auto 0", padding: "0 40px" }}>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "24px 24px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#92400e", margin: "0 0 8px" }}>We&apos;ll need your logo for the final build.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                <div style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: "20px 12px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", margin: "0 0 8px" }}>Upload Logo</p>
                  <label style={{ display: "inline-block", color: "#F5C842", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Browse files
                    <input type="file" accept=".png,.jpg,.jpeg" style={{ display: "none" }} />
                  </label>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "20px 12px", textAlign: "center" }}>
                  <a
                    href={`https://bvm-studio-app.vercel.app/studio-v2/brand?name=${encodedName}&mode=logo`}
                    target="_blank"
                    style={{ fontSize: 13, fontWeight: 700, color: "#F5C842", textDecoration: "none", display: "block", marginBottom: 4 }}
                  >
                    Generate a Logo →
                  </a>
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>After generating, download and upload it here.</p>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer", fontSize: 13, color: "#78716c" }}>
                <input type="checkbox" checked={logoSkipped} onChange={() => setLogoSkipped(!logoSkipped)} style={{ accentColor: "#F5C842" }} />
                I&apos;ll provide my logo later
              </label>
            </div>
          </div>
        )}

        {/* Custom Enhancement */}
        {isTearSheet && (
          <div style={{ maxWidth: 600, margin: "32px auto 0", padding: "0 40px" }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
              <p style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", margin: "0 0 4px" }}>Want to go beyond the template?</p>
              <a
                href={`mailto:therrera@bestversionmedia.com?subject=${encodeURIComponent(`Custom Enhancement for ${client.business_name}`)}`}
                style={{ fontSize: 13, color: "#F5C842", fontWeight: 600, textDecoration: "none" }}
              >
                Ask about Custom Enhancement →
              </a>
            </div>
          </div>
        )}

        {/* Checklist + Approval — only for tear-sheet stage */}
        {isTearSheet && (
          <div style={{ maxWidth: 600, margin: "32px auto 0", padding: "0 40px" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px 28px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0d1a2e", margin: "0 0 16px" }}>Before you approve, please confirm:</h3>
              {checkLabels.map((label, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", fontSize: 14, color: "#475569" }}>
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() => toggleCheck(i)}
                    style={{ width: 18, height: 18, accentColor: "#F5C842", cursor: "pointer" }}
                  />
                  {label}
                </label>
              ))}
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>Need to change something? Use the note field below.</p>
            </div>
          </div>
        )}

        {/* Spacer before sticky bar */}
        <div style={{ height: isTearSheet ? 100 : 40 }} />
      </section>

      {/* Sticky Approval Bar — only for tear-sheet stage */}
      {isTearSheet && (
        <div style={{ position: "sticky", bottom: 0, background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "16px 32px", zIndex: 50, boxShadow: "0 -4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            {/* Download Tear Sheet — left side */}
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`/api/site/generate?clientId=${client.id}&lookKey=${selectedLook || client.selectedLook || "warm_bold"}`);
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
              style={{
                background: "#F5C842",
                color: "#0d1a2e",
                border: "none",
                padding: "14px 28px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Download Tear Sheet ↓
            </button>

            {/* Approve + note — right side */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button
                onClick={handleApprove}
                disabled={submitting || !canApprove}
                style={{
                  background: canApprove ? "#F5C842" : "#d1d5db",
                  color: canApprove ? "#0d1a2e" : "#9ca3af",
                  border: "none",
                  padding: "12px 32px",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: canApprove && !submitting ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}
              >
                {submitting ? "Submitting..." : "Approve This Direction →"}
              </button>
              {!showNote ? (
                <button onClick={() => setShowNote(true)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
                  Leave a note first
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flex: 1, maxWidth: 400 }}>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What would you like us to change?"
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#1a2740", resize: "none", outline: "none" }}
                    rows={2}
                  />
                  <button
                    onClick={handleRevision}
                    disabled={submitting || !note.trim()}
                    style={{ background: "#0d1a2e", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: submitting || !note.trim() ? "not-allowed" : "pointer", opacity: submitting || !note.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}
                  >
                    Submit with Note
                  </button>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, justifyContent: "center", marginTop: 8 }}>
            <span style={{ color: allChecked ? "#22c55e" : "#ef4444" }}>{allChecked ? "✓" : "✗"} Direction confirmed</span>
            <span style={{ color: lookSelected ? "#22c55e" : "#ef4444" }}>{lookSelected ? "✓" : "✗"} Look selected</span>
            <span style={{ color: logoResolved ? "#22c55e" : "#ef4444" }}>{logoResolved ? "✓" : "✗"} Logo {client?.hasLogo ? "provided" : logoSkipped ? "skipped" : "needed"}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ padding: "20px 32px", textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Questions? Contact your BVM rep</p>
      </footer>
    </div>
  );
}
