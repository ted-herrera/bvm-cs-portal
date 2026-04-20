"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Msg { role: "bruno" | "user"; text: string }

interface CampaignFields {
  businessName: string; category: string; city: string; zip: string;
  services: string; adSize: string; tagline: string;
  qrUrl: string; contactPhone: string; contactEmail: string; contactAddress: string;
  complete: boolean;
}

const EMPTY: CampaignFields = {
  businessName: "", category: "", city: "", zip: "", services: "", adSize: "",
  tagline: "", qrUrl: "", contactPhone: "", contactEmail: "", contactAddress: "",
  complete: false,
};

function getRepId(): string {
  try {
    const raw = localStorage.getItem("campaign_user") || (() => {
      const c = document.cookie.split(";").find(x => x.trim().startsWith("campaign_user="));
      return c ? decodeURIComponent(c.split("=").slice(1).join("=")) : null;
    })();
    if (raw) return JSON.parse(raw).username || "unassigned";
  } catch { /* */ }
  return "unassigned";
}

const SYSTEM = `You are Bruno, BVM's campaign intake assistant. Collect these fields ONE AT A TIME in natural conversation. Be warm, brief, and never robotic. Never list multiple questions at once.

FIELDS TO COLLECT (in this order):
1. Business name and city
2. Business category (restaurant, dental, legal, fitness, home services, retail, etc)
3. ZIP code
4. Primary service or offer for the ad
5. Ad size — present options: 1/8 Page (3.65"x2.5"), 1/4 Page (3.65"x5") — most popular, 1/3 Page Vertical (2.5"x10"), 1/2 Page (7.5"x5"), Full Page (7.5"x10")
6. Tagline — generate 3 punchy options based on business+city, let them pick or skip
7. Website URL for QR code — "What's your website? We'll add a QR code." Skip available.
8. Contact phone for the ad
9. Contact email for the ad
10. Full business address (street, city, state, zip) — "What's your full address for the ad?" Skip available.

CRITICAL OUTPUT: Always end every response with a JSON block:
###FIELDS###
{"businessName":"","category":"","city":"","zip":"","services":"","adSize":"","tagline":"","qrUrl":"","contactPhone":"","contactEmail":"","contactAddress":"","complete":false}
###END###

Fill in collected fields. Use empty string for uncollected. Set complete=true ONLY when all required fields collected (tagline, qrUrl, contactAddress may be empty if skipped).`;

function parseResponse(raw: string): { text: string; fields: Partial<CampaignFields> } {
  const idx = raw.indexOf("###FIELDS###");
  if (idx === -1) return { text: raw.trim(), fields: {} };
  const text = raw.substring(0, idx).trim();
  const endIdx = raw.indexOf("###END###", idx);
  const jsonStr = endIdx > -1 ? raw.substring(idx + 12, endIdx).trim() : raw.substring(idx + 12).trim();
  try { return { text, fields: JSON.parse(jsonStr) }; } catch {
    const m = jsonStr.match(/\{[\s\S]*\}/);
    if (m) try { return { text, fields: JSON.parse(m[0]) }; } catch { /* */ }
    return { text, fields: {} };
  }
}

export default function CampaignIntakePage() {
  const router = useRouter();
  const [chat, setChat] = useState<Msg[]>([{ role: "bruno", text: "Hey — I'm Bruno! Let's set up your print campaign. What's the business name and where are they located?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<CampaignFields>(EMPTY);
  const [generating, setGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Array<{ role: string; content: string }>>([{ role: "assistant", content: "Hey — I'm Bruno! Let's set up your print campaign. What's the business name and where are they located?" }]);
  const repId = useRef("unassigned");

  useEffect(() => { repId.current = getRepId(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, loading]);

  async function send(userText?: string) {
    const msg = userText || input.trim();
    if (!msg || loading || generating) return;
    setInput("");

    const userMsg: Msg = { role: "user", text: msg };
    setChat(prev => [...prev, userMsg]);
    historyRef.current.push({ role: "user", content: msg });
    setLoading(true);

    try {
      const collectedStr = Object.entries(fields).filter(([k, v]) => k !== "complete" && v).map(([k, v]) => `- ${k}: ${v}`).join("\n");
      const systemWithFields = SYSTEM + (collectedStr ? `\n\n=== ALREADY COLLECTED ===\n${collectedStr}\nDo NOT ask for these again.` : "");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemWithFields, messages: historyRef.current, temperature: 0.7 }),
      });
      const data = await res.json();
      const raw = data.response || "";
      const { text, fields: newFields } = parseResponse(raw);

      historyRef.current.push({ role: "assistant", content: raw });
      setChat(prev => [...prev, { role: "bruno", text: text || "Let me think..." }]);

      if (newFields && Object.keys(newFields).length > 0) {
        setFields(prev => {
          const merged = { ...prev };
          for (const [k, v] of Object.entries(newFields)) {
            if (v && k !== "complete") (merged as Record<string, unknown>)[k] = v;
          }
          merged.complete = !!newFields.complete;
          return merged;
        });

        if (newFields.complete) {
          const finalFields = { ...fields };
          for (const [k, v] of Object.entries(newFields)) {
            if (v && k !== "complete") (finalFields as Record<string, unknown>)[k] = v;
          }
          setTimeout(() => runGeneration(finalFields), 500);
        }
      }
    } catch (e) {
      console.error("Bruno error:", e);
      setChat(prev => [...prev, { role: "bruno", text: "Sorry, hit a snag. Try again?" }]);
    }
    setLoading(false);
  }

  async function runGeneration(f: CampaignFields) {
    setGenerating(true);
    const clientId = crypto.randomUUID();

    // Save to Supabase
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row: any = {
          id: clientId, business_name: f.businessName, category: f.category,
          city: f.city, zip: f.zip, services: f.services, ad_size: f.adSize,
          tagline: f.tagline || null, rep_id: repId.current, stage: "intake", revisions: [],
        };
        const { error } = await sb.from("campaign_clients").insert(row);
        if (error) console.error("Insert error:", error.message);
      }
    } catch (e) { console.error("Supabase error:", e); }

    // SBR
    let sbrData = null;
    try {
      const r = await fetch("/api/campaign/sbr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessName: f.businessName, city: f.city, zip: f.zip, category: f.category }) });
      sbrData = await r.json();
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) await sb.from("campaign_clients").update({ sbr_data: sbrData, stage: "tearsheet" }).eq("id", clientId);
    } catch (e) { console.error("SBR error:", e); }

    // Images
    try {
      const r = await fetch("/api/campaign/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessName: f.businessName, category: f.category, city: f.city, services: f.services, adSize: f.adSize, tagline: f.tagline, sbrData }) });
      const d = await r.json();
      if (d.directions) {
        const { getSupabase } = await import("@/lib/supabase");
        const sb = getSupabase();
        if (sb) await sb.from("campaign_clients").update({ generated_directions: d.directions }).eq("id", clientId);
      }
    } catch (e) { console.error("Image error:", e); }

    router.push("/campaign/tearsheet/" + clientId);
  }

  async function runDemo() {
    const demo: CampaignFields = { businessName: "Ted's Burger Shack", category: "Restaurant", city: "Tulsa", zip: "74103", services: "Premium burgers, craft shakes, local ingredients", adSize: "1/4 Page", tagline: "Tulsa's favorite burger.", qrUrl: "https://tedsburgershack.com", contactPhone: "(918) 555-0123", contactEmail: "hello@tedsburgershack.com", contactAddress: "123 Main St, Tulsa, OK 74103", complete: true };
    setFields(demo);
    setChat(prev => [...prev, { role: "bruno", text: "Running demo — Ted's Burger Shack in Tulsa..." }]);
    repId.current = "Karen Guirguis";
    await runGeneration(demo);
  }

  const filledCount = Object.entries(fields).filter(([k, v]) => k !== "complete" && v).length;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#1B2A4A", fontFamily: "'DM Sans', sans-serif" }}>
      {/* LEFT — Bruno Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ height: 56, background: "#2d3e50", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 12 }}>B</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Bruno</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Print Campaign Intake</span>
          <div style={{ flex: 1 }} />
          <button onClick={runDemo} disabled={generating} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "5px 14px", fontSize: 11, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontWeight: 600 }}>Demo Run →</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px" }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "bruno" && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 10, flexShrink: 0 }}>B</div>}
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "#F5C842" : "rgba(255,255,255,0.08)", color: m.role === "user" ? "#1B2A4A" : "#fff", fontSize: 14, lineHeight: 1.5 }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1B2A4A", fontSize: 10, flexShrink: 0 }}>B</div>
              <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.08)", display: "flex", gap: 4 }}>
                {[0, 1, 2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C842", animation: "pulse 1s ease infinite", animationDelay: j * 0.2 + "s" }} />)}
              </div>
            </div>
          )}
          {generating && (
            <div style={{ textAlign: "center", padding: 24, color: "rgba(255,255,255,0.5)" }}>
              <div style={{ width: 32, height: 32, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              Generating your campaign directions...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {!generating && (
          <div style={{ padding: "12px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !loading) send(); }} placeholder="Type your answer..." style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none" }} />
              <button onClick={() => send()} disabled={loading || !input.trim()} style={{ background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>Send</button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — Brief Panel */}
      <div style={{ width: 400, background: "rgba(255,255,255,0.03)", padding: "28px 24px", overflowY: "auto" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#F5C842", margin: "0 0 6px" }}>Campaign Brief</h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 20px" }}>{filledCount} of 11 fields collected</p>
        <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(filledCount / 11) * 100}%`, background: "#F5C842", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>

        {([
          ["Business Name", fields.businessName],
          ["Category", fields.category],
          ["City", fields.city],
          ["ZIP", fields.zip],
          ["Services", fields.services],
          ["Ad Size", fields.adSize],
          ["Tagline", fields.tagline],
          ["QR URL", fields.qrUrl],
          ["Phone", fields.contactPhone],
          ["Email", fields.contactEmail],
          ["Address", fields.contactAddress],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
            {val ? (
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{val}</div>
            ) : (
              <div style={{ height: 18, background: "rgba(255,255,255,0.05)", borderRadius: 4, width: "65%" }} />
            )}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}
