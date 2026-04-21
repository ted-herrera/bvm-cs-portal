// Print Ad Template Engine
// Generates HTML/CSS print ad layouts at exact pixel dimensions for BVM magazine sizes.
// Preview at 150 DPI; print-ready export at 300 DPI with 0.125" bleed.

export type PrintSize = "1/8" | "1/4" | "1/3" | "1/2" | "full" | "cover";
export type PrintVariation = "clean_classic" | "bold_modern" | "premium_editorial";

export interface PrintAdData {
  businessName: string;
  tagline: string;
  city: string;
  services: string[];
  cta: string;
  phone: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  photoUrl: string;
  brandColors: { primary: string; secondary: string; accent: string };
  size: PrintSize;
  variation: PrintVariation;
  subVariation?: number; // 0-3
  qrValue?: string;
  sbr?: SbrContext;
}

// Optional SBR context used to modulate copy tone and urgency on the ad.
// High opportunity score → aspirational language; high competitor density → urgency tag.
export interface SbrContext {
  medianIncome?: number | string;
  opportunityScore?: number | string;
  competitorDensity?: number | string; // "low" | "medium" | "high" or numeric
  incomeTier?: "low" | "middle" | "premium";
}

const FONT_STACK_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_STACK_HEAD = "'Playfair Display', Georgia, serif";
const FONT_STACK_MONO = "'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT_IMPORT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');`;

function incomeTier(sbr?: SbrContext): "low" | "middle" | "premium" {
  if (!sbr) return "middle";
  if (sbr.incomeTier) return sbr.incomeTier;
  const raw = sbr.medianIncome;
  const num = typeof raw === "number" ? raw : parseInt(String(raw || "").replace(/[^0-9]/g, ""), 10);
  if (!num || isNaN(num)) return "middle";
  if (num >= 120000) return "premium";
  if (num < 55000) return "low";
  return "middle";
}

function competitorLevel(sbr?: SbrContext): "low" | "medium" | "high" {
  if (!sbr) return "medium";
  const raw = sbr.competitorDensity;
  if (typeof raw === "string") {
    const s = raw.toLowerCase();
    if (s.includes("high")) return "high";
    if (s.includes("low")) return "low";
    return "medium";
  }
  if (typeof raw === "number") {
    if (raw >= 7) return "high";
    if (raw <= 3) return "low";
    return "medium";
  }
  return "medium";
}

function opportunityLevel(sbr?: SbrContext): "low" | "medium" | "high" {
  if (!sbr) return "medium";
  const raw = sbr.opportunityScore;
  const num = typeof raw === "number" ? raw : parseFloat(String(raw || "").replace(/[^0-9.]/g, ""));
  if (!num || isNaN(num)) return "medium";
  if (num >= 70) return "high";
  if (num <= 35) return "low";
  return "medium";
}

// Returns a CTA string optionally enriched by SBR urgency cues.
function ctaWithUrgency(cta: string, sbr?: SbrContext): string {
  if (!cta) return "Contact Us";
  const comp = competitorLevel(sbr);
  if (comp === "high" && !/today|now|limited/i.test(cta)) return `${cta} Today`;
  return cta;
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
  "1/3": { w: 3.625, h: 6.625 },
  "1/2": { w: 7.5, h: 4.875 },
  full: { w: 7.5, h: 10 },
  cover: { w: 8.5, h: 11 },
};

export const SIZE_LABELS: Record<PrintSize, string> = {
  "1/8": "Eighth Page",
  "1/4": "Quarter Page",
  "1/3": "Third Page",
  "1/2": "Half Page",
  full: "Full Page",
  cover: "Featured Cover",
};

export const SIZE_DESCRIPTIONS: Record<PrintSize, string> = {
  "1/8": "Business card style — perfect for compact placements",
  "1/4": "Most popular size — strong presence at great value",
  "1/3": "Tall vertical format — premium magazine column",
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
      { bg: "#1F2937", text: "#FFFFFF", accent: "#22D3EE", secondary: "#CBD5E1", fontFamily: "'Inter', system-ui, sans-serif", headlineFont: "'Inter', system-ui, sans-serif" },
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
    <style>${FONT_IMPORT_CSS}</style>
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

// ─── Locked 3-zone grid renderer ─────────────────────────────────────────
// Top 35%: business name + tagline + eyebrow/logo zone
// Middle 40%: hero photo or color block + services list
// Bottom 25%: CTA button + phone + address + city
// All 12 variation+sub combinations honor this grid.

interface ZoneSizes {
  topH: number;
  midH: number;
  botH: number;
  padding: number;
}

function zones(w: number, h: number, s: number): ZoneSizes {
  const topH = Math.round(h * 0.35);
  const midH = Math.round(h * 0.40);
  const botH = h - topH - midH;
  const padding = Math.max(10, Math.round(18 * s));
  return { topH, midH, botH, padding };
}

// ──── Typography size scaler ────
// Caller passes the reference px (e.g. 30 for business name at 1/4 reference).
// Scaled proportionally for larger/smaller ads via fontScale(w,h).
function px(base: number, s: number): number {
  return Math.max(8, Math.round(base * s));
}

// Shared content blocks — used by all three variations. Receives `p` for palette
// and `onDark` for text contrast on dark photos.
function topBlock(d: PrintAdData, p: SubPalette, s: number, accentBg: string, textColor: string, dividerColor: string): string {
  const nameSize = px(30, s);
  const taglineSize = px(15, s);
  const eyebrow = `<div style="font-family:${FONT_STACK_MONO};font-size:${px(10, s)}px;letter-spacing:0.22em;text-transform:uppercase;color:${accentBg};font-weight:500;margin:0 0 ${px(6, s)}px;">${escape(d.city || "Local")}</div>`;
  const name = `<h1 style="font-family:${FONT_STACK_HEAD};font-size:${nameSize}px;line-height:1.02;margin:0;font-weight:700;letter-spacing:-0.01em;color:${textColor};">${escape(d.businessName || "Your Business")}</h1>`;
  const tagline = d.tagline && d.tagline.trim()
    ? `<p style="font-family:${FONT_STACK_HEAD};font-size:${taglineSize}px;font-style:italic;line-height:1.3;margin:${px(6, s)}px 0 0;color:${dividerColor};font-weight:400;max-width:100%;">${escape(d.tagline)}</p>`
    : "";
  return `${eyebrow}${name}${tagline}`;
}

function servicesBlock(d: PrintAdData, s: number, textColor: string, accentColor: string): string {
  if (!d.services || d.services.length === 0) return "";
  const size = px(12, s);
  const items = d.services.slice(0, 3).map((sv) => escape(sv)).join(
    ` <span style="color:${accentColor};font-weight:700;">·</span> `,
  );
  return `<div style="font-family:${FONT_STACK_BODY};font-weight:500;font-size:${size}px;color:${textColor};letter-spacing:0.01em;line-height:1.5;">${items}</div>`;
}

function bottomBlock(d: PrintAdData, p: SubPalette, s: number, ctaBg: string, ctaText: string, monoColor: string, dividerColor: string): string {
  const ctaSize = px(13, s);
  const phoneSize = px(11, s);
  const addrSize = px(10, s);
  const citySize = px(10, s);
  const ctaLabel = escape(ctaWithUrgency(d.cta || "Contact Us", d.sbr));
  const ctaBtn = `<span style="font-family:${FONT_STACK_BODY};display:inline-block;background:${ctaBg};color:${ctaText};padding:${px(8, s)}px ${px(16, s)}px;font-size:${ctaSize}px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;border-radius:${Math.max(3, Math.round(4 * s))}px;line-height:1;white-space:nowrap;">${ctaLabel} →</span>`;
  const phoneLine = d.phone
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${phoneSize}px;color:${monoColor};margin-top:${px(6, s)}px;letter-spacing:0.02em;">${escape(d.phone)}${d.website ? ` · ${escape(d.website)}` : ""}</div>`
    : "";
  const addrLine = d.address && d.address.trim()
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${addrSize}px;color:${monoColor};margin-top:${px(2, s)}px;letter-spacing:0.02em;">${escape(d.address)}</div>`
    : "";
  const cityLine = d.city
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${citySize}px;color:${dividerColor};margin-top:${px(2, s)}px;letter-spacing:0.08em;text-transform:uppercase;">${escape(d.city)}</div>`
    : "";
  return `<div>${ctaBtn}${phoneLine}${addrLine}${cityLine}</div>`;
}

function photoOrBlock(d: PrintAdData): string {
  return d.photoUrl
    ? `url('${d.photoUrl}') center/cover`
    : `linear-gradient(135deg, ${d.brandColors.primary}, ${d.brandColors.accent})`;
}

function renderCleanClassic(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const sub = (((d.subVariation ?? 0) % 4) + 4) % 4;
  const { topH, midH, botH, padding } = zones(w, h, s);
  const photoBg = photoOrBlock(d);

  // Sub variations vary photo framing in the middle zone — grid remains locked.
  const midPadding = Math.max(8, Math.round(12 * s));
  let middleZone = "";
  if (sub === 0) {
    // Photo left, services right
    middleZone = `<div style="display:flex;height:100%;gap:${midPadding}px;">
      <div style="flex:0 0 55%;height:100%;background:${photoBg};border-radius:${Math.max(2, Math.round(3 * s))}px;"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${servicesBlock(d, s, p.text, p.accent)}</div>
    </div>`;
  } else if (sub === 1) {
    // Photo right, services left with gold frame
    middleZone = `<div style="display:flex;height:100%;gap:${midPadding}px;">
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${servicesBlock(d, s, p.text, p.accent)}</div>
      <div style="flex:0 0 55%;height:100%;background:${photoBg};border:${Math.max(2, Math.round(3 * s))}px solid ${p.accent};box-sizing:border-box;"></div>
    </div>`;
  } else if (sub === 2) {
    // Photo as top banner, services below
    middleZone = `<div style="display:flex;flex-direction:column;height:100%;gap:${midPadding}px;">
      <div style="flex:0 0 62%;background:${photoBg};border-radius:${Math.max(2, Math.round(3 * s))}px;"></div>
      <div style="flex:1;display:flex;align-items:center;">${servicesBlock(d, s, p.text, p.accent)}</div>
    </div>`;
  } else {
    // Photo bottom band, services top
    middleZone = `<div style="display:flex;flex-direction:column;height:100%;gap:${midPadding}px;">
      <div style="flex:1;display:flex;align-items:flex-start;">${servicesBlock(d, s, p.text, p.accent)}</div>
      <div style="flex:0 0 62%;background:${photoBg};border-radius:${Math.max(2, Math.round(3 * s))}px;"></div>
    </div>`;
  }

  return `<div style="width:${w}px;height:${h}px;background:${p.bg};color:${p.text};font-family:${FONT_STACK_BODY};box-sizing:border-box;display:flex;flex-direction:column;padding:${padding}px;">
    <div style="height:${topH - padding}px;flex-shrink:0;">${topBlock(d, p, s, p.accent, p.text, p.secondary)}</div>
    <div style="height:${midH}px;flex-shrink:0;">${middleZone}</div>
    <div style="height:${botH - padding}px;flex-shrink:0;border-top:1px solid ${p.accent};padding-top:${Math.max(6, Math.round(8 * s))}px;margin-top:${Math.max(6, Math.round(8 * s))}px;">${bottomBlock(d, p, s, p.accent, p.bg, p.text, p.secondary)}</div>
  </div>`;
}

function renderBoldModern(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const sub = (((d.subVariation ?? 0) % 4) + 4) % 4;
  const { topH, midH, botH, padding } = zones(w, h, s);
  const photoBg = photoOrBlock(d);
  const onDarkText = "#FFFFFF";
  const mono = "rgba(255,255,255,0.75)";

  // Middle zone: dark block with photo insert or photo dominant with tint
  let middleZone = "";
  if (sub === 0) {
    middleZone = `<div style="display:flex;height:100%;gap:${Math.round(12 * s)}px;">
      <div style="flex:1;display:flex;align-items:center;">${servicesBlock(d, s, onDarkText, p.accent)}</div>
      <div style="flex:0 0 58%;height:100%;background:${photoBg};border-radius:${Math.max(2, Math.round(3 * s))}px;"></div>
    </div>`;
  } else if (sub === 1) {
    middleZone = `<div style="display:flex;height:100%;gap:${Math.round(12 * s)}px;">
      <div style="flex:0 0 58%;height:100%;background:${photoBg};border-radius:${Math.max(2, Math.round(3 * s))}px;"></div>
      <div style="flex:1;display:flex;align-items:center;">${servicesBlock(d, s, onDarkText, p.accent)}</div>
    </div>`;
  } else if (sub === 2) {
    // Photo tiled across full middle with overlay tint
    middleZone = `<div style="position:relative;height:100%;border-radius:${Math.max(2, Math.round(3 * s))}px;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photoBg};"></div>
      <div style="position:absolute;inset:0;background:${p.bg};opacity:0.55;"></div>
      <div style="position:relative;z-index:2;padding:${Math.round(16 * s)}px;height:100%;box-sizing:border-box;display:flex;align-items:flex-end;">${servicesBlock(d, s, onDarkText, p.accent)}</div>
    </div>`;
  } else {
    // Split top/bottom: photo top 60%, services bottom strip
    middleZone = `<div style="display:flex;flex-direction:column;height:100%;gap:${Math.round(10 * s)}px;">
      <div style="flex:0 0 62%;background:${photoBg};border-radius:${Math.max(2, Math.round(3 * s))}px;"></div>
      <div style="flex:1;display:flex;align-items:center;">${servicesBlock(d, s, onDarkText, p.accent)}</div>
    </div>`;
  }

  return `<div style="width:${w}px;height:${h}px;background:${p.bg};color:${onDarkText};font-family:${FONT_STACK_BODY};box-sizing:border-box;display:flex;flex-direction:column;padding:${padding}px;">
    <div style="height:${topH - padding}px;flex-shrink:0;">${topBlock(d, p, s, p.accent, onDarkText, mono)}</div>
    <div style="height:${midH}px;flex-shrink:0;">${middleZone}</div>
    <div style="height:${botH - padding}px;flex-shrink:0;border-top:${Math.max(1, Math.round(2 * s))}px solid ${p.accent};padding-top:${Math.max(6, Math.round(8 * s))}px;margin-top:${Math.max(6, Math.round(8 * s))}px;">${bottomBlock(d, p, s, p.accent, "#0C2340", mono, "rgba(255,255,255,0.55)")}</div>
  </div>`;
}

function renderPremiumEditorial(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const sub = (((d.subVariation ?? 0) % 4) + 4) % 4;
  const { topH, midH, botH, padding } = zones(w, h, s);
  const photoBg = photoOrBlock(d);
  const onDarkText = "#FFFFFF";
  const mono = "rgba(255,255,255,0.8)";

  // Photo fills full ad; content sits in translucent zones over photo.
  // Sub variations change the overlay treatment + panel positions, grid stays 35/40/25.
  let topOverlay = "", midOverlay = "", botOverlay = "";
  if (sub === 0) {
    // Dark tint across photo, content stacked center
    topOverlay = `background:linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 100%);`;
    midOverlay = `background:rgba(0,0,0,0.22);`;
    botOverlay = `background:linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 100%);`;
  } else if (sub === 1) {
    // Soft gradient bottom, lighter top
    topOverlay = `background:linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.15) 100%);`;
    midOverlay = `background:transparent;`;
    botOverlay = `background:linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.25) 100%);`;
  } else if (sub === 2) {
    // Brand-color wash with photo peeking in middle
    topOverlay = `background:${p.bg};opacity:0.9;`;
    midOverlay = `background:rgba(0,0,0,0.08);`;
    botOverlay = `background:${p.bg};opacity:0.9;`;
  } else {
    // Frosted panels on photo
    topOverlay = `background:rgba(12,35,64,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);`;
    midOverlay = `background:rgba(0,0,0,0.20);`;
    botOverlay = `background:rgba(12,35,64,0.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);`;
  }

  return `<div style="width:${w}px;height:${h}px;background:${photoBg};color:${onDarkText};font-family:${FONT_STACK_BODY};position:relative;box-sizing:border-box;display:flex;flex-direction:column;">
    <div style="height:${topH}px;flex-shrink:0;${topOverlay}padding:${padding}px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;">
      ${topBlock(d, p, s, p.accent, onDarkText, mono)}
    </div>
    <div style="height:${midH}px;flex-shrink:0;${midOverlay}padding:${padding}px;box-sizing:border-box;display:flex;align-items:center;">
      ${servicesBlock(d, s, onDarkText, p.accent)}
    </div>
    <div style="height:${botH}px;flex-shrink:0;${botOverlay}padding:${padding}px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">
      ${bottomBlock(d, p, s, p.accent, "#0C2340", mono, "rgba(255,255,255,0.6)")}
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
  if (k.includes("1/3") || k.includes("third")) return "1/3";
  if (k.includes("1/2") || k.includes("half")) return "1/2";
  if (k.includes("cover") || k.includes("featured")) return "cover";
  if (k.includes("full")) return "full";
  return "1/4";
}
