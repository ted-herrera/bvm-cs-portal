import { NextRequest, NextResponse } from "next/server";
import { BRUNO_INTAKE_PROMPT } from "@/lib/sbr";

export async function POST(request: NextRequest) {
  try {
    const { messages, pipeline } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const systemPrompt = pipeline
      ? `${BRUNO_INTAKE_PROMPT}\n\nPipeline context: ${JSON.stringify(pipeline)}`
      : BRUNO_INTAKE_PROMPT;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 502 });
    }

    const data = await response.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";

    return NextResponse.json({ response: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Bruno VA failed: ${message}` }, { status: 500 });
  }
}
