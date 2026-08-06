/** The wide building+arc crop, no text — for small/ambient placements
 *  (navbar, footer) where the full lockup's text is too fine to read. */
export function Mark({ className = "h-9 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-mark-wide.png" alt="WhiteHouse Games" className={className} />;
}

/** The full brand lockup (building, arc, cards/chip, wordmark, "Casino
 *  Platform" line) — for the login page and other large, deliberate placements. */
export function Logo({ className = "h-40 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="WhiteHouse Games — Casino Platform" className={className} />;
}
