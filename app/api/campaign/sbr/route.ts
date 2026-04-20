import { NextRequest, NextResponse } from "next/server";
import { SBR_SYSTEM_PROMPT } from "@/lib/sbr";

export async function POST(request: NextRequest) {
  try {
    const { businessName, city, zip, category } = await request.json();

    if (!businessName || !category) {
      return NextResponse.json(
        { error: "businessName and category are required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        temperature: 0.5,
        system: SBR_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Run Bruno SBR for: ${businessName} | ${category} | ${city || "Unknown"} | ${zip || "Unknown"}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 502 });
    }

    const data = await response.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";

    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `SBR failed: ${message}` }, { status: 500 });
  }
}
