export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`flex flex-col gap-4 ${align === "center" ? "items-center text-center" : "items-start"}`}>
      {eyebrow && (
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-gold">{eyebrow}</span>
      )}
      <h2 className="text-balance font-display text-3xl font-semibold leading-tight text-text sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className={`max-w-2xl text-base leading-relaxed text-text-dim ${align === "center" ? "mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </div>
  );
}
