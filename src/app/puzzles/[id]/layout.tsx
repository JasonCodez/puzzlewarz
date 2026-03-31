import type { Metadata } from "next";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const puzzle = await prisma.puzzle.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      difficulty: true,
      puzzleType: true,
      category: { select: { name: true } },
    },
  }).catch(() => null);

  if (!puzzle) {
    return {
      title: "Puzzle",
      robots: { index: false, follow: false },
    };
  }

  const title = puzzle.title || "Puzzle";
  const description =
    puzzle.description
      ? puzzle.description.slice(0, 155)
      : `A ${puzzle.difficulty} ${puzzle.puzzleType?.replace(/_/g, " ")} puzzle in the ${puzzle.category?.name ?? "General"} category on Puzzle Warz.`;

  return {
    title,
    description,
    alternates: { canonical: `https://puzzlewarz.com/puzzles/${id}` },
    openGraph: {
      title: `${title} | Puzzle Warz`,
      description,
      url: `https://puzzlewarz.com/puzzles/${id}`,
      type: "website",
    },
  };
}

export default function PuzzleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
