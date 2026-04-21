// OpenAI image generation — builds an intelligent prompt from business context.
//
// Primary signature (per spec):
//   generateAdImage(businessName, businessType, services, city, adSize, incomeTier, variation)
//
// Legacy 3-arg signature kept for back-compat with /api/image/generate callers
// that only pass businessName + services + vibe. The impl detects which call
// shape was used by inspecting the second argument.

type IncomeTier = "low" | "middle" | "premium" | "" | undefined;
type Variation = "clean_classic" | "bold_modern" | "premium_editorial" | string;

export interface GenerateAdImageOptions {
  businessName: string;
  businessType?: string;
  services?: string[];
  city?: string;
  adSize?: string;
  incomeTier?: IncomeTier;
  variation?: Variation;
  seed?: string | number;
}

export async function generateAdImage(
  businessName: string,
  services: string[],
  vibe?: string,
): Promise<string | null>;
export async function generateAdImage(
  businessName: string,
  businessType: string,
  services: string[],
  city: string,
  adSize: string,
  incomeTier: IncomeTier,
  variation: Variation,
  seed?: string | number,
): Promise<string | null>;
export async function generateAdImage(
  businessName: string,
  arg2: string | string[],
  arg3?: string | string[],
  city?: string,
  adSize?: string,
  incomeTier?: IncomeTier,
  variation?: Variation,
  seed?: string | number,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Detect call shape via arg2 type.
  const legacyShape = Array.isArray(arg2);
  let businessType = "";
  let services: string[] = [];
  let tierIn: IncomeTier = "middle";
  let variationIn: Variation = "clean_classic";
  let cityIn = "";
  let adSizeIn = "";
  let legacyVibe = "";

  if (legacyShape) {
    services = arg2 as string[];
    legacyVibe = (arg3 as string) || "";
  } else {
    businessType = (arg2 as string) || "";
    services = (arg3 as string[]) || [];
    cityIn = city || "";
    adSizeIn = adSize || "";
    tierIn = incomeTier || "middle";
    variationIn = variation || "clean_classic";
  }

  const prompt = buildPrompt({
    businessName,
    businessType,
    services,
    city: cityIn,
    adSize: adSizeIn,
    incomeTier: tierIn,
    variation: variationIn,
    seed,
    legacyVibe,
  });

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      }),
    });

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        const body = await res.text().catch(() => "");
        console.error("[openai-image] HTTP error:", res.status, body.slice(0, 500));
      }
      return null;
    }
    const data = await res.json();
    const first = data?.data?.[0];
    if (!first) return null;
    if (typeof first.url === "string") return first.url;
    if (typeof first.b64_json === "string") return `data:image/png;base64,${first.b64_json}`;
    return null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[openai-image] error:", err);
    }
    return null;
  }
}

interface PromptInputs {
  businessName: string;
  businessType: string;
  services: string[];
  city: string;
  adSize: string;
  incomeTier: IncomeTier;
  variation: Variation;
  seed?: string | number;
  legacyVibe?: string;
}

function buildPrompt(inp: PromptInputs): string {
  const svcList = (inp.services || []).filter(Boolean).slice(0, 3);
  const svcText = svcList.join(", ");
  const city = inp.city || "";
  const bizType = inp.businessType || "local business";
  const variation = (inp.variation || "clean_classic").toString();

  // Per-variation photography style
  const styleByVariation: Record<string, string> = {
    premium_editorial: `editorial lifestyle photography, shallow depth of field, warm natural light, sophisticated, ${city ? `${city} local business` : "local business"}`,
    bold_modern: `bold hero product shot, vibrant colors, tight crop, commercial photography${svcList[0] ? `, ${svcList[0]} close-up` : ""}`,
    clean_classic: `clean professional photography, bright and inviting, ${bizType} team or location, approachable and trustworthy`,
  };
  const style = styleByVariation[variation] || styleByVariation.clean_classic;

  // Per-size composition hint
  const size = (inp.adSize || "").toLowerCase();
  let composition = "";
  if (size === "cover" || size === "full") composition = "wide cinematic composition";
  else if (size === "1/2" || size === "half") composition = "landscape format hero shot";
  else if (size === "1/4" || size === "1/3" || size === "quarter" || size === "third") composition = "tight vertical crop single hero element";
  else if (size === "1/8" || size === "eighth") composition = "extreme close-up single product or face";
  else composition = "balanced single-subject composition";

  // Per-income-tier modifier
  const tier = (inp.incomeTier || "middle").toString().toLowerCase();
  const tierModifier =
    tier === "premium" ? "luxury editorial, aspirational"
    : tier === "low" ? "friendly approachable authentic"
    : "warm community feel";

  const seedSuffix = inp.seed ? ` Artistic seed: ${String(inp.seed)}.` : "";
  const vibePart = inp.legacyVibe ? ` Additional vibe: ${inp.legacyVibe}.` : "";

  const features = svcText ? ` Featuring ${svcText}.` : "";
  const cityPart = city ? ` in ${city}` : "";

  return `${style} photograph for ${inp.businessName || "a local business"}, a ${bizType}${cityPart}.${features} ${composition}. ${tierModifier}. Professional advertising photography. No text. No logos.${vibePart}${seedSuffix}`.trim();
}
