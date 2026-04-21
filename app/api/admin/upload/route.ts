import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";

// ─── GateKeeper Executive Pack parser ────────────────────────────────────
// Parses three sheets:
//   • "Dashboard Summary" — team health, portfolio BoB, WOW delta, risk,
//     per-rep scores + tiers
//   • "Team Totals" — portfolio baseline, in-scope BoB, declined, digital mix
//   • "Segmentation - Print Only" — individual agreement rows

// Rep name mapping (last name → internal username)
const LASTNAME_TO_USER: Record<string, string> = {
  mcneely: "kala",
  marcus: "samantha",
  dippolito: "april",
  polivka: "alex",
  guirguis: "karen",
  ekinde: "genele",
};
const FULLNAME_TO_USER: Record<string, string> = {
  "kala mcneely": "kala",
  "samantha marcus": "samantha",
  "april dippolito": "april",
  "alex polivka": "alex",
  "karen guirguis": "karen",
  "genele ekinde": "genele",
};
function mapRepName(raw: unknown): string {
  if (!raw) return "";
  const s = String(raw).trim().toLowerCase();
  if (!s) return "";
  if (FULLNAME_TO_USER[s]) return FULLNAME_TO_USER[s];
  const parts = s.split(/\s+/);
  const last = parts[parts.length - 1];
  if (LASTNAME_TO_USER[last]) return LASTNAME_TO_USER[last];
  if (LASTNAME_TO_USER[s]) return LASTNAME_TO_USER[s];
  return s;
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function tierForScore(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

interface RepRollup {
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

function buildHeaderIndex(row: unknown[]): Record<string, number> {
  const idx: Record<string, number> = {};
  row.forEach((h, i) => {
    const key = str(h).toLowerCase();
    if (key) idx[key] = i;
  });
  return idx;
}

function lookupFirst(rows: unknown[][], labelRegex: RegExp, valueOffset = 1): string {
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      if (labelRegex.test(str(row[c]).toLowerCase())) {
        return str(row[c + valueOffset]);
      }
    }
  }
  return "";
}

function parseDashboardSummary(sheet: xlsx.WorkSheet): { summary: Partial<TeamSummary>; reps: RepRollup[] } {
  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const summary: Partial<TeamSummary> = {};

  summary.teamHealthScore = num(lookupFirst(rows, /team\s+health\s+score/));
  summary.portfolioBoB = num(lookupFirst(rows, /portfolio\s+bob|book\s+of\s+business/));
  summary.wowDelta = num(lookupFirst(rows, /wow\s+delta|week.?over.?week/));
  summary.portfolioRiskPct = num(lookupFirst(rows, /portfolio\s+risk|risk\s+%/));

  const reps: RepRollup[] = [];
  let tableStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].map(str).join(" ").toLowerCase();
    if (joined.includes("rep") && (joined.includes("health") || joined.includes("score")) && joined.includes("tier")) {
      tableStart = i;
      break;
    }
  }
  if (tableStart !== -1) {
    const header = buildHeaderIndex(rows[tableStart]);
    const nameCol = header["rep"] ?? header["name"] ?? 0;
    const scoreCol = header["health score"] ?? header["score"] ?? header["health"] ?? -1;
    const tierCol = header["tier"] ?? -1;
    const countCol = header["print only count"] ?? header["print only"] ?? header["count"] ?? -1;
    const valueCol = header["print only value"] ?? header["value"] ?? header["$"] ?? -1;
    const bobCol = header["bob"] ?? header["book of business"] ?? -1;
    for (let r = tableStart + 1; r < rows.length; r++) {
      const row = rows[r];
      const name = str(row[nameCol]);
      if (!name || /^(total|team|grand|all)/i.test(name)) break;
      const mapped = mapRepName(name);
      if (!mapped) continue;
      const score = scoreCol >= 0 ? num(row[scoreCol]) : 0;
      reps.push({
        rep: mapped,
        displayName: name,
        healthScore: score,
        tier: tierCol >= 0 ? str(row[tierCol]) || tierForScore(score) : tierForScore(score),
        printOnlyCount: countCol >= 0 ? num(row[countCol]) : 0,
        printOnlyValue: valueCol >= 0 ? num(row[valueCol]) : 0,
        bookOfBusiness: bobCol >= 0 ? num(row[bobCol]) : 0,
      });
    }
  }

  return { summary, reps };
}

function parseTeamTotals(sheet: xlsx.WorkSheet, base: Partial<TeamSummary>): TeamSummary {
  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const merged: TeamSummary = {
    teamHealthScore: base.teamHealthScore ?? 0,
    portfolioBoB: base.portfolioBoB ?? 0,
    portfolioBaseline: base.portfolioBaseline ?? 0,
    inScopeBoB: base.inScopeBoB ?? 0,
    wowDelta: base.wowDelta ?? 0,
    portfolioRiskPct: base.portfolioRiskPct ?? 0,
    declinedTotal: base.declinedTotal ?? 0,
    digitalMix: base.digitalMix ?? 0,
  };
  const pick = (re: RegExp): number => num(lookupFirst(rows, re));
  merged.portfolioBaseline = pick(/portfolio\s+baseline|baseline/) || merged.portfolioBaseline;
  merged.inScopeBoB = pick(/in.?scope\s+bob|in.?scope|scope\s+bob/) || merged.inScopeBoB;
  merged.declinedTotal = pick(/declined\s+total|declined/) || merged.declinedTotal;
  merged.digitalMix = pick(/digital\s+mix/) || merged.digitalMix;
  merged.teamHealthScore = pick(/team\s+health\s+score/) || merged.teamHealthScore;
  if (!merged.portfolioBoB) merged.portfolioBoB = pick(/portfolio\s+bob|book\s+of\s+business/);
  return merged;
}

function parseSegmentationPrintOnly(sheet: xlsx.WorkSheet): PrintOnlyRow[] {
  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (rows.length === 0) return [];

  // Find header row — it should contain "Agreement Number" and "Client Name"
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const joined = rows[i].map(str).join(" ").toLowerCase();
    if (joined.includes("agreement") && joined.includes("client")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const header = buildHeaderIndex(rows[headerIdx]);
  const col = (names: string[]): number => {
    for (const n of names) {
      if (header[n] !== undefined) return header[n];
    }
    return -1;
  };
  const cAgreement = col(["agreement number", "agreement #", "agreement"]);
  const cClient = col(["client name", "client"]);
  const cRep = col(["rep", "sales rep", "assigned rep"]);
  const cSubtotal = col(["subtotal sales", "subtotal", "sales"]);
  const cRenew = col(["renew status", "renewal status"]);
  const cSaleItems = col(["sale items", "items"]);
  const cDigital = col(["digital classification", "digital"]);
  const cSegment = col(["segment type", "segment"]);
  const cContacted = col(["contacted"]);
  const cContactType = col(["contact type"]);
  const cCurrent = col(["current status", "status"]);
  const cBlocker = col(["blocker"]);
  const cNext = col(["next step"]);
  const cNotes = col(["notes"]);

  const out: PrintOnlyRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const agreement = str(row[cAgreement]);
    const client = str(row[cClient]);
    if (!agreement && !client) continue;
    const repRaw = cRep >= 0 ? str(row[cRep]) : "";
    const contactedRaw = cContacted >= 0 ? str(row[cContacted]).toLowerCase() : "";
    const contacted = /^(yes|y|true|1|✓|done)$/.test(contactedRaw);
    out.push({
      agreementNumber: agreement,
      clientName: client,
      rep: mapRepName(repRaw),
      subtotalSales: cSubtotal >= 0 ? num(row[cSubtotal]) : 0,
      renewStatus: cRenew >= 0 ? str(row[cRenew]) : "",
      saleItems: cSaleItems >= 0 ? str(row[cSaleItems]) : "",
      digitalClassification: cDigital >= 0 ? str(row[cDigital]) : "",
      segmentType: cSegment >= 0 ? str(row[cSegment]) : "",
      contacted,
      contactType: cContactType >= 0 ? str(row[cContactType]) : "",
      currentStatus: cCurrent >= 0 ? str(row[cCurrent]) : "",
      blocker: cBlocker >= 0 ? str(row[cBlocker]) : "",
      nextStep: cNext >= 0 ? str(row[cNext]) : "",
      notes: cNotes >= 0 ? str(row[cNotes]) : "",
    });
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: "buffer" });

    const dashboard = workbook.Sheets["Dashboard Summary"] || workbook.Sheets["Dashboard"] || workbook.Sheets[workbook.SheetNames[0]];
    const teamTotals = workbook.Sheets["Team Totals"] || workbook.Sheets["Team Total"];
    const segmentation = workbook.Sheets["Segmentation - Print Only"] || workbook.Sheets["Print Only"] || workbook.Sheets["Segmentation"];

    const { summary, reps } = dashboard ? parseDashboardSummary(dashboard) : { summary: {}, reps: [] };
    const teamSummary = teamTotals ? parseTeamTotals(teamTotals, summary) : {
      teamHealthScore: summary.teamHealthScore || 0,
      portfolioBoB: summary.portfolioBoB || 0,
      portfolioBaseline: 0,
      inScopeBoB: 0,
      wowDelta: summary.wowDelta || 0,
      portfolioRiskPct: summary.portfolioRiskPct || 0,
      declinedTotal: 0,
      digitalMix: 0,
    };
    const printOnlyList = segmentation ? parseSegmentationPrintOnly(segmentation) : [];

    // Enrich rep rollups with print-only data if not already populated from Dashboard Summary.
    const printByRep: Record<string, { count: number; value: number }> = {};
    printOnlyList.forEach((row) => {
      if (!row.rep) return;
      if (!printByRep[row.rep]) printByRep[row.rep] = { count: 0, value: 0 };
      printByRep[row.rep].count += 1;
      printByRep[row.rep].value += row.subtotalSales;
    });
    const repsEnriched = reps.map((r) => {
      const derived = printByRep[r.rep];
      return {
        ...r,
        printOnlyCount: r.printOnlyCount || derived?.count || 0,
        printOnlyValue: r.printOnlyValue || derived?.value || 0,
      };
    });

    return NextResponse.json({
      success: true,
      teamSummary,
      repScores: repsEnriched,
      printOnlyList,
      sheetNames: workbook.SheetNames,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
