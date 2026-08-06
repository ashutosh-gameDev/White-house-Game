"use client";

import { useMemo, useState } from "react";
import { GameCard } from "./GameCard";
import type { Game } from "@/lib/types";

export function GamesLobby({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q));
  }, [games, query]);

  return (
    <div className="flex flex-col gap-8">
      <div className="relative max-w-sm">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games…"
          className="w-full rounded-sm border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="rounded-sm border border-dashed border-border p-12 text-center text-text-dim">
          {games.length === 0 ? "No games match this filter yet." : `No games match "${query}".`}
        </div>
      )}
    </div>
  );
}
