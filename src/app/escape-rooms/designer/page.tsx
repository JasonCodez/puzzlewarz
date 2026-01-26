"use client";

import dynamic from "next/dynamic";

export default function EscapeRoomDesignerPage() {
  // Dynamically import the designer to ensure client-side rendering
  const Designer = dynamic(() => import("../Designer"), { ssr: false });
  return <Designer />;
}
