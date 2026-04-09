"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopNav from "@/components/TopNav";
import { classifyBusinessType, getCTASuggestion } from "@/lib/business-classifier";

interface Msg { role: "bruno" | "user"; text: string; pills?: { label: string; value: string }[] }

const LOOK_OPTIONS = [
  { id: "warm_bold", label: "Local", accent: "#c2692a", desc: "Clean & Classic" },
  { id: "professional", label: "Community", accent: "#185fa5", desc: "Professional & Trusted" },
  { id: "bold_modern", label: "Premier ⭐", accent: "#F5C842", desc: "Bold & Premium" },
];

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function IntakeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isMagic = params.get("magic") === "true";

  type Step = "intro" | "confirm" | "services" | "tagline" | "cta" | "look" | "finish";

  const [step, setStep] = useState<Step>("intro");
  const [chat, setChat] = useState<Msg[]>([{
    role: "bruno",
    text: isMagic
      ? "Hey — your rep set up this link for you. Tell me about the business. Name, what they do, where they are."
      : "Hey — I'm Bruno. Tell me about the business. Name, what they do, where they are.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [bizName, setBizName] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [desc, setDesc] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [tagline, setTagline] = useState("");
  const [taglineAttempts, setTaglineAttempts] = useState(0);
  const [cta, setCta] = useState("");
  const [look, setLook] = useState("warm_bold");
  const [sbrData, setSbrData] = useState<Record<string, unknown> | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");

  const sbrRef = useRef<Record<string, unknown> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  useEffect(() => {
    if (!look || !bizName) return;
    fetch("/api/site/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "preview", lookKey: look, profileData: { business_name: bizName, city, zip, phone: "", intakeAnswers: { q1: `${bizName}, ${city} ${zip}`, q2: desc, q3: services.join(", "), q4: cta, q5: look }, sbrData: sbrData || undefined } }),
    }).then((r) => r.json()).then((d) => setPreviewHtml(d.html || "")).catch(() => {});
  }, [look, bizName, city, zip, desc, services, cta, sbrData]);

  function add(role: "bruno" | "user", text: string, pills?: { label: string; value: string }[]) {
    setChat((p) => [...p, { role, text, pills }]);
  }

  async function fireSBR(name: string, z: string, c: string) {
    try {
      const res = await fetch("/api/sbr/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessType: classifyBusinessType(name, ""), zip: z, city: c, businessName: name }) });
      const data = await res.json();
      const sbr = data.sbrData || data;
      setSbrData(sbr);
      sbrRef.current = sbr;
      const comps = (sbr.competitors as string[])?.slice(0, 3)?.join(", ");
      if (comps) add("bruno", `🏆 Top competitors: ${comps}`);
      const insight = sbr.marketInsight as string;
      if (insight) { await delay(400); add("bruno", `📊 ${String(insight).substring(0, 120)}...`); }
    } catch { /* SBR unavailable */ }
  }

  async function generateTaglines(): Promise<string[]> {
    const sbr = sbrRef.current;
    const headline = (sbr?.campaignHeadline as string) || "";
    const prompt = `Write 3 short taglines (under 8 words each) for "${bizName}", a ${classifyBusinessType(bizName, desc)} in ${city}. Services: ${services.join(", ")}. ${headline ? `Headline: ${headline}.` : ""} Return ONLY: ["tagline1","tagline2","tagline3"]`;
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: "Return ONLY a JSON array of 3 taglines. No markdown.", messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      const text = String(data?.response ?? data?.content?.[0]?.text ?? "");
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) return JSON.parse(match[0]) as string[];
    } catch { /* fallback */ }
    return [`${bizName} — Built for ${city}`, "Quality You Can Trust", "Local. Proven. Yours."];
  }

  async function handleSend(override?: string) {
    const ans = (override || input).trim();
    if (!ans || loading) return;
    setInput("");
    add("user", ans);
    setLoading(true);

    switch (step) {
      case "intro": {
        // Extract everything from one message
        const zipMatch = ans.match(/\b(\d{5})\b/);
        const parts = ans.replace(/\d{5}/, "").split(/[,.\n]+/).map((s) => s.trim()).filter(Boolean);
        const name = parts[0]?.replace(/(?<!['\u2019])\b\w/g, (c) => c.toUpperCase()) || "New Business";
        const descPart = parts.slice(1).join(", ").replace(/\b(in|at|from|near)\s+\w+(\s+\w{2})?\s*$/i, "").trim();
        const cityMatch = ans.match(/\b(?:in|at|from|near)\s+([A-Za-z\s]+?)(?:\s+\d{5}|\s*$)/i);
        const c = cityMatch?.[1]?.trim().replace(/\b\w/g, (ch) => ch.toUpperCase()) || "";

        setBizName(name);
        if (c) setCity(c);
        if (zipMatch) setZip(zipMatch[1]);
        if (descPart) setDesc(descPart);

        await delay(400);
        const summary = `${name}${descPart ? `, ${descPart.toLowerCase().slice(0, 60)}` : ""}${c ? ` in ${c}` : ""}${zipMatch ? ` ${zipMatch[1]}` : ""}`;
        add("bruno", `Got it — ${summary}. That right?`);
        setStep("confirm");
        break;
      }

      case "confirm": {
        const yes = /^(yes|yeah|yep|sure|correct|right|perfect|yup|absolutely)$/i.test(ans.trim());
        if (!yes) {
          add("bruno", "No worries — tell me again. Name, what they do, where they are.");
          setStep("intro");
          break;
        }
        await delay(300);
        add("bruno", `Scanning ${city || "the"} market...`);
        if (zip && city) fireSBR(bizName, zip, city);
        await delay(800);
        add("bruno", "What are the top 2 or 3 things they offer?");
        setStep("services");
        break;
      }

      case "services": {
        const items = ans.split(/[,\n&]+/).map((s) => s.trim()).filter((s) => s.length > 1);
        if (items.length === 0) { add("bruno", "Give me at least one service or specialty."); break; }
        setServices(items.slice(0, 3));
        await delay(400);
        add("bruno", `${items.slice(0, 3).join(", ")} — solid. Generating taglines...`);
        const taglines = await generateTaglines();
        await delay(300);
        add("bruno", "Pick a tagline:", taglines.map((t) => ({ label: t, value: t })));
        setStep("tagline");
        break;
      }

      case "tagline": {
        const none = /^(none|none of these|no|nope|different|other)$/i.test(ans.trim());
        if (none && taglineAttempts < 2) {
          setTaglineAttempts((p) => p + 1);
          if (taglineAttempts === 0) {
            add("bruno", "What feeling should the brand give people?");
          } else {
            const taglines = await generateTaglines();
            add("bruno", "Try these:", taglines.map((t) => ({ label: t, value: t })));
          }
          break;
        }
        if (none) {
          const taglines = await generateTaglines();
          const picked = taglines[0] || `${bizName} — ${city}`;
          setTagline(picked);
          add("bruno", `Going with "${picked}" — your rep can update anytime.`);
        } else {
          setTagline(ans);
          add("bruno", `Locked: "${ans}"`);
        }
        await delay(400);
        const bt = classifyBusinessType(bizName, desc);
        const sug = getCTASuggestion(bt, bt);
        const alt = bt === "restaurant" ? "Reserve a Table" : bt === "dental" ? "Call Today" : "Call Now";
        add("bruno", "What should the main button say?", [{ label: sug, value: sug }, { label: alt, value: alt }]);
        setStep("cta");
        break;
      }

      case "cta": {
        setCta(ans.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
        await delay(300);
        add("bruno", "Pick a site style:");
        setStep("look");
        break;
      }

      case "look": {
        let lookId = "";
        if (["warm_bold", "professional", "bold_modern"].includes(ans)) lookId = ans;
        else if (ans.match(/local|warm/i)) lookId = "warm_bold";
        else if (ans.match(/community|professional/i)) lookId = "professional";
        else if (ans.match(/premier|bold|modern/i)) lookId = "bold_modern";
        if (!lookId) { add("bruno", "Pick one — click a card or type Local, Community, or Premier."); break; }
        setLook(lookId);
        const label = LOOK_OPTIONS.find((l) => l.id === lookId)?.label || lookId;
        if (lookId === "bold_modern") {
          import("canvas-confetti").then((mod) => mod.default({ particleCount: 120, spread: 80, colors: ["#F5C842", "#0d1a2e", "#ffffff"] }));
        }
        await delay(300);
        add("bruno", `${label} — nice. Creating profile now...`);
        setStep("finish");
        await doFinish(lookId);
        break;
      }
    }
    setLoading(false);
  }

  async function doFinish(lookKey: string) {
    await delay(600);
    add("bruno", "📍 Running market analysis...");
    await delay(500);
    add("bruno", "🎨 Building campaign...");
    await delay(400);
    add("bruno", "✅ Done — opening dashboard.");

    try {
      const slug = bizName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const res = await fetch("/api/intake/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeAnswers: { q1: `${bizName}, ${city} ${zip}`, q2: desc, q3: services.join(", "), q4: cta, q5: lookKey, q6: "no", q7: "", q8: tagline, q9: `${slug}.com` },
          sbrData: { ...(sbrData || {}), tagline, suggestedTagline: tagline, services: services.map((s) => ({ name: s, description: `${s} — proudly serving ${city}.` })) },
          rep: isMagic ? "magic-link" : "ted",
        }),
      });
      const data = await res.json();
      if (data.profile?.id) { await delay(600); router.push("/dashboard"); }
    } catch { /* error */ }
  }

  // Demo mode
  async function runDemo() {
    const d = 600;
    const w = (ms: number) => new Promise((r) => setTimeout(r, ms));
    add("user", "Ted's Tacos, smash burgers and street tacos in Tulsa 74103");
    await w(d);
    setBizName("Ted's Tacos"); setCity("Tulsa"); setZip("74103"); setDesc("smash burgers and street tacos");
    add("bruno", "Got it — Ted's Tacos, smash burgers and street tacos in Tulsa 74103. That right?");
    await w(d);
    add("user", "Yes"); await w(d);
    add("bruno", "Scanning Tulsa market..."); await w(d);
    add("bruno", "What are the top 2 or 3 things they offer?"); await w(d);
    add("user", "Street Tacos, Catering, Late Night"); await w(d);
    setServices(["Street Tacos", "Catering", "Late Night"]);
    add("bruno", "Street Tacos, Catering, Late Night — solid. Generating taglines...");
    await w(d);
    add("bruno", "Pick a tagline:", [{ label: "Tulsa's Taco Revolution Starts Here", value: "Tulsa's Taco Revolution Starts Here" }, { label: "Real Tacos. Real Fast.", value: "Real Tacos. Real Fast." }, { label: "Eight Years of Making Tulsa Hungry.", value: "Eight Years of Making Tulsa Hungry." }]);
    await w(d);
    add("user", "Tulsa's Taco Revolution Starts Here"); await w(d);
    setTagline("Tulsa's Taco Revolution Starts Here");
    add("bruno", 'Locked: "Tulsa\'s Taco Revolution Starts Here"'); await w(d);
    add("bruno", "What should the main button say?", [{ label: "Order Now", value: "Order Now" }, { label: "Reserve a Table", value: "Reserve a Table" }]);
    await w(d);
    add("user", "Order Now"); await w(d);
    setCta("Order Now");
    add("bruno", "Pick a site style:"); await w(d);
    add("user", "Premier ⭐"); await w(d);
    setLook("bold_modern");
    import("canvas-confetti").then((mod) => mod.default({ particleCount: 120, spread: 80, colors: ["#F5C842", "#0d1a2e", "#ffffff"] }));
    add("bruno", "Premier ⭐ — nice. Opening profile...");
    await w(1000);
    router.push("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0d1a2e" }}>
      <TopNav activePage="intake" />
      <div style={{ display: "flex", flex: 1 }}>
        {/* Chat */}
        <div style={{ width: "50%", display: "flex", flexDirection: "column", borderRight: "1px solid #1e293b" }}>
          <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Bruno Intake</h2>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Step: {step}</p>
            </div>
            <button onClick={runDemo} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🎬 Demo</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {chat.map((msg, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", borderRadius: 12, padding: "10px 16px", fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6, background: msg.role === "user" ? "#F5C842" : "#1a2740", color: msg.role === "user" ? "#0d1a2e" : "#fff", border: msg.role === "bruno" ? "1px solid #334155" : "none" }}>
                    {msg.role === "bruno" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0d1a2e", fontSize: 11 }}>B</div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#F5C842" }}>Bruno</span>
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
                {msg.pills && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, paddingLeft: 32 }}>
                    {msg.pills.map((p) => (
                      <button key={p.value} onClick={() => handleSend(p.value)} style={{ background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{p.label}</button>
                    ))}
                    {step === "tagline" && <button onClick={() => handleSend("none of these")} style={{ background: "transparent", color: "#64748b", border: "1px solid #334155", borderRadius: 999, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}>None of these</button>}
                  </div>
                )}
              </div>
            ))}

            {step === "look" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {LOOK_OPTIONS.map((l) => (
                  <button key={l.id} onClick={() => handleSend(l.id)} style={{ background: "#1a2740", border: l.id === "bold_modern" ? "2px solid #F5C842" : "1px solid #334155", borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left" }}>
                    <div style={{ height: 4, background: l.accent, borderRadius: 2, marginBottom: 10 }} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{l.label}</p>
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{l.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 32 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842", animation: "pulse 1s infinite" }} />
                <span style={{ fontSize: 12, color: "#64748b" }}>Bruno is thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {step !== "finish" && (
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
            {bizName ? (
              <>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>{bizName}</h2>
                {city && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{city}{zip ? `, ${zip}` : ""}</p>}
                {tagline && <p style={{ fontSize: 15, color: "#F5C842", fontStyle: "italic", marginTop: 12 }}>&ldquo;{tagline}&rdquo;</p>}
                {services.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Services</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {services.map((s, i) => <span key={i} style={{ border: "1px solid #334155", borderRadius: 999, padding: "4px 12px", fontSize: 12, color: "#fff" }}>{s}</span>)}
                    </div>
                  </div>
                )}
                {cta && <button style={{ marginTop: 16, background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700 }}>{cta}</button>}
                {previewHtml && (
                  <div style={{ marginTop: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Site Preview — {LOOK_OPTIONS.find((l) => l.id === look)?.label}</p>
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
