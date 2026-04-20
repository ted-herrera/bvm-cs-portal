import { NextRequest, NextResponse } from "next/server";
import { renderPrintAd, type PrintAdData, type PrintSize, type PrintVariation } from "@/lib/print-engine";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<PrintAdData> & {
      showBleed?: boolean;
      showSafeZone?: boolean;
      showTrimMarks?: boolean;
      dpi?: 150 | 300;
    };

    const data: PrintAdData = {
      businessName: body.businessName || "Business Name",
      tagline: body.tagline || "",
      city: body.city || "",
      services: Array.isArray(body.services) ? body.services : [],
      cta: body.cta || "Learn More",
      phone: body.phone || "",
      website: body.website,
      logoUrl: body.logoUrl,
      photoUrl: body.photoUrl || "",
      brandColors: body.brandColors || { primary: "#0C2340", secondary: "#475569", accent: "#D4A843" },
      size: (body.size as PrintSize) || "1/4",
      variation: (body.variation as PrintVariation) || "clean_classic",
      subVariation: typeof body.subVariation === "number" ? body.subVariation : 0,
    };

    const html = renderPrintAd(data, {
      dpi: body.dpi ?? 150,
      showBleed: !!body.showBleed,
      showSafeZone: !!body.showSafeZone,
      showTrimMarks: !!body.showTrimMarks,
    });

    return NextResponse.json({ html });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to render print ad" },
      { status: 500 },
    );
  }
}
