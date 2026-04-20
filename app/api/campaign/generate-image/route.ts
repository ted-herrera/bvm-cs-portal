import { classifyBusinessType, detectSubType } from "@/lib/business-classifier";
import { getPhotoLibraryKey } from "@/lib/photo-library";

export const maxDuration = 30;

const PHOTO_LIBRARY: Record<string, string[]> = {
  restaurant: ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1200&q=85&fit=crop"],
  fitness: ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=85&fit=crop"],
  dental: ["https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=1200&q=85&fit=crop"],
  medical: ["https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=85&fit=crop"],
  legal: ["https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&q=85&fit=crop"],
  roofing: ["https://images.unsplash.com/photo-1632889659658-369b01848454?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85&fit=crop"],
  beauty: ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=85&fit=crop"],
  automotive: ["https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=1200&q=85&fit=crop"],
  realestate: ["https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85&fit=crop"],
  financial: ["https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=85&fit=crop"],
  homeservices: ["https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=85&fit=crop"],
  hvac: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=85&fit=crop"],
  landscaping: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1600693669105-b05ae7e0b7d9?w=1200&q=85&fit=crop"],
  retail: ["https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1200&q=85&fit=crop"],
  education: ["https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&q=85&fit=crop"],
  pet: ["https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1200&q=85&fit=crop"],
  business: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=85&fit=crop","https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=85&fit=crop"],
};

const DIRECTION_STYLES = [
  { name: "Bold & Direct", description: "Bold, high-contrast design. Strong typography. Direct call to action." },
  { name: "Warm & Local", description: "Warm community feel. Friendly and approachable." },
  { name: "Premium & Polished", description: "Upscale sophisticated design. Clean lines." },
];

export async function POST(request: Request) {
  const { businessName, category, city, services, adSize, tagline } = (await request.json()) as {
    businessName: string; category: string; city: string; services: string;
    adSize: string; tagline: string; sbrData?: unknown; directionIndex?: number;
  };

  // Use Design Center's classification logic
  const bizType = classifyBusinessType(businessName, `${category} ${services}`);
  const subType = detectSubType(businessName, `${category} ${services}`);
  const photoKey = getPhotoLibraryKey(bizType, subType);
  const photos = PHOTO_LIBRARY[photoKey] || PHOTO_LIBRARY.business;

  // Generate 3 directions with different photos
  const directions = DIRECTION_STYLES.map((dir, i) => {
    const photoIndex = i % photos.length;
    return {
      name: dir.name,
      imageUrl: photos[photoIndex],
      description: dir.description,
      prompt: `${bizType}/${photoKey} — ${dir.name} for ${businessName} (${category}) in ${city}`,
    };
  });

  return Response.json({ directions });
}
