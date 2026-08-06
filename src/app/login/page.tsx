"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error?.message ?? "Login failed");
      setSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-display text-2xl font-semibold tracking-wide">
            <span className="text-gold">White</span>
            <span className="text-text">House</span>
          </p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.25em] text-text-faint">
            Private preview access
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-sm border border-border bg-surface/60 p-8 backdrop-blur-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-xs font-medium uppercase tracking-[0.15em] text-text-dim">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="rounded-sm border border-border bg-bg-raised px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-[0.15em] text-text-dim">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-sm border border-border bg-bg-raised px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-sm bg-gold px-6 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-bg transition-colors hover:bg-gold-bright disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-faint">
          Access is granted by WhiteHouse Games directly. No public registration exists.
        </p>
      </div>
    </main>
  );
}
