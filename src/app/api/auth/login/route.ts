import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { SESSION_COOKIE } from "@/lib/session";
import type { SafeUser } from "@/lib/types";

// Matches RMBackend's JWT_EXPIRES_IN default (7d) — see .env.example on both repos.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Username and password are required" } },
      { status: 400 },
    );
  }

  try {
    const { token, user } = await apiFetch<{ token: string; user: SafeUser }>("/api/auth/login", {
      method: "POST",
      body: { username: body.username, password: body.password },
    });

    const response = NextResponse.json({ data: { user } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Could not reach the backend" } },
      { status: 502 },
    );
  }
}
