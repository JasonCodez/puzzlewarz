import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export const revalidate = 3600; // regenerate sitemap at most once per hour

const BASE = "https://puzzlewarz.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static public routes ─────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/puzzles`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/daily`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/leaderboards`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/escape-rooms`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/forum`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/players`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
  ];

  // ── Dynamic routes ────────────────────────────────────────────────────────
  let puzzleRoutes: MetadataRoute.Sitemap = [];
  let escapeRoomRoutes: MetadataRoute.Sitemap = [];
  let forumRoutes: MetadataRoute.Sitemap = [];

  try {
    const puzzles = await prisma.puzzle.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    puzzleRoutes = puzzles.map((p) => ({
      url: `${BASE}/puzzles/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time — skip dynamic puzzle routes
  }

  try {
    const rooms = await prisma.escapeRoomPuzzle.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    escapeRoomRoutes = rooms.map((r) => ({
      url: `${BASE}/escape-rooms/${r.id}`,
      lastModified: r.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable at build time — skip dynamic escape room routes
  }

  try {
    const posts = await prisma.forumPost.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500, // cap at 500 most-recent posts
    });
    forumRoutes = posts.map((p) => ({
      url: `${BASE}/forum/posts/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    // DB unavailable at build time — skip dynamic forum routes
  }

  return [...staticRoutes, ...puzzleRoutes, ...escapeRoomRoutes, ...forumRoutes];
}
