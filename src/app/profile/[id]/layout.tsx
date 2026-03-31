import type { Metadata } from "next";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true },
  }).catch(() => null);

  const name = user?.name ?? "Player";
  const title = `${name}'s Profile`;
  const description = `View ${name}'s puzzle stats, achievements, and leaderboard ranking on Puzzle Warz.`;

  return {
    title,
    description,
    alternates: { canonical: `https://puzzlewarz.com/profile/${id}` },
    openGraph: {
      title: `${title} | Puzzle Warz`,
      description,
      url: `https://puzzlewarz.com/profile/${id}`,
      type: "profile",
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
