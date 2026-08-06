"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function GameTopBar({ gameName }: { gameName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg px-6 py-3">
      <Link
        href="/portfolio"
        className="text-xs font-medium uppercase tracking-[0.15em] text-text-dim hover:text-gold"
      >
        ← Portfolio
      </Link>
      <span className="font-display text-sm italic text-text-dim">{gameName}</span>
      <button
        onClick={handleLogout}
        className="text-xs font-medium uppercase tracking-[0.15em] text-text-dim hover:text-gold"
      >
        Log out
      </button>
    </header>
  );
}
