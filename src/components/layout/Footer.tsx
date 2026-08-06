import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Mark } from "@/components/brand/Logo";

const FOOTER_LINKS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/games", label: "Games" },
  { href: "/technologies", label: "Technologies" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col gap-8 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <Mark className="h-8 w-auto" />
          <p className="mt-3 text-sm leading-relaxed text-text-dim">
            Unity WebGL games, built for operators. This preview is private — access is by invitation only and is
            not available to the public.
          </p>
        </div>

        <div className="flex gap-16">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-faint">Site</span>
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-text-dim hover:text-gold">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
      <Container className="border-t border-border py-6">
        <p className="text-xs text-text-faint">
          © {new Date().getFullYear()} WhiteHouse Games. All builds shown are demonstration software.
        </p>
      </Container>
    </footer>
  );
}
