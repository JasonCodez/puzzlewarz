import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Players",
  description:
    "Browse the Puzzle Warz player directory. Discover top solvers, view player profiles, and see who's climbing the leaderboards.",
  alternates: { canonical: "https://puzzlewarz.com/players" },
  openGraph: {
    title: "Players | Puzzle Warz",
    description:
      "Browse the player directory. Discover top solvers, view player profiles, and see who's climbing the leaderboards.",
    url: "https://puzzlewarz.com/players",
    type: "website",
  },
};

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
