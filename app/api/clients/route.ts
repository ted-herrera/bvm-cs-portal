import { NextResponse } from "next/server";
import { getClients } from "@/lib/mock-data";

export async function GET() {
  const clients = getClients();
  return NextResponse.json({ clients });
}
