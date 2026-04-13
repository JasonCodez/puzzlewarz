import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";
import CookieBanner from "@/components/CookieBanner";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Puzzle Warz — Daily Puzzles, Leaderboards & Multiplayer Challenges",
    template: "%s | Puzzle Warz",
  },
  description:
    "Crack the daily Gridlock File, race the clock on word puzzles, and challenge rivals in Warz mode. Earn points, climb leaderboards, and unlock achievements — free to play.",
  keywords: [
    "daily puzzle",
    "logic puzzles online",
    "word puzzle game",
    "multiplayer puzzle game",
    "team puzzles",
    "puzzle competition",
    "leaderboard puzzles",
    "brain teasers online",
    "gridlock puzzle",
    "puzzle battle",
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
    title: "Puzzle Warz — Daily Puzzles, Leaderboards & Multiplayer Challenges",
    description:
      "Crack the daily Gridlock File, race the clock on word puzzles, and challenge rivals in Warz mode. Earn points, climb leaderboards, and unlock achievements.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Puzzle Warz — Daily Puzzles, Leaderboards & Multiplayer Challenges",
    description:
      "Crack the daily Gridlock File, race the clock on word puzzles, and challenge rivals in Warz mode. Earn points, climb leaderboards, and unlock achievements.",
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
      description: "Daily logic puzzles, word challenges, and multiplayer battles. Compete for the top spot on Puzzle Warz.",
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
        <CookieBanner />
      </body>
    </html>
  );
}
