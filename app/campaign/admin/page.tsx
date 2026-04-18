"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CampaignClient } from "@/lib/campaign";

const STAGE_COLORS: Record<string, string> = {
  intake: "#64748b", tearsheet: "#f59e0b", approved: "#22c55e",
  production: "#3b82f6", delivered: "#F5C842",
};
const STAGE_LABELS: Record<string, string> = {
  intake: "Intake", tearsheet: "Tearsheet", approved: "Approved",
  production: "Production", delivered: "Delivered",
};

function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function getAdminFromCookie(): { username: string; role: string } | null {
  const raw = getCookie("campaign_user");
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    if (payload.role === "admin") return payload;
  } catch { /* */ }
  return null;
}

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<CampaignClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getAdminFromCookie();
    if (!user) { router.push("/campaign/login"); return; }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("campaign_clients").select("*").order("created_at", { ascending: false });
        if (data) setClients(data as CampaignClient[]);
      }
    } catch { /* */ }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Stage counts
  const stageCounts: Record<string, number> = {};
  clients.forEach((c) => { stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1; });

  // Rep performance
  const repMap = new Map<string, { total: number; delivered: number; totalDays: number; deliveredCount: number }>();
  clients.forEach((c) => {
    const r = c.rep_id || "unassigned";
    if (!repMap.has(r)) repMap.set(r, { total: 0, delivered: 0, totalDays: 0, deliveredCount: 0 });
    const entry = repMap.get(r)!;
    entry.total++;
    if (c.stage === "delivered") {
      entry.delivered++;
      entry.deliveredCount++;
      entry.totalDays += daysSince(c.created_at);
    }
  });

  const repStats = Array.from(repMap.entries()).map(([name, data]) => ({
    name,
    total: data.total,
    delivered: data.delivered,
    avgDays: data.deliveredCount > 0 ? Math.round(data.totalDays / data.deliveredCount) : 0,
  })).sort((a, b) => b.total - a.total);

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A" }}>
      {/* Nav */}
      <nav style={{ background: "#2d3e50", height: 56, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
        <img src="/bvm_logo.png" alt="BVM" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#F5C842", fontWeight: 700 }}>Campaign Portal — Admin</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Ted Herrera</span>
        <Link href="/campaign/dashboard" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,0.12)" }}>
          Rep View
        </Link>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stage Counts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
          <div style={{ background: "#243454", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#F5C842" }}>{clients.length}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Total Campaigns</div>
          </div>
          {["intake", "tearsheet", "approved", "production", "delivered"].map((s) => (
            <div key={s} style={{ background: "#243454", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: STAGE_COLORS[s] }}>{stageCounts[s] || 0}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{STAGE_LABELS[s]}</div>
            </div>
          ))}
        </div>

        {/* Rep Performance */}
        <div style={{ background: "#243454", borderRadius: 12, padding: 24, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: "0 0 16px" }}>Rep Performance</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Rep</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Total</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Delivered</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {repStats.map((r) => (
                  <tr key={r.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 12px", color: "#fff", fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: "10px 12px", color: "#F5C842", fontWeight: 700, textAlign: "center" }}>{r.total}</td>
                    <td style={{ padding: "10px 12px", color: "#22c55e", fontWeight: 700, textAlign: "center" }}>{r.delivered}</td>
                    <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.6)", textAlign: "center" }}>{r.avgDays || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Campaigns */}
        <div style={{ background: "#243454", borderRadius: 12, padding: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#fff", margin: "0 0 16px" }}>All Campaigns</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Business</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>City</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Rep</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Stage</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Ad Size</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Days</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const cSbr = (c.sbr_data || {}) as Record<string, unknown>;
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 600 }}>{c.business_name}</td>
                      <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.6)" }}>{c.city}</td>
                      <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.6)" }}>{c.rep_id || "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <span style={{ background: `${STAGE_COLORS[c.stage]}20`, color: STAGE_COLORS[c.stage], fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>
                          {STAGE_LABELS[c.stage] || c.stage}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>{c.ad_size}</td>
                      <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>{daysSince(c.created_at)}</td>
                      <td style={{ padding: "8px 10px", color: "#F5C842", fontWeight: 700, textAlign: "center" }}>{String((cSbr.opportunityScore as number) || "—")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
