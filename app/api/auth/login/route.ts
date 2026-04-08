import { cookies } from "next/headers";
import { USERS, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body as { username: string; password: string };

  if (!username || !password) {
    return Response.json({ error: "Missing credentials" }, { status: 400 });
  }

  const normalizedUser = username.toLowerCase().trim();
  const user = USERS.find((u) => u.username === normalizedUser && u.password === password);

  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signToken(user);
  const cookieStore = await cookies();
  cookieStore.set("dc_session", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ success: true, username: user.username, role: user.role });
}
