import { NextResponse } from "next/server";
import sharp from "sharp";

// Print-ready PNG export at 300 DPI with 0.125" bleed on all sides.
// Input: { imageUrl, size } — fetches the generatedImageUrl, resizes to the
// trim dimensions, and extends by the bleed using the dominant corner color.

type PrintSize = "eighth" | "quarter" | "third" | "half" | "full" | "cover";

const SIZE_PX: Record<PrintSize, { trim: [number, number]; bleed: [number, number] }> = {
  eighth:  { trim: [1088, 713],  bleed: [1163, 788]  },
  quarter: { trim: [1088, 1463], bleed: [1163, 1538] },
  third:   { trim: [1088, 1988], bleed: [1163, 2063] },
  half:    { trim: [2250, 1463], bleed: [2325, 1538] },
  full:    { trim: [2250, 3000], bleed: [2325, 3075] },
  cover:   { trim: [2550, 3300], bleed: [2625, 3375] },
};

function normalizeSize(s: string | undefined): PrintSize {
  const k = (s || "").toLowerCase().trim();
  if (k.includes("eighth") || k.includes("1/8")) return "eighth";
  if (k.includes("quarter") || k.includes("1/4")) return "quarter";
  if (k.includes("third") || k.includes("1/3")) return "third";
  if (k.includes("half") || k.includes("1/2")) return "half";
  if (k.includes("cover")) return "cover";
  if (k.includes("full")) return "full";
  return "quarter";
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer | null> {
  // Support data URIs (base64) and http(s) URLs.
  if (imageUrl.startsWith("data:")) {
    const comma = imageUrl.indexOf(",");
    if (comma === -1) return null;
    const b64 = imageUrl.slice(comma + 1);
    return Buffer.from(b64, "base64");
  }
  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

// Average color sampled from the 4 corner regions of the image. Used to extend
// the trim edge into the bleed area so there is no visible white ring.
async function edgeColor(img: sharp.Sharp): Promise<{ r: number; g: number; b: number }> {
  try {
    const { dominant } = await img.clone().stats();
    return { r: dominant.r, g: dominant.g, b: dominant.b };
  } catch {
    return { r: 12, g: 35, b: 64 };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { imageUrl?: string; size?: string };
    if (!body.imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }
    const sz = normalizeSize(body.size);
    const { trim, bleed } = SIZE_PX[sz];

    const buffer = await fetchImageBuffer(body.imageUrl);
    if (!buffer) {
      return NextResponse.json({ error: "unable to fetch imageUrl" }, { status: 502 });
    }

    const trimmed = sharp(buffer).resize(trim[0], trim[1], { fit: "cover", position: "attention" });
    const color = await edgeColor(trimmed);

    const bleedX = Math.round((bleed[0] - trim[0]) / 2);
    const bleedY = Math.round((bleed[1] - trim[1]) / 2);

    const out = await trimmed
      .extend({
        top: bleedY,
        bottom: bleedY,
        left: bleedX,
        right: bleedX,
        background: { r: color.r, g: color.g, b: color.b, alpha: 1 },
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="print-${sz}.png"`,
        "X-Print-Size": sz,
        "X-Print-Trim-Px": `${trim[0]}x${trim[1]}`,
        "X-Print-Bleed-Px": `${bleed[0]}x${bleed[1]}`,
        "X-Print-DPI": "300",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
