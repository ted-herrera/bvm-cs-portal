"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getCampaignUser, type CampaignClient, CLOSE_USER_IDS } from "@/lib/campaign";

/* ── Design Tokens ───────────────────────────────────────────────────── */
const T = {
  BG: "#F5F0E8", SURFACE: "#FDFAF4", NAVY: "#1B2A4A", GOLD: "#C8922A",
  BORDER: "#DDD5C0", TEXT: "#1C2B1D", TEXT2: "#6B5E45", GRAY: "#9B8E7A",
  GREEN: "#3D6B4F", AMBER: "#C8761A", RED: "#8B3A2A",
} as const;

/* ── Supabase Helpers ────────────────────────────────────────────────── */
function sbHeaders(): Record<string, string> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

async function fetchCampaignClients(repId: string): Promise<CampaignClient[]> {
  const url = SB_URL();
  if (!url) return [];
  const res = await fetch(`${url}/rest/v1/campaign_clients?rep_id=eq.${encodeURIComponent(repId)}&select=*&order=created_at.desc`, { headers: sbHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchCSIntel(repId: string): Promise<any[]> {
  const url = SB_URL();
  if (!url) {
    try { return JSON.parse(localStorage.getItem("cs_intel_" + repId) ?? "[]"); } catch { return []; }
  }
  const res = await fetch(`${url}/rest/v1/cs_intel?rep_id=eq.${encodeURIComponent(repId)}&select=*`, { headers: sbHeaders() });
  if (!res.ok) {
    try { return JSON.parse(localStorage.getItem("cs_intel_" + repId) ?? "[]"); } catch { return []; }
  }
  return res.json();
}

/* ── Demo Data ───────────────────────────────────────────────────────── */
function makeDemoClients(): CampaignClient[] {
  const names = [
    { b: "Rosalinda's Tacos", c: "Tulsa", z: "74103", cat: "Restaurant", fn: "Rosalinda", stage: "approved" as const },
    { b: "Peak Dental", c: "Denver", z: "80202", cat: "Healthcare", fn: "Amy", stage: "production" as const },
    { b: "Iron Ridge Roofing", c: "Nashville", z: "37201", cat: "Home Services", fn: "Marcus", stage: "delivered" as const },
    { b: "Sunset Yoga Studio", c: "Austin", z: "78701", cat: "Fitness", fn: "Clara", stage: "intake" as const },
    { b: "Metro Auto Glass", c: "Phoenix", z: "85001", cat: "Automotive", fn: "James", stage: "tearsheet" as const },
    { b: "Bright Smile Ortho", c: "Seattle", z: "98101", cat: "Healthcare", fn: "Priya", stage: "approved" as const },
    { b: "The Rustic Table", c: "Portland", z: "97201", cat: "Restaurant", fn: "Devon", stage: "production" as const },
    { b: "Summit Legal Group", c: "Chicago", z: "60601", cat: "Legal", fn: "Karen", stage: "intake" as const },
  ];
  return names.map((n, i) => ({
    id: `demo-${i}`, created_at: new Date(Date.now() - i * 86400000).toISOString(),
    business_name: n.b, category: n.cat, city: n.c, zip: n.z, services: n.cat,
    ad_size: "1/4 page", tagline: "", rep_id: "demo", stage: n.stage,
    sbr_data: null, generated_directions: null, selected_direction: null,
    approved_at: null, revisions: null, messages: null,
    client_email: "", client_first_name: n.fn, client_phone: "",
    contact_phone: "(555) 000-0000", contact_email: `${n.fn.toLowerCase()}@example.com`,
    contact_address: `${n.c}, ${n.z}`, ad_copy: "", qr_url: null,
    health_score: 60 + Math.floor(Math.random() * 35),
    risk_level: ["low", "medium", "high"][i % 3], renewal_date: null, past_due: i % 4 === 0 ? 1200 : 0,
  }));
}

/* ── Stage Badge ─────────────────────────────────────────────────────── */
function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    intake: { bg: "#E8E0D0", fg: T.TEXT2 }, tearsheet: { bg: "#D4E4F7", fg: "#2A5A8A" },
    approved: { bg: "#D4EDDA", fg: T.GREEN }, production: { bg: "#FFF3CD", fg: T.AMBER },
    delivered: { bg: "#CCE5D8", fg: T.GREEN },
  };
  const c = colors[stage] ?? colors.intake;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.fg }}>
      {stage.toUpperCase()}
    </span>
  );
}

/* ── Contact Card (Left Panel) ───────────────────────────────────────── */
function ContactCard({ client, onAction }: { client: CampaignClient; onAction: (a: string) => void }) {
  const initials = (client.client_first_name?.[0] ?? client.business_name[0]).toUpperCase();
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", background: T.NAVY, color: "#FFF",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18,
        }}>{initials}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.TEXT }}>{client.business_name}</div>
          <div style={{ fontSize: 12, color: T.GRAY }}>{client.city}, {client.zip}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <StageBadge stage={client.stage} />
        {client.health_score != null && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
            background: client.health_score > 70 ? "#D4EDDA" : client.health_score > 40 ? "#FFF3CD" : "#F8D7DA",
            color: client.health_score > 70 ? T.GREEN : client.health_score > 40 ? T.AMBER : T.RED,
          }}>Health: {client.health_score}</span>
        )}
      </div>
      <Section title="Contact">
        <InfoRow label="Email" value={client.contact_email || client.client_email} />
        <InfoRow label="Phone" value={client.contact_phone || client.client_phone} />
        <InfoRow label="Address" value={client.contact_address} />
      </Section>
      <Section title="Account">
        <InfoRow label="Category" value={client.category || client.services} />
        <InfoRow label="Ad Size" value={client.ad_size} />
        <InfoRow label="Created" value={new Date(client.created_at).toLocaleDateString()} />
      </Section>
      {client.stage !== "intake" && (
        <Section title="Campaign">
          <InfoRow label="Tagline" value={client.tagline || "—"} />
          {client.approved_at && <InfoRow label="Approved" value={new Date(client.approved_at).toLocaleDateString()} />}
        </Section>
      )}
      <Link href={`/campaign/client/${client.id}`} style={{
        display: "block", textAlign: "center", marginTop: 16, padding: "10px 0", borderRadius: 8,
        background: T.NAVY, color: "#FFF", fontWeight: 600, fontSize: 13, textDecoration: "none",
      }}>
        Open Campaign →
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.GRAY, marginBottom: 6, letterSpacing: 1 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
      <span style={{ color: T.GRAY }}>{label}</span>
      <span style={{ color: T.TEXT, fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

/* ── Right Panel Tabs ────────────────────────────────────────────────── */
function ActionPanel({ client, activeTab, setActiveTab }: {
  client: CampaignClient; activeTab: string; setActiveTab: (t: string) => void;
}) {
  const [brunoMsg, setBrunoMsg] = useState("");
  const [brunoChat, setBrunoChat] = useState<{ role: string; text: string }[]>([]);
  const [zipScan, setZipScan] = useState("");
  const tabs = ["Actions", "Bruno", "Territory", "CS Intel"];

  const sendBruno = async () => {
    if (!brunoMsg.trim()) return;
    const userMsg = brunoMsg.trim();
    setBrunoChat(p => [...p, { role: "user", text: userMsg }]);
    setBrunoMsg("");
    try {
      const res = await fetch("/api/campaign/bruno-va", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, clientId: client.id }),
      });
      const data = await res.json();
      setBrunoChat(p => [...p, { role: "bruno", text: data.reply ?? "No response." }]);
    } catch {
      setBrunoChat(p => [...p, { role: "bruno", text: "Connection error." }]);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 16px 0", borderBottom: `1px solid ${T.BORDER}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.TEXT, marginBottom: 12 }}>{client.business_name}</div>
        <div style={{ display: "flex", gap: 4, marginBottom: -1 }}>
          {["Note", "Email", "Call", "Task", "Escalate"].map(a => (
            <button key={a} style={{
              fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.BORDER}`,
              background: T.SURFACE, color: T.TEXT2, cursor: "pointer", fontWeight: 600,
            }}>{a}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${T.BORDER}` }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: "transparent", border: "none", borderBottom: activeTab === t ? `2px solid ${T.GOLD}` : "2px solid transparent",
            color: activeTab === t ? T.GOLD : T.GRAY,
          }}>{t}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {activeTab === "Actions" && <ActionsTab client={client} />}
        {activeTab === "Bruno" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{
              flex: 1, background: `linear-gradient(180deg, ${T.NAVY}, #0F1B33)`, borderRadius: 10,
              padding: 12, marginBottom: 8, overflow: "auto", minHeight: 200,
            }}>
              {brunoChat.length === 0 && (
                <div style={{ color: "#5A6B80", fontSize: 13, textAlign: "center", marginTop: 60 }}>
                  Ask Bruno about {client.business_name}...
                </div>
              )}
              {brunoChat.map((m, i) => (
                <div key={i} style={{
                  marginBottom: 8, textAlign: m.role === "user" ? "right" : "left",
                }}>
                  <span style={{
                    display: "inline-block", padding: "8px 12px", borderRadius: 10, fontSize: 13,
                    background: m.role === "user" ? T.GOLD : "#243756", color: m.role === "user" ? T.NAVY : "#CCC",
                    maxWidth: "85%",
                  }}>{m.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={brunoMsg} onChange={e => setBrunoMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendBruno()}
                placeholder="Ask Bruno..." style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.BORDER}`,
                  fontSize: 13, outline: "none",
                }} />
              <button onClick={sendBruno} style={{
                background: T.GOLD, color: "#FFF", border: "none", borderRadius: 8,
                padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>Send</button>
            </div>
          </div>
        )}
        {activeTab === "Territory" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.TEXT, marginBottom: 8 }}>ZIP Radius Scan</div>
            <input value={zipScan} onChange={e => setZipScan(e.target.value)} placeholder="Enter ZIP code"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.BORDER}`, fontSize: 13, marginBottom: 8, outline: "none" }} />
            <Link href={`/campaign/intelligence/${client.id}`} style={{
              display: "block", textAlign: "center", padding: "10px 0", borderRadius: 8,
              background: T.NAVY, color: "#FFF", fontWeight: 600, fontSize: 13, textDecoration: "none",
            }}>View Intel Report →</Link>
          </div>
        )}
        {activeTab === "CS Intel" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.TEXT, marginBottom: 8 }}>CS Intelligence Upload</div>
            <button onClick={() => {
              const input = document.createElement("input"); input.type = "file"; input.accept = ".csv,.xlsx";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const form = new FormData(); form.append("file", file);
                await fetch("/api/campaign/cs-upload", { method: "POST", body: form });
              };
              input.click();
            }} style={{
              width: "100%", padding: "10px 0", borderRadius: 8, border: `2px dashed ${T.BORDER}`,
              background: "transparent", color: T.GRAY, fontSize: 13, cursor: "pointer",
            }}>Upload CSV / XLSX</button>
            <div style={{ marginTop: 12, fontSize: 12, color: T.GRAY }}>
              Upload customer success data to enrich this account.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionsTab({ client }: { client: CampaignClient }) {
  const ctas: { label: string; desc: string; color: string }[] = [
    { label: "Send Tear Sheet", desc: "Generate and deliver tear sheet", color: T.GOLD },
    { label: "Request Approval", desc: "Send proof for client review", color: T.GREEN },
    { label: "Schedule Follow-up", desc: "Set reminder for next touch", color: T.AMBER },
  ];
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.GRAY, marginBottom: 8, letterSpacing: 1 }}>CAMPAIGN CTAs</div>
      {ctas.map(c => (
        <button key={c.label} style={{
          display: "block", width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 6,
          borderRadius: 8, border: `1px solid ${T.BORDER}`, background: T.SURFACE, cursor: "pointer",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{c.label}</div>
          <div style={{ fontSize: 11, color: T.GRAY }}>{c.desc}</div>
        </button>
      ))}
      <div style={{ fontSize: 12, fontWeight: 700, color: T.GRAY, marginBottom: 8, marginTop: 16, letterSpacing: 1 }}>CARD TEMPLATES</div>
      {["Thank You", "Follow-up", "Renewal Notice"].map(t => (
        <div key={t} style={{
          padding: "8px 12px", marginBottom: 4, borderRadius: 6, background: T.BG,
          fontSize: 12, color: T.TEXT2, border: `1px solid ${T.BORDER}`,
        }}>{t}</div>
      ))}
      <div style={{ fontSize: 12, fontWeight: 700, color: T.GRAY, marginBottom: 8, marginTop: 16, letterSpacing: 1 }}>DELIVERY PACK</div>
      <div style={{ fontSize: 12, color: T.GRAY }}>
        {client.stage === "delivered" ? "Package delivered ✓" : "Campaign not yet delivered"}
      </div>
    </div>
  );
}

/* ── Center Tabs ─────────────────────────────────────────────────────── */
function CenterPanel({ clients, selected, closeLeads, csIntel, demo }: {
  clients: CampaignClient[]; selected: CampaignClient | null; closeLeads: any[];
  csIntel: any[]; demo: boolean;
}) {
  const [tab, setTab] = useState("Activity");
  const [msgText, setMsgText] = useState("");
  const [crmSearch, setCrmSearch] = useState("");
  const tabs = ["Activity", "Campaign", "Messages", "Close CRM", "Audit"];

  const mrr = csIntel.length > 0 ? csIntel.reduce((s: number, r: any) => s + (r.mrr ?? 0), 0) : 0;
  const arr = mrr * 12;
  const tcv = csIntel.reduce((s: number, r: any) => s + (r.tcv ?? 0), 0);

  const sendMsg = async () => {
    if (!msgText.trim() || !selected) return;
    await fetch(`/api/campaign/message/${selected.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "rep", content: msgText.trim() }),
    });
    setMsgText("");
  };

  const matchedCount = closeLeads.filter((l: any) => clients.some(c => c.business_name.toLowerCase() === (l.display_name ?? "").toLowerCase())).length;
  const csOpsOnly = clients.filter(c => !closeLeads.some((l: any) => (l.display_name ?? "").toLowerCase() === c.business_name.toLowerCase())).length;
  const closeOnly = closeLeads.filter((l: any) => !clients.some(c => c.business_name.toLowerCase() === (l.display_name ?? "").toLowerCase())).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* BOB Snapshot */}
      {csIntel.length > 0 && (
        <div style={{ display: "flex", gap: 12, padding: "12px 20px", borderBottom: `1px solid ${T.BORDER}` }}>
          {[
            { label: "MRR", val: `$${mrr.toLocaleString()}`, size: 32 },
            { label: "ARR", val: `$${arr.toLocaleString()}` },
            { label: "TCV", val: `$${tcv.toLocaleString()}` },
            { label: "Accounts", val: String(csIntel.length) },
          ].map(m => (
            <div key={m.label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: (m as any).size ?? 18, fontWeight: 800, color: T.NAVY }}>{m.val}</div>
              <div style={{ fontSize: 11, color: T.GRAY }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.BORDER}`, padding: "0 20px" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: "transparent", border: "none",
            borderBottom: tab === t ? `2px solid ${T.GOLD}` : "2px solid transparent",
            color: tab === t ? T.NAVY : T.GRAY,
          }}>{t}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {tab === "Activity" && (
          <div>
            {clients.length === 0 ? (
              <div style={{ textAlign: "center", color: T.GRAY, marginTop: 40, fontSize: 14 }}>No activity yet</div>
            ) : clients.slice(0, 15).map(c => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: `1px solid ${T.BORDER}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: T.NAVY, color: "#FFF",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
                }}>{c.business_name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.TEXT }}>{c.business_name}</div>
                  <div style={{ fontSize: 11, color: T.GRAY }}>{c.city} &middot; Stage: {c.stage}</div>
                </div>
                <div style={{ fontSize: 11, color: T.GRAY }}>{new Date(c.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "Campaign" && (
          <div>
            {clients.filter(c => c.stage !== "intake").map(c => (
              <div key={c.id} style={{
                padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${T.BORDER}`, background: T.SURFACE,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: T.TEXT }}>{c.business_name}</span>
                  <StageBadge stage={c.stage} />
                </div>
                <div style={{ fontSize: 12, color: T.GRAY }}>{c.tagline || c.category}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "Messages" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: 1, marginBottom: 12 }}>
              {selected?.messages?.map((m, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.role === "rep" ? T.GOLD : T.NAVY }}>{m.role}</span>
                  <div style={{ fontSize: 13, color: T.TEXT, marginTop: 2 }}>{m.content}</div>
                  <div style={{ fontSize: 10, color: T.GRAY }}>{new Date(m.timestamp).toLocaleString()}</div>
                </div>
              )) ?? <div style={{ color: T.GRAY, fontSize: 13 }}>Select a contact to view messages</div>}
            </div>
            {selected && (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={msgText} onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMsg()}
                  placeholder="Type a message..." style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.BORDER}`,
                    fontSize: 13, outline: "none",
                  }} />
                <button onClick={sendMsg} style={{
                  background: T.GOLD, color: "#FFF", border: "none", borderRadius: 8,
                  padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>Send</button>
              </div>
            )}
          </div>
        )}
        {tab === "Close CRM" && (
          <div>
            <input value={crmSearch} onChange={e => setCrmSearch(e.target.value)} placeholder="Search CRM..."
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.BORDER}`,
                fontSize: 13, marginBottom: 12, outline: "none",
              }} />
            {closeLeads
              .filter((l: any) => !crmSearch || (l.display_name ?? "").toLowerCase().includes(crmSearch.toLowerCase()))
              .slice(0, 20).map((l: any, i: number) => (
                <div key={i} style={{
                  padding: "8px 0", borderBottom: `1px solid ${T.BORDER}`, fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600, color: T.TEXT }}>{l.display_name ?? "Unknown"}</div>
                  <div style={{ fontSize: 11, color: T.GRAY }}>{l.status_display_name ?? l.status_label ?? ""}</div>
                </div>
              ))}
          </div>
        )}
        {tab === "Audit" && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Matched", val: matchedCount, color: T.GREEN },
                { label: "CSOps Only", val: csOpsOnly, color: T.AMBER },
                { label: "Close Only", val: closeOnly, color: T.RED },
              ].map(a => (
                <div key={a.label} style={{
                  flex: 1, textAlign: "center", padding: 16, borderRadius: 10, background: T.SURFACE,
                  border: `1px solid ${T.BORDER}`,
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: a.color }}>{a.val}</div>
                  <div style={{ fontSize: 12, color: T.GRAY }}>{a.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: T.GRAY }}>
              Cross-referencing {clients.length} CSOps accounts with {closeLeads.length} Close CRM leads.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Priority Queue ──────────────────────────────────────────────────── */
function buildPriorityQueue(clients: CampaignClient[]): CampaignClient[] {
  return [...clients]
    .sort((a, b) => (b.health_score ?? 0) - (a.health_score ?? 0))
    .slice(0, 25);
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [clients, setClients] = useState<CampaignClient[]>([]);
  const [closeLeads, setCloseLeads] = useState<any[]>([]);
  const [csIntel, setCsIntel] = useState<any[]>([]);
  const [selected, setSelected] = useState<CampaignClient | null>(null);
  const [demo, setDemo] = useState(false);
  const [search, setSearch] = useState("");
  const [rightTab, setRightTab] = useState("Actions");
  const [rightOpen, setRightOpen] = useState(false);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auth check
  useEffect(() => {
    const u = getCampaignUser();
    if (!u) { window.location.href = "/campaign/login"; return; }
    setUser(u);
  }, []);

  // Clock
  useEffect(() => {
    clockRef.current = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  // Data loading
  useEffect(() => {
    if (!user) return;
    if (demo) { setClients(makeDemoClients()); setCloseLeads([]); setCsIntel([]); return; }
    const repId = user.username;
    fetchCampaignClients(repId).then(setClients);
    fetch("/api/campaign/close-leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: CLOSE_USER_IDS[repId] ?? "" }),
    }).then(r => r.json()).then(d => setCloseLeads(d.leads ?? [])).catch(() => {});
    fetchCSIntel(repId).then(setCsIntel);
  }, [user, demo]);

  const selectClient = (c: CampaignClient) => { setSelected(c); setRightOpen(true); setRightTab("Actions"); };

  const filtered = clients.filter(c =>
    !search || c.business_name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_email.toLowerCase().includes(search.toLowerCase())
  );
  const priorityQueue = buildPriorityQueue(filtered);

  if (!user) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Demo Banner */}
      {demo && (
        <div style={{ background: "#FBBF24", color: T.NAVY, textAlign: "center", padding: "4px 0", fontSize: 12, fontWeight: 700 }}>
          DEMO MODE — Showing mock data
        </div>
      )}

      {/* ── Top Nav ────────────────────────────────────────────────── */}
      <nav style={{
        height: 52, background: T.NAVY, display: "flex", alignItems: "center", padding: "0 20px",
        gap: 16, flexShrink: 0,
      }}>
        <div style={{ color: "#FFF", fontWeight: 800, fontSize: 14, letterSpacing: 1, whiteSpace: "nowrap" }}>CAMPAIGN PORTAL</div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all contacts..."
            style={{
              width: 320, padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 13,
              background: "rgba(255,255,255,0.12)", color: "#FFF", outline: "none",
            }} />
        </div>
        <div style={{ color: "#8899B0", fontSize: 12, fontFamily: "monospace" }}>{clock}</div>
        <button onClick={() => { setDemo(d => !d); setSelected(null); }} style={{
          padding: "4px 10px", borderRadius: 6, border: `1px solid ${demo ? "#FBBF24" : "#5A6B80"}`,
          background: demo ? "#FBBF24" : "transparent", color: demo ? T.NAVY : "#8899B0",
          fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>Demo</button>
        <Link href="/campaign/intake" style={{
          padding: "6px 14px", borderRadius: 8, background: T.GOLD, color: "#FFF",
          fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
        }}>New Campaign →</Link>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: T.GOLD, color: T.NAVY,
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
        }}>{user.username[0]}</div>
        <button onClick={() => {
          localStorage.removeItem("campaign_user");
          document.cookie = "campaign_user=; path=/; max-age=0";
          window.location.href = "/campaign/login";
        }} style={{
          background: "transparent", border: "none", color: "#5A6B80", fontSize: 11,
          cursor: "pointer", whiteSpace: "nowrap",
        }}>Sign out</button>
      </nav>

      {/* ── Main Grid ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Panel */}
        <div style={{
          width: 300, background: T.SURFACE, borderRight: `1px solid ${T.BORDER}`,
          overflow: "auto", flexShrink: 0,
        }}>
          {!selected ? (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.GRAY, marginBottom: 16 }}>Search for a contact</div>
              {priorityQueue.slice(0, 10).map(c => (
                <div key={c.id} onClick={() => selectClient(c)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                  borderBottom: `1px solid ${T.BORDER}`, cursor: "pointer",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: T.NAVY, color: "#FFF",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
                  }}>{c.business_name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.TEXT }}>{c.business_name}</div>
                    <div style={{ fontSize: 11, color: T.GRAY }}>{c.city}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <button onClick={() => { setSelected(null); setRightOpen(false); }} style={{
                background: "transparent", border: "none", color: T.GOLD, fontSize: 12,
                fontWeight: 600, cursor: "pointer", padding: "12px 20px 0",
              }}>← Back to list</button>
              <ContactCard client={selected} onAction={() => {}} />
            </div>
          )}
        </div>

        {/* Center Panel */}
        <div style={{ flex: 1, background: T.BG, overflow: "hidden" }}>
          <CenterPanel clients={filtered} selected={selected} closeLeads={closeLeads} csIntel={csIntel} demo={demo} />
        </div>

        {/* Right Slide-out */}
        {rightOpen && selected && (
          <div style={{
            width: 380, background: T.SURFACE, borderLeft: `3px solid ${T.GOLD}`,
            overflow: "auto", flexShrink: 0,
          }}>
            <ActionPanel client={selected} activeTab={rightTab} setActiveTab={setRightTab} />
          </div>
        )}
      </div>
    </div>
  );
}
