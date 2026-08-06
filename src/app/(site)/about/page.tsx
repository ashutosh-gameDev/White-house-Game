import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { RevealSection } from "@/components/motion/RevealSection";

const PROCESS = [
  {
    step: "01",
    title: "Design & math spec",
    body: "Every title starts as a written spec — reel weights, payout tables, bonus triggers, feature toggles — before a single scene is built. That spec becomes the game's configuration contract.",
  },
  {
    step: "02",
    title: "Unity build",
    body: "The game is built natively in Unity and exported to WebGL. No plugins, no wrappers — it runs in a browser tab the same way it runs in the editor.",
  },
  {
    step: "03",
    title: "Realtime wiring",
    body: "Every build speaks the same Socket.IO protocol back to our backend — authentication, config delivery, and heartbeats are identical across titles, so integration effort doesn't grow with the catalog.",
  },
  {
    step: "04",
    title: "Delivery & licensing",
    body: "Once a build is approved, it's handed off for licensing and deployment on your infrastructure, or hosted as part of an ongoing arrangement — whichever fits your stack.",
  },
];

const PRINCIPLES = [
  {
    title: "Configurable at the core",
    body: "Reel weights, symbol tables, bonus math — every number that defines a game's behavior lives in a versioned configuration object, not hardcoded in the build. Tuning a game doesn't mean rebuilding it.",
  },
  {
    title: "Built for integration",
    body: "One authentication flow, one connection protocol, one config format across every title. A team integrating game #1 already knows how game #12 will behave.",
  },
  {
    title: "Browser-first",
    body: "Unity WebGL means no installers, no app stores, no platform review cycles. A build shipped today is playable from a link today.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section>
        <Container className="flex flex-col gap-6 py-24">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">About</span>
          <h1 className="max-w-2xl text-balance font-display text-4xl font-semibold leading-tight sm:text-5xl">
            We build the game and the wiring underneath it.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-text-dim">
            WhiteHouse Games is a small studio focused on one thing: Unity WebGL games that plug into a real
            backend from day one — not standalone demos that need to be rebuilt before they can go live.
          </p>
        </Container>
      </section>

      <RevealSection>
        <Container className="flex flex-col gap-12 py-24">
          <SectionHeading eyebrow="Process" title="How a title gets made" />
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            {PROCESS.map((item) => (
              <div key={item.step} className="flex gap-5">
                <span className="font-display text-3xl italic text-gold-dim">{item.step}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-text">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-dim">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </RevealSection>

      <SectionDivider />

      <RevealSection>
        <Container className="flex flex-col gap-12 py-24">
          <SectionHeading eyebrow="Principles" title="What stays the same across every game" />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {PRINCIPLES.map((item) => (
              <div
                key={item.title}
                className="rounded-md border border-border bg-surface p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]
                           transition-all duration-300 hover:-translate-y-1 hover:border-gold-dim
                           hover:shadow-[0_16px_36px_-12px_rgba(212,175,55,0.25)]"
              >
                <h3 className="font-display text-lg font-semibold text-gold-bright">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-dim">{item.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </RevealSection>
    </>
  );
}
