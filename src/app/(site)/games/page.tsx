import Link from "next/link";
import { getSession } from "@/lib/session";
import { listCategories } from "@/lib/data/categories";
import { listGames } from "@/lib/data/games";
import { GameCard } from "@/components/game/GameCard";
import { Container } from "@/components/ui/Container";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const session = await getSession();
  const token = session!.token;

  const [categories, games] = await Promise.all([listCategories(token), listGames(token, { category })]);

  return (
    <section>
      <Container className="flex flex-col gap-6 border-b border-border py-20">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Games</span>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Full catalog</h1>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/games"
            className={`rounded-sm border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition-colors ${
              !category ? "border-gold text-gold" : "border-border text-text-dim hover:text-text"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/games?category=${c.slug}`}
              className={`rounded-sm border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition-colors ${
                category === c.slug ? "border-gold text-gold" : "border-border text-text-dim hover:text-text"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </Container>

      <Container className="py-16">
        {games.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-border p-12 text-center text-text-dim">
            No games match this filter yet.
          </div>
        )}
      </Container>
    </section>
  );
}
