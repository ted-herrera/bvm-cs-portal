"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CampaignClient } from "@/lib/campaign";

interface CSRow {
  rep: string;
  client: string;
  contract_number: string | null;
  monthly: number | null;
  renew_status: string | null;
}

interface RepSummary {
  rep: string;
  accounts: number;
  renewable: number;
  declined: number;
  mrr: number;
  arr: number;
}

export default function CampaignAdminPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignClient[]>([]);
  const [csData, setCsData] = useState<CSRow[]>([]);
  const [repSummaries, setRepSummaries] = useState<RepSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [periodEnd, setPeriodEnd] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingCs, setLoadingCs] = useState(true);

  // Auth check
  useEffect(() => {
    try {
      const raw = localStorage.getItem("campaign_user");
      if (!raw) {
        router.push("/campaign/login");
        return;
      }
      const user = JSON.parse(raw);
      if (user.role !== "admin") {
        router.push("/campaign/login");
      }
    } catch {
      router.push("/campaign/login");
    }
  }, [router]);

  // Load campaign_clients
  const loadCampaigns = useCallback(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      setLoadingCampaigns(false);
      return;
    }
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/campaign_clients?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data || []);
      }
    } catch {
      /* silent */
    }
    setLoadingCampaigns(false);
  }, []);

  // Load cs_intel
  const loadCsData = useCallback(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      setLoadingCs(false);
      return;
    }
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/cs_intel?select=*`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (res.ok) {
        const data: CSRow[] = await res.json();
        setCsData(data || []);

        // Build rep summaries
        const byRep: Record<string, CSRow[]> = {};
        for (const row of data) {
          if (!row.rep) continue;
          if (!byRep[row.rep]) byRep[row.rep] = [];
          byRep[row.rep].push(row);
        }

        const summaries: RepSummary[] = Object.entries(byRep).map(
          ([rep, rows]) => {
            const accounts = rows.length;
            const renewable = rows.filter(
              (r) =>
                r.renew_status?.toLowerCase() === "renewable" ||
                r.renew_status?.toLowerCase() === "renewed",
            ).length;
            const declined = rows.filter(
              (r) =>
                r.renew_status?.toLowerCase() === "declined" ||
                r.renew_status?.toLowerCase() === "cancelled",
            ).length;
            const mrr = rows.reduce(
              (sum, r) => sum + (r.monthly || 0),
              0,
            );
            return {
              rep,
              accounts,
              renewable,
              declined,
              mrr: Math.round(mrr * 100) / 100,
              arr: Math.round(mrr * 12 * 100) / 100,
            };
          },
        );
        setRepSummaries(summaries);
      }
    } catch {
      /* silent */
    }
    setLoadingCs(false);
  }, []);

  useEffect(() => {
    loadCampaigns();
    loadCsData();
  }, [loadCampaigns, loadCsData]);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadResult("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("week", periodEnd);

    try {
      const res = await fetch("/api/campaign/cs-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult(
          `Uploaded ${data.rowCount} rows for week ${data.week}`,
        );
        loadCsData();
      } else {
        setUploadResult(`Error: ${data.error}`);
      }
    } catch {
      setUploadResult("Upload failed");
    }
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  const totals = repSummaries.reduce(
    (acc, r) => ({
      accounts: acc.accounts + r.accounts,
      renewable: acc.renewable + r.renewable,
      declined: acc.declined + r.declined,
      mrr: acc.mrr + r.mrr,
      arr: acc.arr + r.arr,
    }),
    { accounts: 0, renewable: 0, declined: 0, mrr: 0, arr: 0 },
  );

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1B2A4A",
        color: "#ffffff",
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
        }}
      >
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#ffffff",
            margin: 0,
          }}
        >
          Campaign Portal{" "}
          <span style={{ color: "#94a3b8", fontWeight: 400 }}>
            — Admin
          </span>
        </h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link
            href="/campaign/intake"
            style={{
              fontSize: 13,
              color: "#C8922A",
              textDecoration: "none",
            }}
          >
            Intake
          </Link>
          <Link
            href="/campaign/login"
            style={{
              fontSize: 13,
              color: "#94a3b8",
              textDecoration: "none",
            }}
          >
            Logout
          </Link>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
        {/* Reporting Period */}
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#C8922A",
            }}
          >
            Reporting Period
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            style={{
              background: "#0f1d33",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              color: "#ffffff",
              outline: "none",
            }}
          />
          <span style={{ color: "#64748b" }}>to</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            style={{
              background: "#0f1d33",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              color: "#ffffff",
              outline: "none",
            }}
          />
        </div>

        {/* Upload Card */}
        <div
          style={{
            background: "#1a2740",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#C8922A",
              marginBottom: 16,
            }}
          >
            Upload CS Data
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "#C8922A" : "#334155"}`,
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.2s",
              background: dragOver ? "rgba(200,146,42,0.05)" : "transparent",
            }}
            onClick={() =>
              document.getElementById("cs-file-input")?.click()
            }
          >
            <input
              id="cs-file-input"
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
            <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
              {uploading
                ? "Uploading..."
                : "Drop .xlsx or .csv file here, or click to browse"}
            </p>
          </div>
          {uploadResult && (
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: uploadResult.startsWith("Error")
                  ? "#ef4444"
                  : "#22c55e",
              }}
            >
              {uploadResult}
            </p>
          )}
        </div>

        {/* Team BOB Table */}
        <div
          style={{
            background: "#1a2740",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
            overflowX: "auto",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#C8922A",
              marginBottom: 16,
            }}
          >
            Team Book of Business
          </p>
          {loadingCs ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>Loading...</p>
          ) : repSummaries.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>
              No CS data uploaded yet. Upload a spreadsheet above.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #334155",
                    textAlign: "left",
                  }}
                >
                  {[
                    "Rep",
                    "Accounts",
                    "Renewable",
                    "Declined",
                    "MRR",
                    "ARR",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#94a3b8",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repSummaries.map((r) => (
                  <tr
                    key={r.rep}
                    style={{ borderBottom: "1px solid #1e293b" }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      {r.rep}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{r.accounts}</td>
                    <td style={{ padding: "10px 12px", color: "#22c55e" }}>
                      {r.renewable}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#ef4444" }}>
                      {r.declined}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{fmt(r.mrr)}</td>
                    <td style={{ padding: "10px 12px" }}>{fmt(r.arr)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr
                  style={{
                    borderTop: "2px solid #C8922A",
                    fontWeight: 700,
                  }}
                >
                  <td style={{ padding: "10px 12px", color: "#C8922A" }}>
                    Total
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {totals.accounts}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#22c55e" }}>
                    {totals.renewable}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#ef4444" }}>
                    {totals.declined}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {fmt(totals.mrr)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {fmt(totals.arr)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* All Campaigns Table */}
        <div
          style={{
            background: "#1a2740",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: 24,
            overflowX: "auto",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#C8922A",
              marginBottom: 16,
            }}
          >
            All Campaigns
          </p>
          {loadingCampaigns ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>Loading...</p>
          ) : campaigns.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>
              No campaigns yet.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #334155",
                    textAlign: "left",
                  }}
                >
                  {[
                    "Business",
                    "Category",
                    "City",
                    "Ad Size",
                    "Rep",
                    "Stage",
                    "Created",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#94a3b8",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid #1e293b",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      router.push(`/campaign/tearsheet/${c.id}`)
                    }
                  >
                    <td
                      style={{ padding: "10px 12px", fontWeight: 600 }}
                    >
                      {c.business_name}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{c.category}</td>
                    <td style={{ padding: "10px 12px" }}>{c.city}</td>
                    <td style={{ padding: "10px 12px" }}>{c.ad_size}</td>
                    <td style={{ padding: "10px 12px" }}>{c.rep_id}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background:
                            c.stage === "approved"
                              ? "rgba(34,197,94,0.15)"
                              : c.stage === "delivered"
                                ? "rgba(59,130,246,0.15)"
                                : "rgba(200,146,42,0.15)",
                          color:
                            c.stage === "approved"
                              ? "#22c55e"
                              : c.stage === "delivered"
                                ? "#3b82f6"
                                : "#C8922A",
                        }}
                      >
                        {c.stage}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
