import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { logoUrl, selectedLook, tagline, occasion, services, cta, confettiFired } =
    body as {
      logoUrl?: string;
      selectedLook?: string;
      tagline?: string;
      occasion?: string;
      services?: string;
      cta?: string;
      confettiFired?: boolean;
    };

  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const logEntries: string[] = [];

  if (logoUrl !== undefined) {
    updates.logoUrl = logoUrl;
    updates.hasLogo = true;
    logEntries.push("Logo uploaded");
  }
  if (selectedLook !== undefined) {
    updates.selectedLook = selectedLook;
    logEntries.push(`Look updated to ${selectedLook}`);
  }
  if (tagline !== undefined) {
    const sbr = (client.sbrData || {}) as Record<string, unknown>;
    updates.sbrData = { ...sbr, suggestedTagline: tagline };
    logEntries.push(`Tagline set: ${tagline}`);
  }
  if (occasion !== undefined && client.intakeAnswers) {
    updates.intakeAnswers = { ...client.intakeAnswers, q8: occasion };
  }
  if (services !== undefined && client.intakeAnswers) {
    updates.intakeAnswers = { ...(updates.intakeAnswers as Record<string, string> || client.intakeAnswers), q3: services };
  }
  if (cta !== undefined && client.intakeAnswers) {
    updates.intakeAnswers = { ...(updates.intakeAnswers as Record<string, string> || client.intakeAnswers), q4: cta };
  }
  if (confettiFired !== undefined) {
    updates.confettiFired = confettiFired;
  }

  const newNotes = logEntries.map((text) => ({
    from: "system",
    text,
    timestamp: new Date().toISOString(),
  }));

  if (newNotes.length > 0) {
    updates.internalNotes = [...client.internalNotes, ...newNotes];
  }

  const updated = await updateClient(id, updates);
  return NextResponse.json({ success: true, client: updated });
}
