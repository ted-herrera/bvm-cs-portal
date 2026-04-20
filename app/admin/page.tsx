"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ClientProfile } from "@/lib/pipeline";

const NAVY = "#0C2340";
const GOLD = "#D4A843";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const TEXT2 = "#475569";
const BG = "#f5f7fb";

const REPS = ["alex", "april", "genele", "kala", "karen", "samantha"];

const STAGE_OPTIONS: { key: string; label: string }[] = [
  { key: "intake", label: "Intake" },
  { key: "tear-sheet", label: "Tear Sheet" },
  { key: "building", label: "Production" },
  { key: "qa", label: "Review" },
  { key: "delivered", label: "Delivered" },
  { key: "live", label: "Live" },
];

function estimateRevenue(c: ClientProfile): number {
  const intake = (c.intakeAnswers || {}) as Record<string, string>;
  const size = (intake.q5 || "").toLowerCase();
  if (size.includes("cover")) return 2400;
  if (size.includes("full")) return 1800;
  if (size.includes("half")) return 1200;
  if (size.includes("third")) return 900;
  if (size.includes("quarter")) return 700;
  return 450;
}

function opportunityLabel(c: ClientProfile): string {
  const intake = (c.intakeAnswers || {}) as Record<string, string>;
  const size = (intake.q5 || "").toLowerCase();
  if (!size || size.includes("eighth")) return "Size upgrade + digital";
  if (size.includes("quarter")) return "Half-page upgrade";
  if (size.includes("half") || size.includes("third")) return "Full-page + digital";
  return "Add website + digital";
}

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [repFilter, setRepFilter] = useState<string>("all");
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        setClients((d.clients || []) as ClientProfile[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const byRep = useMemo(() => {
    const m: Record<string, ClientProfile[]> = {};
    REPS.forEach((r) => (m[r] = []));
    clients.forEach((c) => {
      const r = (c.assigned_rep || "unassigned").toLowerCase();
      if (!m[r]) m[r] = [];
      m[r].push(c);
    });
    return m;
  }, [clients]);

  const opportunities = useMemo(() => {
    return [...clients]
      .map((c) => ({ client: c, revenue: estimateRevenue(c), op: opportunityLabel(c) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [clients]);

  const filteredClients = repFilter === "all" ? clients : clients.filter((c) => c.assigned_rep === repFilter);

  async function pushReport() {
    setPushing(true);
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "admin-broadcast",
        message: "Weekly campaign report pushed by admin",
        createdAt: new Date().toISOString(),
      }),
    }).catch(() => {});
    setTimeout(() => setPushing(false), 800);
  }

  async function reassign(clientId: string, rep: string) {
    await fetch(`/api/profile/update/${clientId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_rep: rep }),
    }).catch(() => {});
    setClients((cs) => cs.map((c) => (c.id === clientId ? { ...c, assigned_rep: rep } : c)));
  }

  async function setStage(clientId: string, stage: string) {
    await fetch(`/api/profile/update/${clientId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    }).catch(() => {});
    setClients((cs) => cs.map((c) => (c.id === clientId ? { ...c, stage: stage as ClientProfile["stage"] } : c)));
  }

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading admin view...</div>;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>
      <div style={{ borderBottom: `1px solid ${BORDER}`, background: "#fff", padding: "18px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: TEXT2, margin: 0, textTransform: "uppercase" }}>Admin · All Reps</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "2px 0 0", color: TEXT }}>BVM Client Success — Team View</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: TEXT }}>My Dashboard →</button>
          <button onClick={pushReport} disabled={pushing} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: pushing ? 0.5 : 1 }}>{pushing ? "Pushing…" : "Push Weekly Report →"}</button>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Rep overview */}
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: TEXT, letterSpacing: "0.06em", textTransform: "uppercase" }}>Reps</h2>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${REPS.length}, 1fr)`, gap: 12 }}>
            {REPS.map((rep) => {
              const reps = byRep[rep] || [];
              const revenue = reps.reduce((sum, c) => sum + estimateRevenue(c), 0);
              return (
                <div key={rep} onClick={() => setRepFilter(rep === repFilter ? "all" : rep)} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${rep === repFilter ? GOLD : BORDER}`, padding: 16, cursor: "pointer" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: TEXT2, margin: 0, textTransform: "uppercase" }}>{rep}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 0", color: TEXT }}>{reps.length} <span style={{ fontSize: 11, fontWeight: 500, color: TEXT2 }}>clients</span></p>
                  <p style={{ fontSize: 11, color: GOLD, fontWeight: 700, margin: "4px 0 0" }}>${revenue.toLocaleString()} book</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Opportunities board */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: TEXT }}>Top 10 Opportunities — Team</h2>
            <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>Ranked by revenue potential</p>
          </div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: BG, color: TEXT2 }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Business</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Rep</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Stage</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Opportunity</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.client.id} onClick={() => router.push(`/client/${o.client.id}`)} style={{ borderTop: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <td style={{ padding: "10px", color: TEXT, fontWeight: 600 }}>{o.client.business_name}</td>
                  <td style={{ padding: "10px", color: TEXT2 }}>{o.client.assigned_rep || "—"}</td>
                  <td style={{ padding: "10px", color: TEXT2 }}>{o.client.stage}</td>
                  <td style={{ padding: "10px", color: TEXT2 }}>{o.op}</td>
                  <td style={{ padding: "10px", color: GOLD, fontWeight: 700, textAlign: "right" }}>${o.revenue.toLocaleString()}</td>
                </tr>
              ))}
              {opportunities.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: TEXT2 }}>No clients yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Full client table with rep + stage management */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: TEXT }}>All Clients ({filteredClients.length})</h2>
            <div>
              <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, background: "#fff", color: TEXT }}>
                <option value="all">All reps</option>
                {REPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: BG, color: TEXT2 }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Business</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>City</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Rep</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Stage</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "8px 10px", color: TEXT, fontWeight: 600 }}>{c.business_name}</td>
                    <td style={{ padding: "8px 10px", color: TEXT2 }}>{c.city}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <select value={c.assigned_rep || ""} onChange={(e) => reassign(c.id, e.target.value)} style={{ padding: "4px 6px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, background: "#fff", color: TEXT }}>
                        <option value="">—</option>
                        {REPS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <select value={c.stage} onChange={(e) => setStage(c.id, e.target.value)} style={{ padding: "4px 6px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, background: "#fff", color: TEXT }}>
                        {STAGE_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <button onClick={() => router.push(`/client/${c.id}`)} style={{ background: "transparent", border: "none", color: NAVY, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Open →</button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 18, textAlign: "center", color: TEXT2 }}>No clients match filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
