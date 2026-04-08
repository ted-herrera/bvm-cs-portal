import type { ClientProfile } from "./pipeline";

export const mockClients: ClientProfile[] = [
  {
    id: "client-001",
    business_name: "Rosalinda's Tacos",
    contact_name: "Rosalinda Garza",
    contact_email: "rosa@rosalindastacos.com",
    phone: "(918) 555-0142",
    city: "Tulsa",
    zip: "74103",
    assigned_rep: "ted",
    stage: "tear-sheet",
    created_at: "2026-04-01T10:30:00Z",
    approved_at: null,
    qa_passed_at: null,
    delivered_at: null,
    published_url: null,
    sbrData: {
      businessType: "Restaurant / Mexican Food",
      competitors: ["Taco Bueno", "Elote Cafe", "Ted's Cafe Escondido"],
      targetDemo: "Families, lunch crowd, catering clients, Tulsa foodies",
      uniqueAngle: "Authentic family recipes, homemade tortillas daily, three generations of tradition",
      campaignHeadline: "Tulsa's Favorite Street Tacos",
      suggestedTagline: "Tulsa's Favorite Street Tacos",
      taglineSuggestions: ["Tulsa's Favorite Street Tacos", "Real Recipes. Real Flavor. Real Family.", "Three Generations of Sabor"],
      toneNotes: "Warm, inviting, family-first messaging with a street-food edge",
      geoCopyBlock: "From our family kitchen to your table — Rosalinda's has been Tulsa's go-to for authentic Mexican street tacos since day one.",
      localAdvantage: "Family-owned and rooted in the Tulsa community, Rosalinda's brings three generations of authentic Mexican recipes to every plate.",
      yearsServing: "15+",
      happyClients: "10,000+",
      starRating: "4.8",
      googleBadge: "&#11088; <span>4.8 Stars on Google &middot; 340+ Reviews</span>",
    },
    selectedLook: "warm_bold",
    intakeAnswers: {
      q1: "Rosalinda's Tacos, Tulsa OK 74103",
      q2: "Authentic Mexican street taco restaurant with homemade tortillas and three generations of family recipes",
      q3: "Dine-In, Takeout, Catering",
      q4: "Order Now",
      q5: "warm_bold",
      q6: "yes",
      q7: "(918) 555-0142, 1234 S Peoria Ave, Tulsa OK 74103",
      q8: "Grand opening celebration coming up",
    },
    tearSheetUrl: "/tearsheet/client-001",
    buildNotes: ["Intake completed by Ted", "SBR analysis complete"],
    qaReport: null,
    messages: [],
    internalNotes: [
      {
        from: "ted",
        text: "Client wants warm colors — family restaurant vibe. Has logo ready. Loves the street taco angle.",
        timestamp: "2026-04-01T10:45:00Z",
      },
    ],
    buildLog: [
      {
        from: "intake",
        to: "tear-sheet",
        timestamp: "2026-04-01T10:40:00Z",
        triggeredBy: "system",
      },
    ],
    assignedDev: null,
    hasLogo: false,
    logoUrl: null,
  },
  {
    id: "client-002",
    business_name: "Peak Dental",
    contact_name: "Dr. Amy Chen",
    contact_email: "amy@peakdental.com",
    phone: "(303) 555-0198",
    city: "Denver",
    zip: "80202",
    assigned_rep: "sal",
    stage: "qa",
    created_at: "2026-03-25T09:00:00Z",
    approved_at: "2026-03-27T14:00:00Z",
    qa_passed_at: null,
    delivered_at: null,
    published_url: null,
    sbrData: {
      businessType: "Dental Practice",
      competitors: ["Aspen Dental", "Comfort Dental", "Mile High Smiles"],
      targetDemo: "Families, young professionals, cosmetic dentistry patients in downtown Denver",
      uniqueAngle: "Boutique practice with sedation dentistry, same-day crowns, and a spa-like environment",
      campaignHeadline: "Denver's Trusted Family Dentist",
      suggestedTagline: "Denver's Trusted Family Dentist",
      taglineSuggestions: ["Denver's Trusted Family Dentist", "Your Smile. Our Craft.", "Where Denver Smiles Begin"],
      toneNotes: "Professional, trustworthy, modern, approachable",
      geoCopyBlock: "Peak Dental combines cutting-edge technology with a gentle, patient-first approach — right here in the heart of Denver.",
      localAdvantage: "Located in downtown Denver, Peak Dental offers a boutique dental experience with sedation options and same-day crowns for busy professionals.",
      yearsServing: "8",
      happyClients: "3,200+",
      starRating: "4.9",
      googleBadge: "&#11088; <span>4.9 Stars on Google &middot; 215+ Reviews</span>",
    },
    selectedLook: "professional",
    intakeAnswers: {
      q1: "Peak Dental, Denver CO 80202",
      q2: "Modern dental practice specializing in cosmetic and family dentistry with sedation options",
      q3: "General Dentistry, Cosmetic Dentistry, Emergency Care",
      q4: "Book Now",
      q5: "professional",
      q6: "yes",
      q7: "(303) 555-0198, 456 Market St, Denver CO 80202",
      q8: "skip",
    },
    tearSheetUrl: "/tearsheet/client-002",
    buildNotes: [
      "Intake completed by Sal",
      "SBR analysis complete",
      "Tear sheet approved",
      "Build started",
      "Build complete — running QA",
    ],
    qaReport: {
      passed: false,
      score: 72,
      runAt: "2026-04-04T16:00:00Z",
      passes: [
        {
          name: "Structure",
          passed: true,
          checks: [
            { name: "HTML lang attribute", passed: true, severity: "blocker", message: "html lang=\"en\" present" },
            { name: "Title tag", passed: true, severity: "blocker", message: "Title tag found: Peak Dental" },
            { name: "Meta description", passed: true, severity: "warning", message: "Meta description present" },
            { name: "Viewport meta", passed: true, severity: "blocker", message: "Viewport meta tag present" },
            { name: "Canonical link", passed: false, severity: "warning", message: "No canonical link found", autofix: "Add <link rel=\"canonical\" href=\"...\">" },
            { name: "og:title", passed: true, severity: "optimization", message: "Open Graph title present" },
            { name: "og:description", passed: false, severity: "optimization", message: "No og:description meta tag found" },
          ],
        },
        {
          name: "Compliance",
          passed: false,
          checks: [
            { name: "Image alt texts", passed: false, severity: "blocker", message: "2 images missing alt attributes", autofix: "Add descriptive alt text to images" },
            { name: "Button labels", passed: true, severity: "blocker", message: "All buttons have accessible labels" },
            { name: "Color contrast", passed: true, severity: "warning", message: "Contrast ratios within acceptable range" },
            { name: "Heading hierarchy", passed: true, severity: "warning", message: "Heading hierarchy is valid (h1 → h2 → h3)" },
          ],
        },
        {
          name: "Performance",
          passed: true,
          checks: [
            { name: "Inline styles", passed: true, severity: "optimization", message: "3 inline styles found — acceptable" },
            { name: "Images without dimensions", passed: true, severity: "warning", message: "All images have width/height" },
            { name: "Scripts in head", passed: true, severity: "warning", message: "No blocking scripts in head" },
          ],
        },
        {
          name: "Content",
          passed: true,
          checks: [
            { name: "Placeholder text", passed: true, severity: "blocker", message: "No placeholder text detected" },
            { name: "Phone number", passed: true, severity: "warning", message: "Phone number found: (303) 555-0198" },
            { name: "Address present", passed: true, severity: "warning", message: "Address detected in footer" },
            { name: "CTA button", passed: true, severity: "blocker", message: "Primary CTA button found: Book Now" },
          ],
        },
      ],
    },
    messages: [
      {
        from: "client",
        text: "Looks great! Approved.",
        timestamp: "2026-03-27T14:00:00Z",
      },
    ],
    internalNotes: [
      {
        from: "sal",
        text: "Client approved quickly. Wants to launch by end of month.",
        timestamp: "2026-03-27T14:30:00Z",
      },
      {
        from: "sal",
        text: "QA found 2 missing alt texts and no canonical. Fixing now.",
        timestamp: "2026-04-04T16:15:00Z",
      },
    ],
    buildLog: [
      { from: "intake", to: "tear-sheet", timestamp: "2026-03-25T09:30:00Z", triggeredBy: "system" },
      { from: "tear-sheet", to: "building", timestamp: "2026-03-27T14:00:00Z", triggeredBy: "client" },
      { from: "building", to: "qa", timestamp: "2026-04-04T15:00:00Z", triggeredBy: "sal" },
    ],
    assignedDev: "dev1",
    hasLogo: true,
    logoUrl: null,
  },
  {
    id: "client-003",
    business_name: "Iron Ridge Roofing",
    contact_name: "Marcus Johnson",
    contact_email: "marcus@ironridgeroofing.com",
    phone: "(615) 555-0167",
    city: "Nashville",
    zip: "37201",
    assigned_rep: "ted",
    stage: "delivered",
    created_at: "2026-03-15T08:00:00Z",
    approved_at: "2026-03-17T11:00:00Z",
    qa_passed_at: "2026-03-28T10:00:00Z",
    delivered_at: "2026-04-02T09:00:00Z",
    published_url: null,
    sbrData: {
      businessType: "Roofing Contractor",
      competitors: ["Nashville Roofing Co", "Top Notch Roofing", "Bone Dry Roofing"],
      targetDemo: "Homeowners, property managers, insurance claims in Middle Tennessee",
      uniqueAngle: "Military veteran owned, storm damage specialists, free inspections, insurance claim assistance",
      campaignHeadline: "Nashville's Storm Damage Experts",
      suggestedTagline: "Nashville's Storm Damage Experts",
      taglineSuggestions: ["Nashville's Storm Damage Experts", "Built Tough. Built Right. Built to Last.", "Veteran-Owned. Storm-Tested."],
      toneNotes: "Strong, trustworthy, action-oriented, direct",
      geoCopyBlock: "When Nashville storms hit, Iron Ridge Roofing is the first call — veteran-owned, fully insured, and ready to restore your roof fast.",
      localAdvantage: "Veteran-owned and Nashville-based, Iron Ridge brings military precision to every roofing job — from storm damage repair to full replacements.",
      yearsServing: "12+",
      happyClients: "1,800+",
      starRating: "4.9",
      googleBadge: "&#11088; <span>4.9 Stars on Google &middot; 280+ Reviews</span>",
    },
    selectedLook: "bold_modern",
    intakeAnswers: {
      q1: "Iron Ridge Roofing, Nashville TN 37201",
      q2: "Veteran-owned roofing company specializing in storm damage repair, full roof replacement, and free inspections",
      q3: "Roof Replacement, Storm Repair, Free Inspection",
      q4: "Get Free Estimate",
      q5: "bold_modern",
      q6: "yes",
      q7: "(615) 555-0167, 789 Broadway, Nashville TN 37201",
      q8: "skip",
    },
    tearSheetUrl: "/tearsheet/client-003",
    buildNotes: [
      "Intake completed by Ted",
      "SBR analysis complete",
      "Tear sheet approved — client loved the bold direction",
      "Build complete",
      "QA passed — score 94",
      "Package delivered to client",
    ],
    qaReport: {
      passed: true,
      score: 94,
      runAt: "2026-03-28T10:00:00Z",
      passes: [
        {
          name: "Structure",
          passed: true,
          checks: [
            { name: "HTML lang attribute", passed: true, severity: "blocker", message: "html lang=\"en\" present" },
            { name: "Title tag", passed: true, severity: "blocker", message: "Title tag found: Iron Ridge Roofing" },
            { name: "Meta description", passed: true, severity: "warning", message: "Meta description present" },
            { name: "Viewport meta", passed: true, severity: "blocker", message: "Viewport meta tag present" },
            { name: "Canonical link", passed: true, severity: "warning", message: "Canonical link present" },
            { name: "og:title", passed: true, severity: "optimization", message: "Open Graph title present" },
            { name: "og:description", passed: true, severity: "optimization", message: "Open Graph description present" },
          ],
        },
        {
          name: "Compliance",
          passed: true,
          checks: [
            { name: "Image alt texts", passed: true, severity: "blocker", message: "All images have alt attributes" },
            { name: "Button labels", passed: true, severity: "blocker", message: "All buttons have accessible labels" },
            { name: "Color contrast", passed: true, severity: "warning", message: "Contrast ratios within acceptable range" },
            { name: "Heading hierarchy", passed: true, severity: "warning", message: "Heading hierarchy is valid" },
          ],
        },
        {
          name: "Performance",
          passed: true,
          checks: [
            { name: "Inline styles", passed: true, severity: "optimization", message: "1 inline style — acceptable" },
            { name: "Images without dimensions", passed: true, severity: "warning", message: "All images have width/height" },
            { name: "Scripts in head", passed: true, severity: "warning", message: "No blocking scripts in head" },
          ],
        },
        {
          name: "Content",
          passed: true,
          checks: [
            { name: "Placeholder text", passed: true, severity: "blocker", message: "No placeholder text detected" },
            { name: "Phone number", passed: true, severity: "warning", message: "Phone number found: (615) 555-0167" },
            { name: "Address present", passed: true, severity: "warning", message: "Address detected in footer" },
            { name: "CTA button", passed: true, severity: "blocker", message: "Primary CTA found: Get Free Estimate" },
          ],
        },
      ],
    },
    messages: [
      { from: "client", text: "This looks awesome. Let's go!", timestamp: "2026-03-17T11:00:00Z" },
      { from: "system", text: "Package delivered. Download link sent.", timestamp: "2026-04-02T09:00:00Z" },
    ],
    internalNotes: [
      { from: "ted", text: "Marcus is ex-military — keep it direct and professional. Loves the bold purple direction.", timestamp: "2026-03-15T08:30:00Z" },
      { from: "ted", text: "QA passed with 94. All checks green except minor optimization note.", timestamp: "2026-03-28T10:15:00Z" },
    ],
    buildLog: [
      { from: "intake", to: "tear-sheet", timestamp: "2026-03-15T08:30:00Z", triggeredBy: "system" },
      { from: "tear-sheet", to: "building", timestamp: "2026-03-17T11:00:00Z", triggeredBy: "client" },
      { from: "building", to: "qa", timestamp: "2026-03-27T16:00:00Z", triggeredBy: "ted" },
      { from: "qa", to: "review", timestamp: "2026-03-28T10:00:00Z", triggeredBy: "system" },
      { from: "review", to: "delivered", timestamp: "2026-04-02T09:00:00Z", triggeredBy: "ted" },
    ],
    assignedDev: "dev",
    hasLogo: true,
    logoUrl: null,
  },
];

// ---------------------------------------------------------------------------
// Runtime store — survives hot-reloads & cross-route imports via globalThis
// Will be replaced with Supabase
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __bvm_client_store__: Map<string, ClientProfile> | undefined;
}

function getStore(): Map<string, ClientProfile> {
  if (!globalThis.__bvm_client_store__) {
    const map = new Map<string, ClientProfile>();
    for (const c of mockClients) {
      map.set(c.id, c);
    }
    globalThis.__bvm_client_store__ = map;
  }
  return globalThis.__bvm_client_store__;
}

export function getClients(): ClientProfile[] {
  return Array.from(getStore().values());
}

export function getClient(id: string): ClientProfile | undefined {
  return getStore().get(id);
}

export function addClient(profile: ClientProfile): void {
  getStore().set(profile.id, profile);
}

export function updateClient(id: string, updates: Partial<ClientProfile>): ClientProfile | null {
  const store = getStore();
  const existing = store.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  store.set(id, updated);
  return updated;
}

export function getClientsByRep(rep: string): ClientProfile[] {
  return getClients().filter((c) => c.assigned_rep === rep);
}

export function getClientsByStage(stage: string): ClientProfile[] {
  return getClients().filter((c) => c.stage === stage);
}

export function getMockBuildQueue(): ClientProfile[] {
  return getClients()
    .filter((c) => c.stage === "building")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
