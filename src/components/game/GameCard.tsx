import Link from "next/link";
import type { Game } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-md border border-border bg-surface transition-colors duration-300 hover:border-gold"
    >
      {game.thumbnailPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${BACKEND_URL}${game.thumbnailPath}`}
          alt={game.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(160deg,var(--color-surface-2),var(--color-bg-raised))] p-4 text-center">
          <span className="font-display text-lg italic text-text-faint">{game.name}</span>
        </div>
      )}

      {/* Bottom scrim for title legibility over any thumbnail */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Hover play overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-bg shadow-lg shadow-black/40 transition-transform duration-200 group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>

      {game.isFeatured && (
        <span className="absolute left-2.5 top-2.5 rounded-sm bg-gold px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-bg">
          Featured
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3.5">
        {game.category && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-bright">
            {game.category.name}
          </span>
        )}
        <h3 className="font-display text-base font-semibold leading-tight text-white">{game.name}</h3>
      </div>
    </Link>
  );
}
