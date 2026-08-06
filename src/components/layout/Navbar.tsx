"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/Logo";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/games", label: "Games" },
  { href: "/technologies", label: "Technologies" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-border bg-bg/90 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/">
          <Mark className="h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative py-1 text-xs font-medium uppercase tracking-[0.15em] transition-colors duration-300 ${
                  active ? "text-gold" : "text-text-dim hover:text-text"
                }`}
              >
                {item.label}
                <span
                  className={`absolute -bottom-0.5 left-0 h-px w-full origin-left bg-gold transition-transform duration-300 ease-out ${
                    active
                      ? "scale-x-100 shadow-[0_0_6px_rgba(212,175,55,0.6)]"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-text-faint sm:inline">{username}</span>
          <button
            onClick={handleLogout}
            className="hidden text-xs font-medium uppercase tracking-[0.15em] text-text-dim transition-colors hover:text-gold md:inline"
          >
            Log out
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="flex flex-col gap-1.5 md:hidden"
          >
            <span className={`h-px w-6 bg-text transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-px w-6 bg-text transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`h-px w-6 bg-text transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border bg-bg px-6 py-4 md:hidden">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-2 text-sm font-medium uppercase tracking-[0.15em] ${
                  active ? "text-gold" : "text-text-dim"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="mt-2 py-2 text-left text-sm font-medium uppercase tracking-[0.15em] text-text-dim"
          >
            Log out ({username})
          </button>
        </nav>
      )}
    </header>
  );
}
