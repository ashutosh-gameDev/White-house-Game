"use client";

import { useRouter } from "next/navigation";

export function GameTopBar({ gameName, onExit }: { gameName: string; onExit: () => void }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg px-6 py-3">
      <button
        type="button"
        onClick={onExit}
        className="text-xs font-medium uppercase tracking-[0.15em] text-text-dim hover:text-gold"
      >
        ← Games
      </button>
      <span className="font-display text-sm italic text-text-dim">{gameName}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="text-xs font-medium uppercase tracking-[0.15em] text-text-dim hover:text-gold"
      >
        Log out
      </button>
    </header>
  );
}
