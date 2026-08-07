"use client";

import { AnimatePresence, motion } from "framer-motion";
import { resolveAssetUrl } from "@/lib/assetUrl";

interface SplashScreenProps {
  visible: boolean;
  gameName: string;
  bannerPath: string | null;
  progress: number;
  error: string | null;
}

export function SplashScreen({ visible, gameName, bannerPath, progress, error }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-10 overflow-hidden bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {bannerPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveAssetUrl(bannerPath)}
              alt={gameName}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[50vh] w-[50vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[120px]"
              style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
            />
          )}

          {/* Readability scrim over the full-bleed banner — the loader and any
              text sit on top of this, not the raw image. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/80"
          />

          <div className="relative flex h-full w-full flex-col items-center justify-end gap-6 pb-20">
            {!bannerPath && (
              <h1 className="font-display text-3xl font-semibold italic text-text">{gameName}</h1>
            )}

            {error ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-red-400">{error}</p>
                <p className="max-w-xs text-xs text-text-faint">
                  The Unity build for this game hasn&apos;t been deployed to this environment yet.
                </p>
              </div>
            ) : (
              <div className="flex w-80 max-w-[80vw] flex-col gap-3">
                <div className="h-3 w-full overflow-hidden rounded-full border border-border bg-bg-raised/90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.7)] backdrop-blur-sm">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--gold-grad-bottom), var(--gold-grad-mid), var(--gold-grad-top))",
                      boxShadow: "0 0 14px rgba(212,175,55,0.7)",
                    }}
                    animate={{ width: `${Math.round(progress * 100)}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <p className="text-center font-mono text-xs uppercase tracking-[0.2em] text-text">
                  Loading — {Math.round(progress * 100)}%
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
