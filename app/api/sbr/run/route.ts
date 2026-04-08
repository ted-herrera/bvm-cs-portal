import { NextResponse } from "next/server";
import { SBR_SYSTEM_PROMPT } from "@/lib/sbr";

export async function POST(request: Request) {
  const { businessType, zip, city } = (await request.json()) as {
    businessType: string;
    zip: string;
    city: string;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      businessType, zip, city,
      demographics: { medianIncome: "", homeownerPercent: "", familyComposition: "", ageTrends: "" },
      competitors: [], marketInsight: "", campaignHeadline: "", geoCopyBlock: "",
      creativeDirection: "", sbrTalkingPoints: [], competitorBenchmark: "",
      localAdvantage: "", taglineSuggestions: [],
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
        messages: [{ role: "user", content: `Run Bruno SBR for: ${businessType} | ${zip}` }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      businessType, zip, city,
      demographics: { medianIncome: "", homeownerPercent: "", familyComposition: "", ageTrends: "" },
      competitors: [], marketInsight: "", campaignHeadline: "", geoCopyBlock: "",
      creativeDirection: "", sbrTalkingPoints: [], competitorBenchmark: "",
      localAdvantage: "", taglineSuggestions: [],
    });
  }
}
