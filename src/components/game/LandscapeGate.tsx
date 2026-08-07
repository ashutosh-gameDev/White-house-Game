/**
 * Full-viewport "please rotate your device" overlay, shown only in portrait
 * orientation (see the `.landscape-gate` media query in globals.css — this
 * is CSS-driven, not JS resize-event-driven, so it can't be thrown off by
 * mobile browsers firing `orientationchange` before the viewport actually
 * finishes resizing). Games in this project are landscape-only; this blocks
 * play entirely rather than trying to fake landscape by rotating the game's
 * own UI 90° while the phone is still held portrait.
 */
export function LandscapeGate() {
  return (
    <div className="landscape-gate fixed inset-0 z-[150] flex-col items-center justify-center gap-6 bg-bg px-8 text-center">
      <div className="text-6xl" style={{ animation: "rotate-hint 1.8s ease-in-out infinite" }} aria-hidden>
        📱
      </div>
      <p className="font-display text-xl text-text">Rotate your device</p>
      <p className="max-w-xs text-sm text-text-dim">This game is designed for landscape mode — turn your phone sideways to play.</p>
    </div>
  );
}
