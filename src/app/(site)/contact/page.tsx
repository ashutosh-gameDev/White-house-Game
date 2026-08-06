import { getSession } from "@/lib/session";
import { getPublicSettings } from "@/lib/data/settings";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

const FALLBACK_EMAIL = "hello@whitehousegames.example";

const INCLUDE = [
  "Which markets or platforms you're evaluating us for",
  "Genres you're most interested in (slots, cards, crash, or something else)",
  "Rough timeline — this changes how we sequence a demo",
];

export default async function ContactPage() {
  const session = await getSession();
  const settings = await getPublicSettings(session!.token);
  const email = settings["site.contactEmail"] || FALLBACK_EMAIL;

  return (
    <section className="flex min-h-[70vh] items-center">
      <Container className="grid grid-cols-1 gap-16 py-24 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Contact</span>
          <h1 className="text-balance font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Talk to us directly.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-text-dim">
            There's no contact form here on purpose — this is a private preview, and every prospective client
            gets a direct line, not a queue.
          </p>
          <LinkButton href={`mailto:${email}`} variant="solid" className="w-fit">
            {email}
          </LinkButton>
        </div>

        <div className="flex flex-col gap-4 rounded-sm border border-border p-8">
          <h2 className="font-display text-lg font-semibold text-text">Worth including in your first email</h2>
          <ul className="flex flex-col gap-3">
            {INCLUDE.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-text-dim">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
