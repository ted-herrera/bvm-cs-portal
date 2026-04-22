import { NextResponse } from "next/server";
import { generateAdImage } from "@/lib/openai-image";
import { getClient } from "@/lib/mock-data";

export async function GET() {
  console.log("[image/generate] GET — OPENAI_API_KEY set:", !!process.env.OPENAI_API_KEY);
  return NextResponse.json({ configured: !!process.env.OPENAI_API_KEY });
}

type IncomeTier = "low" | "middle" | "premium";

export async function POST(request: Request) {
  const keySet = !!process.env.OPENAI_API_KEY;
  console.log("[image/generate] POST — OPENAI_API_KEY set:", keySet);
  if (!keySet) {
    console.error("[image/generate] OPENAI_API_KEY is missing from the server environment. Add it to Vercel env vars to enable AI image generation — all requests will fall back to stock photos until it is set.");
    return NextResponse.json({ error: "not configured" }, { status: 200 });
  }

  try {
    const body = (await request.json()) as {
      clientId?: string;
      businessName?: string;
      businessType?: string;
      services?: string[];
      city?: string;
      zip?: string;
      desc?: string;
      cta?: string;
      phone?: string;
      address?: string;
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
    let zip = body.zip || "";
    let desc = body.desc || "";
    let cta = body.cta || "";
    let phone = body.phone || "";
    let address = body.address || "";
    let adSize = body.adSize || "";
    let incomeTier: IncomeTier = body.incomeTier || "middle";
    const variation = body.variation || "bauhaus";

    if (body.clientId) {
      const client = await getClient(body.clientId);
      if (client) {
        businessName = businessName || client.business_name;
        city = city || client.city || "";
        zip = zip || client.zip || "";
        phone = phone || client.phone || "";
        const intake = (client.intakeAnswers || {}) as Record<string, string>;
        if (services.length === 0) services = (intake.q3 || "").split(",").map((s) => s.trim()).filter(Boolean);
        if (!desc) desc = intake.q2 || intake.desc || businessType;
        if (!cta) cta = intake.q4 || "";
        if (!address) address = intake.address || "";
        if (!phone) phone = intake.phone || "";
        if (!adSize) adSize = intake.q5 || intake.printSize || "";
        const sbr = (client.sbrData || {}) as Record<string, unknown>;
        const storedTier = sbr.incomeTier as IncomeTier | undefined;
        if (storedTier) incomeTier = storedTier;
      }
    }

    const imageUrl = await generateAdImage({
      businessName,
      businessType,
      services,
      city,
      zip,
      desc,
      cta,
      phone,
      address,
      size: adSize,
      incomeTier,
      variation,
      seed: body.seed,
      prompt: body.prompt,
    });
    if (!imageUrl) {
      return NextResponse.json({ error: "image generation failed" }, { status: 502 });
    }
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
