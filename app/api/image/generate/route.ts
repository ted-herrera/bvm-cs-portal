import { NextResponse } from "next/server";
import { generateAdImage } from "@/lib/openai-image";
import { getClient } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ configured: !!process.env.OPENAI_API_KEY });
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "not configured" }, { status: 200 });
  }

  try {
    const { clientId, prompt } = (await request.json()) as {
      clientId?: string;
      prompt?: string;
    };

    let businessName = "";
    let services: string[] = [];
    let vibe = prompt || "";

    if (clientId) {
      const client = await getClient(clientId);
      if (client) {
        businessName = client.business_name;
        const intake = (client.intakeAnswers || {}) as Record<string, string>;
        services = (intake.q3 || "").split(",").map((s) => s.trim()).filter(Boolean);
        vibe = intake.brandVibe || prompt || "";
      }
    }

    const imageUrl = await generateAdImage(businessName, services, vibe);
    if (!imageUrl) {
      return NextResponse.json({ error: "image generation failed" }, { status: 502 });
    }
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
