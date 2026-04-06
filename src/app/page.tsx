import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Puzzle Warz - Solve Challenges, Compete & Win",
  description:
    "Crack ARG-style puzzles solo or with your team. Earn points, climb real-time leaderboards, and unlock achievements on the ultimate multiplayer puzzle platform.",
  alternates: { canonical: "https://puzzlewarz.com" },
  openGraph: {
    title: "Puzzle Warz - Solve Challenges, Compete & Win",
    description:
      "Crack ARG-style puzzles solo or with your team. Earn points, climb real-time leaderboards, and unlock achievements.",
    url: "https://puzzlewarz.com",
    type: "website",
  },
};

export default function Home() {
  return <HomeClient />;
}