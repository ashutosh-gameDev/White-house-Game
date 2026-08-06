import Link from "next/link";
import { getSession } from "@/lib/session";
import { listCategories } from "@/lib/data/categories";
import { listGames } from "@/lib/data/games";
import { GameCard } from "@/components/game/GameCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealSection } from "@/components/motion/RevealSection";
import type { Game } from "@/lib/types";

const CATEGORY_BLURBS: Record<string, string> = {
  slot: "Reel-based games with configurable weights, scatter and free-spin logic, and feature toggles — the most heavily parameterized genre in the catalog.",
  card: "Turn-based and table-style games where state consistency between client and server matters more than frame rate.",
  crash: "Continuously-updating multiplier games — the clearest stress test for the realtime protocol every title shares.",
};

function blurbFor(categoryName: string) {
  const key = Object.keys(CATEGORY_BLURBS).find((k) => categoryName.toLowerCase().includes(k));
  return key ? CATEGORY_BLURBS[key] : "Part of the current build catalog.";
}

export default async function PortfolioPage() {
  const session = await getSession();
  const token = session!.token;
  const [categories, games] = await Promise.all([listCategories(token), listGames(token)]);

  const byCategory = new Map<number | "uncategorized", Game[]>();
  for (const game of games) {
    const key = game.category?.id ?? "uncategorized";
    byCategory.set(key, [...(byCategory.get(key) ?? []), game]);
  }

  return (
    <>
      <section className="border-b border-border">
        <Container className="flex flex-col gap-6 py-24">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Portfolio</span>
          <h1 className="max-w-2xl text-balance font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Working builds, organized by genre.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-text-dim">
            Everything below is a real Unity WebGL build behind our shared authentication and realtime layer —
            open one to see it load in-browser.
          </p>
        </Container>
      </section>

      {categories.length === 0 && games.length === 0 && (
        <Container className="py-24">
          <div className="rounded-sm border border-dashed border-border p-12 text-center text-text-dim">
            The portfolio is being prepared. Check back shortly, or head to{" "}
            <Link href="/contact" className="text-gold hover:text-gold-bright">
              Contact
            </Link>{" "}
            to ask directly.
          </div>
        </Container>
      )}

      {categories.map((category) => {
        const categoryGames = byCategory.get(category.id) ?? [];
        if (categoryGames.length === 0) return null;

        return (
          <RevealSection key={category.id}>
            <Container className="flex flex-col gap-8 border-b border-border py-20">
              <SectionHeading eyebrow="Genre" title={category.name} description={blurbFor(category.name)} />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categoryGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </Container>
          </RevealSection>
        );
      })}
    </>
  );
}
