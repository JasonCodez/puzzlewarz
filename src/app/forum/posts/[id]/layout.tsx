import type { Metadata } from "next";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const post = await prisma.forumPost.findUnique({
    where: { id },
    select: {
      title: true,
      content: true,
      author: { select: { name: true } },
    },
  }).catch(() => null);

  if (!post) {
    return {
      title: "Discussion",
      robots: { index: false, follow: false },
    };
  }

  const title = post.title || "Discussion";
  const description = post.content
    ? post.content.replace(/[#*>\[\]`]/g, "").slice(0, 155)
    : `Join the discussion on Puzzle Warz.`;

  return {
    title,
    description,
    alternates: { canonical: `https://puzzlewarz.com/forum/posts/${id}` },
    openGraph: {
      title: `${title} | Puzzle Warz Forum`,
      description,
      url: `https://puzzlewarz.com/forum/posts/${id}`,
      type: "article",
    },
  };
}

export default function ForumPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
