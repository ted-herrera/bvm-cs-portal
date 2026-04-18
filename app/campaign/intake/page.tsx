"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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

function fieldCount(f: CollectedFields): number {
  return Object.values(f).filter((v) => v !== null && v !== "").length;
}

export default function CampaignIntakePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<CollectedFields>(EMPTY_FIELDS);
  const [phase, setPhase] = useState<"chat" | "scanning" | "generating">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Initial Bruno greeting
  useEffect(() => {
    sendToBruno("", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            setTimeout(() => startGeneration(finalFields as CollectedFields), 800);
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

  async function startGeneration(finalFields: CollectedFields) {
    setPhase("scanning");

    // Fire SBR scan
    let sbrData = null;
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
      sbrData = await sbrRes.json();
    } catch (e) {
      console.error("SBR error:", e);
    }

    setPhase("generating");

    // Fire image generation
    let directions = null;
    try {
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
          sbrData,
        }),
      });
      const imgData = await imgRes.json();
      directions = imgData.directions;
    } catch (e) {
      console.error("Image gen error:", e);
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
          tagline: finalFields.tagline,
          stage: "tearsheet",
          sbr_data: sbrData,
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
  if (phase !== "chat") {
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

  const progress = fieldCount(fields);

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

          {/* Input */}
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
            { label: "Tagline", value: fields.tagline },
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
        </div>
      </div>
    </div>
  );
}
