import Link from "next/link";
import { getSession } from "@/lib/session";
import { listGames } from "@/lib/data/games";
import { GameRail } from "@/components/game/GameRail";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealSection } from "@/components/motion/RevealSection";

const CAPABILITIES = [
  { label: "Rendering", value: "Unity WebGL" },
  { label: "Realtime layer", value: "Socket.IO" },
  { label: "Genres in build", value: "Slots · Cards · Crash" },
  { label: "Delivery", value: "Browser, no install" },
];

const TECH_STRIP = ["Unity", "Socket.IO", "Node.js", "Next.js", "Prisma", "TypeScript"];

export default async function HomePage() {
  const session = await getSession();
  const featuredGames = await listGames(session!.token, { featured: true });
  // Fall back to the general catalog so the homepage isn't empty just
  // because nobody's flagged a game "featured" in the CRM yet — still live,
  // CRM-managed data either way, never anything hardcoded.
  const spotlightGames = featuredGames.length > 0 ? featuredGames : await listGames(session!.token);

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-10%] top-[-20%] h-[60vh] w-[60vh] rounded-full opacity-25 blur-[140px]"
          style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
        />
        <Container className="relative flex min-h-[80vh] flex-col justify-center gap-8 py-24">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Unity WebGL Game Studio</span>
          <h1 className="max-w-3xl text-balance font-display text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
            Casino-grade games, built for the <em className="text-gold not-italic">browser</em>.
          </h1>
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
      </section>

      <RevealSection>
        <Container className="grid grid-cols-2 gap-8 border-y border-border py-12 sm:grid-cols-4">
          {CAPABILITIES.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">{item.label}</span>
              <span className="font-display text-lg text-text">{item.value}</span>
            </div>
          ))}
        </Container>
      </RevealSection>

      <RevealSection>
        <Container className="flex flex-col gap-10 py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Selected work"
              title={featuredGames.length > 0 ? "Featured builds" : "In the catalog"}
              description="A sample of what's currently in the portfolio. Every title here is a working Unity WebGL build, not a mockup."
            />
            <Link href="/portfolio" className="text-sm font-medium uppercase tracking-[0.1em] text-gold hover:text-gold-bright">
              View all →
            </Link>
          </div>

          {spotlightGames.length > 0 ? (
            <GameRail games={spotlightGames} />
          ) : (
            <div className="rounded-sm border border-dashed border-border p-12 text-center text-text-dim">
              The portfolio is being prepared. Check back shortly, or head to{" "}
              <Link href="/contact" className="text-gold hover:text-gold-bright">
                Contact
              </Link>{" "}
              to ask directly.
            </div>
          )}
        </Container>
      </RevealSection>

      <RevealSection>
        <Container className="flex flex-col gap-8 border-t border-border py-20">
          <SectionHeading eyebrow="Under the hood" title="Built on one stack, end to end" />
          <div className="flex flex-wrap gap-3">
            {TECH_STRIP.map((tech) => (
              <span
                key={tech}
                className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-text-dim"
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
