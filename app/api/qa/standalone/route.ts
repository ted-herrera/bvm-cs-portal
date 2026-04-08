import { runQA } from "@/lib/qa-engine";

export async function POST(request: Request) {
  const body = (await request.json()) as { htmlContent?: string };

  if (!body.htmlContent) {
    return Response.json({ error: "htmlContent is required" }, { status: 400 });
  }

  const report = runQA(body.htmlContent);
  return Response.json({ report });
}
