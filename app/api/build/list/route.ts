import { NextResponse } from "next/server";
import { getAllBuilds } from "@/lib/store";

export async function GET() {
  const builds = (await getAllBuilds()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return NextResponse.json({ builds });
}
