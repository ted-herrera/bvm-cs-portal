export interface SBRData {
  businessType: string;
  zip: string;
  city: string;
  demographics: {
    medianIncome: string;
    homeownerPercent: string;
    familyComposition: string;
    ageTrends: string;
  };
  competitors: string[];
  socialPresence?: {
    facebook?: string;
    instagram?: string;
    google?: string;
    website?: string;
  };
  marketInsight: string;
  campaignHeadline: string;
  geoCopyBlock: string;
  creativeDirection: string;
  sbrTalkingPoints: string[];
  competitorBenchmark: string;
  localAdvantage: string;
  taglineSuggestions: string[];
}

export const SBR_SYSTEM_PROMPT = `Working as a Marketing and Ad Campaign Designer specializing in high-impact, minimalist advertising for Best Version Media clients, perform a complete SBR Market Scan and develop a cohesive, geo-targeted Print and Digital Ad Campaign.

Execute:
1. Market Intelligence Scan: Local Demographics (median income, homeowner %, family composition, age trends), Market Competition (top 10 local competitors in same category), Client Social Media Presence, Market Insight Summary (consumer trends and behaviors affecting this industry locally)
2. Campaign Strategy: Geo-Comparative Strategy benchmarking against 2 local + 1 national competitor to highlight local advantage. Creative Style: minimalist, eye-catching, 7-10 high-value words max. Trend Alignment: authenticity, hyper-personalization, short-form storytelling. Single-minded measurable CTA.
3. Campaign Deliverables: Core Campaign Theme/Headline (7 words max), Geo-Targeted Copy Block (50 words max, community-driven, authentic), Creative Direction summary, SBR Talking Points for CS/AM engagement
4. Tactical Wrap-Up: Market positioning opportunity, creative direction, SBR talking points

Return response as JSON only with these exact keys: businessType, zip, city, demographics {medianIncome, homeownerPercent, familyComposition, ageTrends}, competitors (array of 10 strings), marketInsight, campaignHeadline, geoCopyBlock, creativeDirection, sbrTalkingPoints (array), competitorBenchmark, localAdvantage, taglineSuggestions (array of 3 strings). No preamble, no markdown, JSON only.`;

function emptySBR(businessType: string, zip: string, city: string): SBRData {
  return {
    businessType,
    zip,
    city,
    demographics: { medianIncome: "", homeownerPercent: "", familyComposition: "", ageTrends: "" },
    competitors: [],
    marketInsight: "",
    campaignHeadline: "",
    geoCopyBlock: "",
    creativeDirection: "",
    sbrTalkingPoints: [],
    competitorBenchmark: "",
    localAdvantage: "",
    taglineSuggestions: [],
  };
}

export async function runSBR(businessType: string, zip: string, city: string): Promise<SBRData> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: SBR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Run Bruno SBR for: ${businessType} | ${zip}` }],
      }),
    });
    const data = await res.json();
    if (data.response) {
      const cleaned = data.response.replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return { ...emptySBR(businessType, zip, city), ...parsed };
    }
  } catch {
    // Parse error — return safe fallback
  }
  return emptySBR(businessType, zip, city);
}

export function getSBRSummary(sbr: SBRData): string {
  const comps = sbr.competitors.slice(0, 3).join(", ");
  return `Market: ${sbr.city} ${sbr.zip}. Demographics: ${sbr.demographics.medianIncome} median income, ${sbr.demographics.homeownerPercent} homeowners. Top competitors: ${comps}. Market insight: ${sbr.marketInsight}. Campaign headline: ${sbr.campaignHeadline}. Local advantage: ${sbr.localAdvantage}.`;
}
