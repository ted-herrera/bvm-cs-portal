import type { ClientProfile } from "./pipeline";
import { getSupabase } from "./supabase";

// ─── Row ↔ ClientProfile mappers ────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToProfile(r: any): ClientProfile {
  return {
    id: r.id,
    business_name: r.business_name ?? "",
    contact_name: r.contact_name ?? "",
    contact_email: r.contact_email ?? "",
    phone: r.phone ?? "",
    city: r.city ?? "",
    zip: r.zip ?? "",
    assigned_rep: r.assigned_rep ?? "",
    stage: r.stage ?? "intake",
    created_at: r.created_at ?? new Date().toISOString(),
    approved_at: r.approved_at ?? null,
    qa_passed_at: r.qa_passed_at ?? null,
    delivered_at: r.delivered_at ?? null,
    published_url: r.published_url ?? null,
    sbrData: r.sbr_data ?? null,
    selectedLook: r.selected_look ?? null,
    intakeAnswers: r.intake_answers ?? null,
    tearSheetUrl: r.tear_sheet_url ?? null,
    buildNotes: r.build_notes ?? [],
    qaReport: r.qa_report ?? null,
    messages: r.messages ?? [],
    internalNotes: r.internal_notes ?? [],
    buildLog: r.build_log ?? [],
    assignedDev: r.assigned_dev ?? null,
    hasLogo: r.has_logo ?? false,
    logoUrl: r.logo_url ?? null,
    interests: r.interests ?? undefined,
    confettiFired: r.confetti_fired ?? false,
  };
}

function profileToRow(p: ClientProfile): Record<string, unknown> {
  return {
    id: p.id,
    business_name: p.business_name,
    contact_name: p.contact_name,
    contact_email: p.contact_email,
    phone: p.phone,
    city: p.city,
    zip: p.zip,
    assigned_rep: p.assigned_rep,
    stage: p.stage,
    created_at: p.created_at,
    approved_at: p.approved_at,
    qa_passed_at: p.qa_passed_at,
    delivered_at: p.delivered_at,
    published_url: p.published_url,
    sbr_data: p.sbrData,
    selected_look: p.selectedLook,
    intake_answers: p.intakeAnswers,
    tear_sheet_url: p.tearSheetUrl,
    build_notes: p.buildNotes,
    qa_report: p.qaReport,
    messages: p.messages,
    internal_notes: p.internalNotes,
    build_log: p.buildLog,
    assigned_dev: p.assignedDev,
    has_logo: p.hasLogo,
    logo_url: p.logoUrl,
    interests: p.interests ?? null,
    confetti_fired: p.confettiFired ?? false,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Seed data ──────────────────────────────────────────────────────────

export const mockClients: ClientProfile[] = [
  {
    id: "client-demo",
    business_name: "Ted's Tacos",
    contact_name: "Ted",
    contact_email: "ted@tedstacos.com",
    phone: "(918) 222-4555",
    city: "Tulsa",
    zip: "74103",
    assigned_rep: "ted",
    stage: "tear-sheet",
    created_at: "2026-04-08T10:00:00Z",
    approved_at: null,
    qa_passed_at: null,
    delivered_at: null,
    published_url: null,
    sbrData: {
      campaignHeadline: "Tulsa's Taco Revolution Starts Here",
      geoCopyBlock: "Tulsa's food scene is booming — and Ted's Tacos has been leading the charge for 8 years.",
      localAdvantage: "We know how hard it is for local restaurants to stand out.",
      marketInsight: "Tulsa's fast casual market is growing 14% year over year.",
      competitors: ["Elote", "Chimis", "Celebrity Pig"],
      taglineSuggestions: ["Tulsa's Taco Revolution Starts Here", "Real Tacos. Real Fast. Right Here."],
      suggestedTagline: "Tulsa's Taco Revolution Starts Here",
      tagline: "Tulsa's Taco Revolution Starts Here",
      campaignTheme: "Revolution",
      localAdvantageScore: 92,
      yearsServing: "8+",
      happyClients: "50,000+",
      starRating: "4.9",
      customerQuote: "Best tacos in Tulsa, period.",
      services: [
        { name: "Street Tacos", description: "Hand-pressed corn tortillas filled with slow-braised meats." },
        { name: "Catering", description: "Full-service taco catering for events of any size." },
        { name: "Late Night", description: "Open until 2am on weekends." },
      ],
    },
    selectedLook: "bold_modern",
    intakeAnswers: {
      q1: "Ted's Tacos, Tulsa OK 74103",
      q2: "Street tacos, catering, and late night eats in Tulsa",
      q3: "Street Tacos, Catering, Late Night",
      q4: "Order Now",
      q5: "bold_modern",
      q6: "no",
      q7: "(918) 222-4555",
      q8: "Tulsa's Taco Revolution Starts Here",
      q9: "tedstacos-tulsa.com",
    },
    tearSheetUrl: "/tearsheet/client-demo",
    buildNotes: ["Demo client — intake completed", "SBR analysis complete"],
    qaReport: null,
    messages: [],
    internalNotes: [],
    buildLog: [{ from: "intake", to: "tear-sheet", timestamp: "2026-04-08T10:00:00Z", triggeredBy: "system" }],
    assignedDev: null,
    hasLogo: false,
    logoUrl: null,
    interests: { premier: true, print: true, print_at: "2026-04-08T10:05:00Z", premier_at: "2026-04-08T10:05:00Z" },
  },
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
      uniqueAngle: "Authentic family recipes, homemade tortillas daily",
      campaignHeadline: "Tulsa's Favorite Street Tacos",
      suggestedTagline: "Tulsa's Favorite Street Tacos",
      taglineSuggestions: ["Tulsa's Favorite Street Tacos", "Real Recipes. Real Flavor. Real Family."],
      toneNotes: "Warm, inviting, family-first messaging with a street-food edge",
      geoCopyBlock: "From our family kitchen to your table — Rosalinda's has been Tulsa's go-to.",
      localAdvantage: "Family-owned and rooted in the Tulsa community.",
      yearsServing: "15+",
      happyClients: "10,000+",
      starRating: "4.8",
      googleBadge: "&#11088; <span>4.8 Stars on Google &middot; 340+ Reviews</span>",
    },
    selectedLook: "warm_bold",
    intakeAnswers: {
      q1: "Rosalinda's Tacos, Tulsa OK 74103",
      q2: "Authentic Mexican street taco restaurant",
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
      { from: "ted", text: "Client wants warm colors — family restaurant vibe.", timestamp: "2026-04-01T10:45:00Z" },
    ],
    buildLog: [{ from: "intake", to: "tear-sheet", timestamp: "2026-04-01T10:40:00Z", triggeredBy: "system" }],
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
      campaignHeadline: "Denver's Trusted Family Dentist",
      suggestedTagline: "Denver's Trusted Family Dentist",
    },
    selectedLook: "professional",
    intakeAnswers: {
      q1: "Peak Dental, Denver CO 80202",
      q2: "Modern dental practice",
      q3: "General Dentistry, Cosmetic Dentistry, Emergency Care",
      q4: "Book Now",
      q5: "professional",
      q6: "yes",
      q7: "(303) 555-0198, 456 Market St, Denver CO 80202",
      q8: "skip",
    },
    tearSheetUrl: "/tearsheet/client-002",
    buildNotes: ["Intake completed by Sal", "SBR analysis complete", "Tear sheet approved", "Build started"],
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
            { name: "Canonical link", passed: false, severity: "warning", message: "No canonical link found", autofix: "Add <link rel=\"canonical\" href=\"...\">" },
          ],
        },
        {
          name: "Compliance",
          passed: false,
          checks: [
            { name: "Image alt texts", passed: false, severity: "blocker", message: "2 images missing alt attributes", autofix: "Add descriptive alt text" },
            { name: "Button labels", passed: true, severity: "blocker", message: "All buttons have accessible labels" },
          ],
        },
        { name: "Performance", passed: true, checks: [{ name: "Inline styles", passed: true, severity: "optimization", message: "3 inline styles — acceptable" }] },
        { name: "Content", passed: true, checks: [{ name: "Placeholder text", passed: true, severity: "blocker", message: "No placeholder text detected" }] },
      ],
    },
    messages: [{ from: "client", text: "Looks great! Approved.", timestamp: "2026-03-27T14:00:00Z" }],
    internalNotes: [
      { from: "sal", text: "Client approved quickly.", timestamp: "2026-03-27T14:30:00Z" },
      { from: "sal", text: "QA found 2 missing alt texts.", timestamp: "2026-04-04T16:15:00Z" },
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
      campaignHeadline: "Nashville's Storm Damage Experts",
      suggestedTagline: "Nashville's Storm Damage Experts",
    },
    selectedLook: "bold_modern",
    intakeAnswers: {
      q1: "Iron Ridge Roofing, Nashville TN 37201",
      q2: "Veteran-owned roofing company",
      q3: "Roof Replacement, Storm Repair, Free Inspection",
      q4: "Get Free Estimate",
      q5: "bold_modern",
      q6: "yes",
      q7: "(615) 555-0167, 789 Broadway, Nashville TN 37201",
      q8: "skip",
    },
    tearSheetUrl: "/tearsheet/client-003",
    buildNotes: ["Intake completed by Ted", "Build complete", "QA passed — score 94", "Package delivered"],
    qaReport: {
      passed: true,
      score: 94,
      runAt: "2026-03-28T10:00:00Z",
      passes: [
        { name: "Structure", passed: true, checks: [{ name: "HTML lang", passed: true, severity: "blocker", message: "html lang=\"en\" present" }] },
        { name: "Compliance", passed: true, checks: [{ name: "Image alt texts", passed: true, severity: "blocker", message: "All images have alt attributes" }] },
        { name: "Performance", passed: true, checks: [{ name: "Inline styles", passed: true, severity: "optimization", message: "1 inline style — acceptable" }] },
        { name: "Content", passed: true, checks: [{ name: "Placeholder text", passed: true, severity: "blocker", message: "No placeholder text detected" }] },
      ],
    },
    messages: [
      { from: "client", text: "This looks awesome. Let's go!", timestamp: "2026-03-17T11:00:00Z" },
      { from: "system", text: "Package delivered.", timestamp: "2026-04-02T09:00:00Z" },
    ],
    internalNotes: [
      { from: "ted", text: "Marcus is ex-military — keep it direct.", timestamp: "2026-03-15T08:30:00Z" },
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

// ─── In-memory fallback (used when Supabase is not configured) ──────────

declare global {
  // eslint-disable-next-line no-var
  var __bvm_client_store__: Map<string, ClientProfile> | undefined;
}

function getFallbackStore(): Map<string, ClientProfile> {
  if (!globalThis.__bvm_client_store__) {
    globalThis.__bvm_client_store__ = new Map<string, ClientProfile>();
  }
  for (const c of mockClients) {
    if (!globalThis.__bvm_client_store__.has(c.id)) {
      globalThis.__bvm_client_store__.set(c.id, c);
    }
  }
  return globalThis.__bvm_client_store__;
}

// ─── Seeding helper ─────────────────────────────────────────────────────

let _seeded = false;

async function ensureSeeded(): Promise<void> {
  const sb = getSupabase();
  if (!sb || _seeded) return;
  _seeded = true;
  // Check if seed data exists
  const { data } = await sb.from("clients").select("id").limit(1);
  if (data && data.length > 0) return;
  // Insert mock clients
  const rows = mockClients.map(profileToRow);
  await sb.from("clients").upsert(rows, { onConflict: "id" });
}

// ─── Public API (same signatures as before) ─────────────────────────────

export async function getClients(): Promise<ClientProfile[]> {
  const sb = getSupabase();
  if (!sb) return Array.from(getFallbackStore().values());
  await ensureSeeded();
  const { data, error } = await sb.from("clients").select("*").order("created_at", { ascending: false });
  if (error || !data) return Array.from(getFallbackStore().values());
  return data.map(rowToProfile);
}

export async function getClient(id: string): Promise<ClientProfile | undefined> {
  const sb = getSupabase();
  if (!sb) return getFallbackStore().get(id);
  await ensureSeeded();
  const { data, error } = await sb.from("clients").select("*").eq("id", id).single();
  if (error || !data) return getFallbackStore().get(id);
  return rowToProfile(data);
}

export function addClient(profile: ClientProfile): void {
  // Always write to fallback for in-process reads
  getFallbackStore().set(profile.id, profile);
  const sb = getSupabase();
  if (!sb) return;
  // Fire-and-forget — ensures write happens even if caller doesn't await
  sb.from("clients").upsert(profileToRow(profile), { onConflict: "id" }).then(({ error }) => {
    if (error) console.error("[addClient] Supabase write failed:", error.message);
  });
}

export async function updateClient(id: string, updates: Partial<ClientProfile>): Promise<ClientProfile | null> {
  const sb = getSupabase();
  if (!sb) {
    const store = getFallbackStore();
    const existing = store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    store.set(id, updated);
    return updated;
  }
  // Read current, merge, write back
  const current = await getClient(id);
  if (!current) return null;
  const merged = { ...current, ...updates };
  await sb.from("clients").upsert(profileToRow(merged), { onConflict: "id" });
  getFallbackStore().set(id, merged);
  return merged;
}

export async function getClientsByRep(rep: string): Promise<ClientProfile[]> {
  const all = await getClients();
  return all.filter((c) => c.assigned_rep === rep);
}

export async function getClientsByStage(stage: string): Promise<ClientProfile[]> {
  const all = await getClients();
  return all.filter((c) => c.stage === stage);
}

export async function getMockBuildQueue(): Promise<ClientProfile[]> {
  const all = await getClients();
  return all
    .filter((c) => c.stage === "building")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
