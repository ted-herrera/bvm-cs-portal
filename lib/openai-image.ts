export async function generateAdImage(
  businessName: string,
  services: string[],
  vibe: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const svcText = services.filter(Boolean).slice(0, 3).join(", ");
  const prompt = `A clean, professional editorial photograph for a print magazine ad for "${businessName}".` +
    (svcText ? ` The business offers: ${svcText}.` : "") +
    (vibe ? ` Brand vibe: ${vibe}.` : "") +
    ` No text, no logos, no watermarks. Natural lighting, shallow depth of field, premium magazine quality.`;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.data?.[0];
    if (!first) return null;
    if (typeof first.url === "string") return first.url;
    if (typeof first.b64_json === "string") return `data:image/png;base64,${first.b64_json}`;
    return null;
  } catch {
    return null;
  }
}
