export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    businessName,
    category,
    city,
    services,
    adSize,
    tagline,
    sbrData,
  } = (await request.json()) as {
    businessName: string;
    category: string;
    city: string;
    services: string;
    adSize: string;
    tagline: string;
    sbrData: Record<string, unknown> | null;
    direction?: string;
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const incomeRing = (sbrData?.medianIncome as string) || "";
  const marketBrief = (sbrData?.marketBrief as string) || "";

  const directions = [
    {
      name: "Bold & Direct",
      style: "Bold, high-contrast design with strong typography. Direct call to action. Eye-catching and impossible to ignore.",
      mood: "confident, powerful, attention-grabbing",
    },
    {
      name: "Warm & Local",
      style: "Warm, inviting community feel. Friendly tones, approachable imagery. Feels like a trusted neighbor.",
      mood: "friendly, warm, trustworthy, community-focused",
    },
    {
      name: "Premium & Polished",
      style: "Upscale, sophisticated design. Clean lines, premium feel. Conveys quality and professionalism.",
      mood: "elegant, premium, refined, professional",
    },
  ];

  function buildPrompt(dir: typeof directions[number]): string {
    return `Create a professional print advertisement for a local business.

Business: "${businessName}" — a ${category} business in ${city}
Primary service/offer: ${services}
Tagline: "${tagline}"
Ad size: ${adSize}
${incomeRing ? `Market demographics: ${incomeRing} median income area` : ""}
${marketBrief ? `Market insight: ${marketBrief}` : ""}

Creative direction: ${dir.name}
Style: ${dir.style}
Mood: ${dir.mood}

Requirements:
- This is a PRINT AD for a local magazine
- Include the business name "${businessName}" prominently
- Include the tagline "${tagline}"
- Include a call to action related to: ${services}
- The design should feel ${dir.mood}
- Use appropriate imagery for a ${category} business
- Professional, magazine-quality design
- Do NOT include any phone numbers or addresses — just the brand, tagline, and CTA
- The ad should look like it belongs in a premium local magazine`;
  }

  try {
    const results = await Promise.all(
      directions.map(async (dir) => {
        const prompt = buildPrompt(dir);

        const res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt,
            n: 1,
            size: "1024x1024",
            quality: "high",
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          console.error(`[generate-image] Error for ${dir.name}:`, err);
          return {
            name: dir.name,
            imageUrl: "",
            description: dir.style,
            prompt,
            error: true,
          };
        }

        const data = (await res.json()) as {
          data?: Array<{ url?: string; b64_json?: string }>;
        };

        const imageData = data.data?.[0];
        let imageUrl = imageData?.url || "";

        // If b64_json is returned instead of url, create a data URI
        if (!imageUrl && imageData?.b64_json) {
          imageUrl = `data:image/png;base64,${imageData.b64_json}`;
        }

        return {
          name: dir.name,
          imageUrl,
          description: dir.style,
          prompt,
        };
      })
    );

    return Response.json({ directions: results });
  } catch (e) {
    console.error("[generate-image] Error:", e);
    return Response.json({ error: "Image generation failed" }, { status: 500 });
  }
}
