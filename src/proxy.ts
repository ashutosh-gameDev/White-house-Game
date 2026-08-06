import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Default-deny gate: EVERY route requires a session cookie, including Home,
// About, Technologies, and Contact — this is a fully private site, not a
// public marketing site with a gated portfolio section. Only /login and the
// auth API routes that issue/clear the cookie are exempt. See
// ARCHITECTURE.md §7 ("Design decision (confirmed)").
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // The static-file exclusion matters here specifically: the login page
  // needs to show a logo image *before* a session cookie exists, so
  // public/ assets (and the favicon) must never be gated the same way pages are.
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
