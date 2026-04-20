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
    if (!apiKey) return NextResponse.json({ topics: fallbackTopics(client) });

    const prompt = `Suggest 3 expert-contributor article topics for a ${client.category} business called "${client.business_name}" in ${client.city}. These should be thought-leadership articles (300-500 words each) for a community magazine. The business serves ${client.services}.

Return a JSON array of exactly 3 objects, each with:
- title: a compelling article title
- hook: a 1-sentence pitch for why readers will care
- angle: a 1-sentence direction/angle for the piece

Return ONLY valid JSON, no prose, no markdown fences.`;

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

    if (!res.ok) return NextResponse.json({ topics: fallbackTopics(client) });
    const j = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("");
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const topics = JSON.parse(match[0]);
        if (Array.isArray(topics)) return NextResponse.json({ topics });
      } catch { /* fall through */ }
    }
    return NextResponse.json({ topics: fallbackTopics(client) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "topics generation failed" },
      { status: 500 },
    );
  }
}

function fallbackTopics(client: Record<string, unknown>): Array<{ title: string; hook: string; angle: string }> {
  const cat = String(client.category || "").toLowerCase();
  const name = String(client.business_name || "This business");
  if (cat.includes("dent")) {
    return [
      { title: "5 Signs You Need a Crown", hook: "Cracked, sensitive, or worn teeth can all be early warning signs.", angle: "Walk readers through what to watch for and when to act." },
      { title: "What Your Smile Says About Your Health", hook: "Oral health and systemic health are more connected than most people realize.", angle: "Share the research in plain language with practical tips." },
      { title: "Choosing the Right Dentist for Your Family", hook: "A good dental home looks different than a good one-time appointment.", angle: "Provide a checklist readers can use to evaluate their options." },
    ];
  }
  if (cat.includes("roof")) {
    return [
      { title: "How to Spot Hail Damage After a Storm", hook: "Most homeowners miss the early signs.", angle: "Teach readers a DIY ground-level inspection checklist." },
      { title: "When to Replace vs Repair Your Roof", hook: "Not every leak means a full replacement.", angle: "Share the factors that actually drive the decision." },
      { title: "Insurance Claims After a Storm — What Homeowners Need to Know", hook: "The first call you make matters more than you think.", angle: "Outline the claim process from first call to final payout." },
    ];
  }
  return [
    { title: `The ${name} Story`, hook: "How a community business earns loyalty over time.", angle: "Profile with lessons for small business readers." },
    { title: `What ${client.city || "Local"} Gets Right About Quality`, hook: "Community businesses set a standard that national chains can't match.", angle: "Show what makes local service distinctive." },
    { title: `Three Things to Ask Before Choosing a ${client.category || "Provider"}`, hook: "The right questions save time and money.", angle: "Give readers a short, actionable checklist." },
  ];
}
