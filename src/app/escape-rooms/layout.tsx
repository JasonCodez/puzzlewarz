import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Escape Rooms",
  description:
    "Tackle immersive online escape rooms with your team on Puzzle Warz. Solve multi-stage challenges, uncover hidden clues, and race the clock together.",
  alternates: { canonical: "https://puzzlewarz.com/escape-rooms" },
  openGraph: {
    title: "Escape Rooms | Puzzle Warz",
    description:
      "Tackle immersive online escape rooms with your team. Solve multi-stage challenges, uncover hidden clues, and race the clock together.",
    url: "https://puzzlewarz.com/escape-rooms",
    type: "website",
  },
};

export default function EscapeRoomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
