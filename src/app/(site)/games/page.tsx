import Link from "next/link";
import { getSession } from "@/lib/session";
import { listCategories } from "@/lib/data/categories";
import { listGames } from "@/lib/data/games";
import { GamesLobby } from "@/components/game/GamesLobby";
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
      <Container className="flex flex-col gap-6 border-b border-border py-16">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Games</span>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Full catalog</h1>

        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/games"
            className={`rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition-colors ${
              !category ? "border-gold bg-gold/10 text-gold" : "border-border text-text-dim hover:text-text"
            }`}
          >
            All games
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/games?category=${c.slug}`}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition-colors ${
                category === c.slug ? "border-gold bg-gold/10 text-gold" : "border-border text-text-dim hover:text-text"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </Container>

      <Container className="py-12">
        <GamesLobby games={games} />
      </Container>
    </section>
  );
}
