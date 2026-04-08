"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import { classifyBusinessType, detectSubType, getServiceSuggestions, getCTASuggestion } from "@/lib/business-classifier";

const LOOK_OPTIONS = [
  { id: "warm_bold", label: "Warm & Bold", accent: "#c2692a", desc: "Rustic, high energy — food & hospitality", colors: ["#c2692a", "#F5C842", "#1a2740"] },
  { id: "professional", label: "Clean & Professional", accent: "#185fa5", desc: "Trustworthy — healthcare, dental, legal", colors: ["#185fa5", "#ecf0f1", "#2c3e50"] },
  { id: "bold_modern", label: "Bold & Modern", accent: "#7c3aed", desc: "Contemporary — home services, construction", colors: ["#0d1a2e", "#F5C842", "#7c3aed"] },
];

type Step = "name" | "city" | "zip" | "sbr" | "description" | "services" | "cta" | "look" | "logo" | "phone" | "occasion" | "complete";

interface Msg { role: "bruno" | "rep"; text: string }

function parseBrunoMessage(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#F5C842;text-decoration:underline;font-weight:600">$1</a>');
}

const DEMO_BUSINESSES = [
  { name: "Rosalinda's Tacos", city: "Tulsa", zip: "74103", description: "Authentic street tacos made fresh daily", services: "Dine-In, Takeout & Delivery, Catering & Events", cta: "Order Now", look: "warm_bold", hasLogo: false, phone: "918-555-0142", address: "123 Main St Tulsa OK", occasion: "Grand Opening Special" },
  { name: "Peak Dental", city: "Denver", zip: "80202", description: "Family dentistry with a gentle touch", services: "General Dentistry, Cosmetic Dentistry, Emergency Care", cta: "Book Now", look: "professional", hasLogo: true, phone: "303-555-0198", address: "456 Broadway Denver CO", occasion: "" },
  { name: "Iron Ridge Roofing", city: "Nashville", zip: "37201", description: "Storm damage repair and roof replacement specialists", services: "Roof Replacement, Storm Damage Repair, Free Inspections", cta: "Call Us Today", look: "bold_modern", hasLogo: false, phone: "615-555-0167", address: "789 Music Row Nashville TN", occasion: "Spring Storm Season" },
  { name: "Zen Flow Yoga", city: "Austin", zip: "78701", description: "Hot yoga and mindfulness for all levels", services: "Group Classes, Private Sessions, Wellness Workshops", cta: "Book a Class", look: "professional", hasLogo: true, phone: "512-555-0134", address: "321 Congress Ave Austin TX", occasion: "" },
  { name: "Hank's Hamburgers", city: "Tulsa", zip: "74103", description: "Handcrafted burgers made with local beef", services: "Dine-In, Drive-Thru & Takeout, Catering", cta: "Order Now", look: "warm_bold", hasLogo: false, phone: "918-555-0199", address: "555 Burger Blvd Tulsa OK", occasion: "Happy Hour Specials" },
  { name: "Pacific Auto Care", city: "San Diego", zip: "92101", description: "Full-service auto repair you can trust", services: "Oil Change & Tune-Up, Brake Service, Full Diagnostics", cta: "Schedule Service", look: "bold_modern", hasLogo: true, phone: "619-555-0211", address: "888 Harbor Dr San Diego CA", occasion: "" },
];

const UNCERTAINTY_SIGNALS = ["not sure", "idk", "i don't know", "help", "you pick", "what do you think", "suggest", "recommend", "what should", "what works", "any ideas", "your call", "up to you", "you choose", "what would"];

function isUncertain(msg: string): boolean {
  const lower = msg.toLowerCase();
  return UNCERTAINTY_SIGNALS.some((s) => lower.includes(s));
}

function cleanName(raw: string): string {
  if (!raw) return "";
  let n = raw.trim();
  n = n.replace(/\b\w/g, (c) => c.toUpperCase());
  n = n.replace(/\b([A-Z][a-z]+)(s)(\s+[A-Z])/g, "$1'$2$3");
  return n;
}

const CITY_ABBREVS: Record<string, string> = { okc: "Oklahoma City", nyc: "New York City", la: "Los Angeles", nola: "New Orleans", phx: "Phoenix", atl: "Atlanta", sf: "San Francisco", dc: "Washington DC" };

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [bizName, setBizName] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [desc, setDesc] = useState("");
  const [services, setServices] = useState("");
  const [cta, setCta] = useState("");
  const [look, setLook] = useState("");
  const [hasLogo, setHasLogo] = useState<boolean | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [occasion, setOccasion] = useState("");
  const [sbrData, setSbrData] = useState<Record<string, unknown> | null>(null);
  const [chat, setChat] = useState<Msg[]>([{ role: "bruno", text: "Hey — I'm Bruno. Let's build a profile.\n\nWhat's the business name?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [awaitConfirm, setAwaitConfirm] = useState(false);
  const [pendingVal, setPendingVal] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [demoLoading, setDemoLoading] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const CONFIRM_RE = /^(yes|yeah|yep|yup|correct|right|perfect|great|sounds good|use those|love it|go with that|that works|sure|ok|okay|good|fine|absolutely|exactly|do it|let's go|confirmed|looks good)$/i;
  const SKIP_RE = /^(skip|no|nothing|none|nope|pass|n\/a|not really|no thanks)$/i;

  function addMsg(role: "bruno" | "rep", text: string) {
    setChat((prev) => [...prev, { role, text }]);
  }

  function getBizType() { return classifyBusinessType(bizName, desc); }
  function getSubType() { return detectSubType(bizName, desc); }

  // Fetch site preview
  useEffect(() => {
    if (!look || !bizName) return;
    fetch("/api/site/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "preview",
        lookKey: look,
        profileData: { business_name: bizName, city, zip, phone, intakeAnswers: { q1: `${bizName}, ${city} ${zip}`, q2: desc, q3: services, q4: cta, q5: look, q6: hasLogo ? "yes" : "no", q7: `${phone}, ${address}`, q8: occasion }, sbrData: sbrData || undefined },
      }),
    }).then((r) => r.json()).then((d) => setPreviewHtml(d.html || "")).catch(() => {});
  }, [look, bizName, city, zip, desc, services, cta, phone, address, sbrData, hasLogo, occasion]);

  async function fireSBR(name: string, z: string, c: string) {
    try {
      addMsg("bruno", `📍 ${c}, ${z} — pulling local market data...`);
      const res = await fetch("/api/sbr/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: classifyBusinessType(name, ""), zip: z, city: c }),
      });
      const data = await res.json();
      setSbrData(data);
      const comps = (data.competitors as string[])?.slice(0, 3)?.join(", ");
      if (comps) { await delay(600); addMsg("bruno", `🏆 Top competitors in ${c}: ${comps}`); }
      const insight = data.marketInsight as string;
      if (insight) { await delay(600); addMsg("bruno", `📊 ${insight.substring(0, 120)}...`); }
      await delay(500);
      addMsg("bruno", `✅ Market scan complete.\n\nWhat does ${name} do? One sentence is fine.`);
      setStep("description");
    } catch {
      addMsg("bruno", `Market scan unavailable — no worries. What does ${name} do? One sentence is fine.`);
      setStep("description");
    }
  }

  function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

  async function handleSend(override?: string) {
    const ans = (override || input).trim();
    if (!ans || loading) return;
    setInput("");
    addMsg("rep", ans);
    setLoading(true);

    // Confirmation flow
    if (awaitConfirm) {
      if (CONFIRM_RE.test(ans)) {
        setAwaitConfirm(false);
        // Apply pending value based on step
        if (step === "services") { setServices(pendingVal); setPendingVal(""); await advanceFrom("services"); }
        else if (step === "cta") { setCta(pendingVal); setPendingVal(""); await advanceFrom("cta"); }
      } else {
        setAwaitConfirm(false);
        setPendingVal("");
        addMsg("bruno", "No problem — what would you prefer?");
      }
      setLoading(false);
      return;
    }

    await processStep(ans);
    setLoading(false);
  }

  async function processStep(ans: string) {
    switch (step) {
      case "name": {
        const cleaned = cleanName(ans);
        if (cleaned.length < 2) { addMsg("bruno", "I need at least a business name — what is it?"); return; }
        setBizName(cleaned);
        await delay(400);
        addMsg("bruno", `${cleaned} — nice. Where is ${cleaned} located? City name is fine.`);
        setStep("city");
        break;
      }
      case "city": {
        let c = ans.trim();
        const lower = c.toLowerCase();
        if (CITY_ABBREVS[lower]) c = CITY_ABBREVS[lower];
        else c = c.replace(/\b\w/g, (ch) => ch.toUpperCase());
        if (c.length < 2) { addMsg("bruno", "What city is the business in?"); return; }
        setCity(c);
        await delay(400);
        addMsg("bruno", `${c} — great market. What's the ZIP code?`);
        setStep("zip");
        break;
      }
      case "zip": {
        const zipMatch = ans.match(/\b(\d{5})\b/);
        if (!zipMatch) { addMsg("bruno", "I need a 5-digit ZIP code — what's the ZIP?"); return; }
        setZip(zipMatch[1]);
        await delay(400);
        addMsg("bruno", `Got it — scanning ${city}'s market now...`);
        setStep("sbr");
        await fireSBR(bizName, zipMatch[1], city);
        break;
      }
      case "description": {
        const words = ans.trim().split(/\s+/).filter(Boolean);
        if (words.length < 2) { addMsg("bruno", `Can you give me a bit more? What does ${bizName} actually do for customers?`); return; }
        setDesc(ans);
        await delay(400);
        const encoded = encodeURIComponent(bizName);
        const hl = (sbrData?.campaignHeadline as string) || "";
        const hlParam = hl ? `&headline=${encodeURIComponent(hl)}` : "";
        addMsg("bruno", `Got it.\n\n[Generate Taglines →](https://bvm-studio-app.vercel.app/studio-v2/brand?name=${encoded}${hlParam})  ·  [Generate Logo →](https://bvm-studio-app.vercel.app/studio-v2/brand?name=${encoded}&mode=logo)\n\nWhat are the top 3 services ${bizName} offers? Not sure? I'll suggest some.`);
        setStep("services");
        break;
      }
      case "services": {
        if (isUncertain(ans)) {
          const bt = classifyBusinessType(bizName, desc);
          const st = detectSubType(bizName, desc);
          const sugs = getServiceSuggestions(bt, st);
          const joined = sugs.join(", ");
          setPendingVal(joined);
          setAwaitConfirm(true);
          addMsg("bruno", `For a ${st !== bt ? st : bt} in ${city}, I'd go with: ${joined}. Want those?`);
          return;
        }
        const items = ans.split(/[,\n]/).map((s) => s.trim()).filter((s) => s.length > 1);
        if (items.length < 2) { addMsg("bruno", `Got "${ans}" — what are the other two? Or say "suggest" and I'll pick some.`); return; }
        setServices(items.join(", "));
        await advanceFrom("services");
        break;
      }
      case "cta": {
        if (isUncertain(ans)) {
          const rec = getCTASuggestion(getBizType(), getSubType());
          setPendingVal(rec);
          setAwaitConfirm(true);
          addMsg("bruno", `For a ${getSubType() !== getBizType() ? getSubType() : getBizType()} in ${city}, "${rec}" works well. Want that?`);
          return;
        }
        if (ans.trim().length < 2) { addMsg("bruno", `What should the button say? Something like "Order Now" or "Book Now"?`); return; }
        const cleaned = ans.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        setCta(cleaned);
        await advanceFrom("cta");
        break;
      }
      case "look": {
        let lookId = "";
        if (["warm_bold", "professional", "bold_modern"].includes(ans)) lookId = ans;
        else if (ans.match(/warm/i)) lookId = "warm_bold";
        else if (ans.match(/professional|clean/i)) lookId = "professional";
        else if (ans.match(/bold|modern/i)) lookId = "bold_modern";
        if (!lookId) { addMsg("bruno", "Pick one — click a card or type Warm, Professional, or Bold."); return; }
        setLook(lookId);
        const label = lookId === "warm_bold" ? "Warm & Bold" : lookId === "professional" ? "Clean & Professional" : "Bold & Modern";
        await delay(400);
        addMsg("bruno", `${label} — great fit. Does ${bizName} have a logo ready? Yes or no.`);
        setStep("logo");
        break;
      }
      case "logo": {
        const yes = /\b(yes|yeah|yep|yup|have one|got one|ready)\b/i.test(ans);
        const no = /\b(no|nope|nah|don't|dont|not yet)\b/i.test(ans);
        if (!yes && !no) { addMsg("bruno", `Just a yes or no — does ${bizName} have a logo?`); return; }
        setHasLogo(yes);
        await delay(400);
        const encoded = encodeURIComponent(bizName);
        if (yes) {
          addMsg("bruno", `Got it — we'll collect it through their portal. What's the best phone number for ${bizName}? Address too if you have it.`);
        } else {
          addMsg("bruno", `Got it — adding logo generator to their portal. [Generate Logo for ${bizName} →](https://bvm-studio-app.vercel.app/studio-v2/brand?name=${encoded}&mode=logo)\n\nWhat's the best phone number? Address too if you have it.`);
        }
        setStep("phone");
        break;
      }
      case "phone": {
        const phoneMatch = ans.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (!phoneMatch) { addMsg("bruno", `I need a phone number for ${bizName} — what's the best number?`); return; }
        setPhone(phoneMatch[0]);
        const addr = ans.replace(phoneMatch[0], "").replace(/^[,\s]+/, "").trim();
        if (addr) setAddress(addr);
        await delay(400);
        addMsg("bruno", "Got it. Last one — any special occasion or promotion? Or say skip.");
        setStep("occasion");
        break;
      }
      case "occasion": {
        const isSkip = SKIP_RE.test(ans.trim());
        setOccasion(isSkip ? "" : ans);
        await delay(400);
        addMsg("bruno", `Perfect — that's everything for ${bizName}. Generating their profile now...`);
        await doFinish(isSkip ? "" : ans);
        break;
      }
    }
  }

  async function advanceFrom(from: string) {
    await delay(400);
    if (from === "services") {
      const rec = getCTASuggestion(getBizType(), getSubType());
      addMsg("bruno", `Great. What should the CTA button say? For this type I'd suggest "${rec}". Want that or something else?`);
      setStep("cta");
    } else if (from === "cta") {
      addMsg("bruno", `Perfect. Now pick the vibe for ${bizName}. Click one:`);
      setStep("look");
    }
  }

  async function doFinish(occ: string) {
    setFinishing(true);
    await delay(600);
    addMsg("bruno", `📍 Analyzing ${city} market...`);
    await delay(600);
    const lookLabel = look === "warm_bold" ? "Warm & Bold" : look === "professional" ? "Clean & Professional" : "Bold & Modern";
    addMsg("bruno", `🎨 Building ${lookLabel} campaign...`);
    await delay(400);
    addMsg("bruno", "✅ Profile ready — opening now.");

    try {
      const res = await fetch("/api/intake/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeAnswers: { q1: `${bizName}, ${city} ${zip}`, q2: desc, q3: services, q4: cta, q5: look, q6: hasLogo ? "yes" : "no", q7: `${phone}${address ? `, ${address}` : ""}`, q8: occ || "skip" },
          sbrData: sbrData || {},
          rep: "ted",
        }),
      });
      const data = await res.json();
      if (data.profile?.id) router.push(`/profile/${data.profile.id}`);
    } catch { setFinishing(false); }
  }

  async function fillDemo() {
    const biz = DEMO_BUSINESSES[Math.floor(Math.random() * DEMO_BUSINESSES.length)];
    setDemoLoading(biz.name);
    await delay(1200);
    try {
      const res = await fetch("/api/intake/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeAnswers: { q1: `${biz.name}, ${biz.city} ${biz.zip}`, q2: biz.description, q3: biz.services, q4: biz.cta, q5: biz.look, q6: biz.hasLogo ? "yes" : "no", q7: `${biz.phone}, ${biz.address}`, q8: biz.occasion || "skip" },
          sbrData: {},
          rep: "demo",
        }),
      });
      const data = await res.json();
      if (data.profile?.id) router.push(`/profile/${data.profile.id}`);
    } catch { setDemoLoading(""); }
  }

  if (demoLoading) {
    return (
      <div className="gold-top-bar flex min-h-screen items-center justify-center bg-navy-dark">
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "2px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#F5C842", fontSize: 14, fontWeight: 600 }}>Loading demo: {demoLoading}...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0d1a2e" }}>
      <TopNav activePage="intake" />

      <div className="flex flex-1">
        {/* Chat Panel */}
        <div className="flex w-1/2 flex-col border-r border-[#1e293b]">
          <div className="border-b border-[#1e293b] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Bruno Intake</h2>
              <p className="text-xs text-[#64748b]">Step: {step}</p>
            </div>
            <button onClick={fillDemo} style={{ background: "none", border: "1px solid #F5C842", color: "#F5C842", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Fill Demo Data →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "rep" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === "rep" ? "bg-gold text-navy-dark" : "bg-navy-mid text-white border border-[#334155]"}`}>
                  {msg.role === "bruno" && (
                    <div className="mb-2 flex items-center gap-2">
                      <img src="/bruno.png" alt="Bruno" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                      <span className="text-xs font-semibold text-gold">Bruno</span>
                    </div>
                  )}
                  {msg.role === "bruno" ? (
                    <span dangerouslySetInnerHTML={{ __html: parseBrunoMessage(msg.text) }} />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {/* Look cards */}
            {step === "look" && !awaitConfirm && (
              <div className="grid grid-cols-3 gap-3 py-2">
                {LOOK_OPTIONS.map((l) => (
                  <button key={l.id} onClick={() => handleSend(l.id)} className="rounded-xl border border-[#334155] bg-navy-mid p-4 text-left transition hover:border-gold">
                    <div style={{ height: 4, background: l.accent, borderRadius: 2, marginBottom: 10 }} />
                    <p className="text-sm font-semibold text-white">{l.label}</p>
                    <p className="text-xs text-[#64748b] mt-1">{l.desc}</p>
                    <div className="mt-2 flex gap-1">
                      {l.colors.map((c, j) => <div key={j} className="h-5 w-5 rounded-full" style={{ backgroundColor: c }} />)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {finishing && (
              <div className="space-y-2 rounded-xl border border-gold/30 bg-navy-mid px-4 py-3">
                <div className="text-sm text-gold">📍 Analyzing {city || "market"}...</div>
                <div className="text-sm text-gold">🎨 Building campaign...</div>
                <div className="text-sm text-green-400">✅ Profile ready — opening now.</div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {!finishing && (
            <div className="border-t border-[#1e293b] p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={step === "look" ? "Or type: warm, professional, bold..." : "Type your answer..."}
                  className="flex-1 rounded-lg border border-[#334155] bg-navy-mid px-4 py-2.5 text-sm text-white outline-none transition focus:border-gold placeholder:text-[#64748b]"
                  disabled={loading || step === "sbr"}
                />
                <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-navy-dark transition hover:bg-gold-hover disabled:opacity-50">
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview Panel */}
        <div className="flex w-1/2 flex-col bg-navy-mid p-8 overflow-y-auto" style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", marginBottom: 4 }}>Live Preview</p>
          <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-[#64748b]">Profile Preview</h3>

          <div className="rounded-xl border border-[#334155] bg-navy-dark p-8">
            {bizName ? (
              <>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{bizName}</h2>
                {city && <p className="mt-1 text-sm text-[#94a3b8]">{city}{zip ? `, ${zip}` : ""}</p>}

                {sbrData && (
                  <div className="mt-4 rounded-lg bg-navy-mid p-4 border border-[#334155]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-2">Market Intelligence</p>
                    {(sbrData.competitors as string[])?.length > 0 && (
                      <p className="text-xs text-[#94a3b8]">Competitors: {(sbrData.competitors as string[]).slice(0, 3).join(", ")}</p>
                    )}
                    {(sbrData.campaignHeadline as string) && <p className="text-xs text-[#F5C842] mt-1 font-medium">{String(sbrData.campaignHeadline)}</p>}
                  </div>
                )}

                {desc && <p className="mt-4 text-sm text-[#94a3b8] italic">&ldquo;{desc}&rdquo;</p>}

                {services && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">Services</p>
                    <div className="flex flex-wrap gap-2">
                      {services.split(",").map((s, i) => <span key={i} className="rounded-full border border-[#334155] px-3 py-1 text-xs text-white">{s.trim()}</span>)}
                    </div>
                  </div>
                )}

                {cta && (
                  <div className="mt-4">
                    <button className="rounded-lg bg-gold px-6 py-2 text-sm font-semibold text-navy-dark">{cta}</button>
                  </div>
                )}

                {look && previewHtml && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Look — {LOOK_OPTIONS.find((l) => l.id === look)?.label}
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
                    <button type="button" onClick={() => { const w = window.open("", "_blank"); if (w) { w.document.write(previewHtml); w.document.close(); } }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#F5C842", fontSize: 12, fontWeight: 600, marginTop: 8, display: "block" }}>
                      View Full Size →
                    </button>
                  </div>
                )}

                {hasLogo !== null && (
                  <div className="mt-4">
                    <span className={`text-sm ${hasLogo ? "text-green-400" : "text-amber-400"}`}>{hasLogo ? "✓ Has logo" : "⚠ Logo pending"}</span>
                  </div>
                )}

                {phone && <div className="mt-4 text-sm text-[#94a3b8]"><p>{phone}{address ? ` · ${address}` : ""}</p></div>}

                {occasion && <div className="mt-3"><span className="rounded-full bg-gold/20 px-3 py-1 text-xs text-gold">{occasion}</span></div>}

                {step === "complete" && (
                  <div className="mt-6 flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-sm text-green-400 font-medium">Profile ready</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 text-4xl opacity-30">📋</div>
                <p className="text-[#64748b]">Profile will build here as you answer questions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
