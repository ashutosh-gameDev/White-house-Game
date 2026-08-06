import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "solid" | "outline" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  solid:
    "text-bg bg-[linear-gradient(180deg,var(--gold-grad-top),var(--gold-grad-mid)_55%,var(--gold-grad-bottom))] " +
    "shadow-[0_4px_16px_-4px_rgba(212,175,55,0.35)] " +
    "hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_28px_-6px_rgba(212,175,55,0.55)]",
  outline:
    "border border-gold-dim bg-transparent text-gold " +
    "hover:bg-gold hover:text-bg hover:border-gold hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_rgba(212,175,55,0.4)]",
  ghost: "text-text-dim hover:text-gold",
};

export function Button({
  variant = "solid",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "solid",
  className = "",
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; href: string }) {
  return <Link href={href} className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
