import { NextResponse } from "next/server";
import { addBuildMessage, getBuildMessages } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const buildId = searchParams.get("buildId");
  if (!buildId) {
    return NextResponse.json({ error: "buildId required" }, { status: 400 });
  }
  return NextResponse.json({ messages: await getBuildMessages(buildId) });
}

export async function POST(request: Request) {
  const { buildId, from, text } = (await request.json()) as {
    buildId: string;
    from: "rep" | "dev";
    text: string;
  };
  if (!buildId || !from || !text) {
    return NextResponse.json(
      { error: "buildId, from, and text required" },
      { status: 400 },
    );
  }
  const msg = {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    buildId,
    from,
    text,
    timestamp: new Date().toISOString(),
  };
  await addBuildMessage(msg);
  return NextResponse.json({ success: true, message: msg });
}
