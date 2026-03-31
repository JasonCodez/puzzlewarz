import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Puzzle Categories",
  description:
    "Explore Puzzle Warz by category — logic, cryptography, ARG chains, escape rooms, team challenges, and more. Find the puzzle type that suits your style.",
  alternates: { canonical: "https://puzzlewarz.com/categories" },
  openGraph: {
    title: "Puzzle Categories | Puzzle Warz",
    description:
      "Explore puzzles by category — logic, cryptography, ARG chains, escape rooms, team challenges, and more.",
    url: "https://puzzlewarz.com/categories",
    type: "website",
  },
};

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
