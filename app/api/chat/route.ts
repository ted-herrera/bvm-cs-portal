export async function POST(request: Request) {
  const { messages, system, model, temperature, collectedFields } =
    (await request.json()) as {
      messages: { role: string; content: string }[];
      system?: string;
      model?: string;
      temperature?: number;
      collectedFields?: Record<string, unknown>;
    };

  console.log(
    "[chat/route] Request body:",
    JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      system: system?.substring(0, 80),
      messageCount: messages.length,
      temperature,
      collectedFieldKeys: collectedFields ? Object.keys(collectedFields) : [],
    }),
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(
    "[chat/route] ANTHROPIC_API_KEY:",
    apiKey ? apiKey.substring(0, 10) + "..." : "NOT SET",
  );

  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  // If collectedFields provided, inject them into the system prompt so Bruno
  // never asks again for information we already have.
  let finalSystem = system || "";
  if (collectedFields && Object.keys(collectedFields).length > 0) {
    const knownLines: string[] = [];
    for (const [k, v] of Object.entries(collectedFields)) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v)) {
        if (v.length > 0) knownLines.push(`- ${k}: ${v.join(", ")}`);
      } else if (typeof v === "string" && v.trim()) {
        knownLines.push(`- ${k}: ${v}`);
      }
    }
    if (knownLines.length > 0) {
      finalSystem +=
        "\n\n=== ALREADY COLLECTED (DO NOT ASK AGAIN) ===\n" +
        knownLines.join("\n") +
        "\n\nThese fields have already been confirmed. NEVER ask the user for any of these again. Build on what you already know. Only ask for fields that are still missing.";
    }
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
      system: finalSystem || undefined,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[chat/route] Anthropic error:", err);
    return Response.json({ error: err }, { status: res.status });
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  // Safely extract text from all text blocks — previous code only grabbed
  // content[0], which could be a tool_use or thinking block and produced
  // an empty string response.
  let text = "";
  if (Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block?.type === "text" && typeof block.text === "string") {
        text += block.text;
      }
    }
  }

  return Response.json({ response: text });
}
