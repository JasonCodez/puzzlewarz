import type { Metadata } from "next";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const room = await prisma.escapeRoomPuzzle.findUnique({
    where: { id },
    select: { roomTitle: true, roomDescription: true },
  }).catch(() => null);

  if (!room) {
    return {
      title: "Escape Room",
      robots: { index: false, follow: false },
    };
  }

  const title = room.roomTitle || "Escape Room";
  const description = room.roomDescription
    ? room.roomDescription.slice(0, 155)
    : `Tackle this immersive team escape room challenge on Puzzle Warz.`;

  return {
    title,
    description,
    alternates: { canonical: `https://puzzlewarz.com/escape-rooms/${id}` },
    openGraph: {
      title: `${title} | Puzzle Warz`,
      description,
      url: `https://puzzlewarz.com/escape-rooms/${id}`,
      type: "website",
    },
  };
}

export default function EscapeRoomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
