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

// Rules-based single-variation selector. premium_editorial is the DEFAULT for
// every business type. Home services + auto repair clusters fall back to
// clean_classic where product/service photography reads better. bold_modern
// is no longer a default — only reachable via Surprise Me (which goes through
// the AI prompt, not this selector).
export function selectVariation(
  businessType: string | null | undefined,
  subType: string | null | undefined,
  _size: PrintSize | null | undefined,
  _sbr?: SbrContext,
): PrintVariation {
  const keys = `${businessType || ""} ${subType || ""}`.toLowerCase();

  // Home services + auto repair → clean_classic
  if (/roofing|plumbing|electrical|hvac|painting|flooring|landscaping|cleaning|moving|storage|remodel|handyman|home.?services/.test(keys)) return "clean_classic";
  if (/auto_?repair|automotive|mechanic|\bcar\b/.test(keys)) return "clean_classic";

  // Every other business type defaults to premium_editorial.
  return "premium_editorial";
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

// ─── Award-level ad design system ───────────────────────────────────────
// Rules enforced across all three variations:
//  • One dominant element (photo OR business name) — never both competing
//  • Minimum 12px margin from trim edge, ~15% breathing room
//  • Strict typography hierarchy: name 100%, tagline 45%, services 30%,
//    CTA 35% (high contrast), phone/address 20%
//
// clean_classic     → photo hero (right 55%), name top-left, CTA pill bottom-right
// bold_modern       → name hero, centered massive over tinted full-bleed photo
// premium_editorial → photo hero, full-bleed + overlaid lower-third name, dark bottom strip

interface TypeSizes {
  name: number;
  tagline: number;
  services: number;
  cta: number;
  phone: number;
  eyebrow: number;
}

// Base business-name pixel size per variation (at 1/4 reference).
// Other sizes derive from this ratio (hierarchy is enforced).
const NAME_BASE: Record<PrintVariation, number> = {
  clean_classic: 36,
  bold_modern: 60,
  premium_editorial: 60,
};

function ratios(nameBase: number, s: number): TypeSizes {
  const name = Math.max(18, Math.round(nameBase * s));
  return {
    name,
    tagline: Math.max(13, Math.round(name * 0.45)),
    services: Math.max(10, Math.round(name * 0.30)),
    cta: Math.max(11, Math.round(name * 0.35)),
    phone: Math.max(9, Math.round(name * 0.20)),
    eyebrow: Math.max(9, Math.round(name * 0.22)),
  };
}

function photoOrBlock(d: PrintAdData): string {
  return d.photoUrl
    ? `url('${d.photoUrl}') center/cover`
    : `linear-gradient(135deg, ${d.brandColors.primary}, ${d.brandColors.accent})`;
}

// Inner margin inside trim — minimum 12px, scales up gracefully for large ads.
function insetPadding(s: number): number {
  return Math.max(12, Math.round(20 * s));
}

function ctaLabel(d: PrintAdData): string {
  return escape(ctaWithUrgency(d.cta || "Contact Us", d.sbr));
}

function ctaPill(d: PrintAdData, t: TypeSizes, s: number, bg: string, fg: string): string {
  return `<span style="font-family:${FONT_STACK_BODY};display:inline-block;background:${bg};color:${fg};padding:${Math.round(t.cta * 0.75)}px ${Math.round(t.cta * 1.5)}px;font-size:${t.cta}px;font-weight:900;text-transform:uppercase;letter-spacing:0.09em;border-radius:${Math.max(3, Math.round(4 * s))}px;line-height:1;white-space:nowrap;">${ctaLabel(d)} →</span>`;
}

function servicesLine(d: PrintAdData, t: TypeSizes, color: string, accent: string, upper = false): string {
  if (!d.services || d.services.length === 0) return "";
  const items = d.services.slice(0, 3).map((sv) => escape(sv)).join(
    ` <span style="color:${accent};font-weight:700;">·</span> `,
  );
  return `<div style="font-family:${FONT_STACK_BODY};font-weight:500;font-size:${t.services}px;color:${color};line-height:1.5;${upper ? "letter-spacing:0.16em;text-transform:uppercase;" : "letter-spacing:0.01em;"}">${items}</div>`;
}

function phoneAddressMono(d: PrintAdData, t: TypeSizes, color: string): string {
  const phoneLine = d.phone && d.phone.trim()
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${t.phone}px;color:${color};letter-spacing:0.02em;line-height:1.4;">${escape(d.phone)}${d.website ? ` · ${escape(d.website)}` : ""}</div>`
    : "";
  const addrLine = d.address && d.address.trim()
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${Math.max(9, t.phone - 1)}px;color:${color};letter-spacing:0.02em;line-height:1.4;margin-top:${Math.round(t.phone * 0.2)}px;">${escape(d.address)}</div>`
    : "";
  return `${phoneLine}${addrLine}`;
}

// ─── clean_classic ───────────────────────────────────────────────────
// Photo is the hero (right 55%, full height). Business name top-left, tagline
// beneath. Services + contact stacked bottom-left. CTA pill bottom-right.
function renderCleanClassic(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const t = ratios(NAME_BASE.clean_classic, s);
  const pad = insetPadding(s);
  const photoBg = photoOrBlock(d);
  const leftW = Math.round(w * 0.45 - pad * 1.5);
  const photoW = w - leftW - pad * 3; // pad left, pad gutter, pad right

  const eyebrow = `<div style="font-family:${FONT_STACK_MONO};font-size:${t.eyebrow}px;letter-spacing:0.24em;text-transform:uppercase;color:${p.accent};font-weight:500;margin:0 0 ${Math.round(t.name * 0.22)}px;">${escape(d.city || "Local")}</div>`;
  const name = `<h1 style="font-family:${FONT_STACK_HEAD};font-size:${t.name}px;line-height:0.98;margin:0;font-weight:700;letter-spacing:-0.015em;color:${p.text};">${escape(d.businessName || "Your Business")}</h1>`;
  const tagline = d.tagline && d.tagline.trim()
    ? `<p style="font-family:${FONT_STACK_HEAD};font-size:${t.tagline}px;font-style:italic;line-height:1.35;margin:${Math.round(t.name * 0.22)}px 0 0;color:${p.secondary};font-weight:400;">${escape(d.tagline)}</p>`
    : "";

  return `<div style="width:${w}px;height:${h}px;background:${p.bg};color:${p.text};font-family:${FONT_STACK_BODY};box-sizing:border-box;position:relative;display:flex;padding:${pad}px;gap:${pad}px;">
    <div style="width:${leftW}px;flex-shrink:0;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        ${eyebrow}
        ${name}
        ${tagline}
      </div>
      <div style="padding-bottom:${Math.round(t.cta * 1.8)}px;">
        ${servicesLine(d, t, p.text, p.accent)}
        <div style="margin-top:${Math.round(t.services * 0.9)}px;">${phoneAddressMono(d, t, p.secondary)}</div>
      </div>
    </div>
    <div style="width:${photoW}px;height:100%;background:${photoBg};border-radius:${Math.max(2, Math.round(4 * s))}px;flex-shrink:0;box-shadow:0 0 0 1px rgba(12,35,64,0.06);"></div>
    <div style="position:absolute;right:${pad}px;bottom:${pad}px;">${ctaPill(d, t, s, p.accent, p.bg)}</div>
  </div>`;
}

// ─── bold_modern ─────────────────────────────────────────────────────
// Business name is the hero. Full-bleed dark bg with 40% dark-overlaid photo.
// Centered stack: name → gold rule → tagline → services gold small caps →
// CTA gold pill → phone DM Mono white at very bottom.
function renderBoldModern(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const t = ratios(NAME_BASE.bold_modern, s);
  const pad = insetPadding(s);
  const photoBg = photoOrBlock(d);
  const bgColor = p.bg.startsWith("#") || p.bg.startsWith("rgb") ? p.bg : "#0C2340";

  const eyebrow = `<div style="font-family:${FONT_STACK_MONO};font-size:${t.eyebrow}px;letter-spacing:0.28em;text-transform:uppercase;color:${p.accent};font-weight:600;margin-bottom:${Math.round(t.name * 0.25)}px;">${escape(d.city || "Local")}</div>`;
  const name = `<h1 style="font-family:${FONT_STACK_HEAD};font-size:${t.name}px;line-height:0.96;margin:0;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">${escape(d.businessName || "Your Business")}</h1>`;
  const rule = `<div style="width:${Math.max(40, Math.round(t.name * 1.6))}px;height:${Math.max(2, Math.round(2 * s))}px;background:${p.accent};margin:${Math.round(t.name * 0.35)}px auto;border-radius:2px;"></div>`;
  const tagline = d.tagline && d.tagline.trim()
    ? `<p style="font-family:${FONT_STACK_HEAD};font-size:${t.tagline}px;font-style:italic;line-height:1.35;margin:0 0 ${Math.round(t.name * 0.4)}px;color:rgba(255,255,255,0.88);font-weight:400;max-width:85%;">${escape(d.tagline)}</p>`
    : "";

  return `<div style="width:${w}px;height:${h}px;background:${bgColor};color:#ffffff;font-family:${FONT_STACK_BODY};position:relative;overflow:hidden;box-sizing:border-box;">
    <div style="position:absolute;inset:0;background:${photoBg};opacity:0.6;"></div>
    <div style="position:absolute;inset:0;background:${bgColor};opacity:0.55;"></div>
    <div style="position:relative;z-index:2;height:100%;padding:${pad}px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;text-align:center;">
      <div style="padding-top:${Math.round(h * 0.06)}px;">
        ${eyebrow}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        ${name}
        ${rule}
        ${tagline}
        ${servicesLine(d, t, p.accent, "#ffffff", true)}
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:${Math.round(t.cta * 0.7)}px;padding-bottom:${Math.round(pad * 0.2)}px;">
        ${ctaPill(d, t, s, p.accent, "#0C2340")}
        <div style="color:rgba(255,255,255,0.75);text-align:center;">${phoneAddressMono(d, t, "rgba(255,255,255,0.85)")}</div>
      </div>
    </div>
  </div>`;
}

// ─── premium_editorial ───────────────────────────────────────────────
// Morphe-level simplicity. Full-bleed photo, dark wash, centered name at 42%,
// thin white rule, italic tagline, gold CTA centered near bottom, phone+
// address mono tiny below CTA. No services on this variation — the image
// carries the product story.
function renderPremiumEditorial(d: PrintAdData, _p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const t = ratios(NAME_BASE.premium_editorial, s);
  const edge = Math.max(16, Math.round(18 * s));
  const photoBg = photoOrBlock(d);
  const gold = "#D4A843";

  const eyebrow = `<div style="position:absolute;left:${edge}px;top:${edge}px;z-index:3;font-family:${FONT_STACK_MONO};font-size:${t.eyebrow}px;letter-spacing:0.28em;text-transform:uppercase;color:${gold};font-weight:600;">${escape(d.city || "Local")}</div>`;

  const ruleW = Math.round(w * 0.40);

  const name = `<h1 style="font-family:${FONT_STACK_HEAD};font-size:${t.name}px;line-height:0.96;margin:0;font-weight:700;letter-spacing:-0.015em;color:#ffffff;text-shadow:0 2px 18px rgba(0,0,0,0.45);">${escape(d.businessName || "Your Business")}</h1>`;
  const rule = `<div style="width:${ruleW}px;height:1px;background:rgba(255,255,255,0.92);margin:${Math.max(8, Math.round(8 * s))}px auto 0;"></div>`;
  const tagline = d.tagline && d.tagline.trim()
    ? `<p style="font-family:${FONT_STACK_HEAD};font-size:${t.tagline}px;font-style:italic;line-height:1.3;margin:${Math.max(8, Math.round(10 * s))}px 0 0;color:rgba(255,255,255,0.95);font-weight:400;text-shadow:0 1px 10px rgba(0,0,0,0.35);">${escape(d.tagline)}</p>`
    : "";

  const phoneLine = d.phone && d.phone.trim()
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${Math.max(9, Math.round(t.phone * 0.9))}px;color:rgba(255,255,255,0.9);letter-spacing:0.04em;line-height:1.4;margin-top:${Math.max(8, Math.round(10 * s))}px;">${escape(d.phone)}${d.website ? ` · ${escape(d.website)}` : ""}</div>`
    : "";
  const addrLine = d.address && d.address.trim()
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${Math.max(9, Math.round(t.phone * 0.85))}px;color:rgba(255,255,255,0.8);letter-spacing:0.03em;line-height:1.4;margin-top:${Math.max(2, Math.round(3 * s))}px;">${escape(d.address)}</div>`
    : "";

  return `<div style="width:${w}px;height:${h}px;background:${photoBg};color:#ffffff;font-family:${FONT_STACK_BODY};position:relative;overflow:hidden;box-sizing:border-box;">
    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);z-index:1;"></div>
    ${eyebrow}
    <div style="position:absolute;left:0;right:0;top:42%;z-index:3;padding:0 ${edge}px;text-align:center;">
      ${name}
      ${rule}
      ${tagline}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:${edge}px;z-index:3;padding:0 ${edge}px;text-align:center;display:flex;flex-direction:column;align-items:center;">
      ${ctaPill(d, t, s, gold, "#0C2340")}
      ${phoneLine}
      ${addrLine}
    </div>
  </div>`;
}

// Kept for back-compat (unused, now always 1)
export function subVariationCount(_v: PrintVariation): number {
  return 1;
}

export function nextSubVariation(_current: number, _total = 1): number {
  return 0;
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
