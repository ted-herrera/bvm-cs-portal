import * as XLSX from "xlsx";
import { getSupabase } from "@/lib/supabase";

const VALID_REPS = [
  "Alex Polivka", "April Dippolito", "Genele Ekinde",
  "Kala McNeely", "Karen Guirguis", "Samantha Marcus",
];

function findCol(headers: string[], ...names: string[]): string | null {
  for (const h of headers) {
    const hl = h.toLowerCase().trim();
    for (const n of names) {
      if (hl.includes(n.toLowerCase())) return h;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Database not configured" }, { status: 500 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

  if (rows.length === 0) return Response.json({ error: "Empty spreadsheet" }, { status: 400 });

  const headers = Object.keys(rows[0]);
  const repCol = findCol(headers, "rep", "css", "account manager", "am");
  const clientCol = findCol(headers, "client", "business", "company", "name");
  const contractCol = findCol(headers, "contract", "agreement");
  const saleItemsCol = findCol(headers, "sale item", "ad type", "product");
  const monthlyCol = findCol(headers, "monthly", "mrr", "revenue");
  const renewCol = findCol(headers, "renew", "status");
  const lastEdCol = findCol(headers, "last edition", "end date", "expir");
  const regionCol = findCol(headers, "region");
  const divisionCol = findCol(headers, "division");
  const marketCol = findCol(headers, "market", "publication");
  const industryCol = findCol(headers, "industry", "category");
  const attritionCol = findCol(headers, "attrition", "cause", "reason");

  const byRep: Record<string, number> = {};
  const records: Array<Record<string, unknown>> = [];
  const weekOf = new Date().toISOString().slice(0, 10);

  for (const row of rows) {
    const repName = repCol ? String(row[repCol] || "").trim() : "";
    // Match against valid reps (case-insensitive)
    const matched = VALID_REPS.find(r => r.toLowerCase() === repName.toLowerCase());
    if (!matched) continue;

    const record = {
      rep_name: matched,
      week_of: weekOf,
      business_name: clientCol ? String(row[clientCol] || "") : "",
      contract_number: contractCol ? String(row[contractCol] || "") : "",
      sale_items: saleItemsCol ? String(row[saleItemsCol] || "") : "",
      monthly: monthlyCol ? parseFloat(String(row[monthlyCol] || "0").replace(/[^0-9.]/g, "")) || 0 : 0,
      renew_status: renewCol ? String(row[renewCol] || "") : "",
      last_edition: lastEdCol ? String(row[lastEdCol] || "") : "",
      region: regionCol ? String(row[regionCol] || "") : "",
      division: divisionCol ? String(row[divisionCol] || "") : "",
      market: marketCol ? String(row[marketCol] || "") : "",
      industry: industryCol ? String(row[industryCol] || "") : "",
      attrition_cause: attritionCol ? String(row[attritionCol] || "") : "",
    };

    records.push(record);
    byRep[matched] = (byRep[matched] || 0) + 1;
  }

  if (records.length === 0) {
    return Response.json({ error: "No matching rep records found", total: 0, byRep: {} });
  }

  // Delete existing records for this week
  await sb.from("cs_intel").delete().eq("week_of", weekOf);

  // Insert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await sb.from("cs_intel").insert(batch);
    if (error) {
      console.error("[cs-upload] Insert error:", error);
      return Response.json({ error: error.message, total: i, byRep }, { status: 500 });
    }
  }

  return Response.json({ success: true, total: records.length, byRep });
}
