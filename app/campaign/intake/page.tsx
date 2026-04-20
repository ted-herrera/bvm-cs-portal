"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message { role: "user" | "assistant"; content: string }
interface Brief {
  businessName: string; category: string; city: string; zip: string;
  services: string; adSize: string; tagline: string | null;
  qrUrl: string | null; contactPhone: string; contactEmail: string; contactAddress: string;
}

function getRepFromStorage(): string {
  try {
    const raw = localStorage.getItem("campaign_user") || (() => {
      const c = document.cookie.split(";").find(x => x.trim().startsWith("campaign_user="));
      return c ? decodeURIComponent(c.split("=").slice(1).join("=")) : null;
    })();
    if (raw) return JSON.parse(raw).username || "unassigned";
  } catch { /* */ }
  return "unassigned";
}

const SYSTEM_PROMPT = `You are Bruno, BVM's campaign intake assistant. Collect these fields ONE AT A TIME. Never list multiple questions. Be warm and brief.

COLLECTION ORDER:
1. Business name and city
2. Business category (restaurant, dental, legal, fitness, home services, retail, etc)
3. ZIP code
4. Primary service or offer for the ad
5. Ad size — present these options:
   - 1/8 Page (3.65" x 2.5")
   - 1/4 Page (3.65" x 5") — most popular
   - 1/3 Page Vertical (2.5" x 10")
   - 1/2 Page (7.5" x 5")
   - Full Page (7.5" x 10")
6. Tagline — generate 3 options based on business and city, let them pick or skip
7. Website URL for QR code — ask "What's your website URL? We'll add a QR code to your ad." Skip option available.
8. Contact phone number for the ad
9. Contact email for the ad
10. Full business address — ask "What's your full business address? Street, city, state, zip — this will appear on your ad." Skip option available.

When ALL fields are collected output exactly: BRIEF_COMPLETE followed by JSON on next line:
{"businessName":"...","category":"...","city":"...","zip":"...","services":"...","adSize":"...","tagline":"...","qrUrl":"...","contactPhone":"...","contactEmail":"...","contactAddress":"..."}

Use null for skipped optional fields.`;

export default function CampaignIntake() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Bruno — let's set up your print campaign. What's your business name and what city are you in?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<Partial<Brief>>({});
  const [phase, setPhase] = useState<"intake" | "generating" | "done">("intake");
  const bottomRef = useRef<HTMLDivElement>(null);
  const repId = useRef("unassigned");

  useEffect(() => { repId.current = getRepFromStorage(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || loading || phase !== "intake") return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, system: SYSTEM_PROMPT }),
      });
      const data = await res.json();
      const reply = data.response || data.content?.[0]?.text || "Something went wrong.";
      setLoading(false);

      if (reply.includes("BRIEF_COMPLETE")) {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsedBrief = JSON.parse(jsonMatch[0]) as Brief;
            setBrief(parsedBrief);
            setMessages([...updated, { role: "assistant", content: "Perfect — generating your campaign directions now..." }]);
            setPhase("generating");
            await generateCampaign(parsedBrief);
          } catch {
            setMessages([...updated, { role: "assistant", content: "I had trouble parsing that. Could you try again?" }]);
          }
        }
      } else {
        setMessages([...updated, { role: "assistant", content: reply }]);
      }
    } catch {
      setLoading(false);
      setMessages([...updated, { role: "assistant", content: "Something went wrong — try again." }]);
    }
  }

  async function generateCampaign(b: Brief) {
    const clientId = crypto.randomUUID();

    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { error } = await sb.from("campaign_clients").insert({
          id: clientId, business_name: b.businessName, category: b.category,
          city: b.city, zip: b.zip, services: b.services, ad_size: b.adSize,
          tagline: b.tagline, rep_id: repId.current, stage: "intake", revisions: [],
        });
        if (error) console.error("Supabase insert error:", error.message);
      }
    } catch (e) { console.error("Supabase error:", e); }

    let sbrData = null;
    try {
      const sbrRes = await fetch("/api/campaign/sbr", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: b.businessName, city: b.city, zip: b.zip, category: b.category }),
      });
      sbrData = await sbrRes.json();
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) await sb.from("campaign_clients").update({ sbr_data: sbrData, stage: "tearsheet" }).eq("id", clientId);
    } catch (e) { console.error("SBR error:", e); }

    try {
      const imgRes = await fetch("/api/campaign/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: b.businessName, category: b.category, city: b.city, services: b.services, adSize: b.adSize, tagline: b.tagline, sbrData }),
      });
      const imgData = await imgRes.json();
      if (imgData.directions) {
        const { getSupabase } = await import("@/lib/supabase");
        const sb = getSupabase();
        if (sb) await sb.from("campaign_clients").update({ generated_directions: imgData.directions }).eq("id", clientId);
      }
    } catch (e) { console.error("Image generation error:", e); }

    setPhase("done");
    router.push("/campaign/tearsheet/" + clientId);
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F5F0E8", fontFamily: "Inter, 'DM Sans', sans-serif" }}>
      <div style={{ width: "50%", display: "flex", flexDirection: "column", background: "#FDFAF4", borderRight: "1px solid #DDD5C0" }}>
        <div style={{ padding: "16px 20px", background: "#1B2A4A", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#C8922A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#1B2A4A", fontSize: 14 }}>B</div>
          <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Bruno</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Campaign Intake</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => {
            const demo: Brief = { businessName: "Ted's Burger Shack", category: "Restaurant", city: "Tulsa", zip: "74103", services: "Premium burgers, craft shakes, local ingredients", adSize: "1/4 Page", tagline: "Tulsa's favorite burger.", qrUrl: "https://tedsburgershack.com", contactPhone: "(918) 555-0123", contactEmail: "hello@tedsburgershack.com", contactAddress: "123 Main St, Tulsa, OK 74103" };
            setBrief(demo); setMessages([...messages, { role: "assistant", content: "Running demo intake for Ted's Burger Shack..." }]); setPhase("generating"); repId.current = "Karen Guirguis"; generateCampaign(demo);
          }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontWeight: 600 }}>Demo Run →</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: m.role === "user" ? "#1B2A4A" : "white", color: m.role === "user" ? "white" : "#1C2B1D", fontSize: 14, lineHeight: 1.5, border: m.role === "assistant" ? "1px solid #DDD5C0" : "none" }}>
                {m.content.includes("BRIEF_COMPLETE") ? "Perfect — generating your campaign..." : m.content}
              </div>
            </div>
          ))}
          {loading && <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "white", borderRadius: "4px 16px 16px 16px", width: "fit-content", border: "1px solid #DDD5C0" }}>{[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9B8E7A", animation: "bounce 1.2s infinite", animationDelay: i*0.2+"s", display: "inline-block" }} />)}</div>}
          {phase === "generating" && <div style={{ textAlign: "center", padding: 20, color: "#6B5E45", fontSize: 14 }}><div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>Generating your campaign directions...</div>}
          <div ref={bottomRef} />
        </div>
        {phase === "intake" && (
          <div style={{ padding: 16, borderTop: "1px solid #DDD5C0", display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type your answer..." style={{ flex: 1, padding: "10px 14px", border: "1px solid #DDD5C0", borderRadius: 8, fontSize: 14, outline: "none", background: "#FDFAF4" }} />
            <button onClick={send} disabled={loading} style={{ padding: "10px 20px", background: "#C8922A", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Send</button>
          </div>
        )}
      </div>
      <div style={{ width: "50%", overflowY: "auto", padding: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1B2A4A", marginBottom: 24, fontFamily: "Georgia, serif" }}>Campaign Brief</h2>
        {Object.keys(brief).length === 0 ? (
          <div style={{ color: "#9B8E7A", fontSize: 14 }}>Your brief will appear here as Bruno collects information...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([["Business", (brief as Brief).businessName], ["Category", (brief as Brief).category], ["City", (brief as Brief).city], ["ZIP", (brief as Brief).zip], ["Services", (brief as Brief).services], ["Ad Size", (brief as Brief).adSize], ["Tagline", (brief as Brief).tagline], ["QR URL", (brief as Brief).qrUrl], ["Phone", (brief as Brief).contactPhone], ["Email", (brief as Brief).contactEmail], ["Address", (brief as Brief).contactAddress]] as [string, string | null][]).filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ background: "white", padding: "12px 16px", borderRadius: 8, border: "1px solid #DDD5C0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B8E7A", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, color: "#1C2B1D", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
    </div>
  );
}
