import { runQA } from "@/lib/qa-engine";
import { updateClient, getClient } from "@/lib/mock-data";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    htmlContent?: string;
    clientId?: string;
  };

  const { htmlContent, clientId } = body;

  if (!htmlContent) {
    return Response.json({ error: "htmlContent is required" }, { status: 400 });
  }

  const report = runQA(htmlContent);

  // If clientId provided, attach report to profile
  if (clientId) {
    const client = getClient(clientId);
    if (client) {
      const updates: Record<string, unknown> = { qaReport: report };
      if (report.passed) {
        updates.qa_passed_at = new Date().toISOString();
      }
      updateClient(clientId, updates);
    }
  }

  return Response.json({ report });
}
