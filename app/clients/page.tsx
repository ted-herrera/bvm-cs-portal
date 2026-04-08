"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import type { ClientProfile } from "@/lib/pipeline";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/pipeline";

type Filter = "all" | "attention" | "progress" | "delivered";

function daysSince(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs Attention" },
  { id: "progress", label: "In Progress" },
  { id: "delivered", label: "Delivered" },
];

function matchesFilter(c: ClientProfile, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "attention") return c.stage === "revision-requested" || c.stage === "tear-sheet";
  if (f === "progress") return c.stage === "building" || c.stage === "qa" || c.stage === "intake";
  if (f === "delivered") return c.stage === "delivered" || c.stage === "live";
  return true;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/clients");
        const data = await res.json();
        setClients(data.clients || []);
      } catch {
        const ids = ["client-001", "client-002", "client-003"];
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/profile/${id}`)
              .then((r) => r.json())
              .then((d) => d.client as ClientProfile | null)
              .catch(() => null)
          )
        );
        setClients(results.filter(Boolean) as ClientProfile[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = clients.filter((c) => matchesFilter(c, filter));

  return (
    <div style={{ minHeight: "100vh", background: "#0d1a2e", display: "flex", flexDirection: "column" }}>
      <TopNav activePage="clients" />

      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>Clients</h1>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{clients.length} total</span>
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "6px 16px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: filter === f.id ? "#F5C842" : "#1a2740",
                color: filter === f.id ? "#0d1a2e" : "#94a3b8",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: "2px solid #F5C842",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto",
              }}
            />
          </div>
        ) : (
          <div style={{ background: "#1a2740", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #243454" }}>
                  {["Business", "Contact", "Rep", "Status", "Days in Stage", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 20px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "#64748b",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const lastDate =
                    c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at;
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: "1px solid #1e293b", cursor: "pointer" }}
                      onClick={() => (window.location.href = `/profile/${c.id}`)}
                    >
                      <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "#fff" }}>
                        {c.business_name}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#94a3b8" }}>
                        {c.contact_name}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#94a3b8" }}>
                        {c.assigned_rep}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          className={STAGE_COLORS[c.stage]}
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            borderRadius: 9999,
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          {STAGE_LABELS[c.stage]}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#94a3b8" }}>
                        {daysSince(lastDate)}d
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Link
                            href={`/profile/${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: 12,
                              padding: "4px 12px",
                              borderRadius: 6,
                              background: "transparent",
                              border: "1px solid #F5C842",
                              color: "#F5C842",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            View
                          </Link>
                          <Link
                            href="/qa"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: 12,
                              padding: "4px 12px",
                              borderRadius: 6,
                              background: "transparent",
                              border: "1px solid #475569",
                              color: "#94a3b8",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            Run QA
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 14 }}>
                      No clients match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
