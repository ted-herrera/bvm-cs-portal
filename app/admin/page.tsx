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

function tierColor(tier: string): string {
  const t = (tier || "").toUpperCase();
  if (t === "A") return "#16a34a";
  if (t === "B") return "#65a30d";
  if (t === "C") return "#f59e0b";
  return "#dc2626";
}

interface RepScore {
  rep: string;
  displayName: string;
  healthScore: number;
  tier: string;
  printOnlyCount: number;
  printOnlyValue: number;
  bookOfBusiness: number;
}

interface PrintOnlyRow {
  agreementNumber: string;
  clientName: string;
  rep: string;
  subtotalSales: number;
  renewStatus: string;
  saleItems: string;
  digitalClassification: string;
  segmentType: string;
  contacted: boolean;
  contactType: string;
  currentStatus: string;
  blocker: string;
  nextStep: string;
  notes: string;
}

interface TeamSummary {
  teamHealthScore: number;
  portfolioBoB: number;
  portfolioBaseline: number;
  inScopeBoB: number;
  wowDelta: number;
  portfolioRiskPct: number;
  declinedTotal: number;
  digitalMix: number;
}

interface UploadResult {
  teamSummary: TeamSummary;
  repScores: RepScore[];
  printOnlyList: PrintOnlyRow[];
  uploadedAt: string;
}

interface CloseDeal {
  id?: string;
  display_name?: string;
  name?: string;
  status_label?: string;
  description?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [repFilter, setRepFilter] = useState<string>("all");
  const [pushing, setPushing] = useState(false);
  const [pushedToast, setPushedToast] = useState("");

  // CSOps upload state
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [expandedRep, setExpandedRep] = useState<string | null>(null);
  const [contactedRows, setContactedRows] = useState<Record<string, boolean>>({});

  // Close CRM search
  const [crmQuery, setCrmQuery] = useState("");
  const [crmBusy, setCrmBusy] = useState(false);
  const [crmResults, setCrmResults] = useState<CloseDeal[]>([]);
  const [crmError, setCrmError] = useState("");

  // Bruno VA
  const [brunoOpen, setBrunoOpen] = useState(false);
  const [brunoInput, setBrunoInput] = useState("");
  const [brunoLog, setBrunoLog] = useState<{ role: "user" | "bruno"; text: string }[]>([]);
  const [brunoBusy, setBrunoBusy] = useState(false);

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

  const filteredClients = repFilter === "all" ? clients : clients.filter((c) => c.assigned_rep === repFilter);
  const allCampaigns = useMemo(() => {
    return [...clients].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [clients]);

  async function handleUpload(file: File) {
    setUploadBusy(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) {
        setUploadError(data.error || `HTTP ${res.status}`);
      } else {
        setUpload(data as UploadResult);
        const initial: Record<string, boolean> = {};
        (data.printOnlyList as PrintOnlyRow[]).forEach((row) => { initial[row.agreementNumber] = row.contacted; });
        setContactedRows(initial);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploadBusy(false);
  }

  async function toggleContacted(row: PrintOnlyRow, checked: boolean) {
    setContactedRows((prev) => ({ ...prev, [row.agreementNumber]: checked }));
    await fetch("/api/admin/penetration", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agreementNumber: row.agreementNumber,
        rep: row.rep,
        contacted: checked,
      }),
    }).catch(() => {});
  }

  async function pushSnapshot() {
    setPushing(true);
    try {
      const payload = upload ? {
        teamSummary: upload.teamSummary,
        repScores: upload.repScores,
        printOnlyCount: upload.printOnlyList.length,
      } : null;
      await fetch("/api/admin/push-snapshot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushedBy: "ted", payload, weekOf: new Date().toISOString().slice(0, 10) }),
      });
      // Also broadcast a visible notification to rep dashboards.
      await fetch("/api/notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "admin-broadcast",
          message: "New weekly snapshot is available",
          createdAt: new Date().toISOString(),
        }),
      }).catch(() => {});
      setPushedToast("✓ Snapshot pushed to all rep dashboards");
      setTimeout(() => setPushedToast(""), 4000);
    } catch {
      setPushedToast("Push failed");
      setTimeout(() => setPushedToast(""), 4000);
    }
    setPushing(false);
  }

  async function searchClose() {
    if (!crmQuery.trim()) return;
    setCrmBusy(true);
    setCrmError("");
    setCrmResults([]);
    try {
      const res = await fetch("/api/campaign/crm-search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: crmQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setCrmError(data.error || `HTTP ${res.status}`);
      } else {
        setCrmResults((data.data || data.results || data.leads || []) as CloseDeal[]);
      }
    } catch (err) {
      setCrmError(err instanceof Error ? err.message : "Search failed");
    }
    setCrmBusy(false);
  }

  async function askBruno() {
    const q = brunoInput.trim();
    if (!q || brunoBusy) return;
    setBrunoLog((p) => [...p, { role: "user", text: q }]);
    setBrunoInput("");
    setBrunoBusy(true);
    try {
      const context = {
        scope: "admin",
        clients: clients.map((c) => ({
          name: c.business_name,
          rep: c.assigned_rep,
          stage: c.stage,
          city: c.city,
          size: (c.intakeAnswers || {})["q5"] || "",
        })),
        teamSummary: upload?.teamSummary || null,
        repScores: upload?.repScores || null,
      };
      const res = await fetch("/api/campaign/bruno-va", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: q }],
          pipeline: context,
        }),
      });
      const data = await res.json();
      const text = (data?.response as string) || (data?.content?.[0]?.text as string) || (data?.error as string) || "No response.";
      setBrunoLog((p) => [...p, { role: "bruno", text }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setBrunoLog((p) => [...p, { role: "bruno", text: msg }]);
    }
    setBrunoBusy(false);
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

  // Group print-only by rep — sorted by subtotal desc.
  const printByRep = useMemo(() => {
    const m: Record<string, PrintOnlyRow[]> = {};
    if (!upload) return m;
    upload.printOnlyList.forEach((row) => {
      if (!row.rep) return;
      if (!m[row.rep]) m[row.rep] = [];
      m[row.rep].push(row);
    });
    Object.keys(m).forEach((k) => m[k].sort((a, b) => b.subtotalSales - a.subtotalSales));
    return m;
  }, [upload]);

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading admin view...</div>;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, position: "relative" }}>
      <div style={{ borderBottom: `1px solid ${BORDER}`, background: "#fff", padding: "18px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: TEXT2, margin: 0, textTransform: "uppercase" }}>Admin · All Reps</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "2px 0 0", color: TEXT }}>BVM Client Success — Team View</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {pushedToast && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>{pushedToast}</span>}
          <button onClick={() => router.push("/dashboard")} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: TEXT }}>My Dashboard →</button>
          <button onClick={pushSnapshot} disabled={pushing} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: pushing ? "not-allowed" : "pointer", opacity: pushing ? 0.5 : 1 }}>{pushing ? "Pushing…" : "Push Weekly Snapshot to All Reps →"}</button>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── CSOps upload ────────────────────────────────────────────────── */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: TEXT }}>CSOps Executive Pack</h2>
            <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>GateKeeper XLSX — Dashboard Summary / Team Totals / Segmentation</p>
          </div>
          <label style={{ display: "inline-block", background: NAVY, color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: uploadBusy ? "not-allowed" : "pointer", opacity: uploadBusy ? 0.6 : 1 }}>
            {uploadBusy ? "Parsing…" : "Upload GateKeeper XLSX"}
            <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} disabled={uploadBusy} />
          </label>
          {uploadError && <p style={{ fontSize: 12, color: "#dc2626", marginTop: 10 }}>{uploadError}</p>}

          {upload && (
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Team summary tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {[
                  { label: "Team Health", value: upload.teamSummary.teamHealthScore, color: upload.teamSummary.teamHealthScore >= 80 ? "#16a34a" : upload.teamSummary.teamHealthScore >= 60 ? "#f59e0b" : "#dc2626", suffix: "" },
                  { label: "Portfolio BoB", value: `$${Math.round(upload.teamSummary.portfolioBoB).toLocaleString()}`, color: NAVY },
                  { label: "WOW Δ", value: `${upload.teamSummary.wowDelta >= 0 ? "+" : ""}$${Math.round(upload.teamSummary.wowDelta).toLocaleString()}`, color: upload.teamSummary.wowDelta >= 0 ? "#16a34a" : "#dc2626" },
                  { label: "Declined", value: `$${Math.round(upload.teamSummary.declinedTotal).toLocaleString()}`, color: "#dc2626" },
                  { label: "Risk %", value: `${Math.round(upload.teamSummary.portfolioRiskPct)}%`, color: upload.teamSummary.portfolioRiskPct >= 25 ? "#dc2626" : "#f59e0b" },
                ].map((tile) => (
                  <div key={tile.label} style={{ background: BG, borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: TEXT2, textTransform: "uppercase", margin: 0 }}>{tile.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: tile.color, margin: "4px 0 0" }}>{tile.value}</p>
                  </div>
                ))}
              </div>

              {/* Rep cards with expandable print-only lists */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, upload.repScores.length || 1)}, 1fr)`, gap: 12 }}>
                {upload.repScores.map((r) => {
                  const rows = printByRep[r.rep] || [];
                  const isOpen = expandedRep === r.rep;
                  return (
                    <div key={r.rep} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: TEXT2, textTransform: "uppercase", margin: 0 }}>{r.displayName || r.rep}</p>
                          <p style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: "4px 0 0" }}>{r.healthScore}</p>
                        </div>
                        <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#fff", background: tierColor(r.tier), borderRadius: 999, padding: "4px 10px" }}>{r.tier || "—"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: TEXT2 }}>
                        <span><strong style={{ color: TEXT }}>{r.printOnlyCount}</strong> print only</span>
                        <span><strong style={{ color: TEXT }}>${Math.round(r.printOnlyValue).toLocaleString()}</strong> value</span>
                      </div>
                      {rows.length > 0 && (
                        <button onClick={() => setExpandedRep(isOpen ? null : r.rep)} style={{ marginTop: 10, width: "100%", background: isOpen ? NAVY : "transparent", color: isOpen ? "#fff" : NAVY, border: `1px solid ${NAVY}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          {isOpen ? `Hide ${rows.length} rows` : `Show ${rows.length} print-only rows →`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expanded print-only list for selected rep */}
              {expandedRep && (printByRep[expandedRep] || []).length > 0 && (
                <div style={{ background: BG, borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: TEXT2, textTransform: "uppercase", margin: "0 0 10px" }}>Print Only — {expandedRep}</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ color: TEXT2 }}>
                          <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Agreement</th>
                          <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Client</th>
                          <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Subtotal</th>
                          <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Renew</th>
                          <th style={{ textAlign: "center", padding: "6px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Contacted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(printByRep[expandedRep] || []).map((row) => {
                          const checked = !!contactedRows[row.agreementNumber];
                          return (
                            <tr key={row.agreementNumber || row.clientName} style={{ background: "#fff", borderTop: `1px solid ${BORDER}` }}>
                              <td style={{ padding: "6px 8px", color: TEXT, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{row.agreementNumber || "—"}</td>
                              <td style={{ padding: "6px 8px", color: TEXT, fontWeight: 600 }}>{row.clientName}</td>
                              <td style={{ padding: "6px 8px", color: NAVY, fontWeight: 700, textAlign: "right" }}>${Math.round(row.subtotalSales).toLocaleString()}</td>
                              <td style={{ padding: "6px 8px", color: TEXT2 }}>{row.renewStatus || "—"}</td>
                              <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                <input type="checkbox" checked={checked} onChange={(e) => toggleContacted(row, e.target.checked)} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Close CRM search ────────────────────────────────────────────── */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: TEXT }}>Close CRM Search</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <input type="text" value={crmQuery} onChange={(e) => setCrmQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchClose()} placeholder="Name or agreement number..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: "#fff" }} />
            <button onClick={searchClose} disabled={crmBusy || !crmQuery.trim()} style={{ background: crmBusy || !crmQuery.trim() ? "#e2e8f0" : NAVY, color: crmBusy || !crmQuery.trim() ? "#94a3b8" : "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: crmBusy || !crmQuery.trim() ? "not-allowed" : "pointer" }}>{crmBusy ? "Searching…" : "Search Close"}</button>
          </div>
          {crmError && <p style={{ fontSize: 12, color: "#dc2626", margin: "10px 0 0" }}>{crmError}</p>}
          {crmResults.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {crmResults.slice(0, 10).map((deal, i) => (
                <div key={deal.id || `deal-${i}`} style={{ background: BG, borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>{deal.display_name || deal.name || "—"}</p>
                  <p style={{ fontSize: 11, color: TEXT2, margin: "2px 0 0" }}>{deal.status_label || "—"}{deal.description ? ` · ${deal.description}` : ""}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Rep overview ────────────────────────────────────────────────── */}
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

        {/* ── All Campaigns (Supabase clients) ────────────────────────────── */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: TEXT }}>All Campaigns — {allCampaigns.length}</h2>
            <p style={{ fontSize: 11, color: TEXT2, margin: 0 }}>Across the team · newest first</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: BG, color: TEXT2 }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Business</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Rep</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Stage</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Size</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Created</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em" }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {allCampaigns.map((c) => {
                  const intake = (c.intakeAnswers || {}) as Record<string, string>;
                  const size = intake.q5 || intake.printSize || "—";
                  const created = c.created_at ? new Date(c.created_at).toLocaleDateString() : "—";
                  return (
                    <tr key={c.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "8px 10px", color: TEXT, fontWeight: 600 }}>{c.business_name}</td>
                      <td style={{ padding: "8px 10px", color: TEXT2 }}>{c.assigned_rep || "—"}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ display: "inline-block", background: BG, color: TEXT, borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{c.stage}</span>
                      </td>
                      <td style={{ padding: "8px 10px", color: TEXT2 }}>{size}</td>
                      <td style={{ padding: "8px 10px", color: TEXT2 }}>{created}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                        <button onClick={() => router.push(`/client/${c.id}`)} style={{ background: "transparent", border: "none", color: NAVY, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Open →</button>
                      </td>
                    </tr>
                  );
                })}
                {allCampaigns.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 18, textAlign: "center", color: TEXT2 }}>No campaigns yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Full client table with rep + stage management (kept) ────────── */}
        <section style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: TEXT }}>Manage Clients ({filteredClients.length})</h2>
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

      {/* ── Floating Bruno VA (admin mode) ─────────────────────────────── */}
      {brunoOpen && (
        <div style={{ position: "fixed", right: 24, bottom: 88, width: 380, maxHeight: 520, background: "#fff", borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", zIndex: 200 }}>
          <div style={{ background: NAVY, color: "#fff", padding: "12px 16px", borderRadius: "14px 14px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", margin: 0 }}>Bruno · Admin</p>
              <p style={{ fontSize: 13, fontWeight: 600, margin: "2px 0 0" }}>Knows every rep · every client</p>
            </div>
            <button onClick={() => setBrunoOpen(false)} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {brunoLog.length === 0 && (
              <p style={{ fontSize: 12, color: TEXT2, fontStyle: "italic", margin: 0 }}>Try: &ldquo;show me the team health scores&rdquo; · &ldquo;who has the most print-only clients?&rdquo; · &ldquo;what is the portfolio risk this week?&rdquo;</p>
            )}
            {brunoLog.map((m, i) => (
              <div key={i} style={{ background: m.role === "user" ? BG : "#fef9ec", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 10px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: m.role === "user" ? TEXT2 : GOLD, margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.role === "user" ? "You" : "Bruno"}</p>
                <p style={{ fontSize: 12, color: TEXT, margin: "4px 0 0", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.text}</p>
              </div>
            ))}
            {brunoBusy && <p style={{ fontSize: 11, color: TEXT2, fontStyle: "italic", margin: 0 }}>Bruno is thinking…</p>}
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: 10, display: "flex", gap: 6 }}>
            <input type="text" value={brunoInput} onChange={(e) => setBrunoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askBruno()} placeholder="Ask about the team…" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, color: TEXT, background: "#fff" }} />
            <button onClick={askBruno} disabled={brunoBusy || !brunoInput.trim()} style={{ background: brunoBusy || !brunoInput.trim() ? "#e2e8f0" : GOLD, color: brunoBusy || !brunoInput.trim() ? "#94a3b8" : NAVY, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: brunoBusy || !brunoInput.trim() ? "not-allowed" : "pointer" }}>Ask</button>
          </div>
        </div>
      )}
      <button onClick={() => setBrunoOpen((o) => !o)} style={{ position: "fixed", right: 24, bottom: 24, width: 56, height: 56, borderRadius: "50%", background: GOLD, color: NAVY, border: "none", fontSize: 22, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 30px rgba(212,168,67,0.45)", zIndex: 150 }}>B</button>
    </div>
  );
}
