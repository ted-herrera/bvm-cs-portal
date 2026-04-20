import { NextRequest, NextResponse } from "next/server";
import { CAMPAIGN_USERS } from "@/lib/campaign";

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 });
    }

    const trimmed = username.trim();
    const user = CAMPAIGN_USERS.find(
      (u) => u.username.toLowerCase() === trimmed.toLowerCase(),
    );

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
    }

    const payload = { username: user.username, role: user.role };
    const res = NextResponse.json({ success: true, role: user.role, username: user.username });

    res.cookies.set("campaign_user", JSON.stringify(payload), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
