"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";

/**
 * Full-viewport blocker shown the instant a player exits a game, before
 * Unity's runtime actually tears down. Quit() frees a large chunk of WASM
 * memory synchronously and can block the main thread for a couple of
 * seconds — without this, the player just sees a frozen game frame during
 * that handoff back to /games. GameShell mounts this first and gives it
 * a paint frame before triggering the Quit()+navigate, so the player sees
 * this instead of a stuck screen. There's no real progress to report here
 * (Quit() doesn't expose one), so the bar is an indeterminate sweep.
 */
export function ExitOverlay() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[55vh] w-[55vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
      />

      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
        <Logo className="h-24 w-auto sm:h-32" />
      </div>

      <div className="absolute left-1/2 top-[68%] flex w-[min(90vw,34rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3">
        <div className="h-4 w-full overflow-hidden rounded-full border border-border bg-bg-raised shadow-[inset_0_1px_3px_rgba(0,0,0,0.7)]">
          <motion.div
            className="h-full w-1/3 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--gold-grad-bottom), var(--gold-grad-mid), var(--gold-grad-top))",
              boxShadow: "0 0 14px rgba(212,175,55,0.7)",
            }}
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <p className="text-center font-mono text-xs uppercase tracking-[0.2em] text-text-dim">
          Returning to platform…
        </p>
      </div>
    </motion.div>
  );
}
