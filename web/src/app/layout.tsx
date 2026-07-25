import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// LinearDesign.md: Inter Variable (full axis — the 510/590 stops need the
// variable font) with cv01/ss03/zero features; JetBrains Mono substitutes
// Berkeley Mono for IDs, shortcuts, and technical metadata only.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "CO_ Network — Every business in Coral Gables, mapped",
  description:
    "A relationship network for the Coral Gables business ecosystem. Claim your business, correct your data, see how you stand, and find the connections that matter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
