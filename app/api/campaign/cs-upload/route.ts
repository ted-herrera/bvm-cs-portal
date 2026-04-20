import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { getSupabase } from "@/lib/supabase";
import { CAMPAIGN_USERS } from "@/lib/campaign";

interface CSRow {
  rep: string;
  client: string;
  contract_number: string | null;
  sale_items: string | null;
  monthly: number | null;
  renew_status: string | null;
  last_edition: string | null;
  region: string | null;
  division: string | null;
  market: string | null;
  industry: string | null;
  attrition_cause: string | null;
}

const COLUMN_MAP: Record<string, keyof CSRow> = {
  rep: "rep",
  client: "client",
  "contract #": "contract_number",
  "contract number": "contract_number",
  "sale items": "sale_items",
  monthly: "monthly",
  "renew status": "renew_status",
  "last edition": "last_edition",
  region: "region",
  division: "division",
  market: "market",
  industry: "industry",
  "attrition cause": "attrition_cause",
};

function normalizeHeaders(headers: string[]): Record<number, keyof CSRow> {
  const map: Record<number, keyof CSRow> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i]?.trim().toLowerCase();
    if (key && COLUMN_MAP[key]) {
      map[i] = COLUMN_MAP[key];
    }
  }
  return map;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const week = formData.get("week") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!week) {
      return NextResponse.json({ error: "week is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "Spreadsheet has no sheets" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData: unknown[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length < 2) {
      return NextResponse.json({ error: "Spreadsheet has no data rows" }, { status: 400 });
    }

    const headerRow = (rawData[0] as string[]).map((h) => String(h || ""));
    const colMap = normalizeHeaders(headerRow);

    const validRepNames = new Set(CAMPAIGN_USERS.map((u) => u.username.toLowerCase()));

    const rows: CSRow[] = [];
    for (let i = 1; i < rawData.length; i++) {
      const raw = rawData[i] as unknown[];
      const row: Partial<CSRow> = {};

      for (const [colIdx, field] of Object.entries(colMap)) {
        const val = raw[Number(colIdx)];
        if (field === "monthly") {
          row[field] = typeof val === "number" ? val : val ? parseFloat(String(val)) || null : null;
        } else {
          (row as Record<string, unknown>)[field] = val != null ? String(val) : null;
        }
      }

      // Filter to valid rep names only
      if (row.rep && validRepNames.has(row.rep.trim().toLowerCase()) && row.client) {
        rows.push(row as CSRow);
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found for known reps" }, { status: 400 });
    }

    // Delete existing data for this week
    const { error: deleteError } = await supabase
      .from("cs_intel")
      .delete()
      .eq("week", week);

    if (deleteError) {
      return NextResponse.json({ error: `Delete failed: ${deleteError.message}` }, { status: 500 });
    }

    // Insert new rows
    const insertData = rows.map((r) => ({ ...r, week }));
    const { error: insertError } = await supabase.from("cs_intel").insert(insertData);

    if (insertError) {
      return NextResponse.json({ error: `Insert failed: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, rowCount: rows.length, week });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
