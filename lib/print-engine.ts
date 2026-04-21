// Print Ad Template Engine
// Generates HTML/CSS print ad layouts at exact pixel dimensions for BVM magazine sizes.
// Preview at 150 DPI; print-ready export at 300 DPI with 0.125" bleed.

export type PrintSize = "1/8" | "1/4" | "1/3" | "1/2" | "full" | "cover";
// Five named templates, plus the three legacy variation names retained as
// aliases so previously-stored selectedVariation values keep rendering.
// Legacy mapping: clean_classic → bauhaus, bold_modern → nike, premium_editorial → ogilvy.
export type PrintVariation =
  | "local_converter"
  | "ogilvy"
  | "bauhaus"
  | "apple"
  | "nike"
  | "clean_classic"
  | "bold_modern"
  | "premium_editorial";

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
  vibe?: string; // free-text brand vibe hint (energy/bold/strong/powerful → nike override)
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

// Rules-based template selector. Maps business category → one of 5 templates.
// Overrides:
//   • vibe keywords energy/bold/strong/powerful/urban/young → nike regardless
//   • cover/full page + premium income tier → apple (unless home services or food)
export function selectVariation(
  businessType: string | null | undefined,
  subType: string | null | undefined,
  size: PrintSize | null | undefined,
  sbr?: SbrContext,
): PrintVariation {
  const keys = `${businessType || ""} ${subType || ""}`.toLowerCase();
  const vibe = (sbr?.vibe || "").toLowerCase();
  const tier = incomeTier(sbr);
  const sz = String(size || "").toLowerCase();

  const isHomeServices = /roofing|plumbing|electrical|hvac|painting|flooring|landscaping|cleaning|moving|storage|remodel|handyman|home.?services|auto_?repair|automotive|mechanic|\bcar\b/.test(keys);
  const isFood = /food|bakery|restaurant|cafe|coffee|pizza|taco|mexican|bbq|burger|chocolate|sweets|pastry|japanese|sushi|bar\b|brewery|wine|distillery|catering|grocery/.test(keys);

  // Vibe override → nike
  if (/energy|bold|strong|powerful|urban|young/.test(vibe)) return "nike";

  // Cover / full + premium tier → apple (unless home services or food)
  if ((sz === "cover" || sz === "full") && tier === "premium" && !isHomeServices && !isFood) {
    return "apple";
  }

  // Template E — nike: fitness / gym / martial arts / dance / urban auto
  if (/fitness|gym|yoga|pilates|martial_?arts|karate|dance|crossfit/.test(keys)) return "nike";

  // Template A — local_converter: home services + auto
  if (isHomeServices) return "local_converter";

  // Template B — ogilvy: food / hospitality / personal care
  if (/restaurant|cafe|bakery|coffee|bar\b|brewery|wine|distillery|spa|salon|beauty|florist|catering|bbq|pizza|taco|mexican|japanese|sushi|burger/.test(keys)) return "ogilvy";

  // Template D — apple: law / luxury / jewelry / hotel / real estate premium
  if (/law\b|legal|attorney|lawyer|jewelry|hotel|motel|resort|inn|real_?estate|realtor/.test(keys)) {
    return "apple";
  }

  // Template C — bauhaus: medical / professional / retail / boutique
  if (/dental|medical|doctor|clinic|financial|finance|insurance|accounting|optical|pharmacy|chiropractic|physical_?therapy|retail|boutique|bookstore|hardware|tutoring|childcare|pet|veterinary/.test(keys)) {
    return "bauhaus";
  }

  // Default
  return "bauhaus";
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
  local_converter: "Local Converter",
  ogilvy: "Ogilvy",
  bauhaus: "Bauhaus",
  apple: "Apple",
  nike: "Nike",
  // Legacy
  clean_classic: "Clean & Classic",
  bold_modern: "Bold & Modern",
  premium_editorial: "Premium Editorial",
};

export const VARIATION_DESCRIPTIONS: Record<PrintVariation, string> = {
  local_converter:
    "Full-bleed action photo. Dark left-side slab with geo eyebrow, massive headline, services checkmarks, trust strip. Built for service businesses.",
  ogilvy:
    "Lifestyle photography with bottom gradient. Editorial italic headline, gold rule, service pills. Warm human story.",
  bauhaus:
    "Cream background with geometric color block. Inter Black name, service bullets, photo in a frame. Precise and calm.",
  apple:
    "White negative-space stage. One hero subject, small restrained type. Absolute minimalism.",
  nike:
    "Black high-energy action photo with dark tint. Distressed headline, gold italic subline, badges, gold phone strip.",
  // Legacy
  clean_classic: "Legacy alias — renders as Bauhaus.",
  bold_modern: "Legacy alias — renders as Nike.",
  premium_editorial: "Legacy alias — renders as Ogilvy.",
};

// Map legacy names to canonical 5 templates.
type TemplateName = "local_converter" | "ogilvy" | "bauhaus" | "apple" | "nike";
function canonicalTemplate(v: PrintVariation): TemplateName {
  if (v === "clean_classic") return "bauhaus";
  if (v === "bold_modern") return "nike";
  if (v === "premium_editorial") return "ogilvy";
  return v as TemplateName;
}

interface SubPalette {
  bg: string;
  text: string;
  accent: string;
  secondary: string;
  fontFamily: string;
  headlineFont: string;
}

function paletteFor(variation: PrintVariation, _sub: number, brand: PrintAdData["brandColors"]): SubPalette {
  const t = canonicalTemplate(variation);
  const primary = brand.primary || "#0C2340";
  const accent = brand.accent || "#D4A843";
  const secondary = brand.secondary || "#475569";
  if (t === "local_converter") {
    return { bg: "#0C2340", text: "#FFFFFF", accent: "#D4A843", secondary: "rgba(255,255,255,0.8)", fontFamily: FONT_STACK_BODY, headlineFont: FONT_STACK_BODY };
  }
  if (t === "ogilvy") {
    return { bg: primary, text: "#FFFFFF", accent, secondary: "rgba(255,255,255,0.85)", fontFamily: FONT_STACK_BODY, headlineFont: FONT_STACK_HEAD };
  }
  if (t === "bauhaus") {
    return { bg: "#F5EFE4", text: "#0C2340", accent: primary, secondary, fontFamily: FONT_STACK_BODY, headlineFont: FONT_STACK_BODY };
  }
  if (t === "apple") {
    return { bg: "#FAF8F3", text: "#0C2340", accent: "#0C2340", secondary: "#64748B", fontFamily: FONT_STACK_BODY, headlineFont: FONT_STACK_HEAD };
  }
  // nike
  return { bg: "#000000", text: "#FFFFFF", accent: "#F5C842", secondary: "rgba(255,255,255,0.85)", fontFamily: FONT_STACK_BODY, headlineFont: FONT_STACK_BODY };
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
  const t = canonicalTemplate(data.variation);
  if (t === "local_converter") return renderLocalConverter(data, p, w, h);
  if (t === "ogilvy") return renderOgilvy(data, p, w, h);
  if (t === "bauhaus") return renderBauhaus(data, p, w, h);
  if (t === "apple") return renderApple(data, p, w, h);
  return renderNike(data, p, w, h);
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

// Base business-name pixel size per template (at 1/4 reference).
const NAME_BASE: Record<TemplateName, number> = {
  local_converter: 58,
  ogilvy: 44,
  bauhaus: 48,
  apple: 26,
  nike: 64,
};

function ratios(nameBase: number, s: number): TypeSizes {
  const name = Math.max(18, Math.round(nameBase * s));
  return {
    name,
    tagline: Math.max(13, Math.round(name * 0.45)),
    services: Math.max(10, Math.round(name * 0.30)),
    cta: Math.max(11, Math.round(name * 0.35)),
    phone: Math.max(12, Math.round(name * 0.28)),
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

function phoneAddressMono(d: PrintAdData, t: TypeSizes, color: string, opts?: { pill?: boolean; s?: number }): string {
  const phone = (d.phone || "").trim();
  const address = (d.address || "").trim();
  if (!phone && !address) return "";
  const phoneLine = phone
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${t.phone}px;color:${color};letter-spacing:0.04em;line-height:1.4;font-weight:500;">${escape(phone)}${d.website ? ` · ${escape(d.website)}` : ""}</div>`
    : "";
  const addrLine = address
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${Math.max(11, t.phone - 1)}px;color:${color};letter-spacing:0.03em;line-height:1.4;margin-top:${Math.round(t.phone * 0.2)}px;">${escape(address)}</div>`
    : "";
  if (opts?.pill) {
    const s = opts.s ?? 1;
    return `<div style="display:inline-block;background:rgba(0,0,0,0.55);border-radius:${Math.max(6, Math.round(8 * s))}px;padding:${Math.max(5, Math.round(6 * s))}px ${Math.max(10, Math.round(14 * s))}px;">${phoneLine}${addrLine}</div>`;
  }
  return `${phoneLine}${addrLine}`;
}

// ─── Shared fragments used by the 5 templates ────────────────────────
function starRating(s: number, color = "#F5C842"): string {
  const size = Math.max(10, Math.round(12 * s));
  return `<div style="display:flex;gap:${Math.max(2, Math.round(2 * s))}px;color:${color};font-size:${size}px;letter-spacing:0.04em;">★★★★★</div>`;
}
function qrCard(d: PrintAdData, s: number, opts: { size?: number; bg?: string; fg?: string; label?: string } = {}): string {
  if (!d.qrValue) return "";
  const sz = opts.size ?? Math.max(44, Math.round(64 * s));
  const bg = opts.bg || "#ffffff";
  const fg = opts.fg || "#0C2340";
  const label = opts.label ? escape(opts.label) : "";
  const value = escape(d.qrValue);
  // Placeholder QR block — a dense dotted grid that reads as a QR glyph until
  // the exporter swaps in a real QR image.
  return `<div style="display:inline-flex;flex-direction:column;align-items:center;background:${bg};border-radius:${Math.max(4, Math.round(6 * s))}px;padding:${Math.max(6, Math.round(8 * s))}px;gap:${Math.max(4, Math.round(6 * s))}px;">
    <div style="width:${sz}px;height:${sz}px;background:${fg};display:grid;grid-template-columns:repeat(8, 1fr);grid-template-rows:repeat(8, 1fr);gap:1px;padding:${Math.round(sz * 0.06)}px;box-sizing:border-box;">
      ${Array.from({ length: 64 }).map((_, i) => {
        const on = ((i * 2654435761) ^ (value.length * (i + 3))) & 1;
        return `<div style="background:${on ? bg : fg};"></div>`;
      }).join("")}
    </div>
    ${label ? `<div style="font-family:${FONT_STACK_MONO};font-size:${Math.max(8, Math.round(9 * s))}px;color:${fg};letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">${label}</div>` : ""}
  </div>`;
}
function checkmarkList(d: PrintAdData, t: TypeSizes, color: string, accent: string, max = 5): string {
  const items = (d.services || []).slice(0, max);
  if (items.length === 0) return "";
  return `<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:${Math.round(t.services * 0.4)}px;">
    ${items.map((sv) => `<li style="font-family:${FONT_STACK_BODY};font-weight:500;font-size:${t.services}px;color:${color};line-height:1.35;display:flex;align-items:center;gap:${Math.round(t.services * 0.6)}px;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:${Math.round(t.services * 1.1)}px;height:${Math.round(t.services * 1.1)}px;border-radius:50%;background:${accent};color:#0C2340;font-weight:900;flex-shrink:0;font-size:${Math.round(t.services * 0.7)}px;">✓</span>
      ${escape(sv)}
    </li>`).join("")}
  </ul>`;
}

// ─── TEMPLATE A — local_converter ───────────────────────────────────
// Full bleed action photo + dark-overlay left slab.
function renderLocalConverter(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const t = ratios(NAME_BASE.local_converter, s);
  const pad = Math.max(12, Math.round(20 * s));
  const photoBg = photoOrBlock(d);
  const slabW = Math.round(w * 0.55);

  const eyebrow = `<div style="font-family:${FONT_STACK_MONO};font-size:${t.eyebrow}px;letter-spacing:0.24em;text-transform:uppercase;color:${p.accent};font-weight:600;">${escape(d.city || "Local")}</div>`;
  const name = `<h1 style="font-family:${FONT_STACK_BODY};font-size:${t.name}px;line-height:0.95;margin:${Math.round(t.name * 0.15)}px 0 0;font-weight:900;letter-spacing:-0.02em;color:#ffffff;">${escape(d.businessName || "Your Business")}</h1>`;
  const subhead = d.tagline && d.tagline.trim()
    ? `<p style="font-family:${FONT_STACK_BODY};font-weight:500;font-size:${t.tagline}px;line-height:1.3;margin:${Math.round(t.name * 0.2)}px 0 0;color:rgba(255,255,255,0.9);">${escape(d.tagline)}</p>`
    : "";

  const footerStrip = `<div style="position:absolute;left:0;right:0;bottom:0;padding:${Math.max(4, Math.round(6 * s))}px ${pad}px;background:rgba(0,0,0,0.82);font-family:${FONT_STACK_MONO};font-size:${Math.max(9, Math.round(t.phone * 0.7))}px;color:rgba(255,255,255,0.82);letter-spacing:0.14em;text-transform:uppercase;text-align:center;">
    Family owned · Locally operated${d.city ? ` · ${escape(d.city)}` : ""}
  </div>`;

  return `<div style="width:${w}px;height:${h}px;background:${photoBg};color:#ffffff;font-family:${FONT_STACK_BODY};position:relative;overflow:hidden;box-sizing:border-box;">
    <div style="position:absolute;left:0;top:0;bottom:0;width:${slabW}px;background:linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.78) 70%, rgba(0,0,0,0) 100%);z-index:1;"></div>
    <div style="position:absolute;left:${pad}px;top:${pad}px;right:${w - slabW + pad}px;bottom:${Math.round(h * 0.22)}px;z-index:2;display:flex;flex-direction:column;">
      ${eyebrow}
      ${name}
      ${subhead}
      <div style="margin-top:${Math.round(t.name * 0.35)}px;">${checkmarkList(d, t, "#ffffff", p.accent, 5)}</div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:${Math.round(h * 0.055)}px;padding:${Math.max(8, Math.round(10 * s))}px ${pad}px;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:space-between;gap:${pad}px;z-index:2;">
      <div style="display:flex;flex-direction:column;gap:${Math.max(2, Math.round(3 * s))}px;">
        ${starRating(s, p.accent)}
        <div style="font-family:${FONT_STACK_MONO};font-size:${Math.max(9, Math.round(t.phone * 0.75))}px;color:rgba(255,255,255,0.85);letter-spacing:0.1em;text-transform:uppercase;">Neighbors trust</div>
      </div>
      <div style="font-family:${FONT_STACK_MONO};font-size:${t.phone}px;color:#ffffff;font-weight:600;letter-spacing:0.05em;">${escape(d.phone || "")}</div>
      ${d.qrValue ? qrCard(d, s, { size: Math.max(48, Math.round(60 * s)), label: "Scan" }) : `<div>${ctaPill(d, t, s, p.accent, "#0C2340")}</div>`}
    </div>
    ${footerStrip}
  </div>`;
}

// ─── TEMPLATE B — ogilvy ────────────────────────────────────────────
// Lifestyle photo + bottom gradient + editorial italic headline + gold rule.
function renderOgilvy(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const t = ratios(NAME_BASE.ogilvy, s);
  const pad = Math.max(16, Math.round(22 * s));
  const photoBg = photoOrBlock(d);
  const gold = "#D4A843";
  const year = new Date().getFullYear();

  const logo = `<div style="position:absolute;right:${pad}px;top:${pad}px;z-index:3;text-align:right;">
    <div style="font-family:${FONT_STACK_HEAD};font-size:${Math.max(16, Math.round(t.tagline * 1.2))}px;color:#ffffff;font-weight:700;letter-spacing:-0.01em;">${escape(d.businessName || "Your Business")}</div>
    <div style="font-family:${FONT_STACK_MONO};font-size:${Math.max(8, Math.round(t.eyebrow * 0.85))}px;color:${gold};letter-spacing:0.22em;text-transform:uppercase;margin-top:${Math.max(2, Math.round(3 * s))}px;">${escape(d.city || "Local")} · EST. ${year}</div>
  </div>`;

  const headline = `<h1 style="font-family:${FONT_STACK_HEAD};font-size:${t.name}px;line-height:1.02;margin:0;font-weight:700;font-style:italic;color:#ffffff;letter-spacing:-0.01em;text-shadow:0 2px 16px rgba(0,0,0,0.45);max-width:62%;">${escape(d.tagline || d.businessName)}</h1>`;
  const rule = `<div style="width:${Math.round(w * 0.40)}px;height:1px;background:${gold};margin:${Math.round(t.name * 0.35)}px 0;"></div>`;
  const body = `<p style="font-family:${FONT_STACK_BODY};font-weight:300;font-size:${Math.max(12, Math.round(t.tagline * 0.92))}px;line-height:1.55;color:rgba(255,255,255,0.95);margin:0;max-width:58%;text-shadow:0 1px 8px rgba(0,0,0,0.4);">${escape(d.tagline ? d.businessName + (d.city ? ` · ${d.city}` : "") : `${d.businessName}${d.city ? ` of ${d.city}` : ""}. ${d.services?.slice(0, 2).join(", ") || ""}`.trim())}</p>`;

  const pills = (d.services || []).slice(0, 4).map((sv) => `<span style="display:inline-flex;align-items:center;gap:${Math.max(4, Math.round(5 * s))}px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.3);border-radius:999px;padding:${Math.max(5, Math.round(6 * s))}px ${Math.max(9, Math.round(12 * s))}px;font-family:${FONT_STACK_BODY};font-size:${Math.max(10, Math.round(t.services * 0.9))}px;color:#ffffff;font-weight:500;letter-spacing:0.03em;">◆ ${escape(sv)}</span>`).join("");

  return `<div style="width:${w}px;height:${h}px;background:${photoBg};color:#ffffff;font-family:${FONT_STACK_BODY};position:relative;overflow:hidden;box-sizing:border-box;">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.82) 100%);z-index:1;"></div>
    ${logo}
    <div style="position:absolute;left:${pad}px;right:${pad}px;bottom:${Math.round(h * 0.28)}px;z-index:3;">
      ${headline}
      ${rule}
      ${body}
    </div>
    <div style="position:absolute;left:${pad}px;right:${pad}px;bottom:${Math.round(h * 0.06)}px;z-index:3;display:flex;justify-content:space-between;align-items:flex-end;gap:${pad}px;flex-wrap:wrap;">
      <div style="display:flex;flex-wrap:wrap;gap:${Math.max(5, Math.round(6 * s))}px;flex:1;min-width:0;">${pills}</div>
      ${d.qrValue ? qrCard(d, s, { size: Math.max(54, Math.round(70 * s)), bg: "#ffffff", fg: p.accent, label: `Scan to ${(d.cta || "order").toLowerCase()}` }) : ""}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:${Math.max(4, Math.round(6 * s))}px;z-index:3;text-align:center;font-family:${FONT_STACK_MONO};font-size:${Math.max(10, Math.round(t.phone * 0.8))}px;color:#ffffff;letter-spacing:0.1em;">${escape(d.phone || "")}</div>
  </div>`;
}

// ─── TEMPLATE C — bauhaus ──────────────────────────────────────────
// Cream bg + geometric brand block + bold name + service bullets + photo frame.
function renderBauhaus(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const t = ratios(NAME_BASE.bauhaus, s);
  const pad = Math.max(14, Math.round(20 * s));
  const photoBg = photoOrBlock(d);
  const brand = p.accent;
  const blockSize = Math.round(Math.min(w, h) * 0.28);

  const name = `<h1 style="font-family:${FONT_STACK_BODY};font-size:${t.name}px;line-height:0.92;margin:0;font-weight:900;letter-spacing:-0.025em;color:${p.text};">${escape(d.businessName || "Your Business")}</h1>`;
  const city = `<div style="font-family:${FONT_STACK_BODY};font-size:${Math.max(12, Math.round(t.tagline * 0.95))}px;color:${brand};font-weight:800;letter-spacing:0.02em;margin-top:${Math.round(t.name * 0.15)}px;text-transform:uppercase;">${escape(d.city || "Local")}</div>`;

  const bullets = (d.services || []).slice(0, 4).map((sv, i) => {
    const colors = [brand, p.text, "#64748B", brand];
    const c = colors[i % colors.length];
    return `<li style="display:flex;align-items:center;gap:${Math.max(6, Math.round(8 * s))}px;font-family:${FONT_STACK_BODY};font-size:${t.services}px;font-weight:500;color:${p.text};line-height:1.35;">
      <span style="width:${Math.max(10, Math.round(12 * s))}px;height:${Math.max(10, Math.round(12 * s))}px;background:${c};flex-shrink:0;"></span>
      ${escape(sv)}
    </li>`;
  }).join("");

  const photoH = Math.round(h * 0.46);
  const photoFrame = `<div style="width:100%;height:${photoH}px;background:${photoBg};border:${Math.max(3, Math.round(4 * s))}px solid ${brand};box-sizing:border-box;position:relative;">
    <div style="position:absolute;right:-${Math.max(6, Math.round(8 * s))}px;bottom:-${Math.max(6, Math.round(8 * s))}px;width:${Math.max(18, Math.round(24 * s))}px;height:${Math.max(18, Math.round(24 * s))}px;background:${brand};"></div>
  </div>`;

  return `<div style="width:${w}px;height:${h}px;background:${p.bg};color:${p.text};font-family:${FONT_STACK_BODY};position:relative;overflow:hidden;box-sizing:border-box;padding:${pad}px;">
    <div style="position:absolute;right:${Math.round(pad * 0.5)}px;top:${Math.round(pad * 0.5)}px;width:${blockSize}px;height:${blockSize}px;background:${brand};border-radius:50%;opacity:0.12;"></div>
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;height:100%;">
      <div>
        ${name}
        ${city}
      </div>
      <div style="height:1px;background:${p.text};opacity:0.15;margin:${Math.round(t.name * 0.4)}px 0;"></div>
      <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:${Math.max(12, Math.round(16 * s))}px;flex:1;min-height:0;">
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:${Math.round(t.services * 0.5)}px;align-self:center;">
          ${bullets}
        </ul>
        <div style="align-self:stretch;display:flex;align-items:center;">
          ${photoFrame}
        </div>
      </div>
      ${d.qrValue ? `<div style="position:absolute;right:0;bottom:${Math.round(t.cta * 2)}px;z-index:3;">${qrCard(d, s, { size: Math.max(48, Math.round(60 * s)), bg: "#ffffff", fg: brand, label: `Scan to ${(d.cta || "visit").toLowerCase()}` })}</div>` : ""}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;background:${brand};padding:${Math.max(8, Math.round(10 * s))}px ${pad}px;display:flex;justify-content:space-between;align-items:center;gap:${pad}px;color:#ffffff;">
      <div style="font-family:${FONT_STACK_BODY};font-weight:800;font-size:${Math.max(11, Math.round(t.tagline * 0.9))}px;letter-spacing:0.02em;">${escape(d.businessName || "")}</div>
      <div style="font-family:${FONT_STACK_MONO};font-size:${t.phone}px;letter-spacing:0.04em;font-weight:600;">${escape(d.phone || "")}${d.website ? ` · ${escape(d.website)}` : ""}</div>
    </div>
  </div>`;
}

// ─── TEMPLATE D — apple ────────────────────────────────────────────
// Pure negative space. One hero object ~45%. Everything else tiny.
function renderApple(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const t = ratios(NAME_BASE.apple, s);
  const pad = Math.max(18, Math.round(28 * s));
  const photoBg = photoOrBlock(d);

  const heroSize = Math.round(Math.min(w, h) * 0.45);

  const name = `<h1 style="font-family:${FONT_STACK_HEAD};font-size:${t.name}px;line-height:1.08;margin:0;font-weight:700;color:${p.text};letter-spacing:-0.01em;">${escape(d.businessName || "Your Business")}</h1>`;
  const tagline = d.tagline && d.tagline.trim()
    ? `<p style="font-family:${FONT_STACK_BODY};font-weight:300;font-size:${Math.max(11, Math.round(t.tagline * 0.9))}px;line-height:1.5;margin:${Math.round(t.name * 0.3)}px 0 0;color:${p.secondary};max-width:56%;">${escape(d.tagline)}</p>`
    : "";
  const rule = `<div style="width:${Math.round(w * 0.30)}px;height:1px;background:${p.text};opacity:0.55;margin:${Math.round(t.name * 0.4)}px 0;"></div>`;
  const phone = d.phone
    ? `<div style="font-family:${FONT_STACK_MONO};font-size:${Math.max(10, Math.round(t.phone * 0.85))}px;color:${p.secondary};letter-spacing:0.06em;">${escape(d.phone)}</div>`
    : "";

  return `<div style="width:${w}px;height:${h}px;background:${p.bg};color:${p.text};font-family:${FONT_STACK_BODY};position:relative;overflow:hidden;box-sizing:border-box;">
    <div style="position:absolute;left:50%;top:42%;transform:translate(-50%, -50%);width:${heroSize}px;height:${heroSize}px;background:${photoBg};border-radius:${Math.max(4, Math.round(6 * s))}px;"></div>
    <div style="position:absolute;left:${pad}px;bottom:${pad}px;right:${pad}px;display:flex;justify-content:space-between;align-items:flex-end;gap:${pad}px;">
      <div style="max-width:70%;">
        ${name}
        ${rule}
        ${tagline}
        <div style="margin-top:${Math.round(t.name * 0.4)}px;">${phone}</div>
      </div>
      ${d.qrValue ? qrCard(d, s, { size: Math.max(42, Math.round(52 * s)), bg: p.bg, fg: p.text }) : ""}
    </div>
  </div>`;
}

// ─── TEMPLATE E — nike ─────────────────────────────────────────────
// Black bg + high-energy action photo + distressed headline + gold strip.
function renderNike(d: PrintAdData, p: SubPalette, w: number, h: number): string {
  const s = fontScale(w, h);
  const t = ratios(NAME_BASE.nike, s);
  const pad = Math.max(14, Math.round(20 * s));
  const photoBg = photoOrBlock(d);
  const gold = p.accent;

  const logo = `<div style="position:absolute;right:${pad}px;top:${pad}px;z-index:3;font-family:${FONT_STACK_BODY};font-weight:900;font-size:${Math.max(12, Math.round(t.tagline * 1.1))}px;color:#ffffff;letter-spacing:0.04em;text-transform:uppercase;">${escape(d.businessName || "Your Business")}</div>`;

  const headline = d.tagline && d.tagline.trim() ? d.tagline : d.businessName || "Move";
  const subline = d.tagline && d.tagline.trim() ? (d.services?.[0] || "Show up.") : (d.services?.slice(0, 3).join(" · ") || "");

  const badges = (d.services || []).slice(0, 3).map((sv) => `<div style="display:inline-flex;align-items:center;justify-content:center;min-width:${Math.max(54, Math.round(72 * s))}px;height:${Math.max(34, Math.round(44 * s))}px;border:2px solid #ffffff;border-radius:${Math.max(4, Math.round(6 * s))}px;padding:0 ${Math.max(8, Math.round(10 * s))}px;font-family:${FONT_STACK_BODY};font-size:${Math.max(10, Math.round(t.services * 0.9))}px;font-weight:800;color:#ffffff;letter-spacing:0.1em;text-transform:uppercase;">${escape(sv)}</div>`).join("");

  return `<div style="width:${w}px;height:${h}px;background:#000000;color:#ffffff;font-family:${FONT_STACK_BODY};position:relative;overflow:hidden;box-sizing:border-box;">
    <div style="position:absolute;inset:0;background:${photoBg};"></div>
    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);"></div>
    ${logo}
    <div style="position:absolute;left:${pad}px;top:${Math.round(h * 0.28)}px;width:52%;z-index:3;">
      <h1 style="font-family:${FONT_STACK_BODY};font-size:${t.name}px;line-height:0.9;margin:0;font-weight:900;letter-spacing:-0.03em;color:#ffffff;text-transform:uppercase;">${escape(headline)}</h1>
      <p style="font-family:${FONT_STACK_HEAD};font-weight:700;font-style:italic;font-size:${t.tagline}px;line-height:1.25;margin:${Math.round(t.name * 0.25)}px 0 0;color:${gold};">${escape(subline)}</p>
    </div>
    <div style="position:absolute;left:${pad}px;bottom:${Math.round(h * 0.12)}px;z-index:3;display:flex;gap:${Math.max(6, Math.round(8 * s))}px;flex-wrap:wrap;">${badges}</div>
    ${d.qrValue ? `<div style="position:absolute;right:${pad}px;bottom:${Math.round(h * 0.12)}px;z-index:3;">${qrCard(d, s, { size: Math.max(50, Math.round(64 * s)), bg: "#000000", fg: gold, label: `Scan · ${(d.cta || "Order Ahead").toUpperCase()}` })}</div>` : ""}
    <div style="position:absolute;left:0;right:0;bottom:0;background:${gold};padding:${Math.max(6, Math.round(8 * s))}px ${pad}px;display:flex;justify-content:space-between;align-items:center;color:#000000;font-family:${FONT_STACK_MONO};font-weight:600;font-size:${Math.max(10, Math.round(t.phone * 0.78))}px;letter-spacing:0.1em;z-index:3;">
      <span>${escape(d.phone || "")}</span>
      <span style="text-transform:uppercase;">${escape(d.city || "Local")}${d.address ? ` · ${escape(d.address)}` : ""}</span>
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
