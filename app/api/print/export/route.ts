import { NextResponse } from "next/server";
import { renderPrintAd, getSizeSpec, type PrintAdData } from "@/lib/print-engine";

// Returns print-ready output at 300 DPI with bleed. Uses a lightweight
// approach: returns an HTML document at the exact bleed dimensions so the
// caller can render/export to PNG via a headless browser or screenshot tool.
export async function POST(request: Request) {
  try {
    const data = (await request.json()) as PrintAdData;
    if (!data?.businessName || !data?.size) {
      return NextResponse.json({ error: "businessName and size required" }, { status: 400 });
    }

    const spec = getSizeSpec(data.size);
    const ad = renderPrintAd(data, { dpi: 300, showBleed: false, showTrimMarks: true });

    const doc = `<!doctype html><html><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>html,body{margin:0;padding:0;background:#ffffff;}@page{size:${spec.bleedInches.w}in ${spec.bleedInches.h}in;margin:0;}</style></head><body>${ad}</body></html>`;

    return new NextResponse(doc, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Print-Bleed-Width-In": String(spec.bleedInches.w),
        "X-Print-Bleed-Height-In": String(spec.bleedInches.h),
        "X-Print-Trim-Width-In": String(spec.trimInches.w),
        "X-Print-Trim-Height-In": String(spec.trimInches.h),
        "X-Print-DPI": "300",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
