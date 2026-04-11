import { NextResponse } from "next/server";
import {
  getNotifications,
  markNotificationRead,
  dismissNotification,
} from "@/lib/store";

export async function GET() {
  return NextResponse.json({ notifications: await getNotifications() });
}

export async function POST(request: Request) {
  const { id, action } = (await request.json()) as {
    id: string;
    action: "read" | "dismiss";
  };
  if (!id || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }
  if (action === "read") await markNotificationRead(id);
  if (action === "dismiss") await dismissNotification(id);
  return NextResponse.json({ success: true });
}
