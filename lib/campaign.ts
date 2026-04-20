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
  generated_directions: Array<{ name: string; imageUrl: string; description: string; prompt: string }> | null;
  selected_direction: string | null;
  approved_at: string | null;
  revisions: Array<{ note?: string; type?: string; value?: string; created_at: string }> | null;
  messages: Array<{ role: string; content: string; timestamp: string }> | null;
  client_email: string;
  client_first_name: string;
  client_phone: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  ad_copy: string;
  qr_url: string | null;
  health_score: number | null;
  risk_level: string | null;
  renewal_date: string | null;
  past_due: number;
}

export const AD_SIZES: Record<string, { label: string; trim: string; bleed: string; px: { w: number; h: number } }> = {
  "1/8 page": { label: "1/8 Page", trim: '3.65" × 2.5"', bleed: '3.9" × 2.75"', px: { w: 548, h: 375 } },
  "1/4 page": { label: "1/4 Page", trim: '3.65" × 5"', bleed: '3.9" × 5.25"', px: { w: 548, h: 750 } },
  "1/3 page vertical": { label: "1/3 Page Vertical", trim: '2.5" × 10"', bleed: '2.75" × 10.25"', px: { w: 375, h: 1500 } },
  "1/2 page": { label: "1/2 Page", trim: '7.5" × 5"', bleed: '7.75" × 5.25"', px: { w: 1125, h: 750 } },
  "full page": { label: "Full Page", trim: '7.5" × 10"', bleed: '8.625" × 11.125"', px: { w: 1125, h: 1500 } },
  "front cover": { label: "Front Cover", trim: '7.5" × 10"', bleed: '8.625" × 11.125"', px: { w: 1125, h: 1500 } },
};

export const CAMPAIGN_USERS = [
  { username: "Alex Polivka", password: "password", role: "rep" as const },
  { username: "April Dippolito", password: "password", role: "rep" as const },
  { username: "Genele Ekinde", password: "password", role: "rep" as const },
  { username: "Kala McNeely", password: "password", role: "rep" as const },
  { username: "Karen Guirguis", password: "password", role: "rep" as const },
  { username: "Samantha Marcus", password: "password", role: "rep" as const },
  { username: "Ted Herrera", password: "password", role: "admin" as const },
];

export const CLOSE_USER_IDS: Record<string, string> = {
  "Alex Polivka": "user_ZDhdlcanHiDZj6QoOTReknHGifsEhZpV03hDhQEutis",
  "April Dippolito": "user_thprS88WhvHcnElDBzhcz2CvY4BeGgKMYFwuHQEeLhR",
  "Genele Ekinde": "user_sVfp8aLaBkWMNs4NzYUrJ45nPl9twtpvpI75cQTtMLS",
  "Kala McNeely": "user_2garXAc19Evv9pYyMHr6cVgDJdCkERbZTUlx6vs7JkC",
  "Karen Guirguis": "user_bco3BJa2xPHHmrT570fuH3jBBWG4MKjBX0SZYKdL5k4",
  "Samantha Marcus": "user_rOPMIjFq1Fh1kGRljVkkyAPDnt61OSloJ1x0nX5UKWI",
  "Ted Herrera": "user_GGLCIENjMBktSidCBK16Fny5CIWno7rIMd55QhHBKtD",
};

export function getCampaignUser(): { username: string; role: string } | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = localStorage.getItem("campaign_user");
    if (!raw) {
      const c = document.cookie.split(";").find(x => x.trim().startsWith("campaign_user="));
      if (c) raw = decodeURIComponent(c.split("=").slice(1).join("="));
    }
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return null;
}
