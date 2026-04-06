"use client";

import { useEffect, useState } from "react";
import { getSkinTokens, type PuzzleSkinTokens } from "@/lib/puzzleSkins";
import { usePuzzleSkinOverride } from "@/contexts/PuzzleSkinContext";

// Shared in-flight promise so multiple components on the same page
// share one request, but re-fetches fresh on every page navigation.
let inflight: Promise<string> | null = null;

export function usePuzzleSkin(): PuzzleSkinTokens {
  const override = usePuzzleSkinOverride();
  const [skinKey, setSkinKey] = useState<string>(override ?? "default");

  useEffect(() => {
    // If an override key is provided via context (e.g. public profile page),
    // use it directly and skip the API fetch.
    if (override !== null) {
      setSkinKey(override);
      return;
    }

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
  }, [override]);

  return getSkinTokens(skinKey);
}
