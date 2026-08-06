import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealSection } from "@/components/motion/RevealSection";

const STACK = [
  {
    layer: "Client",
    name: "Unity WebGL",
    body: "Every game is authored natively in Unity and exported to WebGL — full engine feature set (physics, shaders, animation), running in an ordinary browser tab with no plugin.",
  },
  {
    layer: "Realtime",
    name: "Socket.IO",
    body: "One shared connection protocol across every title: authenticate, request config, send a heartbeat, get notified when a build is ready. A game module can extend it with its own events without touching any other game's.",
  },
  {
    layer: "Backend",
    name: "Node.js + Express",
    body: "A single REST API serves both the CRM and the website — game metadata, categories, uploads, users. Nothing game-specific lives here until a game actually needs server logic.",
  },
  {
    layer: "Data",
    name: "Prisma + SQLite",
    body: "A deliberately small schema — users, games, categories, settings. Each game's tuning values live in a JSON configuration column, versioned, validated per-game once that game has real logic.",
  },
  {
    layer: "Frontends",
    name: "Next.js + TypeScript",
    body: "Both the website and the internal CRM are Next.js apps talking to the same backend over plain HTTP — no shared runtime, no monorepo, so either can be redeployed independently.",
  },
];

export default function TechnologiesPage() {
  return (
    <>
      <section className="border-b border-border">
        <Container className="flex flex-col gap-6 py-24">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Technologies</span>
          <h1 className="max-w-2xl text-balance font-display text-4xl font-semibold leading-tight sm:text-5xl">
            The stack behind every build.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-text-dim">
            Nothing exotic — a small set of well-understood tools, applied the same way across every game so
            integration effort stays flat as the catalog grows.
          </p>
        </Container>
      </section>

      <RevealSection>
        <Container className="flex flex-col divide-y divide-border py-8">
          {STACK.map((item) => (
            <div key={item.name} className="grid grid-cols-1 gap-4 py-10 sm:grid-cols-[160px_1fr]">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold">{item.layer}</span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-text">{item.name}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-dim">{item.body}</p>
              </div>
            </div>
          ))}
        </Container>
      </RevealSection>
    </>
  );
}
