export async function POST(request: Request) {
  const { messages, system, model, temperature } = (await request.json()) as {
    messages: { role: string; content: string }[];
    system?: string;
    model?: string;
    temperature?: number;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 1024,
      temperature: temperature ?? 0.7,
      system: system || undefined,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const text =
    data.content?.[0]?.type === "text" ? data.content[0].text : "";

  return Response.json({ response: text });
}
