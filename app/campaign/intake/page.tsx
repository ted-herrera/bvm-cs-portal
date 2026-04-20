"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { getCampaignUser } from "@/lib/campaign";
import {
  renderPrintAd,
  getSizeSpec,
  normalizeSize,
  SIZE_LABELS,
  type PrintAdData,
} from "@/lib/print-engine";

interface Msg {
  role: "bruno" | "user";
  text: string;
}

interface IntakeFields {
  businessName: string;
  category: string;
  city: string;
  zip: string;
  services: string;
  adSize: string;
  tagline: string;
  qrUrl: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  complete?: boolean;
}

const EMPTY_FIELDS: IntakeFields = {
  businessName: "",
  category: "",
  city: "",
  zip: "",
  services: "",
  adSize: "",
  tagline: "",
  qrUrl: "",
  contactPhone: "",
  contactEmail: "",
  contactAddress: "",
};

const FIELD_LABELS: Record<keyof Omit<IntakeFields, "complete">, string> = {
  businessName: "Business Name",
  category: "Category",
  city: "City",
  zip: "ZIP Code",
  services: "Services",
  adSize: "Ad Size",
  tagline: "Tagline",
  qrUrl: "QR URL",
  contactPhone: "Phone",
  contactEmail: "Email",
  contactAddress: "Address",
};

const REQUIRED_FIELDS: (keyof IntakeFields)[] = [
  "businessName",
  "category",
  "city",
  "zip",
  "services",
  "adSize",
  "tagline",
];

const SYSTEM_PROMPT = `You are Bruno, a print campaign intake assistant for BVM Print Campaigns. Your job is to collect information about a local business to build a print ad. Be conversational, warm, and professional.

The fields you need to collect:
1. businessName — the business name
2. category — business category (Restaurant, Medical, Legal, etc.)
3. city — city location
4. zip — ZIP code
5. services — key services or products (comma-separated)
6. adSize — ad size: 1/8 Page, 1/4 Page, 1/3 Page Vertical, 1/2 Page, Full Page, or Front Cover
7. tagline — a short tagline or slogan
8. qrUrl — a URL for their QR code (optional, skippable)
9. contactPhone — contact phone number (optional, skippable)
10. contactEmail — contact email (optional, skippable)
11. contactAddress — business address (optional, skippable)

RULES:
1. Check the ALREADY COLLECTED list. NEVER ask for a field that is already collected.
2. Extract any new fields from user messages, merge them, then ask only for what is still missing.
3. If all required fields (1-7) are collected, ask about optional fields (8-11) but let the user skip them.
4. When all fields are collected or user wants to skip remaining optional ones, set complete to true.
5. Each optional field is skippable — if the user says "skip" or "none", move on.
6. Never break flow. Handle anything gracefully.
7. Your text response must be plain conversational text — the JSON block goes at the end between markers.

CRITICAL OUTPUT FORMAT: Always end every response with:
###FIELDS###
{"businessName":"","category":"","city":"","zip":"","services":"","adSize":"","tagline":"","qrUrl":"","contactPhone":"","contactEmail":"","contactAddress":"","complete":false}
###END###

Fill in collected fields. Leave uncollected as empty strings. Set complete to true only when all required fields are populated and optional ones are either collected or skipped.`;

function parseResponse(raw: string): {
  text: string;
  fields: Partial<IntakeFields> & { complete?: boolean };
} {
  const marker = "###FIELDS###";
  const endMarker = "###END###";
  const markerIdx = raw.indexOf(marker);
  if (markerIdx === -1) {
    const cleaned = raw
      .replace(/\{[^{}]*"businessName"[^{}]*\}/g, "")
      .trim();
    return { text: cleaned || raw.trim(), fields: {} };
  }

  const text = raw.substring(0, markerIdx).trim();
  const endIdx = raw.indexOf(endMarker, markerIdx);
  const jsonSlice =
    endIdx > -1
      ? raw.substring(markerIdx + marker.length, endIdx)
      : raw.substring(markerIdx + marker.length);
  const jsonStr = jsonSlice.trim();
  try {
    const fields = JSON.parse(jsonStr);
    return { text, fields };
  } catch {
    const m = jsonStr.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return { text, fields: JSON.parse(m[0]) };
      } catch {
        /* ignore */
      }
    }
    return { text, fields: {} };
  }
}

function buildCollectedFields(
  f: IntakeFields,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === "complete") continue;
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return out;
}

export default function CampaignIntakePage() {
  const [chat, setChat] = useState<Msg[]>([
    {
      role: "bruno",
      text: "Hey there! I'm Bruno, your print campaign assistant. Tell me about the business -- what's the name, what do they do, and where are they located?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [fields, setFields] = useState<IntakeFields>({ ...EMPTY_FIELDS });
  const [repId, setRepId] = useState("unknown");

  const historyRef = useRef<{ role: string; content: string }[]>([
    {
      role: "assistant",
      content:
        "Hey there! I'm Bruno, your print campaign assistant. Tell me about the business -- what's the name, what do they do, and where are they located?",
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    const u = getCampaignUser();
    if (!u) {
      window.location.href = "/campaign/login";
      return;
    }
    setRepId(u.username);
  }, []);

  const filledCount = REQUIRED_FIELDS.filter(
    (k) => {
      const v = fields[k];
      return typeof v === "string" && v.trim() !== "";
    },
  ).length;
  const progress = Math.round((filledCount / REQUIRED_FIELDS.length) * 100);

  const addMsg = useCallback(
    (role: "bruno" | "user", text: string) => {
      setChat((p) => [...p, { role, text }]);
    },
    [],
  );

  async function handleSend(override?: string) {
    const ans = (override || input).trim();
    if (!ans || loading || finished) return;
    setInput("");
    addMsg("user", ans);
    setLoading(true);

    historyRef.current.push({ role: "user", content: ans });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: historyRef.current,
          temperature: 0.7,
          collectedFields: buildCollectedFields(fields),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        addMsg("bruno", `Something went wrong: ${data.error || res.status}`);
        setLoading(false);
        return;
      }

      const raw =
        typeof data.response === "string" && data.response
          ? data.response
          : typeof data.content?.[0]?.text === "string"
            ? data.content[0].text
            : "";

      if (!raw) {
        addMsg("bruno", "I got an empty response -- try again?");
        setLoading(false);
        return;
      }

      const { text, fields: newFields } = parseResponse(raw);

      setFields((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(EMPTY_FIELDS) as (keyof Omit<IntakeFields, "complete">)[]) {
          const val = newFields[key];
          if (typeof val === "string" && val.trim()) {
            updated[key] = val;
          }
        }
        return updated;
      });

      addMsg("bruno", text);
      historyRef.current.push({ role: "assistant", content: raw });

      if (newFields.complete) {
        setFinished(true);
        const merged = { ...fields };
        for (const key of Object.keys(EMPTY_FIELDS) as (keyof Omit<IntakeFields, "complete">)[]) {
          const val = newFields[key];
          if (typeof val === "string" && val.trim()) {
            merged[key] = val;
          }
        }
        await doFinish(merged);
      }
    } catch {
      addMsg("bruno", "Sorry, had a hiccup. Say that again?");
    }

    setLoading(false);
  }

  async function doFinish(f: IntakeFields) {
    try {
      // Save to Supabase campaign_clients (core fields only)
      const createRes = await fetch("/api/campaign/message/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => null);

      // Use a direct supabase insert via a simple approach — post to our own endpoint
      const insertRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "Return exactly: OK",
          messages: [{ role: "user", content: "ping" }],
        }),
      }).catch(() => null);

      // Insert into campaign_clients via supabase directly from the client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      let clientId = crypto.randomUUID();

      if (supabaseUrl && supabaseKey) {
        const insertPayload = {
          id: clientId,
          business_name: f.businessName,
          category: f.category,
          city: f.city,
          zip: f.zip,
          services: f.services,
          ad_size: f.adSize,
          tagline: f.tagline,
          rep_id: repId,
          stage: "intake",
          contact_phone: f.contactPhone || "",
          contact_email: f.contactEmail || "",
          contact_address: f.contactAddress || "",
          qr_url: f.qrUrl || null,
          messages: historyRef.current.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: new Date().toISOString(),
          })),
        };

        const sbRes = await fetch(`${supabaseUrl}/rest/v1/campaign_clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify(insertPayload),
        });

        if (sbRes.ok) {
          const rows = await sbRes.json();
          if (rows?.[0]?.id) clientId = rows[0].id;
        }

        // Suppress unused variable warnings
        void createRes;
        void insertRes;
      }

      // Fire SBR + generate-image in parallel, AWAIT both before redirect
      const [sbrRes, imgRes] = await Promise.allSettled([
        fetch("/api/campaign/sbr", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessName: f.businessName, category: f.category, city: f.city, zip: f.zip }),
        }).then(r => r.json()),
        fetch("/api/campaign/generate-image", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessName: f.businessName, category: f.category, city: f.city, services: f.services, adSize: f.adSize, tagline: f.tagline }),
        }).then(r => r.json()),
      ]);

      // Save SBR data
      if (supabaseUrl && supabaseKey && sbrRes.status === "fulfilled") {
        await fetch(`${supabaseUrl}/rest/v1/campaign_clients?id=eq.${clientId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ sbr_data: sbrRes.value }),
        }).catch(() => {});
      }

      // Save generated directions
      if (supabaseUrl && supabaseKey && imgRes.status === "fulfilled" && imgRes.value.directions) {
        await fetch(`${supabaseUrl}/rest/v1/campaign_clients?id=eq.${clientId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ generated_directions: imgRes.value.directions, stage: "tearsheet" }),
        }).catch(() => {});
      }

      // Redirect to tearsheet
      window.location.href = `/campaign/tearsheet/${clientId}`;
    } catch {
      addMsg("bruno", "Saved your info but hit a snag. Redirecting...");
    }
  }

  async function runDemo() {
    const w = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const d = 500;

    addMsg(
      "user",
      "Ted's Burger Shack, Restaurant in Tulsa, ZIP 74103. Premium burgers, craft shakes, local ingredients.",
    );
    await w(d);
    setFields((p) => ({
      ...p,
      businessName: "Ted's Burger Shack",
      category: "Restaurant",
      city: "Tulsa",
      zip: "74103",
      services: "Premium burgers, craft shakes, local ingredients",
    }));
    addMsg(
      "bruno",
      "Love it -- Ted's Burger Shack in Tulsa! Premium burgers and craft shakes sounds amazing. What size ad are you looking for? We have 1/8, 1/4, 1/3 Vertical, 1/2, Full Page, and Front Cover.",
    );
    await w(d);
    addMsg("user", "1/4 Page");
    await w(d);
    setFields((p) => ({ ...p, adSize: "1/4 Page" }));
    addMsg(
      "bruno",
      "1/4 Page -- great pick. Do you have a tagline or slogan for the business?",
    );
    await w(d);
    addMsg("user", "Tulsa's favorite burger.");
    await w(d);
    setFields((p) => ({ ...p, tagline: "Tulsa's favorite burger." }));
    addMsg(
      "bruno",
      "Nice tagline! Now for some optional contact info. Got a website URL for the QR code?",
    );
    await w(d);
    addMsg("user", "https://tedsburgershack.com");
    await w(d);
    setFields((p) => ({ ...p, qrUrl: "https://tedsburgershack.com" }));
    addMsg("bruno", "And a phone number?");
    await w(d);
    addMsg("user", "(918) 555-0123");
    await w(d);
    setFields((p) => ({ ...p, contactPhone: "(918) 555-0123" }));
    addMsg("bruno", "Email address?");
    await w(d);
    addMsg("user", "hello@tedsburgershack.com");
    await w(d);
    setFields((p) => ({
      ...p,
      contactEmail: "hello@tedsburgershack.com",
    }));
    addMsg("bruno", "And the business address?");
    await w(d);
    addMsg("user", "123 Main St, Tulsa, OK 74103");
    await w(d);
    setFields((p) => ({
      ...p,
      contactAddress: "123 Main St, Tulsa, OK 74103",
    }));
    setRepId("Karen Guirguis");
    addMsg(
      "bruno",
      "All set! Here's the summary:\n\n- Business: Ted's Burger Shack\n- Category: Restaurant\n- Location: Tulsa, 74103\n- Services: Premium burgers, craft shakes, local ingredients\n- Ad Size: 1/4 Page\n- Tagline: Tulsa's favorite burger.\n- QR URL: https://tedsburgershack.com\n- Phone: (918) 555-0123\n- Email: hello@tedsburgershack.com\n- Address: 123 Main St, Tulsa, OK 74103\n\nCreating your campaign now...",
    );
    setFinished(true);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#1B2A4A",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 56,
          background: "#2d3e50",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#C8922A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: "#1B2A4A",
              fontSize: 14,
            }}
          >
            B
          </div>
          <span
            style={{ color: "#ffffff", fontWeight: 700, fontSize: 16 }}
          >
            Bruno
          </span>
          <span
            style={{
              color: "#94a3b8",
              fontSize: 13,
              marginLeft: 8,
            }}
          >
            Print Campaign Intake
          </span>
        </div>
        <button
          onClick={runDemo}
          style={{
            background: "#C8922A",
            color: "#1B2A4A",
            border: "none",
            padding: "6px 18px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Demo Run
        </button>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Chat panel */}
        <div
          style={{
            width: "55%",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #334155",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {chat.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    borderRadius: 12,
                    padding: "10px 16px",
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    background:
                      msg.role === "user" ? "#C8922A" : "#1a2740",
                    color:
                      msg.role === "user" ? "#1B2A4A" : "#ffffff",
                    border:
                      msg.role === "bruno"
                        ? "1px solid #334155"
                        : "none",
                  }}
                >
                  {msg.role === "bruno" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#C8922A",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          color: "#1B2A4A",
                          fontSize: 11,
                        }}
                      >
                        B
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#C8922A",
                        }}
                      >
                        Bruno
                      </span>
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 32,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#C8922A",
                    animation: "pulse 1s infinite",
                  }}
                />
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Bruno is thinking...
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {!finished && (
            <div style={{ borderTop: "1px solid #334155", padding: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your answer..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#1a2740",
                    padding: "10px 16px",
                    fontSize: 14,
                    color: "#ffffff",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  style={{
                    background: "#C8922A",
                    color: "#1B2A4A",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: loading || !input.trim() ? 0.5 : 1,
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Brief panel */}
        <div
          style={{
            width: "45%",
            background: "#1a2740",
            padding: 32,
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#C8922A",
              marginBottom: 8,
            }}
          >
            Live Print Preview
          </p>

          <LiveAdPreview fields={fields} />
          <div style={{ height: 24 }} />

          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#C8922A",
              marginBottom: 8,
            }}
          >
            Campaign Brief
          </p>

          {/* Progress bar */}
          <div
            style={{
              background: "#334155",
              borderRadius: 999,
              height: 6,
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#C8922A",
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p
            style={{
              fontSize: 11,
              color: "#64748b",
              marginTop: -18,
              marginBottom: 24,
              textAlign: "right",
            }}
          >
            {filledCount}/{REQUIRED_FIELDS.length} required
          </p>

          {/* Rep */}
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#C8922A",
                margin: "0 0 4px",
              }}
            >
              Rep
            </p>
            <p
              style={{
                fontSize: 14,
                color: "#ffffff",
                margin: 0,
              }}
            >
              {repId}
            </p>
          </div>

          {/* Fields */}
          {(
            Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]
          ).map((key) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#C8922A",
                  margin: "0 0 4px",
                }}
              >
                {FIELD_LABELS[key]}
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: fields[key] ? "#ffffff" : "#475569",
                  margin: 0,
                  fontStyle: fields[key] ? "normal" : "italic",
                }}
              >
                {fields[key] || "Waiting..."}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

function LiveAdPreview({ fields }: { fields: IntakeFields }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ad = useMemo<PrintAdData>(() => {
    const services = (fields.services || "")
      .split(/[,;·•]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    return {
      businessName: fields.businessName || "Your Business",
      tagline: fields.tagline || "",
      city: fields.city || "",
      services: services.length ? services : [],
      cta: "Visit Us Today",
      phone: fields.contactPhone || "",
      photoUrl: defaultPhoto(fields.category),
      brandColors: { primary: "#0C2340", secondary: "#475569", accent: "#C8922A" },
      size: normalizeSize(fields.adSize),
      variation: "bold_modern",
      subVariation: 0,
    };
  }, [fields]);

  const spec = getSizeSpec(ad.size);
  const targetW = 320;
  const scale = targetW / spec.trimPx150.w;
  const filled = !!fields.businessName;

  useEffect(() => {
    if (!containerRef.current) return;
    const inner = containerRef.current.querySelector("[data-live-inner]") as HTMLDivElement | null;
    if (inner) inner.style.transform = `scale(${scale})`;
  }, [scale, ad]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          width: targetW,
          height: spec.trimPx150.h * scale,
          background: filled ? "#fff" : "transparent",
          border: filled ? "1px solid #334155" : "2px dashed #334155",
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {filled ? (
          <div
            data-live-inner
            style={{ width: spec.trimPx150.w, height: spec.trimPx150.h, transformOrigin: "top left" }}
            dangerouslySetInnerHTML={{ __html: renderPrintAd(ad, { dpi: 150 }) }}
          />
        ) : (
          <div style={{ color: "#64748b", fontSize: 12, textAlign: "center", padding: 12 }}>
            Your print ad will build itself here as Bruno gathers your story.
          </div>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#64748b" }}>
        {SIZE_LABELS[ad.size]} · {spec.trimInches.w}&rdquo; × {spec.trimInches.h}&rdquo;
      </div>
    </div>
  );
}

function defaultPhoto(cat: string): string {
  const k = (cat || "").toLowerCase();
  if (k.includes("restaurant") || k.includes("food")) return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200";
  if (k.includes("dent") || k.includes("health") || k.includes("medical")) return "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200";
  if (k.includes("legal") || k.includes("law")) return "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200";
  if (k.includes("roof") || k.includes("home") || k.includes("construction")) return "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200";
  if (k.includes("fitness") || k.includes("yoga") || k.includes("gym")) return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200";
  if (k.includes("auto")) return "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200";
  return "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200";
}
