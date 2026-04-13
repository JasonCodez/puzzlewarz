import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Puzzle Warz - Daily Puzzles, Leaderboards & Multiplayer Challenges",
  description:
    "Crack the daily Gridlock File, race the clock on word puzzles, and battle rivals in multiplayer Warz mode. Earn points, climb leaderboards, and unlock achievements — free to play.",
  alternates: { canonical: "https://puzzlewarz.com" },
  openGraph: {
    title: "Puzzle Warz - Daily Puzzles, Leaderboards & Multiplayer Challenges",
    description:
      "Crack the daily Gridlock File, race the clock on word puzzles, and battle rivals in multiplayer Warz mode. Earn points, climb leaderboards, and unlock achievements.",
    url: "https://puzzlewarz.com",
    type: "website",
  },
};

export default function Home() {
  return <HomeClient />;
}