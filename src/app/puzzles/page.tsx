import type { Metadata } from "next";
import { Suspense } from "react";
import PuzzlesWrapper from "./puzzles-wrapper";

export const metadata: Metadata = {
  title: "All Puzzles",
  description:
    "Browse hundreds of ARG-style logic puzzles, cryptic challenges, escape rooms, and team puzzles. Filter by difficulty, category, and status to find your next challenge.",
  alternates: { canonical: "https://puzzlewarz.com/puzzles" },
  openGraph: {
    title: "All Puzzles | Puzzle Warz",
    description:
      "Browse hundreds of ARG-style logic puzzles, cryptic challenges, escape rooms, and team puzzles.",
    url: "https://puzzlewarz.com/puzzles",
    type: "website",
  },
};

export default function PuzzlesPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#020202' }} className="min-h-screen flex items-center justify-center"><p style={{ color: '#FDE74C' }}>Loading puzzles...</p></div>}>
      <PuzzlesWrapper />
    </Suspense>
  );
}

