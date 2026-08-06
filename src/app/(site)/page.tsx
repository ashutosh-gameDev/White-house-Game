import Link from "next/link";
import { getSession } from "@/lib/session";
import { listGames } from "@/lib/data/games";
import { listCategories } from "@/lib/data/categories";
import { GameCard } from "@/components/game/GameCard";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { RevealSection } from "@/components/motion/RevealSection";

const TECH_STRIP = ["Unity", "Socket.IO", "Node.js", "Next.js", "Prisma", "TypeScript"];

export default async function HomePage() {
  const session = await getSession();
  const token = session!.token;

  const [featuredGames, allGames, categories] = await Promise.all([
    listGames(token, { featured: true }),
    listGames(token),
    listCategories(token),
  ]);
  // Fall back to the general catalog so the homepage isn't empty just
  // because nobody's flagged a game "featured" in the CRM yet — still live,
  // CRM-managed data either way, never anything hardcoded.
  const spotlightGames = (featuredGames.length > 0 ? featuredGames : allGames).slice(0, 8);

  // Real, live numbers — not invented usage stats. See ARCHITECTURE.md
  // non-goals: no player analytics exist to report here even if we wanted to.
  const stats = [
    { value: String(allGames.length), label: "Games in catalog" },
    { value: String(categories.length), label: "Genres covered" },
    { value: "WebGL", label: "Rendering" },
    { value: "Realtime", label: "Socket.IO layer" },
  ];

  return (
    <>
      {/* GAMES FIRST — a client logging in should see the product immediately,
          not a paragraph of marketing copy. Studio narrative follows below. */}
      <section className="relative overflow-hidden border-b border-border">
        <AmbientBackground />
        <Container className="relative flex flex-col gap-8 pb-16 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">
                {featuredGames.length > 0 ? "Featured builds" : "Live in the catalog"}
              </span>
              <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
                Open a build below — every one runs in-browser, right now.
              </h1>
            </div>
            <Link
              href="/games"
              className="group relative py-1 text-sm font-medium uppercase tracking-[0.1em] text-gold hover:text-gold-bright"
            >
              View full catalog →
            </Link>
          </div>

          {spotlightGames.length > 0 ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {spotlightGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-12 text-center text-text-dim">
              The portfolio is being prepared. Check back shortly, or head to{" "}
              <Link href="/contact" className="text-gold hover:text-gold-bright">
                Contact
              </Link>{" "}
              to ask directly.
            </div>
          )}
        </Container>
      </section>

      <RevealSection>
        <Container className="flex flex-col gap-8 py-20">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Unity WebGL Game Studio</span>
          <h2 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.1] sm:text-5xl">
            Casino-grade games, built for the <em className="text-gold not-italic">browser</em>.
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-text-dim">
            WhiteHouse Games designs and builds Unity WebGL titles — slots, card games, and crash mechanics — wired
            to a real-time backend from the first prototype. This preview is private, built for operators evaluating
            us directly.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <LinkButton href="/portfolio" variant="solid">
              View portfolio
            </LinkButton>
            <LinkButton href="/contact" variant="outline">
              Get in touch
            </LinkButton>
          </div>
        </Container>
      </RevealSection>

      <SectionDivider />

      <RevealSection>
        <Container className="grid grid-cols-2 gap-8 py-16 sm:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="flex flex-col gap-1.5 rounded-md border border-border bg-surface px-5 py-6">
              <span className="font-display text-3xl font-semibold text-gold-bright">{item.value}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">{item.label}</span>
            </div>
          ))}
        </Container>
      </RevealSection>

      <SectionDivider />

      <RevealSection>
        <Container className="flex flex-col gap-8 py-20">
          <SectionHeading eyebrow="Under the hood" title="Built on one stack, end to end" />
          <div className="flex flex-wrap gap-3">
            {TECH_STRIP.map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-text-dim"
              >
                {tech}
              </span>
            ))}
          </div>
          <Link href="/technologies" className="text-sm font-medium uppercase tracking-[0.1em] text-gold hover:text-gold-bright">
            See the full stack →
          </Link>
        </Container>
      </RevealSection>
    </>
  );
}
