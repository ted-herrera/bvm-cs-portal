import { NextResponse } from "next/server";
import { generateAdImage } from "@/lib/openai-image";
import { getClient } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ configured: !!process.env.OPENAI_API_KEY });
}

type IncomeTier = "low" | "middle" | "premium";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "not configured" }, { status: 200 });
  }

  try {
    const body = (await request.json()) as {
      clientId?: string;
      businessName?: string;
      businessType?: string;
      services?: string[];
      city?: string;
      adSize?: string;
      incomeTier?: IncomeTier;
      variation?: string;
      seed?: string | number;
      prompt?: string;
    };

    // Start with caller-provided values; fill gaps from stored client record.
    let businessName = body.businessName || "";
    let businessType = body.businessType || "";
    let services: string[] = Array.isArray(body.services) ? body.services.filter(Boolean) : [];
    let city = body.city || "";
    let adSize = body.adSize || "";
    let incomeTier: IncomeTier = body.incomeTier || "middle";
    const variation = body.variation || "clean_classic";

    if (body.clientId) {
      const client = await getClient(body.clientId);
      if (client) {
        businessName = businessName || client.business_name;
        city = city || client.city || "";
        const intake = (client.intakeAnswers || {}) as Record<string, string>;
        if (services.length === 0) services = (intake.q3 || "").split(",").map((s) => s.trim()).filter(Boolean);
        if (!adSize) adSize = intake.q5 || intake.printSize || "";
        const sbr = (client.sbrData || {}) as Record<string, unknown>;
        const storedTier = sbr.incomeTier as IncomeTier | undefined;
        if (storedTier) incomeTier = storedTier;
      }
    }

    const imageUrl = await generateAdImage(
      businessName,
      businessType,
      services,
      city,
      adSize,
      incomeTier,
      variation,
      body.seed,
    );
    if (!imageUrl) {
      return NextResponse.json({ error: "image generation failed" }, { status: 502 });
    }
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
