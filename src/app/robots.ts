import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/puzzles",
          "/puzzles/",
          "/leaderboards",
          "/leaderboards/",
          "/learn",
          "/forum",
          "/forum/posts/",
          "/escape-rooms",
          "/escape-rooms/",
          "/categories",
          "/players",
          "/daily",
          "/profile/",
        ],
        disallow: [
          "/admin/",
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/settings",
          "/messages",
          "/notifications",
          "/achievements",
          "/auth/",
          "/teams/",
          "/escape-rooms/designer",
          "/puzzles/*/planning",
        ],
      },
    ],
    sitemap: "https://puzzlewarz.com/sitemap.xml",
  };
}
