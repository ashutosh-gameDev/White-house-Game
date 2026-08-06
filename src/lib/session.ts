import "server-only";
import { cookies } from "next/headers";
import type { SafeUser } from "./types";
import { apiFetch } from "./api";

export const SESSION_COOKIE = "wh_session";

/** Reads the session cookie and asks the backend who it belongs to.
 *  Returns null if there's no cookie, or the token is missing/expired/disabled. */
export async function getSession(): Promise<{ token: string; user: SafeUser } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const user = await apiFetch<SafeUser>("/api/auth/me", { token });
    return { token, user };
  } catch {
    return null;
  }
}
