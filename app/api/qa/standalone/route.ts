import { runQA, autofixHTML } from "@/lib/qa-engine";
import type { BVMSiteVariables } from "@/lib/types/bvm-site-variables";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    htmlContent?: string;
    autofix?: boolean;
    businessName?: string;
    variables?: BVMSiteVariables;
  };

  if (!body.htmlContent) {
    return Response.json({ error: "htmlContent is required" }, { status: 400 });
  }

  const vars = body.variables || null;

  if (body.autofix) {
    const fixed = autofixHTML(body.htmlContent, body.businessName);
    const report = runQA(fixed, vars);
    return Response.json({ report, fixedHtml: fixed });
  }

  const report = runQA(body.htmlContent, vars);
  return Response.json({ report });
}
