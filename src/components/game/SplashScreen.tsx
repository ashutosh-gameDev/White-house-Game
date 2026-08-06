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
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[50vh] w-[50vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[120px]"
            style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
          />

          {bannerPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveAssetUrl(bannerPath)}
              alt={gameName}
              className="relative h-24 w-auto object-contain"
            />
          ) : (
            <h1 className="relative font-display text-3xl font-semibold italic text-text">{gameName}</h1>
          )}

          {error ? (
            <div className="relative flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <p className="max-w-xs text-xs text-text-faint">
                The Unity build for this game hasn&apos;t been deployed to this environment yet.
              </p>
            </div>
          ) : (
            <div className="relative flex w-64 flex-col gap-3">
              <div className="h-px w-full overflow-hidden bg-border">
                <motion.div
                  className="h-full bg-gold"
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
                Loading — {Math.round(progress * 100)}%
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
