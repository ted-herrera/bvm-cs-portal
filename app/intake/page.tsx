"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopNav from "@/components/TopNav";

interface Msg {
  role: "bruno" | "user";
  text: string;
  chips?: { label: string; value: string }[];
}

interface IntakeFields {
  bizName: string;
  city: string;
  zip: string;
  desc: string;
  address: string;
  targetCustomer: string;
  services: string[];
  cta: string;
  brandVibe: string;
  logoUrl: string;
  photoUrl: string;
  printSize: string; // eighth|quarter|third|half|full|cover
  tagline: string;
  qrType: string; // url|email|other|none
  qrValue: string;
  phone: string;
}

const PRINT_SIZES = [
  { id: "eighth", label: "Eighth", desc: "Business card style" },
  { id: "quarter", label: "Quarter", desc: "Most popular" },
  { id: "third", label: "Third", desc: "Tall vertical column" },
  { id: "half", label: "Half", desc: "Bold landscape" },
  { id: "full", label: "Full", desc: "Full page premium" },
  { id: "cover", label: "Cover", desc: "Featured cover" },
];

const SYSTEM_PROMPT = `You are Bruno, the print campaign intake assistant for BVM Client Success. Your job is to collect the details needed to build a print ad campaign direction. Be warm, conversational, and natural — like a smart friend helping a business owner.

Collect in this order (but flex if the user answers out of order):
1. Business name + city (bizName, city — also capture zip if mentioned)
2. What the business does in one sentence (desc)
3. Street address for the ad (address)
4. Target customer (targetCustomer)
5. Top 3 services or products (services as array)
6. Call-to-action (cta) — "Order Now", "Book Today", "Call Us", etc.
7. Brand vibe — colors, energy, feel (brandVibe, free text)
8. Logo — ask if they have one. They can upload or skip. (logoUrl set by UI; you just note it)
9. Photo — ask if they have a photo of the business/team. Upload or skip (stock photo used if skip). (photoUrl set by UI)
10. Print size (printSize) — one of: eighth, quarter, third, half, full, cover. Describe each briefly.
11. Tagline (tagline) — SUGGEST one based on what you know. Client accepts, edits, or skips. Even if skipped, keep a soft internal tagline in the JSON.
12. QR code (qrType + qrValue). Ask if they want one. If yes, ask: website URL or email? If "something else", respond that their rep will follow up — don't block. If no, mark qrType as "none" and the QR is hidden entirely.

ABSOLUTE RULES — DO NOT VIOLATE:
1. Before asking any question, check the ALREADY COLLECTED list. Never ask for a field already set.
2. Extract any new fields from user input; merge into state; ask only for what's still missing.
3. Skip is always allowed. If the user says "skip", "pass", "I don't have one", or similar, move gracefully to the next question.
4. Never break flow. Handle anything gracefully.
5. Never ask rigid scripted questions — converse naturally.
6. Your text response MUST be plain prose (no JSON inside it). The JSON block goes at the very end.
7. After the final question, when all required items are collected OR acknowledged as skipped, your confirmation message MUST be EXACTLY: "I have everything I need to build your campaign direction." followed by a short 3-line summary, then set complete: true.

CRITICAL OUTPUT FORMAT: Every response ends with a JSON block on its own line:
###FIELDS###
{"bizName":"","city":"","zip":"","desc":"","address":"","targetCustomer":"","services":[],"cta":"","brandVibe":"","printSize":"","tagline":"","qrType":"","qrValue":"","phone":"","complete":false}
###END###

For "printSize", use one of: "eighth", "quarter", "third", "half", "full", "cover".
For "qrType", use one of: "url", "email", "other", "none".
`;

function parseResponse(raw: string): { text: string; fields: Partial<IntakeFields> & { complete?: boolean } } {
  const marker = "###FIELDS###";
  const endMarker = "###END###";
  const markerIdx = raw.indexOf(marker);
  if (markerIdx === -1) {
    const cleaned = raw.replace(/\{[^{}]*"bizName"[^{}]*\}/g, "").trim();
    return { text: cleaned || raw.trim(), fields: {} };
  }
  const text = raw.substring(0, markerIdx).trim();
  const endIdx = raw.indexOf(endMarker, markerIdx);
  const jsonSlice = endIdx > -1 ? raw.substring(markerIdx + marker.length, endIdx) : raw.substring(markerIdx + marker.length);
  const jsonStr = jsonSlice.trim();
  try {
    return { text, fields: JSON.parse(jsonStr) };
  } catch {
    const m = jsonStr.match(/\{[\s\S]*\}/);
    if (m) {
      try { return { text, fields: JSON.parse(m[0]) }; } catch { /* ignore */ }
    }
    return { text, fields: {} };
  }
}

function buildCollected(f: IntakeFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  (Object.keys(f) as (keyof IntakeFields)[]).forEach((k) => {
    const v = f[k];
    if (Array.isArray(v) ? v.length > 0 : v) out[k] = v;
  });
  return out;
}

function IntakeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isMagic = params.get("magic") === "true";

  const [chat, setChat] = useState<Msg[]>([{
    role: "bruno",
    text: isMagic
      ? "Hey — your rep set up this link for you. Tell me about the business! What's the name and what city are you in?"
      : "Hey — I'm Bruno. Let's build your print campaign direction. What's the business name and city?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  const [fields, setFields] = useState<IntakeFields>({
    bizName: "", city: "", zip: "", desc: "", address: "", targetCustomer: "",
    services: [], cta: "", brandVibe: "", logoUrl: "", photoUrl: "",
    printSize: "", tagline: "", qrType: "", qrValue: "", phone: "",
  });

  const [sbrData, setSbrData] = useState<Record<string, unknown> | null>(null);

  const historyRef = useRef<{ role: string; content: string }[]>([{
    role: "assistant",
    content: isMagic
      ? "Hey — your rep set up this link for you. Tell me about the business! What's the name and what city are you in?"
      : "Hey — I'm Bruno. Let's build your print campaign direction. What's the business name and city?",
  }]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const sbrFiredRef = useRef(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // Fire SBR silently once we have name + city + zip
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

  function addMsg(role: "bruno" | "user", text: string, chips?: Msg["chips"]) {
    setChat((p) => [...p, { role, text, chips }]);
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
          collectedFields: buildCollected(fields),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        addMsg("bruno", `Something went wrong: ${data.error || res.status}`);
        setLoading(false);
        return;
      }

      const raw = typeof data.response === "string" ? data.response
        : typeof data.content?.[0]?.text === "string" ? data.content[0].text : "";
      if (!raw) {
        addMsg("bruno", "I got an empty response — try again?");
        setLoading(false);
        return;
      }
      const { text, fields: newFields } = parseResponse(raw);

      setFields((prev) => {
        const u = { ...prev };
        (Object.keys(newFields) as (keyof IntakeFields)[]).forEach((k) => {
          const val = (newFields as Record<string, unknown>)[k];
          if (val === undefined || val === null) return;
          if (Array.isArray(val) && val.length > 0) (u as Record<string, unknown>)[k] = val;
          else if (typeof val === "string" && val) (u as Record<string, unknown>)[k] = val;
        });
        return u;
      });

      const showSizeCards = !newFields.printSize && !fields.printSize && /eighth|quarter|third|half|full|cover|print size/i.test(text);
      const chips = showSizeCards
        ? PRINT_SIZES.map((s) => ({ label: `${s.label} — ${s.desc}`, value: s.id }))
        : undefined;

      addMsg("bruno", text, chips);
      historyRef.current.push({ role: "assistant", content: raw });

      if (newFields.printSize === "cover") {
        import("canvas-confetti").then((mod) => mod.default({ particleCount: 120, spread: 80, colors: ["#F5C842", "#0d1a2e", "#ffffff"] }));
      }

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
            q1: `${f.bizName}, ${f.city}${f.zip ? " " + f.zip : ""}`,
            q2: f.desc,
            q3: f.services.join(", "),
            q4: f.cta,
            q5: f.printSize,
            q6: f.qrType === "none" ? "no" : "yes",
            q7: f.qrValue,
            q8: f.tagline,
            q9: `${slug}.com`,
            address: f.address,
            targetCustomer: f.targetCustomer,
            brandVibe: f.brandVibe,
            logoUrl: f.logoUrl,
            photoUrl: f.photoUrl,
            phone: f.phone,
          },
          sbrData: {
            ...(sbrData || {}),
            tagline: f.tagline,
            suggestedTagline: f.tagline,
            services: f.services.map((s) => ({ name: s, description: `${s} — proudly serving ${f.city}.` })),
          },
          rep: isMagic ? "magic-link" : "ted",
        }),
      });
      const data = await res.json();
      if (data.profile?.id) {
        await new Promise((r) => setTimeout(r, 600));
        router.push(`/tearsheet/${data.profile.id}`);
      }
    } catch { /* error */ }
  }

  async function runDemo() {
    const w = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const d = 500;
    const demo = {
      bizName: "Ted's Tacos", city: "Tulsa", zip: "74103",
      desc: "street tacos, smash burgers and craft sodas",
      address: "123 Main St, Tulsa OK 74103",
      targetCustomer: "Young families, downtown workers, late-night foodies",
      services: ["Street Tacos", "Catering", "Late Night"],
      cta: "Order Now",
      brandVibe: "warm, bold, street-food energy — red and gold",
      printSize: "quarter",
      tagline: "Tulsa's Taco Revolution Starts Here",
      qrType: "url" as const,
      qrValue: "tedstacos.com",
      phone: "(918) 555-0199",
    };

    addMsg("user", `${demo.bizName} in ${demo.city} ${demo.zip}`);
    await w(d);
    setFields((p) => ({ ...p, bizName: demo.bizName, city: demo.city, zip: demo.zip }));
    addMsg("bruno", `${demo.bizName} in ${demo.city} — love it. What does the business do in one sentence?`);
    await w(d);
    addMsg("user", demo.desc);
    setFields((p) => ({ ...p, desc: demo.desc }));
    await w(d);
    addMsg("bruno", "Perfect. What's the street address for the ad?");
    await w(d);
    addMsg("user", demo.address);
    setFields((p) => ({ ...p, address: demo.address }));
    await w(d);
    addMsg("bruno", "Got it. Who's your target customer?");
    await w(d);
    addMsg("user", demo.targetCustomer);
    setFields((p) => ({ ...p, targetCustomer: demo.targetCustomer }));
    await w(d);
    addMsg("bruno", "Top 3 services or products?");
    await w(d);
    addMsg("user", demo.services.join(", "));
    setFields((p) => ({ ...p, services: demo.services }));
    await w(d);
    addMsg("bruno", "What should the CTA say?");
    await w(d);
    addMsg("user", demo.cta);
    setFields((p) => ({ ...p, cta: demo.cta }));
    await w(d);
    addMsg("bruno", "Describe your brand vibe — colors, energy, feel.");
    await w(d);
    addMsg("user", demo.brandVibe);
    setFields((p) => ({ ...p, brandVibe: demo.brandVibe }));
    await w(d);
    addMsg("bruno", "Do you have a logo? (Upload or skip)");
    await w(d);
    addMsg("user", "skip");
    await w(d);
    addMsg("bruno", "Photo of the business? (Upload or skip — we'll use stock if skipped)");
    await w(d);
    addMsg("user", "skip");
    await w(d);
    addMsg("bruno", "What print size? Eighth, quarter, third, half, full, or cover?");
    await w(d);
    addMsg("user", "Quarter — most popular");
    setFields((p) => ({ ...p, printSize: demo.printSize }));
    await w(d);
    addMsg("bruno", `Here's a tagline I wrote: "${demo.tagline}". Good, want to tweak, or skip?`);
    await w(d);
    addMsg("user", "Perfect — use it.");
    setFields((p) => ({ ...p, tagline: demo.tagline }));
    await w(d);
    addMsg("bruno", "QR code? Want one? (URL or email, or skip)");
    await w(d);
    addMsg("user", `Yes — ${demo.qrValue}`);
    setFields((p) => ({ ...p, qrType: demo.qrType, qrValue: demo.qrValue, phone: demo.phone }));
    await w(d);
    addMsg("bruno", "I have everything I need to build your campaign direction.\n\n• " + demo.bizName + " — " + demo.city + "\n• " + demo.cta + " · Quarter page\n• QR: " + demo.qrValue);

    setFinished(true);
    await doFinish({ ...demo, logoUrl: "", photoUrl: "" });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0d1a2e" }}>
      <TopNav activePage="intake" />
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ width: "50%", display: "flex", flexDirection: "column", borderRight: "1px solid #1e293b" }}>
          <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Bruno Intake</h2>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                {[
                  fields.bizName && "Name",
                  fields.city && "City",
                  fields.address && "Address",
                  fields.desc && "Desc",
                  fields.targetCustomer && "Target",
                  fields.services.length > 0 && "Services",
                  fields.cta && "CTA",
                  fields.brandVibe && "Vibe",
                  fields.printSize && "Size",
                  fields.tagline && "Tagline",
                  fields.qrType && "QR",
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
                {msg.chips && !fields.printSize && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12, paddingLeft: 32 }}>
                    {msg.chips.map((c) => (
                      <button key={c.value} onClick={() => handleSend(c.label)} style={{
                        background: "#1a2740", border: "1px solid #334155",
                        borderRadius: 10, padding: 12, cursor: "pointer", textAlign: "left", color: "#fff", fontSize: 12,
                      }}>{c.label}</button>
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
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type your answer or 'skip'..." style={{ flex: 1, borderRadius: 8, border: "1px solid #334155", background: "#1a2740", padding: "10px 16px", fontSize: 14, color: "#fff", outline: "none" }} disabled={loading} />
                <button onClick={() => handleSend()} disabled={loading || !input.trim()} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>Send</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ width: "50%", background: "#1a2740", padding: 32, overflowY: "auto", position: "sticky", top: 0, height: "100vh" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", marginBottom: 24 }}>Campaign Direction — Building</p>
          <div style={{ background: "#0d1a2e", border: "1px solid #334155", borderRadius: 12, padding: 32 }}>
            {fields.bizName ? (
              <>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>{fields.bizName}</h2>
                {fields.city && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{fields.city}{fields.zip ? `, ${fields.zip}` : ""}</p>}
                {fields.tagline && <p style={{ fontSize: 15, color: "#F5C842", fontStyle: "italic", marginTop: 12 }}>&ldquo;{fields.tagline}&rdquo;</p>}
                {fields.desc && <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8 }}>{fields.desc}</p>}
                {fields.address && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>📍 {fields.address}</p>}
                {fields.targetCustomer && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>🎯 {fields.targetCustomer}</p>}
                {fields.services.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Services</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {fields.services.map((s, i) => <span key={i} style={{ border: "1px solid #334155", borderRadius: 999, padding: "4px 12px", fontSize: 12, color: "#fff" }}>{s}</span>)}
                    </div>
                  </div>
                )}
                {fields.cta && <button style={{ marginTop: 16, background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700 }}>{fields.cta}</button>}
                {fields.printSize && (
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16 }}>Print Size: <span style={{ color: "#F5C842", fontWeight: 600 }}>{fields.printSize}</span></p>
                )}
                {fields.qrType && fields.qrType !== "none" && (
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>QR: {fields.qrValue || "pending"}</p>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }}>🖨</div>
                <p style={{ color: "#64748b" }}>Your campaign direction builds here as you answer.</p>
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
