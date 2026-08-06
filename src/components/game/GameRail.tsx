import { GameCard } from "./GameCard";
import type { Game } from "@/lib/types";

export function GameRail({ games }: { games: Game[] }) {
  return (
    <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-2 lg:-mx-8 lg:px-8">
      {games.map((game) => (
        <div key={game.id} className="w-36 shrink-0 snap-start sm:w-44 md:w-48">
          <GameCard game={game} />
        </div>
      ))}
    </div>
  );
}
