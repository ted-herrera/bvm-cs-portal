"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { CampaignClient } from "@/lib/campaign";
import { getCampaignUser } from "@/lib/campaign";
import PrintAdPreview from "@/components/PrintAdPreview";
import { getSizeSpec, normalizeSize, SIZE_LABELS } from "@/lib/print-engine";

const NAVY = "#0C2340";
const GOLD = "#D4A843";
const GREEN = "#16a34a";

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function BuildQueuePage() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [queue, setQueue] = useState<CampaignClient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgInput, setMsgInput] = useState("");

  useEffect(() => {
    const u = getCampaignUser();
    if (!u) { window.location.href = "/campaign/login"; return; }
    setUser(u);
  }, []);

  useEffect(() => {
    if (!user) return;
    const sb = getSb();
    if (!sb) { setLoading(false); return; }
    sb.from("campaign_clients")
      .select("*")
      .in("stage", ["approved", "production"])
      .order("approved_at", { ascending: true })
      .then(({ data }) => {
        setQueue((data || []) as CampaignClient[]);
        setLoading(false);
      });
  }, [user]);

  const selected = useMemo(() => queue.find((c) => c.id === selectedId) || null, [queue, selectedId]);

  async function claimBuild(c: CampaignClient) {
    const sb = getSb();
    if (!sb) return;
    await sb.from("campaign_clients").update({ stage: "production" }).eq("id", c.id);
    setQueue((prev) => prev.map((x) => (x.id === c.id ? { ...x, stage: "production" } : x)));
  }

  async function markReady(c: CampaignClient) {
    const sb = getSb();
    if (!sb) return;
    await sb.from("campaign_clients").update({ stage: "delivered" }).eq("id", c.id);
    setQueue((prev) => prev.filter((x) => x.id !== c.id));
    setSelectedId(null);
  }

  async function sendMessage() {
    if (!selected || !msgInput.trim()) return;
    const res = await fetch(`/api/campaign/message/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "designer", content: msgInput.trim() }),
    });
    if (res.ok) setMsgInput("");
  }

  function exportAd(c: CampaignClient, mode: "bleed" | "trim") {
    const qs = new URLSearchParams({ id: c.id, mode });
    window.open(`/campaign/print-preview?${qs.toString()}`, "_blank");
  }

  function downloadDevPack(c: CampaignClient) {
    const data = {
      id: c.id,
      business: c.business_name,
      category: c.category,
      city: c.city,
      zip: c.zip,
      services: c.services,
      tagline: c.tagline,
      adSize: c.ad_size,
      contact: {
        phone: c.contact_phone,
        email: c.contact_email,
        address: c.contact_address,
      },
      selectedDirection: c.selected_direction,
      approvedAt: c.approved_at,
      revisions: c.revisions,
      sbr: c.sbr_data,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.business_name.replace(/\s+/g, "_")}_devpack.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!user) return null;

  const unassigned = queue.filter((c) => c.stage === "approved");
  const myBuilds = queue.filter((c) => c.stage === "production");

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0f1c", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Left column */}
      <aside style={{ width: 300, background: "#05080f", borderRight: "1px solid #1a2332", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ padding: 16, borderBottom: "1px solid #1a2332" }}>
          <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700 }}>
            PRINT QUEUE
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Designer: {user.username}</div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
            Unassigned ({unassigned.length})
          </div>
          {loading && <div style={{ color: "#64748b", fontSize: 13 }}>Loading queue…</div>}
          {!loading && unassigned.length === 0 && (
            <div style={{ color: "#64748b", fontSize: 12 }}>No pending builds</div>
          )}
          {unassigned.map((c) => {
            const size = normalizeSize(c.ad_size);
            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  background: selectedId === c.id ? "#162032" : "#0a101c",
                  border: selectedId === c.id ? `1px solid ${GOLD}` : "1px solid #1a2332",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.business_name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{SIZE_LABELS[size]} · {c.selected_direction || "—"}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); claimBuild(c); setSelectedId(c.id); }}
                  style={{
                    marginTop: 8, background: GOLD, color: NAVY, border: "none", borderRadius: 6,
                    padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  CLAIM BUILD →
                </button>
              </div>
            );
          })}

          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", margin: "24px 0 10px" }}>
            My Builds ({myBuilds.length})
          </div>
          {myBuilds.length === 0 && <div style={{ color: "#64748b", fontSize: 12 }}>No active builds</div>}
          {myBuilds.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                background: selectedId === c.id ? "#162032" : "#0a101c",
                border: selectedId === c.id ? `1px solid ${GOLD}` : "1px solid #1a2332",
                borderRadius: 8, padding: 12, marginBottom: 8, cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>{c.business_name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>In Production</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Center column */}
      <main style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {!selected ? (
          <div style={{ textAlign: "center", marginTop: 120, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>⚙</div>
            <div style={{ fontSize: 16 }}>Select a build to begin</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700 }}>
              WORKSPACE · {SIZE_LABELS[normalizeSize(selected.ad_size)]}
            </div>
            <h1 style={{ fontSize: 32, fontFamily: "'Playfair Display', Georgia, serif", margin: "6px 0 20px" }}>
              {selected.business_name}
            </h1>

            <div style={{ background: "#0a101c", border: "1px solid #1a2332", borderRadius: 12, padding: 24, display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <PrintAdPreview
                client={selected}
                maxWidth={560}
                showBleed
                showSafeZone
                showTrimMarks
                rounded={0}
                shadow
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              <button
                onClick={() => exportAd(selected, "bleed")}
                style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Export Print-Ready (300 DPI + bleed)
              </button>
              <button
                onClick={() => exportAd(selected, "trim")}
                style={{ background: "#1a2332", color: "#fff", border: "1px solid #334155", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Export Preview PNG (trim)
              </button>
              <button
                onClick={() => { exportAd(selected, "bleed"); setTimeout(() => exportAd(selected, "trim"), 500); }}
                style={{ background: "#1a2332", color: "#fff", border: "1px solid #334155", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Export Both
              </button>
              <button
                onClick={() => downloadDevPack(selected)}
                style={{ background: "transparent", color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Download Dev Pack (JSON)
              </button>
            </div>

            {selected.revisions && Array.isArray(selected.revisions) && selected.revisions.length > 0 && (
              <div style={{ background: "#0a101c", border: "1px solid #1a2332", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                  Rep / Client Notes
                </div>
                {selected.revisions.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #1a2332" }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {r.type || "note"} · {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                    </div>
                    <div style={{ marginTop: 4 }}>{r.note || r.value || "(no detail)"}</div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => markReady(selected)}
              style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Mark Ready for Review →
            </button>
          </div>
        )}
      </main>

      {/* Right column */}
      <aside style={{ width: 320, background: "#05080f", borderLeft: "1px solid #1a2332", overflow: "auto", flexShrink: 0, padding: 16 }}>
        {!selected ? (
          <div style={{ color: "#64748b", fontSize: 13, padding: 20, textAlign: "center" }}>
            Select a build to see client info
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
              Client Info
            </div>
            <Row label="Business" value={selected.business_name} />
            <Row label="Category" value={selected.category} />
            <Row label="City" value={`${selected.city} · ${selected.zip}`} />
            <Row label="Services" value={selected.services} />
            <Row label="Tagline" value={selected.tagline} />
            <Row label="Size" value={SIZE_LABELS[normalizeSize(selected.ad_size)]} />
            <Row label="Direction" value={selected.selected_direction || "—"} />
            <Row label="Phone" value={selected.contact_phone} />
            <Row label="Email" value={selected.contact_email} />
            {selected.sbr_data && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                  SBR Summary
                </div>
                <pre style={{ fontSize: 11, color: "#94a3b8", background: "#0a101c", padding: 10, borderRadius: 6, overflow: "auto", maxHeight: 160 }}>
                  {JSON.stringify(selected.sbr_data, null, 2).substring(0, 800)}
                </pre>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                Comms
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
                {(selected.messages || []).length === 0 && (
                  <div style={{ fontSize: 12, color: "#64748b" }}>No messages yet</div>
                )}
                {(selected.messages || []).map((m, i) => (
                  <div key={i} style={{ marginBottom: 10, padding: 8, background: "#0a101c", borderRadius: 6, border: "1px solid #1a2332" }}>
                    <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.role}</div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{m.content}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Message client/rep…"
                  style={{
                    flex: 1, background: "#0a101c", border: "1px solid #1a2332", borderRadius: 6,
                    padding: "8px 10px", color: "#fff", fontSize: 12, outline: "none",
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, padding: 12, background: "#0a101c", border: "1px solid #1a2332", borderRadius: 6 }}>
          <Link href="/campaign/dashboard" style={{ color: GOLD, fontSize: 12, textDecoration: "none" }}>
            ← Back to Dashboard
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ fontSize: 12, marginBottom: 8 }}>
      <div style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>{label}</div>
      <div style={{ color: "#cbd5e1", marginTop: 2 }}>{value}</div>
    </div>
  );
}
