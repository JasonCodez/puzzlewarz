"use client";

import dynamic from "next/dynamic";

// Must be at module level — defining dynamic() inside a component body creates
// a new component type on every render, causing the Designer to unmount/remount
// and re-initialize PIXI on every parent re-render.
const Designer = dynamic(() => import("../Designer"), { ssr: false });

export default function EscapeRoomDesignerPage() {
  return <Designer />;
}
