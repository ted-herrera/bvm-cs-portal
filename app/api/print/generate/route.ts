import { NextResponse } from "next/server";
import { renderPrintAd, type PrintAdData } from "@/lib/print-engine";

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as PrintAdData;
    if (!data?.businessName || !data?.size) {
      return NextResponse.json({ error: "businessName and size required" }, { status: 400 });
    }
    const html = renderPrintAd(data, { dpi: 150 });
    return NextResponse.json({ success: true, html });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
