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
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
