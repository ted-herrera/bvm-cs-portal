import type { ClientProfile } from "./pipeline";

// ─── LOCKED — verbatim copy from bvm-studio-app/app/studio-v2/page.tsx ────────
// Do not modify: PHOTO_MAP, getPhotoUrl, classifyBusiness

const PHOTO_MAP: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=85&fit=crop",
  taco:       "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=85&fit=crop",
  pizza:      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=85&fit=crop",
  burger:     "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=85&fit=crop",
  cafe:       "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=85&fit=crop",
  coffee:     "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=85&fit=crop",
  bakery:     "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=85&fit=crop",
  dessert:    "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=1200&q=85&fit=crop",
  icecream:   "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=1200&q=85&fit=crop",
  bar:        "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=85&fit=crop",
  sushi:      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&q=85&fit=crop",
  dental:     "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&q=85&fit=crop",
  salon:      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=85&fit=crop",
  spa:        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=85&fit=crop",
  fitness:    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=85&fit=crop",
  gym:        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=85&fit=crop",
  medical:    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=85&fit=crop",
  legal:      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=85&fit=crop",
  financial:  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=85&fit=crop",
  realestate: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=85&fit=crop",
  roofing:    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85&fit=crop",
  plumbing:   "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85&fit=crop",
  hvac:       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85&fit=crop",
  landscaping:"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=85&fit=crop",
  retail:     "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=85&fit=crop",
  boutique:   "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=85&fit=crop",
  automotive: "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=1200&q=85&fit=crop",
  tech:       "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=85&fit=crop",
  default:    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=85&fit=crop",
  bank:       "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=1200&q=85&fit=crop",
  credit:     "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=1200&q=85&fit=crop",
  mortgage:   "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=85&fit=crop",
  insurance:  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=85&fit=crop",
  accounting: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=85&fit=crop",
  investment: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=85&fit=crop",
};

export function getPhotoUrl(classifiedType: string): string {
  const key = classifiedType === "construction" ? "roofing"
            : classifiedType === "icecream"      ? "dessert"
            : classifiedType;
  return PHOTO_MAP[key] || PHOTO_MAP.default;
}

export function classifyBusiness(answer: string): string {
  const a = answer.toLowerCase();
  if (a.match(/taco|burrito|mexican|tex.?mex/)) return "taco";
  if (a.match(/pizza|italian/)) return "pizza";
  if (a.match(/burger|sandwich/)) return "burger";
  if (a.match(/drink|cocktail|bar|beer|wine|brewery|spirits/)) return "bar";
  if (a.match(/coffee|cafe|espresso/)) return "cafe";
  if (a.match(/cookie|biscuit/)) return "bakery";
  if (a.match(/cupcake|muffin/)) return "dessert";
  if (a.match(/handmade|artisan|homemade/) && a.match(/food|bak|cook|sweet/)) return "bakery";
  if (a.match(/ice.?cream|gelato|dessert|sweet|candy|cupcake|cake|bakery|pastry/)) return "dessert";
  if (a.match(/sushi|japanese|ramen|asian/)) return "sushi";
  if (a.match(/hair|salon|beauty|nail|spa|styling/)) return "salon";
  if (a.match(/dent|teeth|orthodont/)) return "dental";
  if (a.match(/gym|fitness|yoga|workout|training/)) return "fitness";
  if (a.match(/doctor|medical|clinic|health|urgent/)) return "medical";
  if (a.match(/law|legal|attorney|lawyer/)) return "legal";
  if (a.match(/real.?estate|realtor|property|home/)) return "realestate";
  if (a.match(/roof|plumb|hvac|electric|contrac/)) return "construction";
  if (a.match(/car|auto|vehicle|mechanic|tire/)) return "automotive";
  if (a.match(/computer|tech|repair|software/)) return "tech";
  if (a.match(/retail|shop|store|boutique|cloth/)) return "retail";
  if (a.match(/restaurant|food|eat|dine|cuisine/)) return "restaurant";
  if (a.match(/self.?defense|martial.?arts|karate|judo|taekwondo|boxing/)) return "fitness";
  if (a.match(/teach|tutor|lessons|coach/)) return "fitness";
  if (a.match(/dance|ballet|pilates|crossfit|barre/)) return "fitness";
  if (a.match(/bank|banking|credit.?union|savings/)) return "bank";
  if (a.match(/mortgage|loan|lending/)) return "mortgage";
  if (a.match(/insurance|insure/)) return "insurance";
  if (a.match(/accountant|accounting|bookkeep|cpa|tax/)) return "accounting";
  if (a.match(/invest|wealth|portfolio|advisor|financial/)) return "financial";
  return "default";
}

// ─── BVM Source Templates ────────────────────────────────────────────────────

const PHOTO_KEYS = Object.keys(PHOTO_MAP);

function getPhotoVariant(baseType: string, offset: number): string {
  const idx = PHOTO_KEYS.indexOf(baseType);
  if (idx < 0) return PHOTO_MAP.default;
  const newIdx = (idx + offset) % PHOTO_KEYS.length;
  return PHOTO_MAP[PHOTO_KEYS[newIdx]] || PHOTO_MAP.default;
}

function getServicePhoto(serviceName: string): string {
  const key = classifyBusiness(serviceName);
  return getPhotoUrl(key);
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant", taco: "Mexican Restaurant", pizza: "Pizza Restaurant",
  burger: "Burger Joint", cafe: "Café", bakery: "Bakery", dessert: "Dessert Shop",
  bar: "Bar & Grill", sushi: "Japanese Restaurant", dental: "Dental Practice",
  salon: "Beauty Salon", spa: "Wellness Spa", fitness: "Fitness Center",
  gym: "Gym", medical: "Medical Practice", legal: "Law Firm",
  financial: "Financial Services", realestate: "Real Estate", roofing: "Roofing Company",
  construction: "Construction", automotive: "Auto Service", tech: "Technology",
  retail: "Retail Store", default: "Local Business", bank: "Banking",
  mortgage: "Mortgage", insurance: "Insurance", accounting: "Accounting",
};

// ─── Template Engine ────────────────────────────────────────────────────────

const LOOK_VARS = {
  warm_bold: { accent: "#c2692a", navy: "#243454", fontDisplay: "'Playfair Display',serif", heroOverlay: "rgba(44,24,16,0.82)" },
  professional: { accent: "#185fa5", navy: "#243454", fontDisplay: "'Inter',sans-serif", heroOverlay: "rgba(24,95,165,0.75)" },
  bold_modern: { accent: "#2563eb", navy: "#0d1a2e", fontDisplay: "'DM Sans',sans-serif", heroOverlay: "rgba(13,26,46,0.88)" },
} as const;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildTemplate(vars: typeof LOOK_VARS[keyof typeof LOOK_VARS], isPremier: boolean): string {
  const premierExtras = isPremier ? `
<style>@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes goldPulse{0%{box-shadow:0 4px 20px rgba(245,200,66,0.3)}50%{box-shadow:0 4px 32px rgba(245,200,66,0.7)}100%{box-shadow:0 4px 20px rgba(245,200,66,0.3)}}</style>
<div style="position:fixed;bottom:60px;left:0;right:0;background:#0d1a2e;padding:14px 0;overflow:hidden;z-index:50;border-top:1px solid rgba(255,255,255,0.1)"><div style="display:inline-flex;gap:48px;white-space:nowrap;animation:ticker 30s linear infinite;color:rgba(255,255,255,0.8);font-size:13px">&#11088;&#11088;&#11088;&#11088;&#11088; Best {{BUSINESS_TYPE_LABEL}} in {{CITY}}! — Google Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; {{BUSINESS_NAME}} never disappoints — Yelp Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; My go-to in {{CITY}} — Google Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; Outstanding service every time — Facebook Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; Highly recommend — Google Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; Best {{BUSINESS_TYPE_LABEL}} in {{CITY}}! — Google Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; {{BUSINESS_NAME}} never disappoints — Yelp Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; My go-to in {{CITY}} — Google Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; Outstanding service every time — Facebook Review &nbsp;&middot;&nbsp; &#11088;&#11088;&#11088;&#11088;&#11088; Highly recommend — Google Review</div></div>
<div style="position:fixed;bottom:0;right:0;z-index:100;padding:16px"><button onclick="navigator.clipboard.writeText('Check out {{BUSINESS_NAME}}! {{PUBLISHED_URL}} #{{CITY_SLUG}} #localbusiness').then(function(){this.textContent='Copied!';setTimeout(function(){this.textContent='Share Your Site \\u2192'}.bind(this),2000)}.bind(this))" style="background:#F5C842;color:#0d1a2e;border:none;border-radius:50px;padding:12px 20px;font-weight:800;font-size:14px;cursor:pointer;animation:goldPulse 2s ease-in-out infinite">Share Your Site &#8594;</button></div>
<script>
document.addEventListener('DOMContentLoaded',function(){
var hero=document.querySelector('.block-hero');
if(hero){var b=document.createElement('div');b.innerHTML='&#128081; Featured Local Business \\u00b7 {{CITY}} \\u00b7 {{YEAR}}';b.style.cssText='position:absolute;top:24px;right:24px;background:#F5C842;color:#0d1a2e;padding:8px 16px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;z-index:10';hero.appendChild(b);}
var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){var el=e.target;var t=parseInt(el.getAttribute('data-target')||'0');var s=0;var step=Math.max(t/60,1);var timer=setInterval(function(){s+=step;if(s>=t){el.textContent=t+'+';clearInterval(timer);}else{el.textContent=Math.floor(s)+'';}},25);obs.unobserve(el);}});},{threshold:0.3});
document.querySelectorAll('.stat-counter').forEach(function(el){obs.observe(el);});
});
<\/script>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{BUSINESS_NAME}} — {{CITY}}</title>
<meta name="description" content="{{GEO_COPY}}">
<meta property="og:title" content="{{BUSINESS_NAME}}">
<meta property="og:description" content="{{GEO_COPY}}">
<link rel="canonical" href="{{PUBLISHED_URL}}">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Lato:wght@300;400;700&family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;700;900&display=swap" rel="stylesheet">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"{{BUSINESS_NAME}}","address":{"@type":"PostalAddress","addressLocality":"{{CITY}}","postalCode":"{{ZIP}}"},"telephone":"{{PHONE}}"}<\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--accent:${vars.accent};--navy:${vars.navy};--font-display:${vars.fontDisplay};--hero-overlay:${vars.heroOverlay}}
body{font-family:'Lato',sans-serif;color:#1a1a1a;background:#fff;overflow-x:hidden}
.header-top-nav{background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:100}
.header-top-nav nav{max-width:1200px;margin:0 auto;padding:0 40px;height:72px;display:flex;align-items:center;justify-content:space-between}
.logo-wrapper{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--navy)}
.nav-menu{display:flex;gap:32px;list-style:none}.nav-menu a{font-size:14px;color:#333;text-decoration:none;font-weight:500}.nav-menu a:hover{color:var(--accent)}
.cta-button{background:var(--accent);color:#fff;padding:10px 24px;border-radius:4px;font-weight:700;text-decoration:none;font-size:14px}
.block-hero{padding:80px 40px 96px;background:var(--navy);position:relative;overflow:hidden}
.block-hero .container{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.hero-media-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hero-media-grid .col-full{grid-column:1/-1}.hero-media-grid img{width:100%;height:200px;object-fit:cover;border-radius:8px}.hero-media-grid .col-full img{height:240px}
.hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.15em;color:var(--accent);text-transform:uppercase;margin-bottom:16px}
.hero-title{font-family:var(--font-display);font-size:52px;font-weight:900;color:#fff;line-height:1.05;letter-spacing:-1px;margin-bottom:20px}
.hero-subtitle{font-size:18px;color:rgba(255,255,255,0.65);line-height:1.75;margin-bottom:48px;max-width:480px}
.hero-cta{display:inline-block;background:#fff;color:var(--navy);padding:16px 44px;border-radius:999px;font-size:16px;font-weight:800;text-decoration:none;box-shadow:0 4px 24px rgba(0,0,0,0.3)}
.block-brand-repeat{position:relative;min-height:420px;display:flex;align-items:center;overflow:hidden}.brand-bg{position:absolute;inset:0}.brand-bg img{width:100%;height:100%;object-fit:cover}.brand-overlay{position:absolute;inset:0;background:var(--hero-overlay)}.brand-content{position:relative;max-width:1200px;margin:0 auto;padding:80px 40px;text-align:center;width:100%}.brand-content p{font-size:11px;font-weight:700;letter-spacing:0.15em;color:var(--accent);text-transform:uppercase;margin-bottom:16px}.brand-content h2{font-family:var(--font-display);font-size:42px;font-weight:700;color:#fff;line-height:1.2;max-width:800px;margin:0 auto}
.block-services{padding:80px 40px;background:#fff}.block-services .container{max-width:1200px;margin:0 auto}.services-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.15em;color:var(--accent);text-transform:uppercase;margin-bottom:12px;text-align:center}.block-services h2{font-family:var(--font-display);font-size:38px;font-weight:700;color:var(--navy);text-align:center;margin-bottom:56px;letter-spacing:-0.5px}.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}.service-card img{width:100%;height:220px;object-fit:cover;border-radius:8px;margin-bottom:20px;background:#f1f5f9}.service-card h3{font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--navy);margin-bottom:12px;line-height:1.3}.service-card p{font-size:14px;color:#6b7280;line-height:1.75}.services-cta{text-align:center;margin-top:48px}.services-cta a{display:inline-block;background:var(--navy);color:#fff;padding:14px 40px;border-radius:999px;font-size:15px;font-weight:800;text-decoration:none}
.block-stats{background:var(--navy);padding:80px 40px}.block-stats .container{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}.stats-content h2{font-family:var(--font-display);font-size:38px;font-weight:700;color:#fff;margin-bottom:16px}.stats-content p{font-size:16px;color:rgba(255,255,255,0.55);line-height:1.75;margin-bottom:32px}.stats-content a{display:inline-block;background:var(--accent);color:#fff;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:800;text-decoration:none}.stats-numbers{display:grid;grid-template-columns:repeat(3,1fr);gap:0}.stats-item{text-align:center;border-right:1px solid rgba(255,255,255,0.1);padding:0 24px}.stats-item:last-child{border-right:none}.stats-item .value{font-family:var(--font-display);font-size:50px;font-weight:900;color:#fff;letter-spacing:-2px;line-height:1}.stats-item .sufix{font-family:var(--font-display);font-size:28px;font-weight:900;color:var(--accent)}.stats-item p{font-size:12px;color:rgba(255,255,255,0.45);margin-top:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase}
.block-contact{background:var(--accent);padding:80px 40px;text-align:center}.block-contact .container{max-width:800px;margin:0 auto}.contact-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.15em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:12px}.contact-title{font-family:var(--font-display);font-size:42px;font-weight:700;color:#fff;margin-bottom:16px}.contact-sub{font-size:18px;color:rgba(255,255,255,0.85);margin-bottom:40px}.contact-details{display:flex;justify-content:center;gap:48px;margin-bottom:40px;flex-wrap:wrap}.contact-details span{font-size:16px;color:#fff}.contact-details a{color:#fff;text-decoration:none;font-weight:700}.contact-btn{display:inline-block;background:#fff;color:var(--accent);padding:16px 40px;border-radius:999px;font-weight:800;text-decoration:none;font-size:18px}.google-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);border-radius:6px;padding:8px 16px;margin-top:24px}.google-badge span{font-size:13px;color:#fff;font-weight:600}.social-links{display:flex;justify-content:center;gap:24px;margin-top:20px}.social-links a{color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;text-decoration:none}
footer{background:#111c2e;padding:40px}.footer-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:32px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06)}.footer-brand{font-family:var(--font-display);color:var(--accent);font-size:18px;font-weight:700}.footer-address{color:rgba(255,255,255,0.3);font-size:12px;text-align:center}.footer-bottom{max-width:1200px;margin:20px auto 0;display:flex;justify-content:space-between;align-items:center}.footer-copy{color:rgba(255,255,255,0.2);font-size:11px}.footer-bruno{color:rgba(255,255,255,0.2);font-size:11px;font-style:italic}
@media(max-width:768px){.block-hero .container{grid-template-columns:1fr}.hero-media-grid{display:none}.hero-title{font-size:36px}.services-grid{grid-template-columns:1fr}.block-stats .container{grid-template-columns:1fr}.stats-numbers{grid-template-columns:1fr}.stats-item{border-right:none;border-bottom:1px solid rgba(255,255,255,0.1);padding:20px 0}.footer-inner{grid-template-columns:1fr;text-align:center}.nav-menu{display:none}}
</style>
</head>
<body>
<div class="header-top-nav"><nav><div class="logo-wrapper">{{BUSINESS_NAME}}</div><ul class="nav-menu"><li><a href="#services">Services</a></li><li><a href="#about">About</a></li><li><a href="#contact">Contact</a></li></ul><a href="tel:{{PHONE_DIGITS}}" class="cta-button">{{CTA}}</a></nav></div>
<div class="block-hero"><div class="container"><div class="hero-media-grid"><div class="col-full"><img src="{{HERO_IMAGE}}" alt="{{BUSINESS_NAME}}" referrerpolicy="no-referrer" onerror="this.parentElement.style.background='var(--navy)'"></div><img src="{{HERO_IMAGE_2}}" alt="{{SERVICE_1}}" referrerpolicy="no-referrer" onerror="this.style.display='none'"><img src="{{HERO_IMAGE_3}}" alt="{{SERVICE_2}}" referrerpolicy="no-referrer" onerror="this.style.display='none'"></div><div><div class="hero-eyebrow">{{CITY}} &middot; {{BUSINESS_TYPE_LABEL}}</div><h1 class="hero-title">{{HEADLINE}}</h1><p class="hero-subtitle">{{GEO_COPY}}</p><a href="tel:{{PHONE_DIGITS}}" class="hero-cta">{{CTA}} &rarr;</a></div></div></div>
<div class="block-brand-repeat"><div class="brand-bg"><img src="{{HERO_IMAGE}}" alt="" referrerpolicy="no-referrer"></div><div class="brand-overlay"></div><div class="brand-content"><p>Your Brand On Repeat</p><h2>{{LOCAL_ADVANTAGE}}</h2></div></div>
<div class="block-services" id="services"><div class="container"><div class="services-eyebrow">What We Offer</div><h2>Our Services</h2><div class="services-grid"><div class="service-card"><img src="{{SERVICE_IMAGE_1}}" alt="{{SERVICE_1}}" referrerpolicy="no-referrer" onerror="this.style.opacity='0'"><h3>{{SERVICE_1}}</h3><p>{{SERVICE_DESC_1}}</p></div><div class="service-card"><img src="{{SERVICE_IMAGE_2}}" alt="{{SERVICE_2}}" referrerpolicy="no-referrer" onerror="this.style.opacity='0'"><h3>{{SERVICE_2}}</h3><p>{{SERVICE_DESC_2}}</p></div><div class="service-card"><img src="{{SERVICE_IMAGE_3}}" alt="{{SERVICE_3}}" referrerpolicy="no-referrer" onerror="this.style.opacity='0'"><h3>{{SERVICE_3}}</h3><p>{{SERVICE_DESC_3}}</p></div></div><div class="services-cta"><a href="tel:{{PHONE_DIGITS}}">{{CTA}} &rarr;</a></div></div></div>
<div class="block-stats" id="about"><div class="container"><div class="stats-content"><h2>Serving {{CITY}} with Pride</h2><p>{{MARKET_INSIGHT}}</p><a href="tel:{{PHONE_DIGITS}}">{{CTA}} &rarr;</a></div><div class="stats-numbers"><div class="stats-item"><div><span class="value stat-counter" data-target="{{STAT_1_VAL}}">{{STAT_1_VAL}}</span><span class="sufix">+</span></div><p>{{STAT_1_LABEL}}</p></div><div class="stats-item"><div><span class="value stat-counter" data-target="{{STAT_2_VAL}}">{{STAT_2_VAL}}</span><span class="sufix">+</span></div><p>{{STAT_2_LABEL}}</p></div><div class="stats-item"><div><span class="value">4.9</span><span class="sufix">&#9733;</span></div><p>Customer Rating</p></div></div></div></div>
<div class="block-contact" id="contact"><div class="container"><p class="contact-eyebrow">Get In Touch</p><h2 class="contact-title">Ready to Get Started?</h2><p class="contact-sub">{{CITY}} is waiting. So are we.</p><div class="contact-details"><span>&#128222; <a href="tel:{{PHONE_DIGITS}}">{{PHONE}}</a></span>{{ADDRESS_LINE}}</div><a href="tel:{{PHONE_DIGITS}}" class="contact-btn">{{CTA}} &rarr;</a><div><div class="google-badge">&#127760; <span>Google Business Profile Optimized</span></div></div><div class="social-links"><a href="#">&#128216; Facebook</a><a href="#">&#128248; Instagram</a><a href="#">&#11088; Yelp</a></div></div></div>
<footer><div class="footer-inner"><span class="footer-brand">{{BUSINESS_NAME}}</span><span class="footer-address">{{CITY}}, {{ZIP}}</span><span class="footer-bruno">Made by Bruno</span></div><div class="footer-bottom"><span class="footer-copy">&copy; {{YEAR}} {{BUSINESS_NAME}} &middot; {{CITY}} &middot; Built with BVM Studio</span></div></footer>
${premierExtras}
</body>
</html>`;
}

// ─── Main generation ────────────────────────────────────────────────────────

export function generateSiteHTML(profile: ClientProfile, lookKey: "warm_bold" | "professional" | "bold_modern"): string {
  const vars = LOOK_VARS[lookKey] || LOOK_VARS.professional;
  const isPremier = lookKey === "bold_modern";
  let html = buildTemplate(vars, isPremier);

  const sbr = profile.sbrData as Record<string, unknown> | null;
  const bt = classifyBusiness(profile.business_name + " " + (profile.intakeAnswers?.q2 || ""));
  const city = profile.city || "Your City";
  const services = profile.intakeAnswers?.q3?.split(",").map((s) => s.trim()) || [];
  const s1 = services[0] || "Our Service";
  const s2 = services[1] || "Custom Solutions";
  const s3 = services[2] || "Expert Care";
  const cta = profile.intakeAnswers?.q4 || "Contact Us";
  const phone = profile.phone || "(555) 000-0000";
  const phoneDigits = phone.replace(/\D/g, "") || "5550000000";
  const address = profile.intakeAnswers?.q7?.replace(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}[,\s]*/g, "").trim() || "";
  const headline = (sbr?.campaignHeadline as string) || (sbr?.tagline as string) || (sbr?.suggestedTagline as string) || (sbr?.taglineSuggestions as string[])?.[0] || (profile.business_name + " — " + city);
  const geoCopy = (sbr?.geoCopyBlock as string) || "Proudly serving " + city + " with excellence and care.";
  const localAdvantage = (sbr?.localAdvantage as string) || "We know how difficult it is for local businesses to stand out in " + city + ".";
  const marketInsight = (sbr?.marketInsight as string) || "Proudly serving " + city + " and the surrounding community for years.";
  const stat1 = (sbr?.yearsServing as string)?.replace(/[^0-9]/g, "") || "12";
  const stat2 = (sbr?.happyClients as string)?.replace(/[^0-9]/g, "") || "500";
  const svcDescs = sbr?.services as Array<{ name: string; description: string }> | undefined;
  const sd1 = svcDescs?.[0]?.description || s1 + " — precision-built for " + city + " clients.";
  const sd2 = svcDescs?.[1]?.description || s2 + " delivered on time, every time.";
  const sd3 = svcDescs?.[2]?.description || s3 + " — the " + city + " standard.";

  const slots: Record<string, string> = {
    BUSINESS_NAME: esc(profile.business_name),
    CITY: esc(city),
    ZIP: esc(profile.zip || ""),
    PHONE: esc(phone),
    PHONE_DIGITS: phoneDigits,
    CTA: esc(cta),
    HEADLINE: esc(String(headline).slice(0, 80)),
    GEO_COPY: esc(geoCopy),
    LOCAL_ADVANTAGE: esc(localAdvantage),
    MARKET_INSIGHT: esc(marketInsight),
    HERO_IMAGE: getPhotoUrl(bt),
    HERO_IMAGE_2: getPhotoVariant(bt, 1),
    HERO_IMAGE_3: getPhotoVariant(bt, 2),
    SERVICE_1: esc(s1),
    SERVICE_2: esc(s2),
    SERVICE_3: esc(s3),
    SERVICE_DESC_1: esc(sd1),
    SERVICE_DESC_2: esc(sd2),
    SERVICE_DESC_3: esc(sd3),
    SERVICE_IMAGE_1: getServicePhoto(s1),
    SERVICE_IMAGE_2: getServicePhoto(s2),
    SERVICE_IMAGE_3: getServicePhoto(s3),
    BUSINESS_TYPE_LABEL: BUSINESS_TYPE_LABELS[bt] || "Local Business",
    STAT_1_VAL: stat1,
    STAT_1_LABEL: "Years Serving " + esc(city),
    STAT_2_VAL: stat2,
    STAT_2_LABEL: "Happy Customers",
    ADDRESS_LINE: address ? "<span>&#128205; " + esc(address) + "</span>" : "",
    YEAR: String(new Date().getFullYear()),
    PUBLISHED_URL: profile.published_url || "",
    CITY_SLUG: city.toLowerCase().replace(/\s+/g, ""),
  };

  for (const [key, val] of Object.entries(slots)) {
    html = html.split("{{" + key + "}}").join(val);
  }

  return html;
}

export function generateTearSheetPreview(profile: ClientProfile, lookKey: string): string {
  const validKey = (["warm_bold", "professional", "bold_modern"].includes(lookKey) ? lookKey : "professional") as "warm_bold" | "professional" | "bold_modern";
  const html = generateSiteHTML(profile, validKey);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0}</style></head><body><div style="transform:scale(0.38);transform-origin:top left;width:263%;pointer-events:none">${html.replace(/<!DOCTYPE html>/g, "")}</div></body></html>`;
}
