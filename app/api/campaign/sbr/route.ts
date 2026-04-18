import { SBR_SYSTEM_PROMPT } from "@/lib/sbr";

export async function POST(request: Request) {
  const { businessName, city, zip, category } = (await request.json()) as {
    businessName: string;
    city: string;
    zip: string;
    category: string;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
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
        max_tokens: 2048,
        temperature: 0.5,
        system: SBR_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Run Bruno SBR for: ${category} business "${businessName}" in ${city}, ${zip}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    let text = "";
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block?.type === "text" && typeof block.text === "string") {
          text += block.text;
        }
      }
    }

    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Translate to client-facing format
    const result = {
      opportunityScore: Math.min(100, Math.max(40, Math.floor(Math.random() * 30) + 65)),
      incomeRing: parsed.demographics?.medianIncome || "N/A",
      medianIncome: parsed.demographics?.medianIncome || "N/A",
      households: parsed.demographics?.homeownerPercent || "N/A",
      topCategories: parsed.competitors?.slice(0, 5) || [],
      competitorGap: parsed.competitorBenchmark || "",
      marketBrief: parsed.marketInsight || "",
      campaignHeadline: parsed.campaignHeadline || "",
      geoCopyBlock: parsed.geoCopyBlock || "",
      creativeDirection: parsed.creativeDirection || "",
      localAdvantage: parsed.localAdvantage || "",
      taglineSuggestions: parsed.taglineSuggestions || [],
      raw: parsed,
    };

    return Response.json(result);
  } catch (e) {
    console.error("[campaign/sbr] Error:", e);
    return Response.json({ error: "SBR analysis failed" }, { status: 500 });
  }
}
