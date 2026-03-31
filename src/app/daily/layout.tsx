import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Word Puzzle",
  description:
    "Puzzle Warz Daily — a new 5-letter word puzzle every day. Guess the word in 6 tries and share your score. Free, no sign-in required.",
  alternates: { canonical: "https://puzzlewarz.com/daily" },
  openGraph: {
    title: "Daily Word Puzzle | Puzzle Warz",
    description: "A new 5-letter word puzzle every day. Guess the word in 6 tries and share your score.",
    url: "https://puzzlewarz.com/daily",
    type: "website",
  },
};

export default function DailyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
