import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "See who's crushing the competition on Puzzle Warz. Real-time global and team leaderboards ranked by points, puzzle completions, and speed.",
  alternates: { canonical: "https://puzzlewarz.com/leaderboards" },
  openGraph: {
    title: "Leaderboards | Puzzle Warz",
    description:
      "Real-time global and team leaderboards ranked by points, puzzle completions, and speed.",
    url: "https://puzzlewarz.com/leaderboards",
    type: "website",
  },
};

export default function LeaderboardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
