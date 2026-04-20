import { classifyBusinessType, detectSubType } from "@/lib/business-classifier";
import { getCampaignPhotos } from "@/lib/campaign-photos";

export const maxDuration = 30;

const DIRECTIONS = [
  { name: "Bold & Direct", description: "Bold, high-contrast design. Strong typography. Direct call to action." },
  { name: "Warm & Local", description: "Warm community feel. Friendly and approachable." },
  { name: "Premium & Polished", description: "Upscale sophisticated design. Clean lines." },
];

export async function POST(request: Request) {
  const { businessName, category, services } = (await request.json()) as {
    businessName: string; category: string; services: string;
    city?: string; adSize?: string; tagline?: string; sbrData?: unknown;
  };

  const bizType = classifyBusinessType(businessName, `${category} ${services}`);
  const subType = detectSubType(businessName, `${category} ${services}`);
  const photos = getCampaignPhotos(bizType, subType);

  const directions = DIRECTIONS.map((dir, i) => ({
    name: dir.name,
    imageUrl: photos[i % photos.length] || photos[0] || "",
    description: dir.description,
    prompt: `${bizType}/${subType} — ${dir.name}`,
  }));

  return Response.json({ directions });
}
