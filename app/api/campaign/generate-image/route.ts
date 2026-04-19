const AD_PRINT_SPECS: Record<string, { width: number; height: number; bleedWidth: number; bleedHeight: number; trimW: string; trimH: string; bleedW: string; bleedH: string }> = {
  "1/8 page": { width: 1095, height: 750, bleedWidth: 1170, bleedHeight: 825, trimW: '3.65"', trimH: '2.5"', bleedW: '3.9"', bleedH: '2.75"' },
  "1/4 page": { width: 1095, height: 1500, bleedWidth: 1170, bleedHeight: 1575, trimW: '3.65"', trimH: '5"', bleedW: '3.9"', bleedH: '5.25"' },
  "1/3 page": { width: 2250, height: 975, bleedWidth: 2325, bleedHeight: 1050, trimW: '7.5"', trimH: '3.25"', bleedW: '7.75"', bleedH: '3.5"' },
  "1/2 page": { width: 2250, height: 1500, bleedWidth: 2325, bleedHeight: 1575, trimW: '7.5"', trimH: '5"', bleedW: '7.75"', bleedH: '5.25"' },
  "full page": { width: 2250, height: 3000, bleedWidth: 2325, bleedHeight: 3075, trimW: '7.5"', trimH: '10"', bleedW: '7.75"', bleedH: '10.25"' },
  "front cover": { width: 2250, height: 3000, bleedWidth: 2325, bleedHeight: 3075, trimW: '7.5"', trimH: '10"', bleedW: '7.75"', bleedH: '10.25"' },
};

const PLACEHOLDER_IMAGES: Record<string, string> = {
  "Bold & Direct": "https://placehold.co/1024x1024/1B2A4A/F5C842?text=Bold+%26+Direct",
  "Warm & Local": "https://placehold.co/1024x1024/2C3E2D/F5F0E8?text=Warm+%26+Local",
  "Premium & Polished": "https://placehold.co/1024x1024/C8922A/FFFFFF?text=Premium+%26+Polished",
};

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
    console.error("[generate-image] OPENAI_API_KEY not set in environment");
    return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const incomeRing = (sbrData?.medianIncome as string) || "";
  const marketBrief = (sbrData?.marketBrief as string) || "";
  const printSpec = AD_PRINT_SPECS[adSize] || null;

  const directions = [
    { name: "Bold & Direct", style: "Bold, high-contrast design with strong typography. Direct call to action. Eye-catching and impossible to ignore.", mood: "confident, powerful, attention-grabbing" },
    { name: "Warm & Local", style: "Warm, inviting community feel. Friendly tones, approachable imagery. Feels like a trusted neighbor.", mood: "friendly, warm, trustworthy, community-focused" },
    { name: "Premium & Polished", style: "Upscale, sophisticated design. Clean lines, premium feel. Conveys quality and professionalism.", mood: "elegant, premium, refined, professional" },
  ];

  function buildPrompt(dir: typeof directions[number]): string {
    return `Create a professional print advertisement for a local business.

Business: "${businessName}" — a ${category} business in ${city}
Primary service/offer: ${services}
Tagline: "${tagline}"
Ad size: ${adSize}${printSpec ? ` (trim: ${printSpec.trimW} x ${printSpec.trimH})` : ""}
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
- The ad should look like it belongs in a premium local magazine
- The image must have a subtle but visible border around the entire perimeter
- Designed for print at 300dpi
- Leave 0.25 inch safe zone from edges for text and important elements`;
  }

  // Generate sequentially to avoid rate limits
  const results = [];

  for (const dir of directions) {
    const prompt = buildPrompt(dir);
    let imageUrl = "";

    try {
      console.log(`[generate-image] Generating ${dir.name} for "${businessName}"...`);

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
          quality: "standard",
          response_format: "url",
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[generate-image] OpenAI error for ${dir.name}: HTTP ${res.status}`, errText);
        imageUrl = PLACEHOLDER_IMAGES[dir.name] || "";
      } else {
        const data = (await res.json()) as {
          data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
        };

        const imageData = data.data?.[0];
        imageUrl = imageData?.url || "";

        if (!imageUrl && imageData?.b64_json) {
          imageUrl = `data:image/png;base64,${imageData.b64_json}`;
        }

        if (!imageUrl) {
          console.error(`[generate-image] No URL returned for ${dir.name}:`, JSON.stringify(data));
          imageUrl = PLACEHOLDER_IMAGES[dir.name] || "";
        } else {
          console.log(`[generate-image] ${dir.name} generated successfully`);
        }
      }
    } catch (e) {
      console.error(`[generate-image] Exception for ${dir.name}:`, e);
      imageUrl = PLACEHOLDER_IMAGES[dir.name] || "";
    }

    results.push({
      name: dir.name,
      imageUrl,
      description: dir.style,
      prompt,
      printSpecs: printSpec ? {
        trimWidth: printSpec.trimW,
        trimHeight: printSpec.trimH,
        bleedWidth: printSpec.bleedW,
        bleedHeight: printSpec.bleedH,
        dpi: 300,
        colorNote: "Convert to CMYK before print",
        safeZone: "0.25 inches from trim edge",
      } : null,
    });
  }

  return Response.json({ directions: results });
}
