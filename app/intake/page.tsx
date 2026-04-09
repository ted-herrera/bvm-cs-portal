"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopNav from "@/components/TopNav";

interface Msg {
  role: "bruno" | "user";
  text: string;
  cards?: { label: string; value: string; desc: string; accent: string }[];
}

interface IntakeFields {
  bizName: string;
  city: string;
  zip: string;
  desc: string;
  services: string[];
  cta: string;
  look: string;
  tagline: string;
}

const LOOK_OPTIONS = [
  { id: "warm_bold", label: "Local", accent: "#c2692a", desc: "Clean & Classic" },
  { id: "professional", label: "Community", accent: "#185fa5", desc: "Professional & Trusted" },
  { id: "bold_modern", label: "Premier", accent: "#F5C842", desc: "Bold & Premium" },
];

const SYSTEM_PROMPT = `You are Bruno, an intake assistant for BVM Design Center. Your job is to collect exactly 6 pieces of information to build a local business website. Be conversational, warm, and natural — exactly like talking to a smart friend.

The 6 things you need:
1. Business name
2. City and ZIP code
3. What the business does
4. 2-3 services they offer
5. Their call to action (Order Now, Book Now, Call Us, etc)
6. Their preferred look — show as 3 clickable cards: Local, Community, Premier

Rules:
1. Never break flow no matter what they type — handle anything gracefully and come back
2. Collect all 6 naturally in any order however the conversation goes
3. Once you have all 6 confirm everything in one summary then POST to /api/intake/create
4. Never ask rigid scripted questions — just have a conversation and extract what you need

CRITICAL: You must ALWAYS end every response with a JSON block on its own line in this exact format:
###FIELDS###
{"bizName":"","city":"","zip":"","desc":"","services":[],"cta":"","look":"","tagline":"","complete":false}
###END###

Fill in whatever fields you've collected so far from the conversation. Leave uncollected fields as empty strings or empty arrays. Set "complete" to true ONLY when all 6 items are confirmed by the user in a summary.

For "look", use one of: "warm_bold", "professional", "bold_modern" (or empty if not chosen yet).
For "cta", use title case like "Order Now", "Book Now", "Call Us".
For "tagline", generate a short catchy tagline based on what you know about the business.

When you're ready to show the look options, mention all three: Local (clean & classic), Community (professional & trusted), Premier (bold & premium). The UI will render them as clickable cards automatically when look hasn't been chosen yet and you mention them.

When you have all 6 and the user confirms your summary, set complete to true.`;

function parseResponse(raw: string): { text: string; fields: Partial<IntakeFields> & { complete?: boolean } } {
  const marker = "###FIELDS###";
  const endMarker = "###END###";
  const markerIdx = raw.indexOf(marker);
  if (markerIdx === -1) return { text: raw.trim(), fields: {} };

  const text = raw.substring(0, markerIdx).trim();
  const jsonStr = raw.substring(markerIdx + marker.length, raw.indexOf(endMarker)).trim();
  try {
    const fields = JSON.parse(jsonStr);
    return { text, fields };
  } catch {
    return { text, fields: {} };
  }
}

function IntakeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isMagic = params.get("magic") === "true";

  const [chat, setChat] = useState<Msg[]>([{
    role: "bruno",
    text: isMagic
      ? "Hey — your rep set up this link for you. Tell me about the business! What's the name, what do they do, where are they?"
      : "Hey — I'm Bruno! Tell me about the business. What's the name, what do they do, where are they located?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  const [fields, setFields] = useState<IntakeFields>({
    bizName: "", city: "", zip: "", desc: "",
    services: [], cta: "", look: "", tagline: "",
  });

  const [previewHtml, setPreviewHtml] = useState("");
  const [sbrData, setSbrData] = useState<Record<string, unknown> | null>(null);

  const historyRef = useRef<{ role: string; content: string }[]>([{
    role: "assistant",
    content: isMagic
      ? "Hey — your rep set up this link for you. Tell me about the business! What's the name, what do they do, where are they?"
      : "Hey — I'm Bruno! Tell me about the business. What's the name, what do they do, where are they located?",
  }]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const sbrFiredRef = useRef(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // Live preview update
  useEffect(() => {
    if (!fields.look || !fields.bizName) return;
    fetch("/api/site/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "preview", lookKey: fields.look,
        profileData: {
          business_name: fields.bizName, city: fields.city, zip: fields.zip, phone: "",
          intakeAnswers: {
            q1: `${fields.bizName}, ${fields.city} ${fields.zip}`,
            q2: fields.desc, q3: fields.services.join(", "),
            q4: fields.cta, q5: fields.look,
          },
          sbrData: sbrData || undefined,
        },
      }),
    }).then((r) => r.json()).then((d) => setPreviewHtml(d.html || "")).catch(() => {});
  }, [fields.look, fields.bizName, fields.city, fields.zip, fields.desc, fields.services, fields.cta, sbrData]);

  // Fire SBR once we have name + city + zip
  useEffect(() => {
    if (sbrFiredRef.current || !fields.bizName || !fields.city || !fields.zip) return;
    sbrFiredRef.current = true;
    fetch("/api/sbr/run", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessType: fields.desc || "business", zip: fields.zip, city: fields.city, businessName: fields.bizName }),
    }).then((r) => r.json()).then((data) => {
      setSbrData(data.sbrData || data);
    }).catch(() => {});
  }, [fields.bizName, fields.city, fields.zip, fields.desc]);

  function addMsg(role: "bruno" | "user", text: string, cards?: Msg["cards"]) {
    setChat((p) => [...p, { role, text, cards }]);
  }

  async function handleSend(override?: string) {
    const ans = (override || input).trim();
    if (!ans || loading || finished) return;
    setInput("");
    addMsg("user", ans);
    setLoading(true);

    historyRef.current.push({ role: "user", content: ans });

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: historyRef.current,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const raw = data.response || data.content?.[0]?.text || "";
      const { text, fields: newFields } = parseResponse(raw);

      // Update fields with whatever Bruno extracted
      setFields((prev) => {
        const updated = { ...prev };
        if (newFields.bizName) updated.bizName = newFields.bizName;
        if (newFields.city) updated.city = newFields.city;
        if (newFields.zip) updated.zip = newFields.zip;
        if (newFields.desc) updated.desc = newFields.desc;
        if (newFields.services && newFields.services.length > 0) updated.services = newFields.services;
        if (newFields.cta) updated.cta = newFields.cta;
        if (newFields.look) updated.look = newFields.look;
        if (newFields.tagline) updated.tagline = newFields.tagline;
        return updated;
      });

      // Show look cards if Bruno is asking about look and it hasn't been chosen yet
      const showLookCards = !newFields.look && !fields.look && /local|community|premier/i.test(text);
      const cards = showLookCards
        ? LOOK_OPTIONS.map((l) => ({ label: l.label, value: l.id, desc: l.desc, accent: l.accent }))
        : undefined;

      addMsg("bruno", text, cards);
      historyRef.current.push({ role: "assistant", content: raw });

      // Confetti for Premier
      if (newFields.look === "bold_modern") {
        import("canvas-confetti").then((mod) => mod.default({ particleCount: 120, spread: 80, colors: ["#F5C842", "#0d1a2e", "#ffffff"] }));
      }

      // If complete, fire the POST
      if (newFields.complete) {
        setFinished(true);
        await doFinish(newFields);
      }
    } catch {
      addMsg("bruno", "Sorry, had a hiccup. Say that again?");
    }

    setLoading(false);
  }

  async function doFinish(finalFields: Partial<IntakeFields>) {
    const f = { ...fields, ...finalFields };
    const slug = f.bizName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

    try {
      const res = await fetch("/api/intake/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeAnswers: {
            q1: `${f.bizName}, ${f.city} ${f.zip}`, q2: f.desc,
            q3: f.services.join(", "), q4: f.cta, q5: f.look,
            q6: "no", q7: "", q8: f.tagline, q9: `${slug}.com`,
          },
          sbrData: {
            ...(sbrData || {}), tagline: f.tagline, suggestedTagline: f.tagline,
            services: f.services.map((s) => ({ name: s, description: `${s} — proudly serving ${f.city}.` })),
          },
          rep: isMagic ? "magic-link" : "ted",
        }),
      });
      const data = await res.json();
      if (data.profile?.id) {
        await new Promise((r) => setTimeout(r, 600));
        router.push("/dashboard");
      }
    } catch { /* error */ }
  }

  // Demo mode
  async function runDemo() {
    const w = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const d = 600;
    addMsg("user", "Ted's Tacos, smash burgers and street tacos in Tulsa 74103");
    await w(d);
    setFields((p) => ({ ...p, bizName: "Ted's Tacos", city: "Tulsa", zip: "74103", desc: "smash burgers and street tacos" }));
    addMsg("bruno", "Love it — Ted's Tacos in Tulsa! Smash burgers and street tacos sounds amazing. What are the top 2-3 things you guys offer?");
    await w(d);
    addMsg("user", "Street Tacos, Catering, Late Night");
    await w(d);
    setFields((p) => ({ ...p, services: ["Street Tacos", "Catering", "Late Night"] }));
    addMsg("bruno", "Street Tacos, Catering, and Late Night — solid lineup. What should the main button on your site say? Something like \"Order Now\" or \"Call Us\"?");
    await w(d);
    addMsg("user", "Order Now");
    await w(d);
    setFields((p) => ({ ...p, cta: "Order Now" }));
    addMsg("bruno", "Order Now it is. Last thing — pick your site's vibe:", LOOK_OPTIONS.map((l) => ({ label: l.label, value: l.id, desc: l.desc, accent: l.accent })));
    await w(d);
    addMsg("user", "Premier");
    await w(d);
    setFields((p) => ({ ...p, look: "bold_modern", tagline: "Tulsa's Taco Revolution Starts Here" }));
    import("canvas-confetti").then((mod) => mod.default({ particleCount: 120, spread: 80, colors: ["#F5C842", "#0d1a2e", "#ffffff"] }));
    addMsg("bruno", "Premier — great taste! Here's what I've got:\n\n• Business: Ted's Tacos\n• Location: Tulsa, 74103\n• What you do: Smash burgers and street tacos\n• Services: Street Tacos, Catering, Late Night\n• Button: Order Now\n• Look: Premier\n\nCreating your profile now...");
    await w(1000);
    router.push("/dashboard");
  }

  // Check if we should show look cards (look not yet selected and no cards currently showing)
  const needsLook = !fields.look && !finished;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0d1a2e" }}>
      <TopNav activePage="intake" />
      <div style={{ display: "flex", flex: 1 }}>
        {/* Chat */}
        <div style={{ width: "50%", display: "flex", flexDirection: "column", borderRight: "1px solid #1e293b" }}>
          <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Bruno Intake</h2>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                {[
                  fields.bizName && "Name",
                  fields.city && "Location",
                  fields.desc && "Description",
                  fields.services.length > 0 && "Services",
                  fields.cta && "CTA",
                  fields.look && "Look",
                ].filter(Boolean).join(" · ") || "Getting started..."}
              </p>
            </div>
            <button onClick={runDemo} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Demo</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {chat.map((msg, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", borderRadius: 12, padding: "10px 16px", fontSize: 14,
                    whiteSpace: "pre-wrap", lineHeight: 1.6,
                    background: msg.role === "user" ? "#F5C842" : "#1a2740",
                    color: msg.role === "user" ? "#0d1a2e" : "#fff",
                    border: msg.role === "bruno" ? "1px solid #334155" : "none",
                  }}>
                    {msg.role === "bruno" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0d1a2e", fontSize: 11 }}>B</div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#F5C842" }}>Bruno</span>
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
                {/* Look option cards */}
                {msg.cards && needsLook && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12, paddingLeft: 32 }}>
                    {msg.cards.map((c) => (
                      <button key={c.value} onClick={() => handleSend(c.label)} style={{
                        background: "#1a2740", border: c.value === "bold_modern" ? "2px solid #F5C842" : "1px solid #334155",
                        borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left",
                      }}>
                        <div style={{ height: 4, background: c.accent, borderRadius: 2, marginBottom: 10 }} />
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{c.label}</p>
                        <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{c.desc}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 32 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842", animation: "pulse 1s infinite" }} />
                <span style={{ fontSize: 12, color: "#64748b" }}>Bruno is thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {!finished && (
            <div style={{ borderTop: "1px solid #1e293b", padding: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type your answer..." style={{ flex: 1, borderRadius: 8, border: "1px solid #334155", background: "#1a2740", padding: "10px 16px", fontSize: 14, color: "#fff", outline: "none" }} disabled={loading} />
                <button onClick={() => handleSend()} disabled={loading || !input.trim()} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>Send</button>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ width: "50%", background: "#1a2740", padding: 32, overflowY: "auto", position: "sticky", top: 0, height: "100vh" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", marginBottom: 24 }}>Live Preview</p>
          <div style={{ background: "#0d1a2e", border: "1px solid #334155", borderRadius: 12, padding: 32 }}>
            {fields.bizName ? (
              <>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>{fields.bizName}</h2>
                {fields.city && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{fields.city}{fields.zip ? `, ${fields.zip}` : ""}</p>}
                {fields.tagline && <p style={{ fontSize: 15, color: "#F5C842", fontStyle: "italic", marginTop: 12 }}>&ldquo;{fields.tagline}&rdquo;</p>}
                {fields.desc && <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8 }}>{fields.desc}</p>}
                {fields.services.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Services</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {fields.services.map((s, i) => <span key={i} style={{ border: "1px solid #334155", borderRadius: 999, padding: "4px 12px", fontSize: 12, color: "#fff" }}>{s}</span>)}
                    </div>
                  </div>
                )}
                {fields.cta && <button style={{ marginTop: 16, background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700 }}>{fields.cta}</button>}
                {previewHtml && (
                  <div style={{ marginTop: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Site Preview — {LOOK_OPTIONS.find((l) => l.id === fields.look)?.label}</p>
                    <div style={{ background: "#374151", borderRadius: "8px 8px 0 0", padding: "6px 8px 0" }}>
                      <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                      </div>
                      <div style={{ background: "#fff", borderRadius: "3px 3px 0 0", height: 200, overflow: "hidden" }}>
                        <iframe srcDoc={previewHtml} style={{ width: 1200, height: 800, border: "none", transform: "scale(0.3)", transformOrigin: "top left", pointerEvents: "none" }} title="Preview" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }}>📋</div>
                <p style={{ color: "#64748b" }}>Profile builds here as you answer.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0d1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}>
      <IntakeInner />
    </Suspense>
  );
}
