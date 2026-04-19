const AD_PRINT_SPECS: Record<string, { trimW: string; trimH: string; bleedW: string; bleedH: string }> = {
  "1/8 page": { trimW: '3.65"', trimH: '2.5"', bleedW: '3.9"', bleedH: '2.75"' },
  "1/4 page": { trimW: '3.65"', trimH: '5"', bleedW: '3.9"', bleedH: '5.25"' },
  "1/3 page": { trimW: '7.5"', trimH: '3.25"', bleedW: '7.75"', bleedH: '3.5"' },
  "1/3 page vertical": { trimW: '2.5"', trimH: '10"', bleedW: '2.75"', bleedH: '10.25"' },
  "1/2 page": { trimW: '7.5"', trimH: '5"', bleedW: '7.75"', bleedH: '5.25"' },
  "full page": { trimW: '7.5"', trimH: '10"', bleedW: '7.75"', bleedH: '10.25"' },
  "front cover": { trimW: '7.5"', trimH: '10"', bleedW: '7.75"', bleedH: '10.25"' },
};

const PLACEHOLDER_IMAGES: Record<string, string> = {
  "Bold & Direct": "https://placehold.co/1024x1024/1B2A4A/F5C842?text=Bold+%26+Direct",
  "Warm & Local": "https://placehold.co/1024x1024/2C3E2D/F5F0E8?text=Warm+%26+Local",
  "Premium & Polished": "https://placehold.co/1024x1024/C8922A/FFFFFF?text=Premium+%26+Polished",
};

export async function POST(request: Request) {
  const { businessName, category, city, services, adSize, tagline, sbrData } = (await request.json()) as {
    businessName: string; category: string; city: string; services: string;
    adSize: string; tagline: string; sbrData: Record<string, unknown> | null;
  };

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiKey) {
    console.error("[generate-image] OPENAI_API_KEY not set");
    return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const incomeRing = (sbrData?.medianIncome as string) || "";
  const marketBrief = (sbrData?.marketBrief as string) || "";
  const printSpec = AD_PRINT_SPECS[adSize] || null;

  // Step 1: Bruno layout direction via Claude
  let layout = { primaryFocus: "business name", headlineSize: "large", layoutStyle: "centered", colorMood: "bold", imageStyle: "full-bleed background", reasoning: "Default layout" };

  if (anthropicKey) {
    try {
      const layoutRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 512, temperature: 0.5,
          system: "You are an ad layout director. Return JSON only, no markdown.",
          messages: [{ role: "user", content: `Design layout for ${businessName}, a ${category} in ${city}. Market: ${incomeRing || "Ring 1"}, score ${sbrData?.opportunityScore || 80}. Tagline: "${tagline || "none"}". Services: ${services}. Ad: ${adSize}. Return JSON: {"primaryFocus":"business name"|"offer"|"tagline"|"visual","headlineSize":"large"|"medium"|"small","layoutStyle":"centered"|"left-aligned"|"top-heavy"|"bottom-heavy","colorMood":"bold"|"warm"|"premium"|"professional","imageStyle":"full-bleed background"|"top half"|"side panel","reasoning":"one sentence"}` }],
        }),
      });
      if (layoutRes.ok) {
        const ld = (await layoutRes.json()) as { content?: Array<{ text?: string }> };
        const txt = ld.content?.find(b => b.text)?.text || "";
        const cleaned = txt.replace(/```json\n?|```\n?/g, "").trim();
        try { layout = { ...layout, ...JSON.parse(cleaned) }; } catch { /* use default */ }
      }
    } catch (e) { console.error("[generate-image] Layout direction error:", e); }
  }

  // Step 2: Generate images
  const directions = [
    { name: "Bold & Direct", style: "Bold, high-contrast. Strong typography. Direct CTA.", mood: "confident, powerful" },
    { name: "Warm & Local", style: "Warm community feel. Friendly, approachable.", mood: "friendly, warm, trustworthy" },
    { name: "Premium & Polished", style: "Upscale, sophisticated. Clean lines, premium.", mood: "elegant, refined, professional" },
  ];

  const results = [];

  for (const dir of directions) {
    const prompt = `Professional print advertisement background image for a ${category} business called "${businessName}" in ${city}.
Style: ${dir.style}
Mood: ${dir.mood}
Image composition: ${layout.imageStyle}
Color mood: ${layout.colorMood}
${incomeRing ? `Demographics: ${incomeRing} income area` : ""}

CRITICAL: Pure background image only. No text, no words, no letters, no numbers anywhere in the image. Clean visual suitable for print advertisement background. The image should evoke ${dir.mood} and be appropriate for a ${category} business. Magazine-quality photography or illustration.`;

    let imageUrl = "";
    try {
      console.log(`[generate-image] Generating ${dir.name}...`);
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "gpt-image-1", prompt, n: 1, size: "1024x1024", quality: "high" }),
      });

      if (!res.ok) {
        console.error(`[generate-image] OpenAI error for ${dir.name}: HTTP ${res.status}`, await res.text());
        imageUrl = PLACEHOLDER_IMAGES[dir.name] || "";
      } else {
        const data = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
        imageUrl = data.data?.[0]?.url || "";
        if (!imageUrl && data.data?.[0]?.b64_json) imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
        if (!imageUrl) { imageUrl = PLACEHOLDER_IMAGES[dir.name] || ""; }
        else { console.log(`[generate-image] ${dir.name} generated`); }
      }
    } catch (e) {
      console.error(`[generate-image] Exception for ${dir.name}:`, e);
      imageUrl = PLACEHOLDER_IMAGES[dir.name] || "";
    }

    results.push({
      name: dir.name, imageUrl, description: dir.style, prompt,
      printSpecs: printSpec ? { trimWidth: printSpec.trimW, trimHeight: printSpec.trimH, bleedWidth: printSpec.bleedW, bleedHeight: printSpec.bleedH, dpi: 300, colorNote: "Convert to CMYK before print", safeZone: "0.25 inches from trim edge" } : null,
    });
  }

  return Response.json({ directions: results, layout });
}
