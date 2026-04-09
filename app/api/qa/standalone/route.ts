import { runQA, autofixHTML } from "@/lib/qa-engine";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    htmlContent?: string;
    autofix?: boolean;
    businessName?: string;
  };

  if (!body.htmlContent) {
    return Response.json({ error: "htmlContent is required" }, { status: 400 });
  }

  if (body.autofix) {
    const fixed = autofixHTML(body.htmlContent, body.businessName);
    const report = runQA(fixed);
    return Response.json({ report, fixedHtml: fixed });
  }

  const report = runQA(body.htmlContent);
  return Response.json({ report });
}
