import { NextResponse } from "next/server";

interface SocialPost {
  day: number;
  platform: "facebook" | "instagram" | "google_business";
  type: "promotional" | "educational" | "community" | "behind_the_scenes" | "seasonal";
  caption: string;
  imagePrompt: string;
  hashtags: string[];
  characterCount: number;
}

interface SocialCalendar {
  posts: SocialPost[];
  businessName: string;
  city: string;
  generatedAt: string;
}

const SOCIAL_SYSTEM_PROMPT = `You are Bruno, BVM's social media manager. You write hyperlocal, voice-authentic social posts for local businesses. You have deep market intelligence from SBR data for this specific territory. Write posts that sound like they come from the actual business owner — conversational, local, specific. Never generic. Use the city name naturally. Reference local context, seasons, and community. Use competitor intelligence from SBR to position this business as the local leader. Each post should feel handcrafted, not AI-generated.

Return ONLY valid JSON matching this exact shape — no markdown, no prose, no code fences:
{
  "posts": [
    {
      "day": 1,
      "platform": "facebook",
      "type": "promotional",
      "caption": "...",
      "imagePrompt": "...",
      "hashtags": ["tag1","tag2"],
      "characterCount": 142
    }
  ]
}

Rules:
- Generate exactly 30 posts numbered day 1 through day 30.
- Distribution: 12 Facebook, 12 Instagram, 6 Google Business (google_business).
- Mix post types across the month: promotional, educational, community, behind_the_scenes, seasonal.
- platform must be one of: "facebook", "instagram", "google_business".
- type must be one of: "promotional", "educational", "community", "behind_the_scenes", "seasonal".
- Facebook: up to 400 chars, conversational, community-oriented.
- Instagram: up to 220 chars, visual-first, emoji-friendly, lifestyle tone.
- Google Business: up to 300 chars, SEO-conscious, local keyword-dense, clear CTA.
- Hashtags: 3-8 relevant local hashtags per post. Include at least one city-specific tag.
- imagePrompt: a one-sentence description of the ideal photo.
- characterCount: number of characters in the caption exactly.
- Use the city name in at least 60% of posts.
- Reference local context, neighborhood landmarks, weather/seasons, community events naturally.`;

function toneForLook(look: string): string {
  if (look === "warm_bold") return "Local — warm, neighborly, like chatting across the fence with a friend";
  if (look === "professional") return "Community — professional, trusted, family-first";
  if (look === "bold_modern") return "Premier — aspirational, premium, best-in-class";
  return "friendly and conversational";
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clientId?: string;
    businessName: string;
    city: string;
    services: string[];
    look: string;
    tagline: string;
    sbrData?: Record<string, unknown>;
  };

  const { businessName, city, services, look, tagline, sbrData } = body;

  if (!businessName || !city) {
    return NextResponse.json(
      { error: "businessName and city are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const now = new Date().toISOString();

  // Build a rich user message with full context
  const userMessage = `Generate a 30-day social media content calendar for this business.

BUSINESS:
- Name: ${businessName}
- City: ${city}
- Services: ${services.join(", ") || "(none listed)"}
- Tagline: ${tagline || "(none)"}
- Tone: ${toneForLook(look)}

SBR MARKET INTELLIGENCE:
${
  sbrData
    ? JSON.stringify(
        {
          campaignHeadline: sbrData.campaignHeadline,
          localAdvantage: sbrData.localAdvantage,
          competitors: sbrData.competitors,
          targetDemo: sbrData.targetDemo,
          uniqueAngle: sbrData.uniqueAngle,
          toneNotes: sbrData.toneNotes,
          marketInsight: sbrData.marketInsight,
        },
        null,
        2,
      )
    : "(no SBR data provided)"
}

Return ONLY the JSON calendar. 30 posts. 12 Facebook, 12 Instagram, 6 Google Business. Days 1-30 in order.`;

  // Fallback stub — used if no API key OR the API call fails
  const buildStub = (): SocialCalendar => {
    const platforms: Array<SocialPost["platform"]> = [];
    for (let i = 0; i < 12; i++) platforms.push("facebook");
    for (let i = 0; i < 12; i++) platforms.push("instagram");
    for (let i = 0; i < 6; i++) platforms.push("google_business");
    // Shuffle-ish distribution
    const order: SocialPost["platform"][] = [];
    for (let i = 0; i < 30; i++) {
      order.push(platforms[(i * 7) % 30]);
    }
    const types: SocialPost["type"][] = [
      "promotional",
      "educational",
      "community",
      "behind_the_scenes",
      "seasonal",
    ];
    const posts: SocialPost[] = Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      const platform = order[i];
      const type = types[i % types.length];
      const service = services[i % Math.max(services.length, 1)] || "our work";
      const caption = `${businessName} in ${city} — ${type.replace(/_/g, " ")} spotlight on ${service}. ${tagline ? tagline + " " : ""}Stop by or give us a call today.`;
      return {
        day,
        platform,
        type,
        caption,
        imagePrompt: `A warm, authentic photo of ${businessName} ${type === "behind_the_scenes" ? "team at work" : "serving the " + city + " community"}.`,
        hashtags: [
          `#${city.replace(/\s+/g, "")}`,
          `#Local${city.replace(/\s+/g, "")}`,
          `#${businessName.replace(/[^a-zA-Z0-9]/g, "")}`,
          "#ShopLocal",
          "#SmallBusiness",
        ],
        characterCount: caption.length,
      };
    });
    return { posts, businessName, city, generatedAt: now };
  };

  if (!apiKey) {
    console.log("[social/generate] No API key — returning stub calendar");
    return NextResponse.json(buildStub());
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        temperature: 0.8,
        system: SOCIAL_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      console.error("[social/generate] Anthropic error:", errTxt);
      return NextResponse.json(buildStub());
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    let text = "";
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block?.type === "text" && typeof block.text === "string") text += block.text;
      }
    }

    // Strip any markdown fences
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as { posts?: SocialPost[] };
      if (Array.isArray(parsed.posts) && parsed.posts.length > 0) {
        return NextResponse.json({
          posts: parsed.posts,
          businessName,
          city,
          generatedAt: now,
        });
      }
    } catch (err) {
      console.error("[social/generate] Failed to parse JSON:", err);
    }

    return NextResponse.json(buildStub());
  } catch (err) {
    console.error("[social/generate] Request failed:", err);
    return NextResponse.json(buildStub());
  }
}
