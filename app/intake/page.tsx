"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopNav from "@/components/TopNav";
import { classifyBusinessType, getCTASuggestion } from "@/lib/business-classifier";
import { BRUNO_INTAKE_PROMPT } from "@/lib/sbr";

interface Msg {
  role: "bruno" | "user";
  text: string;
  pills?: { label: string; value: string }[];
}

interface ServiceEntry { name: string; description: string }

const LOOK_OPTIONS = [
  { id: "warm_bold", label: "Local", accent: "#c2692a", desc: "Clean & Classic — warm, inviting" },
  { id: "professional", label: "Community", accent: "#185fa5", desc: "Professional & Trusted" },
  { id: "bold_modern", label: "Premier ⭐", accent: "#F5C842", desc: "Bold & Premium — Featured Badge + Review Ticker + Animated Stats" },
];

const DAILY_AVG: Record<string, number> = {
  restaurant: 120, dental: 12, medical: 25, beauty: 18, fitness: 30,
  roofing: 3, hvac: 5, automotive: 10, legal: 4, realestate: 2,
  financial: 5, pet: 15, retail: 40, education: 20, homeservices: 5, business: 8,
};

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return raw;
}

function IntakeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isMagic = params.get("magic") === "true";
  const urlName = params.get("name") || "";
  const urlCity = params.get("city") || "";

  type Step = "q1" | "q2" | "q3_name" | "q3_desc" | "q3_confirm" | "q4" | "q5" | "q6" | "q7" | "q8" | "q9" | "finish";

  const [step, setStep] = useState<Step>("q1");
  const [chat, setChat] = useState<Msg[]>([{
    role: "bruno",
    text: isMagic
      ? "Hi! Your rep set up this link just for you. I'll guide you through building your site in about 10 minutes.\n\nWhat's the name of your business?"
      : "Hi! I'm Bruno. Let's build your site.\n\nWhat's the name of your business?",
  }]);
  const [input, setInput] = useState(urlName);
  const [loading, setLoading] = useState(false);

  // Collected data
  const [bizName, setBizName] = useState(urlName);
  const [city, setCity] = useState(urlCity);
  const [zip, setZip] = useState("");
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [currentServiceIdx, setCurrentServiceIdx] = useState(0);
  const [currentServiceName, setCurrentServiceName] = useState("");
  const [tagline, setTagline] = useState("");
  const [taglineAttempt, setTaglineAttempt] = useState(0);
  const [yearsOpen, setYearsOpen] = useState("");
  const [customerCount, setCustomerCount] = useState("");
  const [starRating, setStarRating] = useState("4.8");
  const [customerQuote, setCustomerQuote] = useState("");
  const [phone, setPhone] = useState("");
  const [cta, setCta] = useState("");
  const [look, setLook] = useState("");
  const [suggestedDomain, setSuggestedDomain] = useState("");
  const [sbrData, setSbrData] = useState<Record<string, unknown> | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");

  const sbrRef = useRef<Record<string, unknown> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // Live preview
  useEffect(() => {
    if (!look || !bizName) return;
    const svc = services.map((s) => s.name).join(", ");
    fetch("/api/site/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "preview", lookKey: look,
        profileData: { business_name: bizName, city, zip, phone, intakeAnswers: { q1: `${bizName}, ${city} ${zip}`, q2: services.map((s) => s.description).join(". "), q3: svc, q4: cta, q5: look, q6: "no", q7: phone }, sbrData: sbrData || undefined },
      }),
    }).then((r) => r.json()).then((d) => setPreviewHtml(d.html || "")).catch(() => {});
  }, [look, bizName, city, zip, services, cta, phone, sbrData]);

  function addMsg(role: "bruno" | "user", text: string, pills?: { label: string; value: string }[]) {
    setChat((prev) => [...prev, { role, text, pills }]);
  }

  async function fireSBR(name: string, z: string, c: string) {
    try {
      const res = await fetch("/api/sbr/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: classifyBusinessType(name, ""), zip: z, city: c, businessName: name }),
      });
      const data = await res.json();
      const sbr = data.sbrData || data;
      setSbrData(sbr);
      sbrRef.current = sbr;
    } catch { /* SBR unavailable */ }
  }

  async function generateTaglines(attempt: number): Promise<string[]> {
    const sbr = sbrRef.current;
    const headline = (sbr?.campaignHeadline as string) || "";
    const svcNames = services.map((s) => s.name).join(", ");
    let prompt = `Write 3 short taglines (under 8 words each) for "${bizName}", a ${classifyBusinessType(bizName, svcNames)} in ${city}. Services: ${svcNames}. ${headline ? `Campaign headline: ${headline}.` : ""}`;
    if (attempt === 1) prompt += " Focus on the FEELING the brand should give.";
    if (attempt === 2) prompt += " Make them punchy, one-word-inspired.";
    prompt += " Return ONLY: [\"tagline1\",\"tagline2\",\"tagline3\"]";

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: BRUNO_INTAKE_PROMPT + "\n\nFor this specific request: Return ONLY a JSON array of 3 taglines. No markdown, no explanation.", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const text = String(data?.content?.[0]?.text ?? data?.content ?? data?.response ?? "");
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) return JSON.parse(match[0]) as string[];
    } catch { /* fallback */ }
    return [`${bizName} — Built for ${city}`, "Quality You Can Trust", "Local. Proven. Yours."];
  }

  async function handlePillClick(value: string) {
    await handleSend(value);
  }

  async function handleSend(override?: string) {
    const ans = (override || input).trim();
    if (!ans || loading) return;
    setInput("");
    addMsg("user", ans);
    setLoading(true);
    await processStep(ans);
    setLoading(false);
  }

  async function processStep(ans: string) {
    switch (step) {
      // Q1: Business name
      case "q1": {
        const name = ans.trim().replace(/(?<!['\u2019])\b\w/g, (c) => c.toUpperCase());
        if (name.length < 2) { addMsg("bruno", "I need at least a business name — what is it?"); return; }
        setBizName(name);
        await delay(400);
        addMsg("bruno", `Great! What city and ZIP code are you in?`);
        setStep("q2");
        break;
      }

      // Q2: City + ZIP
      case "q2": {
        const zipMatch = ans.match(/\b(\d{5})\b/);
        const cityPart = ans.replace(/\d{5}/, "").replace(/[,\s]+$/, "").trim().replace(/\b\w/g, (c) => c.toUpperCase());
        if (!cityPart || cityPart.length < 2) { addMsg("bruno", "What city? Include the ZIP code too."); return; }
        if (!zipMatch) { addMsg("bruno", `Got ${cityPart} — what's the ZIP code?`); setCity(cityPart); return; }
        setCity(cityPart);
        setZip(zipMatch[1]);
        await delay(400);
        addMsg("bruno", `Got it — let me pull some market data on ${cityPart}...`);
        fireSBR(bizName, zipMatch[1], cityPart);
        await delay(1500);
        addMsg("bruno", `What's your first service or specialty?`);
        setCurrentServiceIdx(0);
        setStep("q3_name");
        break;
      }

      // Q3: Services — name
      case "q3_name": {
        const svcName = ans.trim();
        // Allow skipping service 3
        if (currentServiceIdx >= 2 && /^(none|skip|no|nah|only 2|just 2|no third|that's it|thats it)$/i.test(svcName)) {
          await delay(300);
          addMsg("bruno", "No problem — two services is perfect.\n\nGenerating tagline options...");
          const taglines = await generateTaglines(0);
          setTaglineAttempt(0);
          await delay(300);
          addMsg("bruno", "Here are three tagline options — tap the one you like:", taglines.map((t) => ({ label: t, value: t })));
          setStep("q4");
          return;
        }
        if (svcName.length < 2) { addMsg("bruno", "What service does the business offer?"); return; }
        setCurrentServiceName(svcName);
        await delay(300);
        addMsg("bruno", `What makes your ${svcName} stand out?`);
        setStep("q3_desc");
        break;
      }

      // Q3: Services — description
      case "q3_desc": {
        const isSkip = /^(skip|idk|not sure|pass)$/i.test(ans.trim());
        let desc = ans.trim();
        if (isSkip) {
          desc = `Professional ${currentServiceName} services for ${city} — built around quality and care.`;
        } else if (desc.split(/\s+/).length < 6) {
          // Clean up weak/vague answers
          const weak = desc.toLowerCase();
          if (weak.match(/fresh|ingredi/)) desc = `Made with fresh ingredients daily — the way ${currentServiceName} should be.`;
          else if (weak.match(/good|great|best|awesome/)) desc = `Crafted to be ${city}'s best — every single time.`;
          else if (weak.match(/fast|quick/)) desc = `Fast, reliable ${currentServiceName} — built for ${city}'s pace.`;
          else desc = `${desc.charAt(0).toUpperCase() + desc.slice(1)} — proudly serving ${city}.`;
        }
        const cleaned = desc.charAt(0).toUpperCase() + desc.slice(1);
        await delay(300);
        addMsg("bruno", `Here's how that reads on your site:\n\n"${cleaned}"\n\nDoes that work?`);
        setStep("q3_confirm");
        break;
      }

      // Q3: Services — confirm
      case "q3_confirm": {
        const yes = /^(yes|yeah|yep|sure|ok|good|fine|perfect|great|love it|works|that works|sounds good|confirmed|absolutely)$/i.test(ans.trim());
        if (!yes) {
          addMsg("bruno", `No problem — give me a better description for ${currentServiceName}:`);
          setStep("q3_desc");
          return;
        }
        // Get the description from the last bruno message
        const lastBruno = [...chat].reverse().find((m) => m.role === "bruno" && m.text.includes("Here's how that reads"));
        const descMatch = lastBruno?.text.match(/"([^"]+)"/);
        const finalDesc = descMatch?.[1] || `Professional ${currentServiceName} services.`;
        const newServices = [...services, { name: currentServiceName, description: finalDesc }];
        setServices(newServices);
        const idx = currentServiceIdx + 1;
        setCurrentServiceIdx(idx);

        if (idx < 3) {
          await delay(300);
          const acks = ["Solid.", "Love it.", "That works.", "Good one.", "Nice."];
          const ack = acks[idx % acks.length];
          addMsg("bruno", `${ack} What's service #${idx + 1}?${idx === 2 ? ' (or say "skip" if two is enough)' : ""}`);
          setStep("q3_name");
        } else {
          // Move to Q4 — Taglines
          await delay(400);
          addMsg("bruno", "Generating tagline options...");
          const taglines = await generateTaglines(0);
          setTaglineAttempt(0);
          await delay(300);
          addMsg("bruno", "Here are three tagline options — tap the one you like:", taglines.map((t) => ({ label: t, value: t })));
          setStep("q4");
        }
        break;
      }

      // Q4: Tagline selection
      case "q4": {
        const none = /^(none|none of these|no|nope|different|other)$/i.test(ans.trim());
        if (none) {
          const attempt = taglineAttempt + 1;
          setTaglineAttempt(attempt);
          if (attempt === 1) {
            addMsg("bruno", "What feeling should your brand give people?");
            return; // Stay on q4, next input will generate new taglines
          } else if (attempt === 2) {
            addMsg("bruno", "Give me one word that describes your business:");
            return;
          } else {
            // Auto-select first
            const taglines = await generateTaglines(2);
            const picked = taglines[0] || `${bizName} — ${city}`;
            setTagline(picked);
            await delay(300);
            addMsg("bruno", `I'll go with "${picked}" — your rep can update this anytime.\n\nHow long have you been open?`);
            setStep("q5");
            return;
          }
        }
        // Check if it's a feeling/word response for re-generation
        if (taglineAttempt > 0 && ans.length < 40) {
          const taglines = await generateTaglines(taglineAttempt);
          await delay(300);
          addMsg("bruno", "Here are three new options:", taglines.map((t) => ({ label: t, value: t })));
          return;
        }
        // Direct selection
        setTagline(ans);
        await delay(300);
        addMsg("bruno", `Locked: "${ans}"\n\nHow long have you been open?`);
        setStep("q5");
        break;
      }

      // Q5: Stats — years open
      case "q5": {
        const numMatch = ans.match(/(\d+)/);
        const years = numMatch ? numMatch[1] : "5";
        setYearsOpen(years);
        const bt = classifyBusinessType(bizName, services.map((s) => s.name).join(" "));
        const dailyAvg = DAILY_AVG[bt] || 8;
        const projected = Math.round(parseInt(years) * dailyAvg * 365 / 10); // conservative estimate
        const rounded = projected > 1000 ? `${Math.round(projected / 1000) * 1000}+` : `${projected}+`;
        setCustomerCount(rounded);
        const sbr = sbrRef.current;
        const rating = (sbr?.starRating as string) || "4.8";
        setStarRating(rating);
        await delay(400);
        addMsg("bruno", `Based on ${years} years in ${city}, I'm estimating you've served over ${rounded.replace("+", "")} customers — does that sound right?`);
        // Wait for confirm, then move to Q6
        setStep("q6"); // Actually this is the confirm step before quote
        break;
      }

      // Q6: Customer quote (optional)
      case "q6": {
        // First check if this is the stats confirmation
        const isConfirm = /^(yes|yeah|yep|sure|ok|sounds|right|correct|about|close|sounds right)$/i.test(ans.trim());
        const isCorrection = /\d/.test(ans);
        if (isConfirm || isCorrection) {
          if (isCorrection && !isConfirm) {
            const numMatch = ans.match(/(\d[\d,]*)/);
            if (numMatch) setCustomerCount(numMatch[1].replace(/,/g, "") + "+");
          }
          await delay(300);
          addMsg("bruno", `What's something a happy customer actually said about you? Even just a few words — I'll clean it up.\n\nOr say "skip".`);
          return; // Stay on q6 for the actual quote
        }
        // This is the actual quote response
        const isSkip = /^(skip|no|pass|nothing)$/i.test(ans.trim());
        const isNotReview = /^(i wish|lol|haha|sure|ok|idk|hmm|meh|nah|ha|yea)$/i.test(ans.trim());
        if (isNotReview) {
          addMsg("bruno", "Ha — give me something a real customer actually said, even just a few words.");
          return;
        }
        if (isSkip) {
          const generic = `Outstanding ${classifyBusinessType(bizName, "")} service — exactly what ${city} needed.`;
          setCustomerQuote(generic);
          await delay(300);
          addMsg("bruno", `I'll use a placeholder review. Your rep can update it.\n\nWhat's the best phone number for customers to call?`);
          setStep("q7");
          return;
        }
        // Clean up quote
        let quote = ans.trim();
        if (!quote.startsWith('"')) quote = quote.charAt(0).toUpperCase() + quote.slice(1);
        setCustomerQuote(quote);
        await delay(300);
        addMsg("bruno", `Here's your featured review:\n\n"⭐⭐⭐⭐⭐ ${quote} — Google Review"\n\nGood?\n\nWhat's the best phone number for customers to call?`);
        setStep("q7");
        break;
      }

      // Q7: Phone
      case "q7": {
        const phoneMatch = ans.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (!phoneMatch) { addMsg("bruno", "I need a phone number — what's the best number to reach the business?"); return; }
        const formatted = formatPhone(phoneMatch[0]);
        setPhone(formatted);
        await delay(300);
        // CTA suggestion based on business type
        const bt = classifyBusinessType(bizName, services.map((s) => s.name).join(" "));
        const suggestion = getCTASuggestion(bt, bt);
        const alt = bt === "restaurant" ? "Reserve a Table" : bt === "dental" ? "Call Today" : bt === "fitness" ? "Join Today" : "Call Now";
        addMsg("bruno", "What should the main button say on your site?", [
          { label: suggestion, value: suggestion },
          { label: alt, value: alt },
        ]);
        setStep("q8");
        break;
      }

      // Q8: CTA
      case "q8": {
        const cleaned = ans.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        setCta(cleaned);
        await delay(300);
        addMsg("bruno", `Last thing — choose your site style:`);
        setStep("q9");
        break;
      }

      // Q9: Look — handled by card click
      case "q9": {
        let lookId = "";
        if (["warm_bold", "professional", "bold_modern"].includes(ans)) lookId = ans;
        else if (ans.match(/local|warm/i)) lookId = "warm_bold";
        else if (ans.match(/community|professional|clean/i)) lookId = "professional";
        else if (ans.match(/premier|bold|modern/i)) lookId = "bold_modern";
        if (!lookId) { addMsg("bruno", "Pick one — click a card or type Local, Community, or Premier."); return; }
        setLook(lookId);
        const label = LOOK_OPTIONS.find((l) => l.id === lookId)?.label || lookId;
        // Auto-generate domain silently
        const slug = bizName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
        setSuggestedDomain(`${slug}.com`);

        if (lookId === "bold_modern") {
          import("canvas-confetti").then((mod) => mod.default({ particleCount: 120, spread: 80, colors: ["#F5C842", "#0d1a2e", "#ffffff"] }));
          await delay(300);
          addMsg("bruno", `⭐ Premier selected! Your site will include our featured business badge, live review ticker, and animated stats.`);
        } else {
          await delay(300);
          addMsg("bruno", `${label} — great choice.`);
        }
        await delay(500);
        // Go straight to summary
        const svcList = services.map((s) => `• ${s.name}: ${s.description}`).join("\n");
        addMsg("bruno", `That's everything!\n\n📋 ${bizName}\n${city}, ${zip}\n${phone}\n\nServices:\n${svcList}\n\nTagline: "${tagline}"\nLook: ${label}\n\nCreating your site...`);
        setStep("finish");
        await doFinish();
        break;
      }
    }
  }

  async function doFinish() {
    await delay(800);
    addMsg("bruno", "📍 Analyzing market...");
    await delay(600);
    addMsg("bruno", "🎨 Building campaign...");
    await delay(400);
    addMsg("bruno", "✅ Profile ready — opening now.");

    try {
      const svcNames = services.map((s) => s.name).join(", ");
      const svcDescs = services.map((s) => s.description).join(". ");
      const res = await fetch("/api/intake/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeAnswers: {
            q1: `${bizName}, ${city} ${zip}`,
            q2: svcDescs,
            q3: svcNames,
            q4: cta,
            q5: look,
            q6: "no",
            q7: phone,
            q8: tagline,
            q9: suggestedDomain,
          },
          sbrData: {
            ...(sbrData || {}),
            tagline,
            yearsServing: yearsOpen || "5+",
            happyClients: customerCount || "500+",
            starRating,
            customerQuote,
            suggestedTagline: tagline,
            services: services.map((s) => ({ name: s.name, description: s.description })),
          },
          rep: isMagic ? "magic-link" : "ted",
        }),
      });
      const data = await res.json();
      if (data.profile?.id) {
        await delay(800);
        router.push(`/profile/${data.profile.id}`);
      }
    } catch { /* error */ }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0d1a2e" }}>
      <TopNav activePage="intake" />

      <div style={{ display: "flex", flex: 1 }}>
        {/* Chat Panel */}
        <div style={{ width: "50%", display: "flex", flexDirection: "column", borderRight: "1px solid #1e293b" }}>
          <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Bruno Intake</h2>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Step: {step}</p>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {chat.map((msg, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", borderRadius: 12, padding: "10px 16px", fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6,
                    background: msg.role === "user" ? "#F5C842" : "#1a2740",
                    color: msg.role === "user" ? "#0d1a2e" : "#fff",
                    border: msg.role === "bruno" ? "1px solid #334155" : "none",
                  }}>
                    {msg.role === "bruno" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0d1a2e", fontSize: 12, flexShrink: 0 }}>B</div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#F5C842" }}>Bruno</span>
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
                {/* Pill buttons */}
                {msg.pills && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, paddingLeft: msg.role === "bruno" ? 36 : 0 }}>
                    {msg.pills.map((pill) => (
                      <button key={pill.value} onClick={() => handlePillClick(pill.value)} style={{
                        background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 999,
                        padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}>
                        {pill.label}
                      </button>
                    ))}
                    {step === "q4" && (
                      <button onClick={() => handlePillClick("none of these")} style={{
                        background: "transparent", color: "#64748b", border: "1px solid #334155", borderRadius: 999,
                        padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}>
                        None of these
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Look cards for Q9 */}
            {step === "q9" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 8 }}>
                {LOOK_OPTIONS.map((l) => (
                  <button key={l.id} onClick={() => handleSend(l.id)} style={{
                    background: "#1a2740", border: l.id === "bold_modern" ? "2px solid #F5C842" : "1px solid #334155",
                    borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left",
                  }}>
                    <div style={{ height: 4, background: l.accent, borderRadius: 2, marginBottom: 10 }} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{l.label}</p>
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{l.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 36 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842", animation: "pulse 1s infinite" }} />
                <span style={{ fontSize: 12, color: "#64748b" }}>Bruno is thinking...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {step !== "finish" && (
            <div style={{ borderTop: "1px solid #1e293b", padding: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    let v = e.target.value;
                    if (step === "q7") v = formatPhone(v);
                    setInput(v);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={step === "q9" ? "Or type: Local, Community, Premier..." : "Type your answer..."}
                  style={{ flex: 1, borderRadius: 8, border: "1px solid #334155", background: "#1a2740", padding: "10px 16px", fontSize: 14, color: "#fff", outline: "none" }}
                  disabled={loading}
                />
                <button onClick={() => handleSend()} disabled={loading || !input.trim()} style={{
                  background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 8,
                  padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1,
                }}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview Panel */}
        <div style={{ width: "50%", background: "#1a2740", padding: 32, overflowY: "auto", position: "sticky", top: 0, height: "100vh" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", marginBottom: 4 }}>Live Preview</p>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 24 }}>Profile Preview</p>

          <div style={{ background: "#0d1a2e", border: "1px solid #334155", borderRadius: 12, padding: 32 }}>
            {bizName ? (
              <>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>{bizName}</h2>
                {city && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{city}{zip ? `, ${zip}` : ""}</p>}

                {tagline && <p style={{ fontSize: 15, color: "#F5C842", fontStyle: "italic", marginTop: 12 }}>&ldquo;{tagline}&rdquo;</p>}

                {services.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Services</p>
                    {services.map((s, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{s.name}</span>
                        <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>{s.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {yearsOpen && (
                  <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                    <div><span style={{ fontSize: 20, fontWeight: 800, color: "#F5C842" }}>{yearsOpen}+</span><p style={{ fontSize: 10, color: "#64748b" }}>Years</p></div>
                    <div><span style={{ fontSize: 20, fontWeight: 800, color: "#F5C842" }}>{customerCount}</span><p style={{ fontSize: 10, color: "#64748b" }}>Customers</p></div>
                    <div><span style={{ fontSize: 20, fontWeight: 800, color: "#F5C842" }}>{starRating}⭐</span><p style={{ fontSize: 10, color: "#64748b" }}>Rating</p></div>
                  </div>
                )}

                {customerQuote && <p style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginTop: 12, borderLeft: "2px solid #F5C842", paddingLeft: 12 }}>&ldquo;{customerQuote}&rdquo;</p>}

                {cta && <button style={{ marginTop: 16, background: "#F5C842", color: "#0d1a2e", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700 }}>{cta}</button>}
                {phone && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 12 }}>{phone}</p>}

                {look && previewHtml && (
                  <div style={{ marginTop: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>
                      Site Preview — {LOOK_OPTIONS.find((l) => l.id === look)?.label}
                    </p>
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
                <p style={{ color: "#64748b" }}>Profile will build here as you answer questions.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0d1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /></div>}>
      <IntakeInner />
    </Suspense>
  );
}
