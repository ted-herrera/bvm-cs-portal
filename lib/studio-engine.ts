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

// ─── Templates — verbatim from bvm-studio-app/app/studio-v2/page.tsx ─────────

const TEMPLATE_WARM_BOLD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{business_name}}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"{{business_name}}","address":{"@type":"PostalAddress","addressLocality":"{{city}}","postalCode":"{{zip}}"},"telephone":"{{phone}}"}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Lato',sans-serif;color:#1a1a1a;background:#fff}
nav{background:#0d1a2e;padding:16px 32px;display:flex;justify-content:space-between;align-items:center}
.nav-logo{font-family:'Playfair Display',serif;color:#F5C842;font-size:22px;font-weight:700}
.nav-cta{background:#F5C842;color:#0d1a2e;padding:10px 24px;border-radius:6px;font-weight:700;text-decoration:none;font-size:14px}
.hero{position:relative;height:520px;overflow:hidden;background:#111}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(13,26,46,.85) 0%,rgba(13,26,46,.3) 60%,transparent 100%)}
.hero-content{position:absolute;bottom:48px;left:48px;right:48px}
.hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.15em;color:#F5C842;text-transform:uppercase;margin-bottom:12px}
.hero-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:16px}
.hero-subtitle{font-size:18px;color:rgba(255,255,255,.85);margin-bottom:28px;font-weight:300}
.hero-btn{display:inline-block;background:#F5C842;color:#0d1a2e;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px}
.services{padding:72px 48px;background:#fff}
.section-eyebrow{font-size:11px;font-weight:700;letter-spacing:.15em;color:#c2692a;text-transform:uppercase;margin-bottom:12px;text-align:center}
.section-title{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;color:#0d1a2e;text-align:center;margin-bottom:48px}
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.service-card{background:#fff;border:1px solid #f0e8e0;border-top:4px solid #c2692a;border-radius:8px;padding:32px 24px;box-shadow:0 2px 12px rgba(194,105,42,.08)}
.service-icon{font-size:32px;margin-bottom:16px}
.service-name{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#0d1a2e;margin-bottom:8px}
.service-desc{font-size:14px;color:#64748b;line-height:1.6}
.about{background:#0d1a2e;padding:72px 48px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.about-eyebrow{font-size:11px;font-weight:700;letter-spacing:.15em;color:#F5C842;text-transform:uppercase;margin-bottom:12px}
.about-title{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;color:#fff;margin-bottom:20px}
.about-text{font-size:16px;color:rgba(255,255,255,.75);line-height:1.8}
.about-stat{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;color:#F5C842}
.about-stat-label{font-size:14px;color:rgba(255,255,255,.6);margin-top:4px}
.contact{background:#c2692a;padding:72px 48px;text-align:center}
.contact-title{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;color:#fff;margin-bottom:16px}
.contact-sub{font-size:18px;color:rgba(255,255,255,.85);margin-bottom:32px}
.contact-details{display:flex;justify-content:center;gap:48px;margin-bottom:32px;flex-wrap:wrap}
.contact-item{font-size:16px;color:#fff}
.contact-item a{color:#fff;text-decoration:none;font-weight:700}
.contact-btn{display:inline-block;background:#F5C842;color:#0d1a2e;padding:16px 40px;border-radius:8px;font-weight:700;text-decoration:none;font-size:18px}
footer{background:#0d1a2e;padding:24px 48px;display:flex;justify-content:space-between;align-items:center}
.footer-name{font-family:'Playfair Display',serif;color:#F5C842;font-size:16px;font-weight:700}
.footer-copy{color:rgba(255,255,255,.4);font-size:12px}
.google-badge{display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:6px;padding:6px 12px;margin-top:16px}
.google-badge span{font-size:12px;color:#0d1a2e;font-weight:600}
</style>
</head>
<body>
<nav><span class="nav-logo">{{business_name}}</span><a href="{{cta_link}}" class="nav-cta">{{cta_text}}</a></nav>
<div class="hero">
<img src="{{image_url}}" alt="{{business_name}}" />
<div class="hero-overlay"></div>
<div class="hero-content">
<div class="hero-eyebrow">{{city}} &middot; Est. Local</div>
<h1 class="hero-title">{{tagline}}</h1>
<p class="hero-subtitle">Proudly serving {{city}} &mdash; built for your community.</p>
<a href="{{cta_link}}" class="hero-btn">{{cta_text}} &rarr;</a>
</div>
</div>
<div class="services">
<div class="section-eyebrow">What We Offer</div>
<h2 class="section-title">Our Services</h2>
<div class="services-grid">
<div class="service-card"><div class="service-icon">&#9733;</div><div class="service-name">{{service_1}}</div><div class="service-desc">Professional {{service_1}} for every client in {{city}}.</div></div>
<div class="service-card"><div class="service-icon">&#9889;</div><div class="service-name">{{service_2}}</div><div class="service-desc">{{service_2}} delivered with care and expertise.</div></div>
<div class="service-card"><div class="service-icon">&#10024;</div><div class="service-name">{{service_3}}</div><div class="service-desc">{{service_3}} &mdash; trusted by the {{city}} community.</div></div>
</div>
</div>
<div class="about">
<div>
<div class="about-eyebrow">About Us</div>
<h2 class="about-title">Serving {{city}} with Pride</h2>
<p class="about-text">{{about_text}}</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
<div><div class="about-stat">{{stat_1}}</div><div class="about-stat-label">Years in {{city}}</div></div>
<div><div class="about-stat">{{stat_2}}</div><div class="about-stat-label">Happy Clients</div></div>
<div><div class="about-stat">{{stat_3}}</div><div class="about-stat-label">Star Rating</div></div>
<div><div class="about-stat">24/7</div><div class="about-stat-label">Support</div></div>
</div>
</div>
<div class="contact">
<h2 class="contact-title">Ready to Get Started?</h2>
<p class="contact-sub">{{city}} is waiting. So are we.</p>
<div class="contact-details">
<div class="contact-item">&#128222; <a href="tel:{{phone_digits}}">{{phone}}</a></div>
<div class="contact-item">&#128205; {{address}}</div>
</div>
<a href="{{cta_link}}" class="contact-btn">{{cta_text}} &rarr;</a>
<div><div class="google-badge">&#127760; <span>Google Business Profile Optimized</span></div></div>
</div>
<footer><span class="footer-name">{{business_name}}</span><span class="footer-copy">&copy; 2026 {{business_name}} &middot; {{city}} &middot; Built with BVM Studio</span></footer>
</body>
</html>`;

const TEMPLATE_PROFESSIONAL = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{business_name}}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"{{business_name}}","address":{"@type":"PostalAddress","addressLocality":"{{city}}","postalCode":"{{zip}}"},"telephone":"{{phone}}"}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;color:#1e293b;background:#fff}
nav{background:#fff;padding:20px 48px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:100}
.nav-logo{font-size:20px;font-weight:800;color:#243454;letter-spacing:-.5px}
.nav-cta{background:#243454;color:#fff;padding:10px 24px;border-radius:6px;font-weight:600;text-decoration:none;font-size:14px}
.hero{background:linear-gradient(135deg,#f8fafc 0%,#eef2f7 100%);padding:96px 48px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;min-height:520px}
.hero-eyebrow{font-size:12px;font-weight:600;letter-spacing:.12em;color:#243454;text-transform:uppercase;margin-bottom:16px;opacity:.6}
.hero-title{font-size:48px;font-weight:800;color:#243454;line-height:1.1;margin-bottom:20px;letter-spacing:-1px}
.hero-subtitle{font-size:18px;color:#64748b;margin-bottom:32px;line-height:1.6;font-weight:300}
.hero-btn{display:inline-block;background:#243454;color:#fff;padding:14px 32px;border-radius:8px;font-weight:600;text-decoration:none;font-size:16px}
.hero-image{border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(36,52,84,.15)}
.hero-image img{width:100%;height:400px;object-fit:cover;display:block}
.services{padding:80px 48px;background:#fff}
.section-label{font-size:12px;font-weight:600;letter-spacing:.12em;color:#243454;text-transform:uppercase;margin-bottom:8px;opacity:.5;text-align:center}
.section-title{font-size:36px;font-weight:800;color:#243454;text-align:center;margin-bottom:48px;letter-spacing:-.5px}
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.service-card{background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid #243454;border-radius:10px;padding:32px 24px}
.service-icon{font-size:28px;margin-bottom:16px}
.service-name{font-size:18px;font-weight:700;color:#243454;margin-bottom:8px}
.service-desc{font-size:14px;color:#64748b;line-height:1.6}
.about{background:#f8fafc;padding:80px 48px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.about-label{font-size:12px;font-weight:600;letter-spacing:.12em;color:#243454;text-transform:uppercase;margin-bottom:12px;opacity:.5}
.about-title{font-size:36px;font-weight:800;color:#243454;margin-bottom:20px;letter-spacing:-.5px}
.about-text{font-size:16px;color:#475569;line-height:1.8}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;text-align:center}
.stat-num{font-size:40px;font-weight:800;color:#243454;letter-spacing:-1px}
.stat-label{font-size:12px;color:#64748b;margin-top:4px;font-weight:500}
.contact{background:#243454;padding:80px 48px;text-align:center}
.contact-title{font-size:36px;font-weight:800;color:#fff;margin-bottom:12px;letter-spacing:-.5px}
.contact-sub{font-size:18px;color:rgba(255,255,255,.7);margin-bottom:40px}
.contact-details{display:flex;justify-content:center;gap:48px;margin-bottom:40px;flex-wrap:wrap}
.contact-item{font-size:16px;color:rgba(255,255,255,.85)}
.contact-item a{color:#fff;text-decoration:none;font-weight:600}
.contact-btn{display:inline-block;background:#fff;color:#243454;padding:16px 40px;border-radius:8px;font-weight:700;text-decoration:none;font-size:18px}
.google-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border-radius:6px;padding:8px 16px;margin-top:20px}
.google-badge span{font-size:12px;color:rgba(255,255,255,.8);font-weight:500}
footer{background:#1a2740;padding:24px 48px;display:flex;justify-content:space-between;align-items:center}
.footer-name{font-size:16px;font-weight:700;color:#fff}
.footer-copy{font-size:12px;color:rgba(255,255,255,.35)}
</style>
</head>
<body>
<nav><span class="nav-logo">{{business_name}}</span><a href="{{cta_link}}" class="nav-cta">{{cta_text}}</a></nav>
<div class="hero">
<div>
<div class="hero-eyebrow">{{city}} &middot; {{zip}}</div>
<h1 class="hero-title">{{tagline}}</h1>
<p class="hero-subtitle">Serving {{city}} with excellence. Professional. Reliable. Local.</p>
<a href="{{cta_link}}" class="hero-btn">{{cta_text}} &rarr;</a>
</div>
<div class="hero-image"><img src="{{image_url}}" alt="{{business_name}}" /></div>
</div>
<div class="services">
<div class="section-label">What We Offer</div>
<h2 class="section-title">Our Services</h2>
<div class="services-grid">
<div class="service-card"><div class="service-icon">&#11088;</div><div class="service-name">{{service_1}}</div><div class="service-desc">Professional {{service_1}} for every client in {{city}}.</div></div>
<div class="service-card"><div class="service-icon">&#127942;</div><div class="service-name">{{service_2}}</div><div class="service-desc">{{service_2}} delivered with precision and care.</div></div>
<div class="service-card"><div class="service-icon">&#10024;</div><div class="service-name">{{service_3}}</div><div class="service-desc">{{service_3}} &mdash; our clients trust us to get it right.</div></div>
</div>
</div>
<div class="about">
<div>
<div class="about-label">About Us</div>
<h2 class="about-title">Serving {{city}} with Pride</h2>
<p class="about-text">{{about_text}}</p>
</div>
<div class="stats">
<div class="stat-card"><div class="stat-num">{{stat_1}}</div><div class="stat-label">Years Serving {{city}}</div></div>
<div class="stat-card"><div class="stat-num">{{stat_2}}</div><div class="stat-label">Happy Clients</div></div>
<div class="stat-card"><div class="stat-num">{{stat_3}}&#9733;</div><div class="stat-label">Average Rating</div></div>
<div class="stat-card"><div class="stat-num">24/7</div><div class="stat-label">Support Available</div></div>
</div>
</div>
<div class="contact">
<h2 class="contact-title">Ready to Get Started?</h2>
<p class="contact-sub">{{city}} is waiting.</p>
<div class="contact-details">
<div class="contact-item">&#128222; <a href="tel:{{phone_digits}}">{{phone}}</a></div>
<div class="contact-item">&#128205; {{address}}</div>
</div>
<a href="{{cta_link}}" class="contact-btn">{{cta_text}} &rarr;</a>
<div><div class="google-badge">&#127760; <span>Google Business Profile Optimized</span></div></div>
</div>
<footer><span class="footer-name">{{business_name}}</span><span class="footer-copy">&copy; 2026 &middot; {{city}} &middot; BVM Studio</span></footer>
</body>
</html>`;

const TEMPLATE_BOLD_MODERN = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{business_name}}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"{{business_name}}","address":{"@type":"PostalAddress","addressLocality":"{{city}}","postalCode":"{{zip}}"},"telephone":"{{phone}}"}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;color:#fff;background:#0d1a2e}
nav{background:#0d1a2e;padding:20px 48px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,.08)}
.nav-logo{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.5px}
.nav-logo span{color:#2563eb}
.nav-cta{background:#2563eb;color:#fff;padding:10px 24px;border-radius:6px;font-weight:700;text-decoration:none;font-size:14px}
.hero{position:relative;height:560px;overflow:hidden;background:#111}
.hero img{width:100%;height:100%;object-fit:cover;filter:brightness(.4);display:block}
.hero-content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 64px}
.hero-eyebrow{font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:.2em;color:#2563eb;text-transform:uppercase;margin-bottom:16px}
.hero-title{font-size:56px;font-weight:800;color:#fff;line-height:1.05;margin-bottom:20px;letter-spacing:-1.5px;max-width:700px}
.hero-subtitle{font-size:18px;color:rgba(255,255,255,.6);margin-bottom:36px;max-width:500px}
.hero-btn{display:inline-block;background:#2563eb;color:#fff;padding:16px 36px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;letter-spacing:-.3px}
.services{padding:80px 48px;background:#111827}
.section-mono{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.15em;color:#2563eb;text-transform:uppercase;margin-bottom:12px;text-align:center}
.section-title{font-size:36px;font-weight:800;color:#fff;text-align:center;margin-bottom:48px;letter-spacing:-.5px}
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.service-card{background:#1a2740;border:1px solid rgba(255,255,255,.06);border-top:3px solid #2563eb;border-radius:10px;padding:32px 24px}
.service-icon{font-size:28px;margin-bottom:16px}
.service-name{font-size:18px;font-weight:700;color:#fff;margin-bottom:8px}
.service-desc{font-size:14px;color:rgba(255,255,255,.5);line-height:1.6}
.about{background:#0d1a2e;padding:80px 48px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.about-mono{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.15em;color:#2563eb;text-transform:uppercase;margin-bottom:12px}
.about-title{font-size:36px;font-weight:800;color:#fff;margin-bottom:20px;letter-spacing:-.5px}
.about-text{font-size:16px;color:rgba(255,255,255,.6);line-height:1.8}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.stat-card{background:#111827;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:24px;text-align:center}
.stat-num{font-size:40px;font-weight:800;color:#2563eb;letter-spacing:-1px}
.stat-label{font-size:12px;color:rgba(255,255,255,.4);margin-top:4px}
.contact{background:#111827;padding:80px 48px;text-align:center}
.contact-title{font-size:36px;font-weight:800;color:#fff;margin-bottom:12px;letter-spacing:-.5px}
.contact-sub{font-size:18px;color:rgba(255,255,255,.5);margin-bottom:40px}
.contact-details{display:flex;justify-content:center;gap:48px;margin-bottom:40px;flex-wrap:wrap}
.contact-item{font-size:16px;color:rgba(255,255,255,.7)}
.contact-item a{color:#2563eb;text-decoration:none;font-weight:600}
.contact-btn{display:inline-block;background:#2563eb;color:#fff;padding:16px 40px;border-radius:8px;font-weight:700;text-decoration:none;font-size:18px}
.google-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border-radius:6px;padding:8px 16px;margin-top:20px;border:1px solid rgba(255,255,255,.1)}
.google-badge span{font-size:12px;color:rgba(255,255,255,.5);font-weight:500}
footer{background:#080f1a;padding:24px 48px;display:flex;justify-content:space-between;align-items:center}
.footer-name{font-size:16px;font-weight:700;color:#fff}
.footer-mono{font-family:'DM Mono',monospace;font-size:11px;color:rgba(255,255,255,.25)}
</style>
</head>
<body>
<nav><span class="nav-logo">{{business_name}}<span>.</span></span><a href="{{cta_link}}" class="nav-cta">{{cta_text}}</a></nav>
<div class="hero">
<img src="{{image_url}}" alt="{{business_name}}" />
<div class="hero-content">
<div class="hero-eyebrow">{{city}} &middot; {{zip}}</div>
<h1 class="hero-title">{{tagline}}</h1>
<p class="hero-subtitle">Built different. Serving {{city}} with intention.</p>
<a href="{{cta_link}}" class="hero-btn">{{cta_text}} &rarr;</a>
</div>
</div>
<div class="services">
<div class="section-mono">What We Offer</div>
<h2 class="section-title">Our Services</h2>
<div class="services-grid">
<div class="service-card"><div class="service-icon">&#9889;</div><div class="service-name">{{service_1}}</div><div class="service-desc">{{service_1}} &mdash; precision-built for {{city}} clients.</div></div>
<div class="service-card"><div class="service-icon">&#11088;</div><div class="service-name">{{service_2}}</div><div class="service-desc">{{service_2}} delivered on time, every time.</div></div>
<div class="service-card"><div class="service-icon">&#128293;</div><div class="service-name">{{service_3}}</div><div class="service-desc">{{service_3}} &mdash; the {{city}} standard.</div></div>
</div>
</div>
<div class="about">
<div>
<div class="about-mono">Our Story</div>
<h2 class="about-title">Built for {{city}}</h2>
<p class="about-text">{{about_text}}</p>
</div>
<div class="stats">
<div class="stat-card"><div class="stat-num">{{stat_1}}</div><div class="stat-label">Years in {{city}}</div></div>
<div class="stat-card"><div class="stat-num">{{stat_2}}</div><div class="stat-label">Clients Served</div></div>
<div class="stat-card"><div class="stat-num">{{stat_3}}&#9733;</div><div class="stat-label">Google Rating</div></div>
<div class="stat-card"><div class="stat-num">24/7</div><div class="stat-label">Always Available</div></div>
</div>
</div>
<div class="contact">
<h2 class="contact-title">Let&apos;s go.</h2>
<p class="contact-sub">{{city}} is waiting. So are we.</p>
<div class="contact-details">
<div class="contact-item">&#128222; <a href="tel:{{phone_digits}}">{{phone}}</a></div>
<div class="contact-item">&#128205; {{address}}</div>
</div>
<a href="{{cta_link}}" class="contact-btn">{{cta_text}} &rarr;</a>
<div><div class="google-badge">&#127760; <span>Google Business Profile Optimized</span></div></div>
</div>
<footer><span class="footer-name">{{business_name}}</span><span class="footer-mono">&copy; 2026 &middot; {{city}} &middot; BVM Studio</span></footer>
</body>
</html>`;

const TEMPLATES: Record<string, string> = {
  warm_bold: TEMPLATE_WARM_BOLD,
  professional: TEMPLATE_PROFESSIONAL,
  bold_modern: TEMPLATE_BOLD_MODERN,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fillSlots(template: string, data: Record<string, string>): string {
  return Object.entries(data).reduce((html, [key, val]) => {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    return html.replace(re, val || "");
  }, template);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateSiteHTML(profile: ClientProfile, lookKey: "warm_bold" | "professional" | "bold_modern"): string {
  const template = TEMPLATES[lookKey] || TEMPLATES.professional;
  const sbr = profile.sbrData as Record<string, unknown> | null;

  // Headline / tagline
  const taglineSuggestions = sbr?.taglineSuggestions as string[] | undefined;
  const tagline = (sbr?.campaignHeadline as string)
    || taglineSuggestions?.[0]
    || (sbr?.suggestedTagline as string)
    || `${profile.business_name} — ${profile.city || "Your City"}`;

  // Services
  const services = profile.intakeAnswers?.q3?.split(",").map((s) => s.trim()) || [];
  const s1 = services[0] || "Our Service";
  const s2 = services[1] || "Custom Solutions";
  const s3 = services[2] || "Expert Care";

  // Contact
  const cta = profile.intakeAnswers?.q4 || "Contact Us";
  const phone = profile.phone || "(555) 000-0000";
  const phoneDigits = phone.replace(/\D/g, "");
  const address = profile.intakeAnswers?.q7?.replace(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}[,\s]*/g, "").trim() || profile.city || "";
  const ctaLink = phoneDigits ? `tel:${phoneDigits}` : "#";
  const city = profile.city || "Your City";

  // Hero image
  const bt = classifyBusiness(profile.business_name + " " + (profile.intakeAnswers?.q2 || ""));
  const heroImg = getPhotoUrl(bt);

  // About / copy
  const aboutText = (sbr?.localAdvantage as string)
    || (sbr?.marketInsight as string)
    || (sbr?.geoCopyBlock as string)
    || `Proudly serving ${city} with excellence and care.`;

  // Stats from SBR data
  const stat1 = (sbr?.yearsServing as string) || "12+";
  const stat2 = (sbr?.happyClients as string) || "500+";
  const rawRating = sbr?.starRating as string | undefined;
  const stat3 = rawRating || "4.9";

  const data: Record<string, string> = {
    business_name: esc(profile.business_name),
    city: esc(city),
    zip: esc(profile.zip || ""),
    tagline: esc(tagline.slice(0, 80)),
    service_1: esc(s1),
    service_2: esc(s2),
    service_3: esc(s3),
    cta_text: esc(cta),
    cta_link: ctaLink,
    phone: esc(phone),
    phone_digits: phoneDigits || "5550000000",
    address: esc(address),
    about_text: esc(aboutText),
    image_url: heroImg,
    stat_1: stat1,
    stat_2: stat2,
    stat_3: stat3,
  };

  return fillSlots(template, data);
}

export function generateTearSheetPreview(profile: ClientProfile, lookKey: string): string {
  const validKey = (["warm_bold", "professional", "bold_modern"].includes(lookKey) ? lookKey : "professional") as "warm_bold" | "professional" | "bold_modern";
  const html = generateSiteHTML(profile, validKey);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;}</style></head><body><div style="transform:scale(0.38);transform-origin:top left;width:263%;pointer-events:none">${html.replace(/<!DOCTYPE html>/g, "")}</div></body></html>`;
}
