import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const sb = createClient(url, key);

    const { data: client } = await sb
      .from("campaign_clients")
      .select("*")
      .eq("id", id)
      .single();

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fallback synthesized profile if no API key
      const fallback = synthesizeFallback(client);
      return NextResponse.json({ profile: fallback });
    }

    const prompt = `Write a 150-word business profile highlight for a community magazine. Format:

Headline: "${client.business_name}: [short descriptor]"
Body: 3-4 short paragraphs covering who they are, what they do, how long they've served the ${client.city} community, what makes them distinctive, and include one fabricated but plausible owner quote.
End with a CTA line referencing their tagline.

Business: ${client.business_name}
Category: ${client.category}
City: ${client.city}
Services: ${client.services}
Tagline: ${client.tagline}
Phone: ${client.contact_phone || ""}

Return plain text only, no markdown.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const fallback = synthesizeFallback(client);
      return NextResponse.json({ profile: fallback, fallback: true });
    }

    const j = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n");

    return NextResponse.json({ profile: text || synthesizeFallback(client) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "profile generation failed" },
      { status: 500 },
    );
  }
}

function synthesizeFallback(client: Record<string, unknown>): string {
  const name = (client.business_name as string) || "This business";
  const city = (client.city as string) || "the community";
  const tagline = (client.tagline as string) || "";
  const services = (client.services as string) || "";
  return `${name}: A ${city} Original\n\n${name} has been a trusted name in ${city}, serving neighbors with ${services}. ${tagline ? `"${tagline}" isn't just a tagline — it's a promise.` : ""}\n\nBehind every order is a team that believes small details matter. From the people who walk through the door to the calls that come in after hours, ${name} treats every interaction like it's the one that counts.\n\n"We built this for our neighbors," says the owner. "Every day we get to prove it's worth it."\n\nStop by, call, or find them online — and see what the community already knows.`;
}
