import { NextResponse } from "next/server";
import { SBR_SYSTEM_PROMPT } from "@/lib/sbr";

const EMPTY_SBR = {
  demographics: { medianIncome: "", homeownerPercent: "", familyComposition: "", ageTrends: "" },
  competitors: [], marketInsight: "", campaignHeadline: "", geoCopyBlock: "",
  creativeDirection: "", sbrTalkingPoints: [], competitorBenchmark: "",
  localAdvantage: "", taglineSuggestions: [],
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    businessType?: string;
    zip?: string;
    city?: string;
    businessName?: string;
    description?: string;
  };

  const bizType = body.businessType || body.description || body.businessName || "local business";
  const bizZip = body.zip || "";
  const bizCity = body.city || "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error("SBR Run: ANTHROPIC_API_KEY not configured in environment variables");
    return NextResponse.json({
      success: false,
      error: "ANTHROPIC_API_KEY not configured in environment variables",
      sbrData: null,
      ...EMPTY_SBR,
      businessType: bizType, zip: bizZip, city: bizCity,
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.7,
        system: SBR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Run Bruno SBR for: ${bizType} | ${bizZip} | ${bizCity}` }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`SBR Run: Anthropic API returned ${res.status}:`, errText);
      return NextResponse.json({
        success: false,
        error: `Anthropic API error: ${res.status}`,
        sbrData: null,
        ...EMPTY_SBR,
        businessType: bizType, zip: bizZip, city: bizCity,
      });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    console.log("SBR Run: Success for", bizType, bizZip);
    return NextResponse.json({ success: true, sbrData: parsed, ...parsed });
  } catch (err) {
    console.error("SBR Run: Error during API call or parse:", err);
    return NextResponse.json({
      success: false,
      error: String(err),
      sbrData: null,
      ...EMPTY_SBR,
      businessType: bizType, zip: bizZip, city: bizCity,
    });
  }
}
