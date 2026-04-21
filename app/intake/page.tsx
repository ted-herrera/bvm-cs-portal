"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopNav from "@/components/TopNav";
import { selectVariation, normalizeSize } from "@/lib/print-engine";
import { detectSubType } from "@/lib/business-classifier";

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
  services: string[];
  cta: string;
  logoUrl: string;
  photoUrl: string;
  printSize: string; // eighth|quarter|third|half|full|cover
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

const SYSTEM_PROMPT = `You are Bruno, the print campaign intake assistant for BVM Client Success. Be warm, conversational, natural.

CONVERSATION RULES — STRICT:
- ONE question at a time. Never stack questions.
- Maximum 2 sentences per Bruno message. Ever.
- NO bullet lists inside messages. Ever.
- NO "Perfect!" more than once in the entire conversation. Use varied acknowledgments: "Got it.", "Nice.", "Love that.", "Okay.", "Alright." Keep acks brief.
- BANNED PHRASE: Never ask "What makes your [X] stand out?" or any variation of it.
- After the client answers, give ONE short natural acknowledgment (max one short sentence), then ONE next question.
- Skip is always allowed. If the user says "skip", "pass", "I don't have one", or similar, acknowledge briefly and move to the next question.

COLLECT IN THIS ORDER (ask one at a time, flex if user volunteers something). There are exactly 9 questions total — do not add more. Never ask about target customer, brand vibe, tagline, colors, or feel:
1. Business name + city (bizName, city — also capture zip if mentioned)
2. What the business does in one sentence (desc)
3. Street address for the ad — use these EXACT words: "What's the street address you'd like on the ad?" (address — optional, skip accepted)
4. Top 3 services or products (services as array)
5. Call-to-action (cta)
6. Print size (printSize) — one of: eighth, quarter, third, half, full, cover
7. Logo — ask if they have one, they can upload or skip
8. Photo — ask if they have a photo, upload or skip (stock used if skip)
9. QR code — ask: "Would you like a QR code on your ad?" If yes: ask "What should it link to — your website or email?" If user says something else (not url/email): reply "Got it, I'll flag that for your rep." and move on with qrType "other". If no: qrType "none".

NEVER ASK ABOUT TARGET CUSTOMER. NEVER ASK ABOUT TAGLINE. NEVER ASK ABOUT BRAND VIBE, COLORS, OR FEEL. Infer these silently from the business type when needed downstream.

OTHER RULES:
- Before asking any question, check the ALREADY COLLECTED list. Never re-ask a field already set.
- Extract any new fields from user input; merge them; ask only for what's still missing.
- Your text MUST be plain prose. No JSON inside it. No bullet lists. No multi-question paragraphs.
- After the final question, when all items are collected or skipped, your confirmation MUST be EXACTLY: "I have everything I need to build your campaign direction." followed by a short 3-line summary, then set complete: true.

CRITICAL OUTPUT FORMAT: Every response ends with a JSON block on its own line:
###FIELDS###
{"bizName":"","city":"","zip":"","desc":"","address":"","services":[],"cta":"","printSize":"","qrType":"","qrValue":"","phone":"","complete":false}
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
    bizName: "", city: "", zip: "", desc: "", address: "",
    services: [], cta: "", logoUrl: "", photoUrl: "",
    printSize: "", qrType: "", qrValue: "", phone: "",
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
            q8: "",
            q9: `${slug}.com`,
            address: f.address,
            logoUrl: f.logoUrl,
            photoUrl: f.photoUrl,
            phone: f.phone,
          },
          sbrData: (() => {
            const raw = (sbrData || {}) as Record<string, unknown>;
            const demo = (raw.demographics || {}) as Record<string, unknown>;
            const incomeRaw = (demo.medianIncome ?? raw.medianIncome ?? "") as string | number;
            const incomeNum = typeof incomeRaw === "number"
              ? incomeRaw
              : parseInt(String(incomeRaw || "").replace(/[^0-9]/g, ""), 10) || 0;
            const incomeTier = incomeNum >= 120000 ? "premium" : incomeNum > 0 && incomeNum < 55000 ? "low" : "middle";
            const competitors = Array.isArray(raw.competitors) ? (raw.competitors as unknown[]).length : 0;
            const compTier = competitors >= 7 ? "high" : competitors <= 3 ? "low" : "medium";
            let oppScore = raw.opportunityScore as number | undefined;
            if (!oppScore) {
              const incomeScore = incomeNum >= 120000 ? 40 : incomeNum >= 80000 ? 28 : incomeNum >= 55000 ? 18 : 10;
              const compScore = 40 - Math.min(40, competitors * 4);
              oppScore = Math.min(100, incomeScore + compScore + 25);
            }
            // Silent vibe inference from intake description + business name.
            // Keywords energy / bold / strong / powerful / urban / young push the
            // nike template via selectVariation. Neutral vibes default to calm.
            const vibeSource = `${f.bizName} ${f.desc} ${f.services.join(" ")}`.toLowerCase();
            const vibeHits: string[] = [];
            if (/energy|energetic|hype|pumped|intense/.test(vibeSource)) vibeHits.push("energy");
            if (/bold|badass|loud|aggressive/.test(vibeSource)) vibeHits.push("bold");
            if (/strong|strength|muscle|power.?house/.test(vibeSource)) vibeHits.push("strong");
            if (/power|powerful|fierce/.test(vibeSource)) vibeHits.push("powerful");
            if (/urban|street|downtown|grit/.test(vibeSource)) vibeHits.push("urban");
            if (/young|youth|gen.?z|millennial/.test(vibeSource)) vibeHits.push("young");
            if (/crossfit|mma|martial|boxing|fitness|gym|yoga|pilates|dance/.test(vibeSource)) vibeHits.push("energy");
            const intakeVibe = vibeHits.join(" ").trim();
            return {
              ...raw,
              services: f.services.map((s) => ({ name: s, description: `${s} — proudly serving ${f.city}.` })),
              medianIncome: incomeNum || undefined,
              incomeTier,
              competitorDensity: compTier,
              competitorCount: competitors,
              opportunityScore: oppScore,
              vibe: intakeVibe,
              intakeVibe,
            };
          })(),
          rep: isMagic ? "magic-link" : "ted",
        }),
      });
      const data = await res.json();
      const profileId = data.profile?.id as string | undefined;
      if (profileId) {
        // Compute selected variation and kick off AI image generation.
        // Store both on the client record so the tearsheet loads with image ready.
        try {
          const subType = detectSubType(f.bizName, f.desc);
          const normalizedSize = normalizeSize(f.printSize);
          const sbrRaw = (data.profile?.sbrData || {}) as Record<string, unknown>;
          const incomeTierRaw = (sbrRaw.incomeTier as "low" | "middle" | "premium" | undefined) || "middle";
          const vibeRaw = (sbrRaw.intakeVibe as string | undefined) || (sbrRaw.vibe as string | undefined) || "";
          const chosenVariation = selectVariation(subType, subType, normalizedSize, {
            medianIncome: sbrRaw.medianIncome as number | string | undefined,
            opportunityScore: sbrRaw.opportunityScore as number | string | undefined,
            competitorDensity: sbrRaw.competitorDensity as number | string | undefined,
            incomeTier: incomeTierRaw,
            vibe: vibeRaw,
          });

          // Store selectedVariation + intakeVibe on the client record so the
          // tearsheet renders the right template and downstream re-renders
          // can factor in vibe again if needed.
          fetch(`/api/profile/update/${profileId}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              intakeAnswers: {
                ...(data.profile.intakeAnswers || {}),
                selectedVariation: chosenVariation,
                intakeVibe: vibeRaw,
              },
            }),
          }).catch(() => {});

          // Kick off image generation — await so the tearsheet gets it ready.
          const imgRes = await fetch("/api/image/generate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: profileId,
              businessName: f.bizName,
              businessType: subType,
              services: f.services,
              city: f.city,
              adSize: normalizedSize,
              incomeTier: incomeTierRaw,
              variation: chosenVariation,
              seed: Date.now(),
            }),
          }).catch(() => null);
          const imgData = imgRes ? await imgRes.json().catch(() => null) : null;
          const imageUrl = imgData?.imageUrl as string | undefined;

          if (imageUrl) {
            await fetch(`/api/profile/update/${profileId}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                intakeAnswers: {
                  ...(data.profile.intakeAnswers || {}),
                  selectedVariation: chosenVariation,
                  generatedImageUrl: imageUrl,
                },
              }),
            }).catch(() => {});
          }
        } catch {
          /* non-fatal — tearsheet can still generate on load */
        }

        await new Promise((r) => setTimeout(r, 400));
        router.push(`/tearsheet/${profileId}`);
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
      services: ["Street Tacos", "Catering", "Late Night"],
      cta: "Order Now",
      printSize: "quarter",
      qrType: "url" as const,
      qrValue: "tedstacos.com",
      phone: "(918) 555-0199",
    };

    addMsg("user", `${demo.bizName} in ${demo.city} ${demo.zip}`);
    await w(d);
    setFields((p) => ({ ...p, bizName: demo.bizName, city: demo.city, zip: demo.zip }));
    addMsg("bruno", `Love that. What does ${demo.bizName} do in one sentence?`);
    await w(d);
    addMsg("user", demo.desc);
    setFields((p) => ({ ...p, desc: demo.desc }));
    await w(d);
    addMsg("bruno", "Got it. What's the street address you'd like on the ad?");
    await w(d);
    addMsg("user", demo.address);
    setFields((p) => ({ ...p, address: demo.address }));
    await w(d);
    addMsg("bruno", "Okay. Give me your top three services or products.");
    await w(d);
    addMsg("user", demo.services.join(", "));
    setFields((p) => ({ ...p, services: demo.services }));
    await w(d);
    addMsg("bruno", "Alright. What should the call-to-action say?");
    await w(d);
    addMsg("user", demo.cta);
    setFields((p) => ({ ...p, cta: demo.cta }));
    await w(d);
    addMsg("bruno", "Got it. What print size — eighth, quarter, third, half, full, or cover?");
    await w(d);
    addMsg("user", "Quarter — most popular");
    setFields((p) => ({ ...p, printSize: demo.printSize }));
    await w(d);
    addMsg("bruno", "Nice. Do you have a logo to upload, or skip for now?");
    await w(d);
    addMsg("user", "skip");
    await w(d);
    addMsg("bruno", "No problem. A photo of the business or team? Upload or skip.");
    await w(d);
    addMsg("user", "skip");
    await w(d);
    addMsg("bruno", "Would you like a QR code on your ad?");
    await w(d);
    addMsg("user", "Yes");
    await w(d);
    addMsg("bruno", "What should it link to — your website or email?");
    await w(d);
    addMsg("user", demo.qrValue);
    setFields((p) => ({ ...p, qrType: demo.qrType, qrValue: demo.qrValue, phone: demo.phone }));
    await w(d);
    addMsg("bruno", "I have everything I need to build your campaign direction.\n" + demo.bizName + " — " + demo.city + "\n" + demo.cta + " · Quarter page\nQR: " + demo.qrValue);

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
                  fields.services.length > 0 && "Services",
                  fields.cta && "CTA",
                  fields.printSize && "Size",
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
                {fields.desc && <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8 }}>{fields.desc}</p>}
                {fields.address && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>📍 {fields.address}</p>}
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
