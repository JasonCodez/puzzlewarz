import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forum",
  description:
    "Discuss puzzles, share strategies, and connect with fellow solvers in the Puzzle Warz community forum. Hints, spoilers, and puzzle talk welcome.",
  alternates: { canonical: "https://puzzlewarz.com/forum" },
  openGraph: {
    title: "Forum | Puzzle Warz",
    description:
      "Discuss puzzles, share strategies, and connect with fellow solvers. Hints, spoilers, and puzzle talk welcome.",
    url: "https://puzzlewarz.com/forum",
    type: "website",
  },
};

import { redirect } from "next/navigation";

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  redirect("/puzzles");
}
