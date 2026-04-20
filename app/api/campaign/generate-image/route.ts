import { classifyBusinessType, detectSubType } from "@/lib/business-classifier";
import { getPhotoLibraryKey, getPhotoSourceList } from "@/lib/photo-library";

export const maxDuration = 30;

const DIRECTIONS = [
  { name: "Bold & Direct", description: "Bold, high-contrast design. Strong typography. Direct call to action." },
  { name: "Warm & Local", description: "Warm community feel. Friendly and approachable." },
  { name: "Premium & Polished", description: "Upscale sophisticated design. Clean lines." },
];

export async function POST(request: Request) {
  const { businessName, category, services } = (await request.json()) as {
    businessName: string; category: string; city?: string; services: string;
    adSize?: string; tagline?: string; sbrData?: unknown;
  };

  const bizType = classifyBusinessType(businessName, `${category} ${services}`);
  const subType = detectSubType(businessName, `${category} ${services}`);
  const photoKey = getPhotoLibraryKey(bizType, subType);
  const sources = getPhotoSourceList(bizType, subType);
  const unsplashPhotos = sources.filter(s => s.source === "unsplash").map(s => s.url);

  const directions = DIRECTIONS.map((dir, i) => ({
    name: dir.name,
    imageUrl: unsplashPhotos[i % unsplashPhotos.length] || unsplashPhotos[0] || "",
    description: dir.description,
    prompt: `${photoKey}/${bizType} — ${dir.name}`,
  }));

  return Response.json({ directions });
}
