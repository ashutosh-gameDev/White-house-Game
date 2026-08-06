import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">404</span>
      <h1 className="font-display text-3xl font-semibold text-text">This page doesn&apos;t exist.</h1>
      <Link href="/" className="text-sm font-medium uppercase tracking-[0.1em] text-gold hover:text-gold-bright">
        ← Back to home
      </Link>
    </main>
  );
}
