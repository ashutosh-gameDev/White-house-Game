import type { Metadata } from "next";
import { Bodoni_Moda, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "WhiteHouse Games — Unity Game Studio",
  description:
    "WhiteHouse Games builds Unity WebGL slot, card, and crash games for operators worldwide. This private preview is by invitation only.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full`}>
      <body className="min-h-full bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
