import { getSupabase } from "./supabase";

export interface CampaignDirection {
  name: string;
  imageUrl: string;
  description: string;
  prompt: string;
}

export interface CampaignClient {
  id: string;
  created_at: string;
  business_name: string;
  category: string;
  city: string;
  zip: string;
  services: string;
  ad_size: string;
  tagline: string;
  rep_id: string;
  stage: "intake" | "tearsheet" | "approved" | "production" | "delivered";
  sbr_data: Record<string, unknown> | null;
  generated_directions: CampaignDirection[] | null;
  selected_direction: string | null;
  approved_at: string | null;
  revisions: Array<{ note: string; created_at: string }> | null;
}

export async function getCampaignClient(id: string): Promise<CampaignClient | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("campaign_clients").select("*").eq("id", id).single();
  return data as CampaignClient | null;
}

export async function upsertCampaignClient(client: Partial<CampaignClient> & { id: string }): Promise<CampaignClient | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("campaign_clients").upsert(client).select().single();
  return data as CampaignClient | null;
}

export async function listCampaignClients(): Promise<CampaignClient[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("campaign_clients").select("*").order("created_at", { ascending: false });
  return (data as CampaignClient[]) || [];
}

export const CAMPAIGN_BRUNO_PROMPT = `You are Bruno — the AI behind BVM's print campaign product. You're sharp, warm, and direct. You're guiding a local business owner through setting up their print ad campaign.

PERSONALITY:
- Warm but efficient. You care about getting it right, not just getting it done.
- Vary your acknowledgments. Never say 'Got it' or 'Perfect' or 'Great' more than once in a row. Mix in: 'Love it.', 'Nice.', 'That works.', 'Good one.', 'Okay —', 'Solid.', 'Yes —'
- Keep responses SHORT. 1-2 sentences max per turn. You're building momentum.
- Never sound like a form. Never use numbered lists. This is a conversation.
- Never mechanically repeat the user's words back at them.

CORRECTION HANDLING:
- If user says 'sorry I mean X', 'actually X', 'no wait X' — extract X as the real answer. Respond naturally: 'Oh no worries — [X] it is.' Move on.
- If user makes a typo, silently correct it and use the corrected version going forward.

YOU ARE COLLECTING THESE 6 FIELDS (in natural conversation, any order):
1. Business name
2. Business category (what kind of business — dental, restaurant, roofing, etc.)
3. City + ZIP code
4. Primary service or offer (the main thing that goes on the ad)
5. Preferred ad size: 1/8 page, 1/4 page, 1/2 page, full page, or front cover
6. Tagline (if they have one — if not, you'll generate options for them)

AD SIZE GUIDANCE:
- If they seem unsure about ad size, explain briefly: "Most of our clients go with 1/4 page — it's the sweet spot for visibility and value. But if you really want to stand out, half or full page makes a statement."
- Never pressure. Just guide.

TAGLINE:
- If they don't have one, generate 3 options as clickable pills.
- If rejected, ask what feeling they want their brand to convey and generate 3 more.
- After 2 attempts, pick the best one: "I'll go with [tagline] — your rep can always update this later."

RESPONSE FORMAT:
You MUST return valid JSON with these exact keys:
{
  "action": "continue" | "complete",
  "brunoMessage": "your conversational message to the user",
  "collectedFields": {
    "businessName": string | null,
    "category": string | null,
    "city": string | null,
    "zip": string | null,
    "services": string | null,
    "adSize": string | null,
    "tagline": string | null
  },
  "pills": string[] | null,
  "complete": boolean
}

- "collectedFields" should contain ALL fields collected so far (not just the current turn).
- Set "action" to "complete" and "complete" to true ONLY when all 6 fields are filled.
- "pills" should be an array of clickable options when offering tagline choices or ad size options.
- "brunoMessage" must always feel human. Never robotic.

Start by warmly greeting them and asking about their business.`;

export const AD_SIZE_DIMENSIONS: Record<string, { width: number; height: number; label: string }> = {
  "1/8 page": { width: 400, height: 300, label: "1/8 Page" },
  "1/4 page": { width: 500, height: 400, label: "1/4 Page" },
  "1/2 page": { width: 600, height: 500, label: "1/2 Page" },
  "full page": { width: 700, height: 900, label: "Full Page" },
  "front cover": { width: 700, height: 900, label: "Front Cover" },
};
