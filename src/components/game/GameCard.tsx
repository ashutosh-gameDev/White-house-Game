import Link from "next/link";
import type { Game } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-sm border border-border bg-surface transition-colors duration-300 hover:border-gold-dim"
    >
      <div className="relative aspect-video overflow-hidden bg-bg-raised">
        {game.thumbnailPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${BACKEND_URL}${game.thumbnailPath}`}
            alt={game.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--color-surface-2),var(--color-bg-raised))]">
            <span className="font-display text-lg italic text-text-faint">{game.name}</span>
          </div>
        )}
        {game.isFeatured && (
          <span className="absolute left-3 top-3 rounded-sm bg-gold px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-bg">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        {game.category && (
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">{game.category.name}</span>
        )}
        <h3 className="font-display text-lg font-semibold text-text group-hover:text-gold-bright">{game.name}</h3>
        {game.description && <p className="line-clamp-2 text-sm text-text-dim">{game.description}</p>}
      </div>
    </Link>
  );
}
