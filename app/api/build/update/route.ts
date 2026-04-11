import { NextResponse } from "next/server";
import { getBuild, updateBuild } from "@/lib/store";

export async function PUT(request: Request) {
  const body = await request.json();
  const { buildId, editedHtml, editorStatus, qaEditedScore, qaEditedAt, qaHash, updatedAt, editHistory } = body;

  if (!buildId) {
    return NextResponse.json({ error: "buildId required" }, { status: 400 });
  }

  // Optimistic lock check
  const current = await getBuild(buildId);
  if (!current) return NextResponse.json({ error: "Build not found" }, { status: 404 });
  if (updatedAt && current.updatedAt && current.updatedAt !== updatedAt) {
    return NextResponse.json({ error: "Stale — build was modified by another user" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (editedHtml !== undefined) updates.editedHtml = editedHtml;
  if (editorStatus !== undefined) updates.editorStatus = editorStatus;
  if (qaEditedScore !== undefined) updates.qaEditedScore = qaEditedScore;
  if (qaEditedAt !== undefined) updates.qaEditedAt = qaEditedAt;
  if (qaHash !== undefined) updates.qaHash = qaHash;
  if (editHistory !== undefined) updates.editHistory = editHistory;

  const updated = await updateBuild(buildId, updates as Partial<typeof current>);
  return NextResponse.json({ build: updated });
}
