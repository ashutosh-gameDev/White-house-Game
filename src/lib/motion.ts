// Shared Framer Motion presets so every section reveals the same way instead
// of each page inventing its own timing. Kept deliberately restrained — one
// move (fade + rise), used consistently, reads as more premium than several
// different effects competing for attention.

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
};

export const staggerChildren = (delay = 0.08) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: delay },
  },
});

export const viewportOnce = { once: true, margin: "-80px" };
