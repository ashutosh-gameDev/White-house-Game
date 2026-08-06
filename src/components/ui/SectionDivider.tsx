export function SectionDivider() {
  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      <span className="h-px w-full max-w-[280px] bg-gradient-to-r from-transparent via-border-strong to-transparent" />
      <span className="mx-3 h-1.5 w-1.5 shrink-0 rotate-45 border border-gold-dim bg-gold/20" />
      <span className="h-px w-full max-w-[280px] bg-gradient-to-l from-transparent via-border-strong to-transparent" />
    </div>
  );
}
