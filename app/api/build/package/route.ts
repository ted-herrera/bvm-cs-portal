import { NextResponse } from "next/server";
import { getClient } from "@/lib/mock-data";
import { generateSiteHTML } from "@/lib/studio-engine";
import { generateDevPack, generateDevPackFilename } from "@/lib/dev-pack";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const client = getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const lookKey = (client.selectedLook || "professional") as "warm_bold" | "professional" | "bold_modern";
  const siteHTML = generateSiteHTML(client, lookKey);
  const pack = generateDevPack(client, siteHTML);
  const filename = generateDevPackFilename(client);

  return new NextResponse(pack, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
