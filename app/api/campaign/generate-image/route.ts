import { NextRequest, NextResponse } from "next/server";
import { classifyBusinessType, detectSubType } from "@/lib/business-classifier";
import { getPhotoLibraryKey, getPhotoSourceList } from "@/lib/photo-library";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { businessName, category, city, services, adSize, tagline, sbrData } =
      await request.json();

    if (!businessName || !category) {
      return NextResponse.json({ error: "businessName and category are required" }, { status: 400 });
    }

    const businessType = classifyBusinessType(businessName, category);
    const subType = detectSubType(businessName, category);
    const photoKey = getPhotoLibraryKey(businessType, subType);
    const sources = getPhotoSourceList(businessType, subType);

    const unsplashPhotos = sources.filter((s) => s.source === "unsplash");

    const directions = [
      {
        name: "Direction A — Bold & Modern",
        description: `Clean, high-contrast design for ${businessName}. Emphasizes ${tagline || "brand identity"} with bold typography.`,
        imageUrl: unsplashPhotos[0]?.url || "",
        photoKey,
        city,
        services,
        adSize,
        sbrData,
      },
      {
        name: "Direction B — Warm & Inviting",
        description: `Warm tones and approachable layout for ${businessName}. Community-focused design highlighting ${city || "local"} presence.`,
        imageUrl: unsplashPhotos[1]?.url || "",
        photoKey,
        city,
        services,
        adSize,
        sbrData,
      },
      {
        name: "Direction C — Premium & Elegant",
        description: `Sophisticated design for ${businessName}. Refined aesthetics with premium feel for discerning ${category} clients.`,
        imageUrl: unsplashPhotos[2]?.url || "",
        photoKey,
        city,
        services,
        adSize,
        sbrData,
      },
    ];

    return NextResponse.json({ directions });
  } catch {
    return NextResponse.json({ error: "Failed to generate image directions" }, { status: 500 });
  }
}
