/**
 * Purely decorative, abstract geometric shapes — a nod to roulette-wheel
 * rings and reel-line geometry without literally drawing a casino. Opacity
 * is capped low and uniformly on the wrapper so nothing here ever competes
 * with foreground content.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07]">
      {/* large ring, upper right */}
      <svg
        viewBox="0 0 800 800"
        className="absolute -right-40 -top-40 h-[560px] w-[560px] text-gold"
        fill="none"
      >
        <circle cx="400" cy="400" r="380" stroke="currentColor" strokeWidth="1" />
        <circle cx="400" cy="400" r="300" stroke="currentColor" strokeWidth="1" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x1 = 400 + Math.cos(angle) * 300;
          const y1 = 400 + Math.sin(angle) * 300;
          const x2 = 400 + Math.cos(angle) * 380;
          const y2 = 400 + Math.sin(angle) * 380;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" />;
        })}
      </svg>

      {/* scattered diamonds, lower left */}
      <svg viewBox="0 0 400 400" className="absolute -bottom-24 -left-24 h-[420px] w-[420px] text-gold" fill="none">
        <rect x="60" y="60" width="90" height="90" stroke="currentColor" strokeWidth="1" transform="rotate(45 105 105)" />
        <rect x="200" y="180" width="50" height="50" stroke="currentColor" strokeWidth="1" transform="rotate(45 225 205)" />
        <rect x="140" y="260" width="30" height="30" stroke="currentColor" strokeWidth="1" transform="rotate(45 155 275)" />
      </svg>

      {/* thin reel-line hatching, center */}
      <svg viewBox="0 0 600 200" className="absolute left-1/2 top-1/3 h-40 w-[600px] -translate-x-1/2 text-gold">
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1={i * 80} y1="0" x2={i * 80} y2="200" stroke="currentColor" strokeWidth="1" />
        ))}
      </svg>
    </div>
  );
}
