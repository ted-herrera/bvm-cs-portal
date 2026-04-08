import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/marketing",
  "/login",
  "/api/",
  "/qa-demo",
  "/tearsheet",
  "/client",
  "/intake",
  "/_next",
  "/favicon.ico",
  "/bvm_logo.png",
  "/bruno.png",
  "/bruno-login.png",
  "/overview.mp4",
];

function getRoleFromCookie(cookie: string): "rep" | "dev" | null {
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

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Root redirects to marketing
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/marketing", request.url));
  }

  const session = request.cookies.get("dc_session")?.value;

  // Protected routes need session
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = getRoleFromCookie(session);

  // Role-based routing
  if (role === "dev" && (pathname.startsWith("/dashboard") || pathname.startsWith("/clients"))) {
    return NextResponse.redirect(new URL("/build-queue", request.url));
  }

  if (role === "rep" && pathname.startsWith("/build-queue")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
