// Builds public/demos/*.html by loading the locked templates and
// injecting per-demo variables. Run once per template refresh:
//   node scripts/build-demos.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TEMPLATES = {
  local: fs.readFileSync(path.join(ROOT, "public/templates/template-local.html"), "utf-8"),
  community: fs.readFileSync(path.join(ROOT, "public/templates/template-community.html"), "utf-8"),
  premier: fs.readFileSync(path.join(ROOT, "public/templates/template-premier.html"), "utf-8"),
};

function seoStatusBadge(status) {
  if (status === "indexed") return "🟢 Google Indexed";
  if (status === "submitted") return "🟡 Google Submitted";
  return "⚪ SEO Pending";
}

function domainStatusNote(status, domain) {
  if (status === "confirmed" && domain) return `Live at ${domain}`;
  if (status === "needs-help") return "Domain setup in progress with your BVM rep.";
  return "Domain pending — your BVM rep will confirm before launch.";
}

const DEFAULT_FAQS = [
  { question: "How do I get started?", answer: "Contact us today for a free consultation." },
  { question: "What areas do you serve?", answer: "We proudly serve {{city}} and surrounding areas." },
  { question: "How long does it take?", answer: "Most projects are completed within 1-2 weeks." },
  { question: "Do you offer free estimates?", answer: "Yes — all consultations are completely free." },
  { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed and insured." },
];

function padFaqs(faqs, city) {
  const defaults = DEFAULT_FAQS.map((f) => ({
    question: f.question,
    answer: f.answer.replaceAll("{{city}}", city || "our area"),
  }));
  const out = [...(faqs || [])];
  while (out.length < 5) out.push(defaults[out.length]);
  return out.slice(0, 5);
}

function inject(template, vars) {
  let out = template;
  for (let i = 0; i < vars.services.length; i++) {
    const s = vars.services[i];
    out = out
      .replaceAll(`{{services[${i}].name}}`, s.name)
      .replaceAll(`{{services[${i}].description}}`, s.description)
      .replaceAll(`{{services[${i}].photoUrl}}`, s.photoUrl);
  }
  const faqs = padFaqs(vars.faqs, vars.city);
  for (let i = 0; i < faqs.length; i++) {
    out = out
      .replaceAll(`{{faqs[${i}].question}}`, faqs[i].question)
      .replaceAll(`{{faqs[${i}].answer}}`, faqs[i].answer);
  }
  const scalars = {
    businessName: vars.businessName || "",
    ownerName: vars.ownerName || "",
    phone: vars.phone || "",
    email: vars.email || "",
    address: vars.address || "",
    city: vars.city || "",
    state: vars.state || "",
    zip: vars.zip || "",
    yearsInBusiness: vars.yearsInBusiness || "15+",
    tagline: vars.tagline || "",
    heroHeadline: vars.heroHeadline || "",
    cta: vars.cta || "Contact Us",
    primaryColor: vars.primaryColor || "#1B2A4A",
    secondaryColor: vars.secondaryColor || "#f59e0b",
    accentColor: vars.accentColor || "#ffffff",
    aboutText: vars.aboutText || "",
    heroPhotoUrl: vars.heroPhotoUrl || "",
    template: vars.template || "community",
    businessType: vars.businessType || "business",
    subType: vars.subType || "",
    domain: vars.domain || "",
    domainStatus: vars.domainStatus || "pending",
    seoStatus: vars.seoStatus || "not-submitted",
    seoStatusBadge: seoStatusBadge(vars.seoStatus || "not-submitted"),
    domainStatusNote: domainStatusNote(vars.domainStatus || "pending", vars.domain || ""),
  };
  for (const [k, v] of Object.entries(scalars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

const DEMOS = [
  {
    file: "tulsa-green-landscaping.html",
    vars: {
      businessName: "Tulsa Green Landscaping",
      ownerName: "Marcus Webb",
      phone: "(918) 555-0142",
      email: "info@tulsagreen.com",
      address: "4821 S Peoria Ave",
      city: "Tulsa",
      state: "OK",
      zip: "74105",
      yearsInBusiness: "12",
      tagline: "Tulsa's Trusted Lawn & Landscape Experts",
      heroHeadline: "Beautiful Yards Start Here",
      cta: "Get a Free Estimate",
      services: [
        { name: "Lawn Maintenance", description: "Weekly and bi-weekly mowing, edging, and cleanup for a yard that always looks its best.", photoUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800" },
        { name: "Landscape Design", description: "Custom designs that transform your outdoor space into something you'll love coming home to.", photoUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800" },
        { name: "Seasonal Cleanup", description: "Spring and fall cleanups that keep your property looking sharp year-round.", photoUrl: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=800" },
      ],
      heroPhotoUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600",
      aboutText: "Tulsa Green Landscaping has been transforming outdoor spaces across Tulsa for over 12 years. Founded by Marcus Webb, we bring the same attention to detail to every yard — whether it's a weekly mow or a complete landscape overhaul.",
      primaryColor: "#2d5a27",
      secondaryColor: "#f5f0e8",
      accentColor: "#ffffff",
      template: "local",
      businessType: "homeservices",
      subType: "landscaping",
      seoStatus: "indexed",
      domain: "tulsagreenlandscaping.com",
      domainStatus: "confirmed",
    },
  },
  {
    file: "herrera-roofing.html",
    vars: {
      businessName: "Herrera Roofing",
      ownerName: "Carlos Herrera",
      phone: "(918) 555-0198",
      email: "info@herreraroofing.com",
      address: "1122 E 41st St",
      city: "Tulsa",
      state: "OK",
      zip: "74105",
      yearsInBusiness: "18",
      tagline: "Tulsa's Most Trusted Roofing Company",
      heroHeadline: "Your Roof. Our Reputation.",
      cta: "Get a Free Inspection",
      services: [
        { name: "Roof Replacement", description: "Full roof replacements completed on time, on budget, with zero shortcuts.", photoUrl: "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=800" },
        { name: "Storm Damage Repair", description: "Fast response to hail and wind damage. We work directly with your insurance.", photoUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800" },
        { name: "Roof Inspection", description: "Free 27-point inspection. Know exactly what you have before you need it.", photoUrl: "https://images.unsplash.com/photo-1565117131175-3b56dbd39898?w=800" },
      ],
      heroPhotoUrl: "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=1600",
      aboutText: "Herrera Roofing has protected Tulsa homes and businesses for 18 years. Carlos Herrera started this company with one rule: treat every roof like it's your own family's home.",
      primaryColor: "#1B2A4A",
      secondaryColor: "#c0392b",
      accentColor: "#ffffff",
      template: "community",
      businessType: "roofing",
      subType: "roofing",
      seoStatus: "submitted",
      domain: "herreraroofing.com",
      domainStatus: "confirmed",
    },
  },
  {
    file: "mooshu-sushi.html",
    vars: {
      businessName: "Mooshu Sushi",
      ownerName: "Kenji Tanaka",
      phone: "(918) 555-0177",
      email: "hello@mooshusushi.com",
      address: "2847 Riverside Dr",
      city: "Tulsa",
      state: "OK",
      zip: "74114",
      yearsInBusiness: "8",
      tagline: "Tulsa's Most Elevated Sushi Experience",
      heroHeadline: "Where Every Roll Tells a Story",
      cta: "Reserve a Table",
      services: [
        { name: "Omakase Experience", description: "Chef's selection. Seasonal. Personal. The full Mooshu experience in every bite.", photoUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800" },
        { name: "Premium Rolls", description: "Signature rolls crafted with the finest imported fish and locally sourced ingredients.", photoUrl: "https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=800" },
        { name: "Private Dining", description: "Exclusive private room for corporate events, celebrations, and intimate gatherings.", photoUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800" },
      ],
      heroPhotoUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=1600",
      aboutText: "Mooshu Sushi was born from a simple obsession — finding the perfect bite. Chef Kenji Tanaka brings 20 years of Japanese culinary training to Tulsa, creating an experience that honors tradition while pushing boundaries.",
      primaryColor: "#0a0a0a",
      secondaryColor: "#C9A84C",
      accentColor: "#ffffff",
      template: "premier",
      businessType: "restaurant",
      subType: "sushi",
      seoStatus: "indexed",
      domain: "mooshusushi.com",
      domainStatus: "confirmed",
    },
  },
  {
    file: "hank-moo-beans.html",
    vars: {
      businessName: "Hank, Moo & Beans",
      ownerName: "James Hank",
      phone: "(918) 555-0155",
      email: "info@hankmoolaw.com",
      address: "500 W 7th St, Suite 400",
      city: "Tulsa",
      state: "OK",
      zip: "74119",
      yearsInBusiness: "22",
      tagline: "Tulsa's Trusted Legal Team",
      heroHeadline: "When It Matters Most, We're In Your Corner",
      cta: "Free Consultation",
      services: [
        { name: "Personal Injury", description: "We fight for maximum compensation. No fees unless we win.", photoUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800" },
        { name: "Business Law", description: "Contracts, disputes, formation — protecting your business at every stage.", photoUrl: "https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=800" },
        { name: "Estate Planning", description: "Wills, trusts, and peace of mind for your family's future.", photoUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800" },
      ],
      heroPhotoUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600",
      aboutText: "Hank, Moo & Beans has served Tulsa families and businesses for over 22 years. Founded on the belief that everyone deserves strong, honest legal representation regardless of the size of their case.",
      primaryColor: "#1B2A4A",
      secondaryColor: "#8B7355",
      accentColor: "#ffffff",
      template: "community",
      businessType: "legal",
      subType: "legal",
      seoStatus: "indexed",
      domain: "hankmoolaw.com",
      domainStatus: "confirmed",
    },
  },
];

const outDir = path.join(ROOT, "public/demos");
fs.mkdirSync(outDir, { recursive: true });

for (const demo of DEMOS) {
  const tpl = TEMPLATES[demo.vars.template];
  if (!tpl) {
    console.error(`No template for ${demo.file}`);
    continue;
  }
  const html = inject(tpl, demo.vars);
  fs.writeFileSync(path.join(outDir, demo.file), html, "utf-8");
  console.log(`✓ ${demo.file} (${html.length} bytes)`);
}
console.log("Done.");
