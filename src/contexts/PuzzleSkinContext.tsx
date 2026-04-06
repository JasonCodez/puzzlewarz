"use client";

import { createContext, useContext } from "react";

// When a value is provided, usePuzzleSkin will use it instead of fetching
// the logged-in user's skin. Used on public profile pages to show the
// profile owner's equipped skin to any visitor.
export const PuzzleSkinContext = createContext<string | null>(null);

export function usePuzzleSkinOverride(): string | null {
  return useContext(PuzzleSkinContext);
}
