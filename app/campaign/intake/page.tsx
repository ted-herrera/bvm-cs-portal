"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CAMPAIGN_BRUNO_PROMPT } from "@/lib/campaign";

interface CollectedFields {
  businessName: string | null;
  category: string | null;
  city: string | null;
  zip: string | null;
  services: string | null;
  adSize: string | null;
  tagline: string | null;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  pills?: string[];
}

const EMPTY_FIELDS: CollectedFields = {
  businessName: null,
  category: null,
  city: null,
  zip: null,
  services: null,
  adSize: null,
  tagline: null,
};

function coreFieldCount(f: CollectedFields): number {
  // Count only the 6 core fields (not tagline — handled separately)
  return [f.businessName, f.category, f.city, f.zip, f.services, f.adSize].filter(
    (v) => v !== null && v !== ""
  ).length;
}

function allFieldCount(f: CollectedFields): number {
  return Object.values(f).filter((v) => v !== null && v !== "").length;
}

function getRepIdFromCookie(): string {
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const parts = cookie.trim().split("=");
      const key = parts[0];
      const value = parts.slice(1).join("=");
      if (key === "campaign_user") {
        const parsed = JSON.parse(decodeURIComponent(value));
        return parsed.username || "unassigned";
      }
    }
    // fallback to dc_session for Design Center reps
    for (const cookie of cookies) {
      const parts = cookie.trim().split("=");
      const key = parts[0];
      const value = parts.slice(1).join("=");
      if (key === "dc_session") {
        const parsed = JSON.parse(atob(decodeURIComponent(value)));
        return parsed.username || "unassigned";
      }
    }
  } catch { /* */ }
  return "unassigned";
}

function getRepNameFromCookie(): string {
  try {
    const match = document.cookie.match(/dc_session=([^;]+)/);
    if (!match) return "Rep";
    const [encoded] = match[1].split(".");
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    return payload.name || "Rep";
  } catch {
    return "Rep";
  }
}

function CampaignIntakeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<CollectedFields>(EMPTY_FIELDS);
  const [phase, setPhase] = useState<"chat" | "tagline" | "scanning" | "generating">("chat");
  const [taglineOptions, setTaglineOptions] = useState<string[]>([]);
  const [selectedTagline, setSelectedTagline] = useState<string | null>(null);
  const [sbrData, setSbrData] = useState<Record<string, unknown> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Pre-fill from URL params (e.g. from Close CRM "Start Campaign" button)
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    const bn = searchParams.get("businessName");
    if (bn) {
      prefilled.current = true;
      const adType = searchParams.get("adType") || null;
      setFields((prev) => ({ ...prev, businessName: bn, adSize: adType }));
      // Send Bruno an opening message with context
      const msg = `I'm starting a campaign for ${bn}. They're an existing BVM client${adType ? ` with a ${adType} agreement` : ""}.`;
      sendToBruno(msg);
      return;
    }
    // Normal init
    sendToBruno("", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function sendToBruno(userMsg: string, isInit = false) {
    if (!isInit && !userMsg.trim()) return;

    const newMessages = isInit
      ? messages
      : [...messages, { role: "user" as const, text: userMsg }];
    if (!isInit) setMessages(newMessages);
    setLoading(true);

    const apiMessages = isInit
      ? [{ role: "user", content: "Hi, I'd like to set up a print ad campaign." }]
      : newMessages.map((m) => ({ role: m.role, content: m.text }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: CAMPAIGN_BRUNO_PROMPT,
          messages: apiMessages,
          collectedFields: fields,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      if (data.response) {
        let parsed: {
          brunoMessage?: string;
          collectedFields?: CollectedFields;
          pills?: string[];
          complete?: boolean;
          action?: string;
        } | null = null;

        try {
          const cleaned = data.response.replace(/```json\n?|```\n?/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          // If not JSON, treat as plain text
          parsed = { brunoMessage: data.response };
        }

        if (parsed) {
          const brunoText = parsed.brunoMessage || data.response;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: brunoText, pills: parsed!.pills || undefined },
          ]);

          if (parsed.collectedFields) {
            setFields((prev) => {
              const merged = { ...prev };
              for (const [k, v] of Object.entries(parsed!.collectedFields!)) {
                if (v !== null && v !== "") {
                  merged[k as keyof CollectedFields] = v as string;
                }
              }
              return merged;
            });
          }

          if (parsed.complete || parsed.action === "complete") {
            const finalFields = {
              ...fields,
              ...(parsed.collectedFields || {}),
            };
            // If tagline already collected by Bruno, go straight to generation
            if (finalFields.tagline) {
              setTimeout(() => startGeneration(finalFields as CollectedFields), 800);
            } else {
              // Enter tagline selection phase
              setTimeout(() => startTaglinePhase(finalFields as CollectedFields), 800);
            }
          }
        }
      }
    } catch (e) {
      console.error("Bruno error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I hit a snag. Could you try that again?" },
      ]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  async function startTaglinePhase(finalFields: CollectedFields) {
    setFields(finalFields);
    setPhase("tagline");

    // Add Bruno message about taglines
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: "Last thing — here are 3 tagline options for your campaign. Pick one you like, or skip and we can update it later.",
      },
    ]);

    // Fire SBR to get market data for generating smart taglines
    let sbr = null;
    try {
      const sbrRes = await fetch("/api/campaign/sbr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: finalFields.businessName,
          city: finalFields.city,
          zip: finalFields.zip,
          category: finalFields.category,
        }),
      });
      sbr = await sbrRes.json();
      setSbrData(sbr);
    } catch (e) {
      console.error("SBR error for taglines:", e);
    }

    // Generate taglines via Claude
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You generate punchy, local, specific taglines for local business print ad campaigns. Return ONLY a JSON array of exactly 3 strings. No preamble, no markdown. Each tagline should be:
- Under 10 words
- Specific to the business category and city
- Punchy and memorable — not generic
- Feel local and authentic

${sbr?.marketBrief ? `Market insight: ${sbr.marketBrief}` : ""}
${sbr?.localAdvantage ? `Local advantage: ${sbr.localAdvantage}` : ""}`,
          messages: [
            {
              role: "user",
              content: `Generate 3 taglines for "${finalFields.businessName}" — a ${finalFields.category} business in ${finalFields.city}. Their main offer: ${finalFields.services}.`,
            },
          ],
          temperature: 0.9,
        }),
      });
      const data = await res.json();
      if (data.response) {
        const cleaned = data.response.replace(/```json\n?|```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          setTaglineOptions(parsed.slice(0, 3));
        }
      }
    } catch (e) {
      console.error("Tagline generation error:", e);
      // Fallback taglines
      setTaglineOptions([
        `${finalFields.city}'s best-kept secret.`,
        `Where ${finalFields.city} comes first.`,
        `Built for this neighborhood.`,
      ]);
    }
  }

  function selectTagline(tagline: string) {
    setSelectedTagline(tagline);
    setFields((prev) => ({ ...prev, tagline }));
  }

  function confirmTagline() {
    const finalFields = { ...fields, tagline: selectedTagline };
    setMessages((prev) => [
      ...prev,
      { role: "user", text: selectedTagline || "Skip tagline" },
      { role: "assistant", text: selectedTagline ? "Great choice — let's build your campaign." : "No problem — your rep can add a tagline later. Let's build your campaign." },
    ]);
    setTimeout(() => startGeneration(finalFields as CollectedFields), 600);
  }

  function skipTagline() {
    const finalFields = { ...fields, tagline: null };
    setMessages((prev) => [
      ...prev,
      { role: "user", text: "Skip for now" },
      { role: "assistant", text: "No problem — your rep can add a tagline later. Let's build your campaign." },
    ]);
    setTimeout(() => startGeneration(finalFields as CollectedFields), 600);
  }

  async function startGeneration(finalFields: CollectedFields) {
    setPhase("scanning");

    // Fire SBR scan (if we don't already have it from tagline phase)
    let sbr = sbrData;
    if (!sbr) {
      try {
        const sbrRes = await fetch("/api/campaign/sbr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: finalFields.businessName,
            city: finalFields.city,
            zip: finalFields.zip,
            category: finalFields.category,
          }),
        });
        sbr = await sbrRes.json();
      } catch (e) {
        console.error("SBR error:", e);
      }
    }

    setPhase("generating");

    // Fire image generation
    let directions = null;
    try {
      console.log("[intake] Calling generate-image API...");
      const imgRes = await fetch("/api/campaign/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: finalFields.businessName,
          category: finalFields.category,
          city: finalFields.city,
          services: finalFields.services,
          adSize: finalFields.adSize,
          tagline: finalFields.tagline,
          sbrData: sbr,
        }),
      });
      const imgData = await imgRes.json();
      console.log("[intake] generate-image response:", imgData.error || `${(imgData.directions || []).length} directions`);
      if (imgData.directions) {
        directions = imgData.directions;
      } else {
        console.error("[intake] No directions in response:", imgData);
      }
    } catch (e) {
      console.error("[intake] Image gen error:", e);
    }
    // Fallback if generation failed
    if (!directions || directions.length === 0) {
      directions = [
        { name: "Bold & Direct", imageUrl: "https://placehold.co/1024x1024/1B2A4A/F5C842?text=Bold+%26+Direct", description: "Bold, high-contrast design with strong typography.", prompt: "" },
        { name: "Warm & Local", imageUrl: "https://placehold.co/1024x1024/2C3E2D/F5F0E8?text=Warm+%26+Local", description: "Warm, inviting community feel.", prompt: "" },
        { name: "Premium & Polished", imageUrl: "https://placehold.co/1024x1024/C8922A/FFFFFF?text=Premium+%26+Polished", description: "Upscale, sophisticated design.", prompt: "" },
      ];
    }

    // Save to Supabase
    const clientId = crypto.randomUUID();
    try {
      const sb = await import("@/lib/supabase").then((m) => m.getSupabase());
      if (sb) {
        await sb.from("campaign_clients").insert({
          id: clientId,
          business_name: finalFields.businessName,
          category: finalFields.category,
          city: finalFields.city,
          zip: finalFields.zip,
          services: finalFields.services,
          ad_size: finalFields.adSize,
          rep_id: getRepIdFromCookie(),
          tagline: finalFields.tagline,
          stage: "tearsheet",
          sbr_data: sbr,
          generated_directions: directions,
          revisions: [],
        });
      }
    } catch (e) {
      console.error("Supabase save error:", e);
    }

    router.push(`/campaign/tearsheet/${clientId}`);
  }

  function handlePillClick(pill: string) {
    setInput("");
    sendToBruno(pill);
  }

  // Loading / generation phase overlay
  if (phase === "scanning" || phase === "generating") {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
        <div style={{ width: 48, height: 48, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#fff", margin: 0 }}>
          {phase === "scanning" ? "Bruno is scanning your market..." : "Generating your campaign directions..."}
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>
          {phase === "scanning" ? "Analyzing demographics, competitors, and opportunities" : "Creating 3 unique ad directions with AI"}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const progress = coreFieldCount(fields);

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Top bar */}
      <div style={{ height: 56, background: "#2d3e50", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F5C842", fontFamily: "'Playfair Display', serif" }}>Print Campaign Intake</span>
        </div>
      </div>

      {/* Two column layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT — Bruno Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 12px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
                {m.role === "assistant" && (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 11, flexShrink: 0 }}>B</div>
                )}
                <div style={{ maxWidth: "75%" }}>
                  <div style={{
                    background: m.role === "user" ? "#F5C842" : "rgba(255,255,255,0.08)",
                    color: m.role === "user" ? "#1B2A4A" : "#fff",
                    padding: "10px 16px",
                    borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}>
                    {m.text}
                  </div>
                  {m.pills && m.pills.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {m.pills.map((pill, pi) => (
                        <button
                          key={pi}
                          onClick={() => handlePillClick(pill)}
                          style={{
                            background: "rgba(245,200,66,0.15)",
                            border: "1px solid rgba(245,200,66,0.4)",
                            color: "#F5C842",
                            borderRadius: 20,
                            padding: "6px 16px",
                            fontSize: 13,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16, animation: "fadeIn 0.3s ease" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 11, flexShrink: 0 }}>B</div>
                <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 16px", borderRadius: "16px 16px 16px 4px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842", animation: "pulse 1s ease infinite" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842", animation: "pulse 1s ease infinite 0.2s" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842", animation: "pulse 1s ease infinite 0.4s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input — hidden during tagline phase */}
          {phase === "chat" && (
            <div style={{ padding: "12px 24px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !loading) { sendToBruno(input); setInput(""); } }}
                  placeholder="Type your answer..."
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    fontSize: 14,
                    color: "#fff",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => { if (!loading) { sendToBruno(input); setInput(""); } }}
                  disabled={loading || !input.trim()}
                  style={{
                    background: "#F5C842",
                    color: "#1B2A4A",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 20px",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading || !input.trim() ? 0.5 : 1,
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Brief Preview */}
        <div style={{ width: 420, background: "rgba(255,255,255,0.03)", padding: 32, overflowY: "auto" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#F5C842", margin: "0 0 8px" }}>
            Campaign Brief
          </h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 24px" }}>
            Building as we talk — {progress} of 6 fields collected
          </p>

          {/* Progress bar */}
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginBottom: 32 }}>
            <div style={{ height: "100%", width: `${(progress / 6) * 100}%`, background: "#F5C842", borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>

          {/* Brief fields */}
          {[
            { label: "Business Name", value: fields.businessName },
            { label: "Category", value: fields.category },
            { label: "Location", value: fields.city && fields.zip ? `${fields.city}, ${fields.zip}` : fields.city || fields.zip },
            { label: "Primary Offer", value: fields.services },
            { label: "Ad Size", value: fields.adSize },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                {f.label}
              </div>
              {f.value ? (
                <div style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>{f.value}</div>
              ) : (
                <div style={{ height: 20, background: "rgba(255,255,255,0.06)", borderRadius: 4, width: "70%" }} />
              )}
            </div>
          ))}

          {/* Tagline section — shows cards during tagline phase */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              Tagline
            </div>
            {phase === "tagline" ? (
              <div style={{ marginTop: 8 }}>
                {taglineOptions.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ height: 56, background: "rgba(255,255,255,0.06)", borderRadius: 10, animation: "pulse 1.5s ease infinite" }} />
                    ))}
                  </div>
                ) : (
                  <>
                    {taglineOptions.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => selectTagline(t)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          background: selectedTagline === t ? "rgba(245,200,66,0.12)" : "rgba(255,255,255,0.04)",
                          border: selectedTagline === t ? "2px solid #F5C842" : "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 10,
                          padding: "14px 16px",
                          marginBottom: 8,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          animation: `fadeIn 0.4s ease ${i * 0.1}s both`,
                        }}
                      >
                        <div style={{ fontSize: 14, color: selectedTagline === t ? "#F5C842" : "#fff", fontWeight: 600, fontStyle: "italic" }}>
                          &ldquo;{t}&rdquo;
                        </div>
                      </button>
                    ))}

                    {/* Confirm button */}
                    {selectedTagline && (
                      <button
                        onClick={confirmTagline}
                        style={{
                          width: "100%",
                          background: "#F5C842",
                          color: "#1B2A4A",
                          border: "none",
                          borderRadius: 8,
                          padding: "12px 16px",
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: "pointer",
                          marginTop: 4,
                          animation: "fadeIn 0.3s ease",
                        }}
                      >
                        Use This Tagline →
                      </button>
                    )}

                    {/* Skip button */}
                    <button
                      onClick={skipTagline}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.35)",
                        fontSize: 13,
                        cursor: "pointer",
                        marginTop: 8,
                        padding: "8px 0",
                        fontWeight: 600,
                      }}
                    >
                      Skip for now →
                    </button>
                  </>
                )}
              </div>
            ) : fields.tagline ? (
              <div style={{ fontSize: 15, color: "#fff", fontWeight: 600, fontStyle: "italic" }}>&ldquo;{fields.tagline}&rdquo;</div>
            ) : (
              <div style={{ height: 20, background: "rgba(255,255,255,0.06)", borderRadius: 4, width: "70%" }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignIntakePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <CampaignIntakeInner />
    </Suspense>
  );
}
