// Single source of truth for all BVM site variables.
// Every template slot, QA pass, and dev pack references this shape.

export interface BVMSiteService {
  name: string;
  description: string;
  photoUrl: string;
}

export interface BVMSiteFaq {
  question: string;
  answer: string;
}

export interface BVMSbrData {
  marketSummary: string;
  competitors: string;
  opportunity: string;
  income: string;
}

export type BVMTemplate = "local" | "community" | "premier" | "custom";
export type BVMDomainStatus = "confirmed" | "needs-help" | "pending";
export type BVMSeoStatus = "not-submitted" | "submitted" | "indexed";

export interface BVMSiteVariables {
  // Business
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  yearsInBusiness: string; // default "15+"

  // Brand
  tagline: string;
  heroHeadline: string;
  cta: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Services (exactly 3, pad with defaults if fewer)
  services: BVMSiteService[];

  // Content
  aboutText: string;
  faqs: BVMSiteFaq[]; // exactly 5

  // Media
  heroPhotoUrl: string;

  // Meta
  template: BVMTemplate;
  businessType: string;
  subType: string;

  // Domain & SEO
  domain: string;
  domainStatus: BVMDomainStatus;
  seoStatus: BVMSeoStatus;

  // SBR
  sbrData?: BVMSbrData;
}

export const DEFAULT_VARIABLES: Partial<BVMSiteVariables> = {
  yearsInBusiness: "15+",
  cta: "Contact Us",
  primaryColor: "#1B2A4A",
  secondaryColor: "#f59e0b",
  accentColor: "#ffffff",
  domainStatus: "pending",
  seoStatus: "not-submitted",
  faqs: [
    { question: "How do I get started?", answer: "Contact us today for a free consultation." },
    { question: "What areas do you serve?", answer: "We proudly serve {{city}} and surrounding areas." },
    { question: "How long does it take?", answer: "Most projects are completed within 1-2 weeks." },
    { question: "Do you offer free estimates?", answer: "Yes — all consultations are completely free." },
    { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed and insured." },
  ],
};

// Pad a services array to exactly 3 entries.
export function padServices(services: BVMSiteService[]): BVMSiteService[] {
  const out = [...services];
  while (out.length < 3) {
    out.push({
      name: "Our Services",
      description: "We offer a full suite of services tailored to your needs.",
      photoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    });
  }
  return out.slice(0, 3);
}

// Pad faqs to exactly 5, using defaults.
export function padFaqs(faqs: BVMSiteFaq[] | undefined, city: string): BVMSiteFaq[] {
  const defaults = (DEFAULT_VARIABLES.faqs || []).map((f) => ({
    question: f.question,
    answer: f.answer.replace(/\{\{city\}\}/g, city || "our area"),
  }));
  const out = [...(faqs || [])];
  while (out.length < 5) {
    const def = defaults[out.length % defaults.length];
    if (!def) break;
    out.push(def);
  }
  return out.slice(0, 5);
}

// Merge incoming partial variables with DEFAULT_VARIABLES + pad.
export function mergeWithDefaults(
  input: Partial<BVMSiteVariables>,
): BVMSiteVariables {
  const merged: BVMSiteVariables = {
    businessName: input.businessName || "Your Business",
    ownerName: input.ownerName || "",
    phone: input.phone || "",
    email: input.email || "",
    address: input.address || "",
    city: input.city || "",
    state: input.state || "",
    zip: input.zip || "",
    yearsInBusiness: input.yearsInBusiness || DEFAULT_VARIABLES.yearsInBusiness || "15+",
    tagline: input.tagline || "",
    heroHeadline: input.heroHeadline || input.tagline || "Welcome",
    cta: input.cta || DEFAULT_VARIABLES.cta || "Contact Us",
    primaryColor: input.primaryColor || DEFAULT_VARIABLES.primaryColor || "#1B2A4A",
    secondaryColor: input.secondaryColor || DEFAULT_VARIABLES.secondaryColor || "#f59e0b",
    accentColor: input.accentColor || DEFAULT_VARIABLES.accentColor || "#ffffff",
    services: padServices(input.services || []),
    aboutText:
      input.aboutText ||
      `${input.businessName || "We"} has proudly served ${input.city || "our community"} for years.`,
    faqs: padFaqs(input.faqs, input.city || ""),
    heroPhotoUrl:
      input.heroPhotoUrl ||
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600",
    template: input.template || "community",
    businessType: input.businessType || "business",
    subType: input.subType || "",
    domain: input.domain || "",
    domainStatus: input.domainStatus || "pending",
    seoStatus: input.seoStatus || "not-submitted",
    sbrData: input.sbrData,
  };
  return merged;
}

// Returns the emoji + label for the SEO status badge.
export function seoStatusBadge(status: BVMSeoStatus): string {
  if (status === "indexed") return "🟢 Google Indexed";
  if (status === "submitted") return "🟡 Google Submitted";
  return "⚪ SEO Pending";
}

// Returns a note for the domain status row (shown in footer if pending).
export function domainStatusNote(status: BVMDomainStatus, domain: string): string {
  if (status === "confirmed" && domain) return `Live at ${domain}`;
  if (status === "needs-help") return "Domain setup in progress with your BVM rep.";
  return "Domain pending — your BVM rep will confirm before launch.";
}
