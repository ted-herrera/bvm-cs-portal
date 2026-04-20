// Print Ad Template Engine
// Generates HTML/CSS print ad layouts at exact pixel dimensions for BVM magazine sizes.
// Preview at 150 DPI; print-ready export at 300 DPI with 0.125" bleed.

export type PrintSize = "1/8" | "1/4" | "1/2" | "full" | "cover";
export type PrintVariation = "clean_classic" | "bold_modern" | "premium_editorial";

export interface PrintAdData {
  businessName: string;
  tagline: string;
  city: string;
  services: string[];
  cta: string;
  phone: string;
  website?: string;
  logoUrl?: string;
  photoUrl: string;
  brandColors: { primary: string; secondary: string; accent: string };
  size: PrintSize;
  variation: PrintVariation;
  subVariation?: number; // 0-3
}

export interface SizeSpec {
  label: string;
  trimInches: { w: number; h: number };
  bleedInches: { w: number; h: number };
  trimPx150: { w: number; h: number };
  bleedPx150: { w: number; h: number };
  trimPx300: { w: number; h: number };
  bleedPx300: { w: number; h: number };
}

const BLEED_INCHES = 0.125;
const SAFE_INCHES = 0.25;

const sizeInches: Record<PrintSize, { w: number; h: number }> = {
  "1/8": { w: 3.625, h: 2.375 },
  "1/4": { w: 3.625, h: 4.875 },
  "1/2": { w: 7.5, h: 4.875 },
  full: { w: 7.5, h: 10 },
  cover: { w: 8.5, h: 11 },
};

export const SIZE_LABELS: Record<PrintSize, string> = {
  "1/8": "Eighth Page",
  "1/4": "Quarter Page",
  "1/2": "Half Page",
  full: "Full Page",
  cover: "Featured Cover",
};

export const SIZE_DESCRIPTIONS: Record<PrintSize, string> = {
  "1/8": "Business card style — perfect for compact placements",
  "1/4": "Most popular size — strong presence at great value",
  "1/2": "Bold landscape format — impossible to miss",
  full: "Full page premium real estate",
  cover: "Premium featured cover — the crown jewel",
};

export function getSizeSpec(size: PrintSize): SizeSpec {
  const trim = sizeInches[size];
  const bleed = { w: trim.w + BLEED_INCHES * 2, h: trim.h + BLEED_INCHES * 2 };
  return {
    label: SIZE_LABELS[size],
    trimInches: trim,
    bleedInches: bleed,
    trimPx150: { w: Math.round(trim.w * 150), h: Math.round(trim.h * 150) },
    bleedPx150: { w: Math.round(bleed.w * 150), h: Math.round(bleed.h * 150) },
    trimPx300: { w: Math.round(trim.w * 300), h: Math.round(trim.h * 300) },
    bleedPx300: { w: Math.round(bleed.w * 300), h: Math.round(bleed.h * 300) },
  };
}

export const VARIATION_LABELS: Record<PrintVariation, string> = {
  clean_classic: "Clean & Classic",
  bold_modern: "Bold & Modern",
  premium_editorial: "Premium Editorial",
};

export const VARIATION_DESCRIPTIONS: Record<PrintVariation, string> = {
  clean_classic:
    "White-cream background, serif headlines, clean photo placement. Traditional magazine ad feel that builds trust.",
  bold_modern:
    "Dark or color-blocked backgrounds, bold sans-serif type, dynamic layout. Demands attention.",
  premium_editorial:
    "Full-bleed photography with overlay text. Editorial typography. Magazine cover energy.",
};

interface SubPalette {
  bg: string;
  text: string;
  accent: string;
  secondary: string;
  fontFamily: string;
  headlineFont: string;
}

function paletteFor(variation: PrintVariation, sub: number, brand: PrintAdData["brandColors"]): SubPalette {
  const idx = ((sub % 4) + 4) % 4;
  if (variation === "clean_classic") {
    return [
      { bg: "#ffffff", text: "#0C2340", accent: "#D4A843", secondary: "#475569", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Playfair Display', Georgia, serif" },
      { bg: "#FAF5EB", text: "#2A1810", accent: "#7B1F2B", secondary: "#5C4A3D", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Playfair Display', Georgia, serif" },
      { bg: "#E6F1FB", text: "#0C2340", accent: "#185FA5", secondary: "#3D5680", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Inter', system-ui, sans-serif" },
      { bg: "#FFFFFF", text: "#0C2340", accent: "#16614A", secondary: "#475569", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Playfair Display', Georgia, serif" },
    ][idx];
  }
  if (variation === "bold_modern") {
    return [
      { bg: "#0C2340", text: "#FFFFFF", accent: "#D4A843", secondary: "#94A3B8", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Inter', system-ui, sans-serif" },
      { bg: "#0A0A0A", text: "#FFFFFF", accent: "#DC2626", secondary: "#A1A1AA", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Inter', system-ui, sans-serif" },
      { bg: brand.primary || "#185FA5", text: "#FFFFFF", accent: brand.accent || "#D4A843", secondary: "rgba(255,255,255,0.7)", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Inter', system-ui, sans-serif" },
      { bg: "#FFFFFF", text: brand.primary || "#0C2340", accent: brand.accent || "#D4A843", secondary: brand.secondary || "#475569", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Inter', system-ui, sans-serif" },
    ][idx];
  }
  // premium_editorial
  return [
    { bg: "rgba(0,0,0,0.55)", text: "#FFFFFF", accent: "#D4A843", secondary: "rgba(255,255,255,0.85)", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Playfair Display', Georgia, serif" },
    { bg: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.85) 100%)", text: "#FFFFFF", accent: "#D4A843", secondary: "rgba(255,255,255,0.85)", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Playfair Display', Georgia, serif" },
    { bg: brand.primary || "#0C2340", text: "#FFFFFF", accent: brand.accent || "#D4A843", secondary: "rgba(255,255,255,0.8)", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Playfair Display', Georgia, serif" },
    { bg: "rgba(255,255,255,0.18)", text: "#FFFFFF", accent: "#D4A843", secondary: "rgba(255,255,255,0.85)", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Playfair Display', Georgia, serif" },
  ][idx];
}

export interface RenderOptions {
  dpi?: 150 | 300;
  showBleed?: boolean;
  showSafeZone?: boolean;
  showTrimMarks?: boolean;
  scale?: number; // CSS scale factor for fitting in containers
}

// Returns an HTML string that renders the ad at exact pixel dimensions.
// The outer wrapper includes the bleed area; the inner content occupies the trim.
export function renderPrintAd(data: PrintAdData, opts: RenderOptions = {}): string {
  const { dpi = 150, showBleed = false, showSafeZone = false, showTrimMarks = false } = opts;
  const spec = getSizeSpec(data.size);
  const trimW = dpi === 300 ? spec.trimPx300.w : spec.trimPx150.w;
  const trimH = dpi === 300 ? spec.trimPx300.h : spec.trimPx150.h;
  const bleedW = dpi === 300 ? spec.bleedPx300.w : spec.bleedPx150.w;
  const bleedH = dpi === 300 ? spec.bleedPx300.h : spec.bleedPx150.h;
  const bleedOffsetX = (bleedW - trimW) / 2;
  const bleedOffsetY = (bleedH - trimH) / 2;
  const safeInset = SAFE_INCHES * dpi;
  const palette = paletteFor(data.variation, data.subVariation ?? 0, data.brandColors);

  const inner = renderVariationInner(data, palette, trimW, trimH);

  const bleedOverlay = showBleed
    ? `<div style="position:absolute;inset:0;border:${dpi === 300 ? 6 : 3}px solid rgba(255,0,128,0.6);pointer-events:none;z-index:50;"></div>
       <div style="position:absolute;left:${bleedOffsetX}px;top:${bleedOffsetY}px;width:${trimW}px;height:${trimH}px;border:1px solid rgba(0,0,0,0.95);pointer-events:none;z-index:51;"></div>`
    : "";
  const safeOverlay = showSafeZone
    ? `<div style="position:absolute;left:${bleedOffsetX + safeInset}px;top:${bleedOffsetY + safeInset}px;width:${trimW - safeInset * 2}px;height:${trimH - safeInset * 2}px;border:1px dashed rgba(24,95,165,0.85);pointer-events:none;z-index:52;"></div>`
    : "";
  const trimMarks = showTrimMarks
    ? trimMarkSvg(bleedW, bleedH, bleedOffsetX, bleedOffsetY, trimW, trimH)
    : "";

  return `<div style="position:relative;width:${bleedW}px;height:${bleedH}px;overflow:hidden;background:#fff;">
    <div style="position:absolute;left:${bleedOffsetX}px;top:${bleedOffsetY}px;width:${trimW}px;height:${trimH}px;overflow:hidden;">
      ${inner}
    </div>
    ${bleedOverlay}
    ${safeOverlay}
    ${trimMarks}
  </div>`;
}

function trimMarkSvg(bw: number, bh: number, ox: number, oy: number, tw: number, th: number): string {
  const len = 16;
  const corners = [
    { x: ox, y: oy }, // top-left
    { x: ox + tw, y: oy }, // top-right
    { x: ox, y: oy + th }, // bottom-left
    { x: ox + tw, y: oy + th }, // bottom-right
  ];
  const lines = corners
    .map(({ x, y }) =>
      `<line x1="${x - len}" y1="${y}" x2="${x + len}" y2="${y}" stroke="black" stroke-width="1"/>` +
      `<line x1="${x}" y1="${y - len}" x2="${x}" y2="${y + len}" stroke="black" stroke-width="1"/>`,
    )
    .join("");
  return `<svg width="${bw}" height="${bh}" style="position:absolute;inset:0;pointer-events:none;z-index:53;">${lines}</svg>`;
}

function escape(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderVariationInner(data: PrintAdData, p: SubPalette, w: number, h: number): string {
  if (data.variation === "clean_classic") return renderCleanClassic(data, p, w, h);
  if (data.variation === "bold_modern") return renderBoldModern(data, p, w, h);
  return renderPremiumEditorial(data, p, w, h);
}

// Spec is for trim sizing — scale fonts to fit ad dimensions
function fontScale(w: number, h: number): number {
  // Reference: 1/4 page at 150 DPI ≈ 544×731, baseline scale = 1
  const ref = Math.sqrt(544 * 731);
  const cur = Math.sqrt(w * h);
  return Math.max(0.45, Math.min(2.4, cur / ref));
}

function renderCleanClassic(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const isLandscape = w > h * 1.2;
  const photoH = isLandscape ? "100%" : `${Math.round(h * 0.42)}px`;
  const photoW = isLandscape ? `${Math.round(w * 0.42)}px` : "100%";
  const padding = Math.max(12, Math.round(20 * s));

  return `<div style="width:${w}px;height:${h}px;background:${p.bg};display:flex;flex-direction:${isLandscape ? "row" : "column"};font-family:${p.fontFamily};color:${p.text};">
    <div style="width:${photoW};height:${photoH};background:${d.photoUrl ? `url('${d.photoUrl}') center/cover` : `linear-gradient(135deg, ${d.brandColors.primary}, ${d.brandColors.accent})`};flex-shrink:0;"></div>
    <div style="flex:1;padding:${padding}px;display:flex;flex-direction:column;justify-content:space-between;min-width:0;">
      <div>
        <div style="font-size:${Math.round(9 * s)}px;letter-spacing:0.18em;text-transform:uppercase;color:${p.accent};font-weight:700;margin-bottom:${Math.round(6 * s)}px;">${escape(d.city || "")}</div>
        <h2 style="font-family:${p.headlineFont};font-size:${Math.round(26 * s)}px;line-height:1.05;margin:0 0 ${Math.round(8 * s)}px;font-weight:700;color:${p.text};">${escape(d.businessName)}</h2>
        ${d.tagline ? `<p style="font-size:${Math.round(13 * s)}px;line-height:1.35;margin:0 0 ${Math.round(10 * s)}px;font-style:italic;color:${p.secondary};">${escape(d.tagline)}</p>` : ""}
        ${d.services.length ? `<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:${Math.round(3 * s)}px;">${d.services.slice(0, 3).map((sv) => `<li style="font-size:${Math.round(11 * s)}px;color:${p.text};display:flex;align-items:center;gap:${Math.round(6 * s)}px;"><span style="width:${Math.round(4 * s)}px;height:${Math.round(4 * s)}px;background:${p.accent};border-radius:50%;flex-shrink:0;"></span>${escape(sv)}</li>`).join("")}</ul>` : ""}
      </div>
      <div style="border-top:1px solid ${p.accent};padding-top:${Math.round(8 * s)}px;margin-top:${Math.round(10 * s)}px;">
        <div style="font-size:${Math.round(13 * s)}px;font-weight:700;color:${p.accent};margin-bottom:${Math.round(3 * s)}px;">${escape(d.cta)}</div>
        <div style="font-size:${Math.round(11 * s)}px;color:${p.secondary};">${escape(d.phone)}${d.website ? ` · ${escape(d.website)}` : ""}</div>
      </div>
    </div>
  </div>`;
}

function renderBoldModern(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const padding = Math.max(14, Math.round(24 * s));
  const isLandscape = w > h * 1.2;
  const isCover = h > w * 1.15 && h > 1300;

  return `<div style="width:${w}px;height:${h}px;background:${p.bg};display:flex;flex-direction:column;justify-content:space-between;padding:${padding}px;font-family:${p.fontFamily};color:${p.text};position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;right:0;width:${Math.round(w * (isLandscape ? 0.45 : 0.55))}px;height:${Math.round(h * (isLandscape ? 1 : 0.5))}px;background:${d.photoUrl ? `url('${d.photoUrl}') center/cover` : `linear-gradient(135deg, ${d.brandColors.primary}, ${d.brandColors.accent})`};opacity:${isCover ? 0.95 : 0.85};mix-blend-mode:${p.bg.startsWith("#0") ? "screen" : "normal"};${isLandscape ? "" : "clip-path:polygon(20% 0, 100% 0, 100% 100%, 0% 100%);"}"></div>
    <div style="position:relative;z-index:2;max-width:${Math.round(w * 0.72)}px;">
      <div style="display:inline-block;font-size:${Math.round(10 * s)}px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:${p.accent};border-bottom:${Math.round(3 * s)}px solid ${p.accent};padding-bottom:${Math.round(3 * s)}px;margin-bottom:${Math.round(10 * s)}px;">${escape(d.city || "Local")}</div>
      <h1 style="font-family:${p.headlineFont};font-size:${Math.round(38 * s)}px;line-height:0.95;margin:0 0 ${Math.round(10 * s)}px;font-weight:900;letter-spacing:-0.02em;color:${p.text};">${escape(d.businessName)}</h1>
      ${d.tagline ? `<p style="font-size:${Math.round(15 * s)}px;line-height:1.25;margin:0 0 ${Math.round(14 * s)}px;color:${p.secondary};font-weight:500;">${escape(d.tagline)}</p>` : ""}
    </div>
    <div style="position:relative;z-index:2;">
      ${d.services.length ? `<div style="display:flex;flex-wrap:wrap;gap:${Math.round(6 * s)}px;margin-bottom:${Math.round(12 * s)}px;">${d.services.slice(0, 4).map((sv) => `<span style="font-size:${Math.round(10 * s)}px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;background:${p.accent};color:${p.bg.startsWith("#0") || p.bg.startsWith("#1") || p.bg.startsWith("rgb") ? "#0C2340" : "#FFFFFF"};padding:${Math.round(4 * s)}px ${Math.round(10 * s)}px;border-radius:${Math.round(2 * s)}px;">${escape(sv)}</span>`).join("")}</div>` : ""}
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:${Math.round(12 * s)}px;border-top:${Math.round(2 * s)}px solid ${p.accent};padding-top:${Math.round(10 * s)}px;">
        <div>
          <div style="font-size:${Math.round(20 * s)}px;font-weight:900;color:${p.accent};line-height:1;text-transform:uppercase;letter-spacing:-0.01em;">${escape(d.cta)} →</div>
          <div style="font-size:${Math.round(11 * s)}px;color:${p.secondary};margin-top:${Math.round(4 * s)}px;">${escape(d.phone)}${d.website ? ` · ${escape(d.website)}` : ""}</div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderPremiumEditorial(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const padding = Math.max(16, Math.round(28 * s));
  const sub = (((d.subVariation ?? 0) % 4) + 4) % 4;
  const photoBg = d.photoUrl
    ? `url('${d.photoUrl}') center/cover`
    : `linear-gradient(135deg, ${d.brandColors.primary}, ${d.brandColors.accent})`;

  if (sub === 2) {
    // Split — photo left, solid right
    return `<div style="width:${w}px;height:${h}px;display:flex;font-family:${p.fontFamily};">
      <div style="width:50%;height:100%;background:${photoBg};"></div>
      <div style="width:50%;height:100%;background:${p.bg};color:${p.text};padding:${padding}px;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:${Math.round(10 * s)}px;letter-spacing:0.22em;text-transform:uppercase;color:${p.accent};font-weight:700;margin-bottom:${Math.round(8 * s)}px;">${escape(d.city || "Featured")}</div>
        <h1 style="font-family:${p.headlineFont};font-size:${Math.round(34 * s)}px;line-height:1;margin:0 0 ${Math.round(12 * s)}px;font-weight:700;font-style:italic;color:${p.text};">${escape(d.businessName)}</h1>
        ${d.tagline ? `<p style="font-size:${Math.round(13 * s)}px;line-height:1.4;margin:0 0 ${Math.round(14 * s)}px;color:${p.secondary};">${escape(d.tagline)}</p>` : ""}
        <div style="border-top:1px solid ${p.accent};padding-top:${Math.round(10 * s)}px;">
          <div style="font-size:${Math.round(14 * s)}px;font-weight:700;color:${p.accent};margin-bottom:${Math.round(4 * s)}px;">${escape(d.cta)}</div>
          <div style="font-size:${Math.round(11 * s)}px;color:${p.secondary};">${escape(d.phone)}</div>
        </div>
      </div>
    </div>`;
  }

  if (sub === 3) {
    // Frosted glass overlay
    return `<div style="width:${w}px;height:${h}px;background:${photoBg};position:relative;font-family:${p.fontFamily};color:${p.text};">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);"></div>
      <div style="position:absolute;left:${padding}px;right:${padding}px;bottom:${padding}px;background:${p.bg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.25);border-radius:${Math.round(6 * s)}px;padding:${Math.round(20 * s)}px;">
        <div style="font-size:${Math.round(10 * s)}px;letter-spacing:0.22em;text-transform:uppercase;color:${p.accent};font-weight:700;margin-bottom:${Math.round(6 * s)}px;">${escape(d.city || "Featured")}</div>
        <h1 style="font-family:${p.headlineFont};font-size:${Math.round(28 * s)}px;line-height:1;margin:0 0 ${Math.round(8 * s)}px;font-weight:700;font-style:italic;">${escape(d.businessName)}</h1>
        ${d.tagline ? `<p style="font-size:${Math.round(12 * s)}px;line-height:1.35;margin:0 0 ${Math.round(10 * s)}px;color:${p.secondary};">${escape(d.tagline)}</p>` : ""}
        <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid ${p.accent};padding-top:${Math.round(8 * s)}px;">
          <div style="font-size:${Math.round(13 * s)}px;font-weight:700;color:${p.accent};">${escape(d.cta)} →</div>
          <div style="font-size:${Math.round(10 * s)}px;color:${p.secondary};">${escape(d.phone)}</div>
        </div>
      </div>
    </div>`;
  }

  // sub 0/1: full-bleed photo with overlay or gradient
  const overlay = sub === 1 ? p.bg : "rgba(0,0,0,0.55)";
  const justify = sub === 1 ? "flex-end" : "center";
  return `<div style="width:${w}px;height:${h}px;background:${photoBg};position:relative;font-family:${p.fontFamily};color:${p.text};">
    <div style="position:absolute;inset:0;background:${overlay};"></div>
    <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:${justify};padding:${padding}px;">
      <div>
        <div style="font-size:${Math.round(10 * s)}px;letter-spacing:0.22em;text-transform:uppercase;color:${p.accent};font-weight:700;margin-bottom:${Math.round(8 * s)}px;">${escape(d.city || "Featured")}</div>
        <h1 style="font-family:${p.headlineFont};font-size:${Math.round(36 * s)}px;line-height:1;margin:0 0 ${Math.round(10 * s)}px;font-weight:700;font-style:italic;text-shadow:0 2px 12px rgba(0,0,0,0.4);">${escape(d.businessName)}</h1>
        ${d.tagline ? `<p style="font-size:${Math.round(14 * s)}px;line-height:1.35;margin:0 0 ${Math.round(14 * s)}px;color:${p.secondary};max-width:${Math.round(w * 0.7)}px;">${escape(d.tagline)}</p>` : ""}
        <div style="display:inline-block;background:${p.accent};color:#0C2340;padding:${Math.round(8 * s)}px ${Math.round(16 * s)}px;font-size:${Math.round(12 * s)}px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;border-radius:${Math.round(2 * s)}px;">${escape(d.cta)}</div>
        <div style="font-size:${Math.round(11 * s)}px;color:${p.secondary};margin-top:${Math.round(10 * s)}px;">${escape(d.phone)}${d.website ? ` · ${escape(d.website)}` : ""}</div>
      </div>
    </div>
  </div>`;
}

// Sub-variation count helper
export function subVariationCount(_v: PrintVariation): number {
  return 4;
}

export function nextSubVariation(current: number, total = 4): number {
  return (current + 1) % total;
}

// Map AD_SIZES storage strings → PrintSize enum
export function normalizeSize(s: string | null | undefined): PrintSize {
  if (!s) return "1/4";
  const k = s.toLowerCase().trim();
  if (k.includes("1/8") || k.includes("eighth")) return "1/8";
  if (k.includes("1/4") || k.includes("quarter")) return "1/4";
  if (k.includes("1/2") || k.includes("half")) return "1/2";
  if (k.includes("cover") || k.includes("featured")) return "cover";
  if (k.includes("full")) return "full";
  return "1/4";
}
