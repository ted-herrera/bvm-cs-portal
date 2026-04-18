export async function POST(request: Request) {
  const { businessName, city, message } = (await request.json()) as {
    businessName: string;
    city: string;
    message?: string;
  };

  const apiKey = process.env.HANDWRYTTEN_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Handwrytten not configured" }, { status: 500 });
  }

  const cardMessage = message || `Hi ${businessName},\n\nThank you for partnering with Best Version Media for your print campaign in ${city}. We're excited to help you reach your neighborhood!\n\nWarmly,\nYour BVM Team`;

  try {
    const res = await fetch("https://api.handwrytten.com/v2/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        card_id: "default",
        message: cardMessage,
        recipient: {
          name: businessName,
          city: city,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[send-card] Handwrytten error:", err);
      return Response.json({ error: "Card send failed" }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("[send-card] Error:", e);
    return Response.json({ error: "Card send failed" }, { status: 500 });
  }
}
