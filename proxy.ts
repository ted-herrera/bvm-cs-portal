import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/",
  "/client",
  "/tearsheet",
  "/campaign",
  "/_next",
  "/favicon.ico",
  "/bvm_logo.png",
  "/bruno.png",
  "/bruno-login.png",
  "/choropleth-map.png",
  "/overview.mp4",
];

function getRoleFromCookie(cookie: string): "rep" | "admin" | null {
  try {
    const [encoded] = cookie.split(".");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    return payload.role || null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/profile") || pathname.startsWith("/clients")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const session = request.cookies.get("dc_session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = getRoleFromCookie(session);

  if (role === "rep" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
