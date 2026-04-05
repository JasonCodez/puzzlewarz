"use client";

import { useEffect, useState } from "react";
import { getSkinTokens, type PuzzleSkinTokens } from "@/lib/puzzleSkins";

// Shared in-flight promise so multiple components on the same page
// share one request, but re-fetches fresh on every page navigation.
let inflight: Promise<string> | null = null;

export function usePuzzleSkin(): PuzzleSkinTokens {
  const [skinKey, setSkinKey] = useState<string>("default");

  useEffect(() => {
    let cancelled = false;
    if (!inflight) {
      inflight = fetch("/api/user/info")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => (data?.activeSkin as string) ?? "default")
        .catch(() => "default")
        .finally(() => { inflight = null; });
    }
    inflight.then((skin) => { if (!cancelled) setSkinKey(skin); });
    return () => { cancelled = true; };
  }, []);

  return getSkinTokens(skinKey);
}
