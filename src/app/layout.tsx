import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const siteUrl = "https://puzzlewarz.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Puzzle Warz — Solve Challenges, Compete & Win",
    template: "%s | Puzzle Warz",
  },
  description:
    "Daily logic puzzles. Find the hidden rule, crack the grid, see how you rank. Free to play — Puzzle Warz.",
  keywords: [
    "puzzle platform",
    "online puzzles",
    "ARG puzzles",
    "multiplayer puzzle game",
    "team puzzles",
    "puzzle competition",
    "escape room online",
    "logic puzzles",
    "cryptic challenges",
    "leaderboard puzzles",
  ],
  authors: [{ name: "Puzzle Warz", url: siteUrl }],
  creator: "Puzzle Warz",
  publisher: "Puzzle Warz",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Puzzle Warz",
    title: "Puzzle Warz — Crack Today's Gridlock File",
    description:
      "Daily logic puzzles. Find the hidden rule, crack the grid, see how you rank. Free to play.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Puzzle Warz — Crack Today's Gridlock File",
    description:
      "Daily logic puzzles. Find the hidden rule, crack the grid, see how you rank. Free to play.",
  },
  icons: {
    icon: "/images/puzzle_warz_logo.png",
    apple: "/apple-icon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Puzzle Warz",
      url: siteUrl,
      description: "The ultimate multiplayer puzzle platform for ARG-style challenges.",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/puzzles?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Puzzle Warz",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/images/puzzle_warz_logo.png`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
