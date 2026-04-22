// OpenAI gpt-image-1 ad generator.
//
// Primary signature — options object. Legacy 3-arg and 8-arg positional
// signatures retained via overloads so older callers keep working.
// Builds the exact prompt format specified by the BVM art system and selects
// an OpenAI output size that matches the print size's aspect ratio.

export type TemplateStyle =
  | "nike"
  | "ogilvy"
  | "bauhaus"
  | "apple"
  | "local_converter"
  | "clean_classic"
  | "bold_modern"
  | "premium_editorial";

type IncomeTier = "low" | "middle" | "premium" | "" | undefined;

export interface GenerateAdImageOptions {
  businessName: string;
  city?: string;
  zip?: string;
  desc?: string;
  services?: string[];
  cta?: string;
  phone?: string;
  address?: string;
  size?: string;        // "eighth" / "quarter" / "third" / "half" / "full" / "cover"
  variation?: string;   // TemplateStyle or legacy alias
  seed?: string | number;
  // Legacy extras (unused by the new prompt but accepted for compat):
  businessType?: string;
  incomeTier?: IncomeTier;
  prompt?: string;
}

// Maps the legacy variation names → canonical template label.
function canonicalStyle(variation: string | undefined): string {
  const v = (variation || "").toLowerCase();
  if (v === "clean_classic" || v === "bauhaus") return "bauhaus";
  if (v === "bold_modern" || v === "nike") return "nike";
  if (v === "premium_editorial" || v === "ogilvy") return "ogilvy";
  if (v === "apple") return "apple";
  if (v === "local_converter") return "local converter";
  return "bauhaus";
}

// Friendly print-size label used inside the prompt.
function sizeLabel(size: string | undefined): string {
  const s = (size || "").toLowerCase();
  if (s.includes("cover")) return "featured cover";
  if (s.includes("full")) return "full page";
  if (s === "1/2" || s.includes("half")) return "half page";
  if (s === "1/3" || s.includes("third")) return "third page";
  if (s === "1/4" || s.includes("quarter")) return "quarter page";
  if (s === "1/8" || s.includes("eighth")) return "eighth page";
  return "quarter page";
}

// OpenAI output size per print aspect ratio — gpt-image-1 supported dims only.
function openaiSize(size: string | undefined): "1024x1024" | "1024x1536" | "1536x1024" {
  const s = (size || "").toLowerCase();
  // Landscape half-page
  if (s === "1/2" || s.includes("half")) return "1536x1024";
  // Square eighth-page
  if (s === "1/8" || s.includes("eighth")) return "1024x1024";
  // Portrait: full, cover, quarter, third
  return "1024x1536";
}

function buildPrompt(opts: GenerateAdImageOptions): string {
  const businessName = (opts.businessName || "your business").trim();
  const city = (opts.city || "").trim();
  const zip = (opts.zip || "").trim();
  const desc = (opts.desc || opts.businessType || "").trim();
  const services = (opts.services || []).filter(Boolean).slice(0, 5);
  const cta = (opts.cta || "Contact Us").trim();
  const phone = (opts.phone || "").trim();
  const address = (opts.address || "").trim();
  const size = sizeLabel(opts.size);
  const style = canonicalStyle(opts.variation);

  const styleLabel = `${style} style`;
  const cityZip = [city, zip].filter(Boolean).join(" ");

  // Exact prompt format per the BVM spec.
  let prompt = `Create a ${size} print ad for ${businessName} in ${cityZip || "their local market"} (${styleLabel}).`;
  if (desc) prompt += ` Business: ${desc}.`;
  if (services.length > 0) prompt += ` Services: ${services.join(", ")}.`;
  prompt += ` CTA: ${cta}.`;
  if (phone) prompt += ` Phone: ${phone}.`;
  if (address) prompt += ` Address: ${address}.`;
  prompt += ` Include the business name prominently, phone number, address, and a QR code placeholder in the design. Make it look like a professional magazine print advertisement.`;
  if (opts.seed) prompt += ` Creative seed: ${String(opts.seed)}.`;
  if (opts.prompt) prompt += ` Extra direction: ${opts.prompt}.`;

  return prompt;
}

async function callOpenAI(opts: GenerateAdImageOptions): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = buildPrompt(opts);
  const size = openaiSize(opts.size);

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
        size,
        quality: "high",
        n: 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[openai-image] HTTP error:", res.status, text.slice(0, 600));
      return null;
    }
    const data = await res.json();
    const first = data?.data?.[0];
    if (!first) return null;
    if (typeof first.url === "string") return first.url;
    if (typeof first.b64_json === "string") return `data:image/png;base64,${first.b64_json}`;
    return null;
  } catch (err) {
    console.error("[openai-image] error:", err);
    return null;
  }
}

// Overload declarations ─────────────────────────────────────────────────
export async function generateAdImage(opts: GenerateAdImageOptions): Promise<string | null>;
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
  variation: string,
  seed?: string | number,
): Promise<string | null>;
// Implementation ────────────────────────────────────────────────────────
export async function generateAdImage(
  first: string | GenerateAdImageOptions,
  arg2?: string | string[],
  arg3?: string | string[],
  city?: string,
  adSize?: string,
  incomeTier?: IncomeTier,
  variation?: string,
  seed?: string | number,
): Promise<string | null> {
  if (typeof first === "object" && first !== null) {
    return callOpenAI(first);
  }
  // Positional call shapes: detect by arg2 type.
  const legacy3 = Array.isArray(arg2);
  if (legacy3) {
    return callOpenAI({
      businessName: first,
      services: arg2 as string[],
      prompt: (arg3 as string) || undefined,
    });
  }
  return callOpenAI({
    businessName: first,
    businessType: (arg2 as string) || "",
    services: (arg3 as string[]) || [],
    city: city || "",
    size: adSize || "",
    incomeTier: incomeTier || "middle",
    variation: variation || "bauhaus",
    seed,
  });
}
