export async function POST(request: Request) {
  const { messages, pipeline } = (await request.json()) as {
    messages: Array<{ role: string; content: string }>;
    pipeline: unknown;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const system = `You are Bruno, BVM's campaign intelligence assistant. You help CS reps manage print campaigns, understand market data, track client health, and grow their book of business.

You have access to this rep's campaign pipeline:
${JSON.stringify(pipeline, null, 2)}

Be direct, data-driven, specific. Never generic. When asked about at-risk clients, look at days since last activity, stage changes, and health scores. When asked about opportunities, look at opportunity scores and market data.`;

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
        max_tokens: 1024,
        temperature: 0.5,
        system,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    let text = "";
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block?.type === "text" && typeof block.text === "string") {
          text += block.text;
        }
      }
    }

    return Response.json({ response: text });
  } catch (e) {
    console.error("[campaign/bruno-va] Error:", e);
    return Response.json({ error: "Bruno VA failed" }, { status: 500 });
  }
}
