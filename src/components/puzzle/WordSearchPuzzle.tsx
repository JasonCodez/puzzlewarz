"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  puzzleId: string;
  wordSearchData: Record<string, unknown>;
  onSolved?: () => void;
  alreadySolved?: boolean;
}

type CellCoord = { row: number; col: number };

const WORD_COLORS = [
  { bg: "rgba(34,197,94,0.28)", border: "#22c55e", text: "#4ade80" },
  { bg: "rgba(59,130,246,0.28)", border: "#3b82f6", text: "#60a5fa" },
  { bg: "rgba(234,179,8,0.28)", border: "#eab308", text: "#facc15" },
  { bg: "rgba(239,68,68,0.28)", border: "#ef4444", text: "#f87171" },
  { bg: "rgba(168,85,247,0.28)", border: "#a855f7", text: "#c084fc" },
  { bg: "rgba(244,114,182,0.28)", border: "#f472b6", text: "#f9a8d4" },
  { bg: "rgba(20,184,166,0.28)", border: "#14b8a6", text: "#2dd4bf" },
  { bg: "rgba(249,115,22,0.28)", border: "#f97316", text: "#fb923c" },
];

function serializeCoord(c: CellCoord) {
  return `${c.row},${c.col}`;
}

function findWordInGrid(word: string, grid: string[][]): CellCoord[] | null {
  const dirs = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ] as const;
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of dirs) {
        const cells: CellCoord[] = [];
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size || grid[nr]?.[nc] !== word[i]) {
            ok = false;
            break;
          }
          cells.push({ row: nr, col: nc });
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

function cellsInLine(from: CellCoord, to: CellCoord): CellCoord[] {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  if (dr === 0 && dc === 0) return [from];
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  // Only allow straight lines (horizontal, vertical, diagonal)
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return [from];
  const sr = dr === 0 ? 0 : Math.sign(dr);
  const sc = dc === 0 ? 0 : Math.sign(dc);
  return Array.from({ length: len + 1 }, (_, i) => ({
    row: from.row + sr * i,
    col: from.col + sc * i,
  }));
}

export default function WordSearchPuzzle({
  puzzleId,
  wordSearchData,
  onSolved,
  alreadySolved,
}: Props) {
  const grid = (wordSearchData.grid ?? []) as string[][];
  const words = ((wordSearchData.words ?? []) as string[]).map((w) =>
    String(w).toUpperCase().trim()
  );
  const gridSize = grid.length || 12;
  const storageKey = `ws-found-${puzzleId}`;

  // Unified init: compute foundWords + their cell positions together
  const [{ foundWords, foundWordCells }, setFoundState] = useState<{
    foundWords: string[];
    foundWordCells: Map<string, CellCoord[]>;
  }>(() => {
    const initial: string[] = alreadySolved
      ? [...words]
      : (() => {
          if (typeof window === "undefined") return [];
          try {
            return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[];
          } catch {
            return [];
          }
        })();
    const map = new Map<string, CellCoord[]>();
    for (const w of initial) {
      const cells = findWordInGrid(w, grid);
      if (cells) map.set(w, cells);
    }
    return { foundWords: initial, foundWordCells: map };
  });

  const [selectedCells, setSelectedCells] = useState<CellCoord[]>([]);
  const [dragStart, setDragStart] = useState<CellCoord | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [flashWord, setFlashWord] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gameStatus, setGameStatus] = useState<"playing" | "won">(() =>
    alreadySolved || foundWords.length === words.length ? "won" : "playing"
  );

  const gridRef = useRef<HTMLDivElement>(null);

  // Persist found words across page reloads
  useEffect(() => {
    if (!alreadySolved) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(foundWords));
      } catch {}
    }
  }, [foundWords, storageKey, alreadySolved]);

  // Build a coord → color-index map for rendering
  const cellColorMap = new Map<string, number>();
  foundWordCells.forEach((cells, word) => {
    const idx = words.indexOf(word) % WORD_COLORS.length;
    cells.forEach((c) => cellColorMap.set(serializeCoord(c), idx));
  });

  const selectedSet = new Set(selectedCells.map(serializeCoord));

  // ── Drag handlers ───────────────────────────────────────────────────────────

  function startDrag(row: number, col: number) {
    if (gameStatus !== "playing" || submitting) return;
    setDragStart({ row, col });
    setSelectedCells([{ row, col }]);
    setIsDragging(true);
  }

  function extendDrag(row: number, col: number) {
    if (!isDragging || !dragStart) return;
    setSelectedCells(cellsInLine(dragStart, { row, col }));
  }

  async function endDrag() {
    if (!isDragging) return;
    setIsDragging(false);
    const cells = selectedCells;
    setSelectedCells([]);
    setDragStart(null);

    if (cells.length < 2) return;

    const selWord = cells.map((c) => grid[c.row]?.[c.col] ?? "").join("");
    const revWord = selWord.split("").reverse().join("");
    const matched =
      words.find(
        (w) => (w === selWord || w === revWord) && !foundWords.includes(w)
      ) ?? null;

    if (!matched) return;

    setSubmitting(true);
    const newFoundWords = [...foundWords, matched];
    try {
      const resp = await fetch(`/api/puzzles/${puzzleId}/word_search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: matched,
          cells: cells.map((c) => ({ row: c.row, col: c.col })),
          allFoundWords: newFoundWords,
        }),
      });
      const data = await resp.json();
      if (data.valid) {
        const canonicalCells = findWordInGrid(matched, grid) ?? cells;
        setFoundState((prev) => ({
          foundWords: newFoundWords,
          foundWordCells: new Map(prev.foundWordCells).set(matched, canonicalCells),
        }));
        setFlashWord(matched);
        setTimeout(() => setFlashWord(null), 1200);
        if (data.allFound) {
          setGameStatus("won");
          onSolved?.();
        }
      }
    } catch {}
    setSubmitting(false);
  }

  // ── Touch helpers ───────────────────────────────────────────────────────────

  function cellFromPoint(x: number, y: number): CellCoord | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    const r = Number(el.dataset.wsRow);
    const c = Number(el.dataset.wsCol);
    return !isNaN(r) && !isNaN(c) ? { row: r, col: c } : null;
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    const cell = cellFromPoint(touch.clientX, touch.clientY);
    if (cell) startDrag(cell.row, cell.col);
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = cellFromPoint(touch.clientX, touch.clientY);
    if (cell) extendDrag(cell.row, cell.col);
  }

  // Responsive cell size: fills available width but caps at 38px
  const cellSz = `clamp(22px, calc((min(90vw, 520px) - 2rem - ${(gridSize - 1) * 3}px) / ${gridSize}), 38px)`;

  return (
    <>
      <div
        className="flex flex-col items-center gap-4 select-none pb-6"
        style={{ fontFamily: "'Clear Sans', 'Helvetica Neue', Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="text-center w-full px-4">
          <h2
            className="text-2xl sm:text-3xl font-black tracking-[0.2em] mb-1"
            style={{
              background: "linear-gradient(135deg, #818cf8, #c084fc, #f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 12px rgba(129,140,248,0.4))",
            }}
          >
            WORD SEARCH
          </h2>
          <p className="text-xs" style={{ color: "#64748b" }}>
            {foundWords.length} / {words.length} words found
          </p>
        </div>

        {gameStatus === "won" && (
          <div
            className="px-6 py-3 rounded-xl font-bold text-lg text-center"
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.5)",
              color: "#4ade80",
            }}
          >
            🎉 All {words.length} words found!
          </div>
        )}

        {/* Grid + word list */}
        <div className="flex flex-col sm:flex-row gap-5 items-start w-full max-w-2xl px-2">
          {/* Letter grid */}
          <div
            ref={gridRef}
            className="flex-shrink-0"
            style={{ display: "flex", flexDirection: "column", gap: 3, touchAction: "none" }}
            onMouseLeave={endDrag}
            onMouseUp={endDrag}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={endDrag}
          >
            {grid.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 3 }}>
                {row.map((letter, ci) => {
                  const key = serializeCoord({ row: ri, col: ci });
                  const colorIdx = cellColorMap.get(key);
                  const isSelected = selectedSet.has(key);
                  const isFound = colorIdx !== undefined;
                  const color = isFound ? WORD_COLORS[colorIdx] : null;

                  return (
                    <div
                      key={ci}
                      data-ws-row={ri}
                      data-ws-col={ci}
                      className="flex items-center justify-center font-black rounded transition-colors duration-75"
                      style={{
                        width: cellSz,
                        height: cellSz,
                        fontSize: `clamp(0.55rem, 2.6vw, 0.875rem)`,
                        cursor: gameStatus === "playing" ? "crosshair" : "default",
                        background: isSelected
                          ? "rgba(129,140,248,0.45)"
                          : isFound
                          ? color!.bg
                          : "rgba(30,41,59,0.85)",
                        border: isSelected
                          ? "2px solid #818cf8"
                          : isFound
                          ? `2px solid ${color!.border}`
                          : "2px solid rgba(71,85,105,0.5)",
                        color: isSelected
                          ? "#c7d2fe"
                          : isFound
                          ? color!.text
                          : "#94a3b8",
                        boxShadow: isFound ? `0 0 6px ${color!.border}40` : "none",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                      }}
                      onMouseDown={() => startDrag(ri, ci)}
                      onMouseEnter={() => extendDrag(ri, ci)}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Word list */}
          <div className="flex-1 flex flex-wrap sm:flex-col gap-2 sm:min-w-[110px]">
            <p
              className="w-full text-xs font-semibold tracking-wider mb-1 hidden sm:block"
              style={{ color: "#475569" }}
            >
              FIND THESE WORDS
            </p>
            {words.map((word, wi) => {
              const found = foundWords.includes(word);
              const colorIdx = wi % WORD_COLORS.length;
              const color = found ? WORD_COLORS[colorIdx] : null;
              const isFlashing = flashWord === word;

              return (
                <div
                  key={word}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200"
                  style={{
                    background: found ? color!.bg : "rgba(30,41,59,0.6)",
                    border: `1px solid ${found ? color!.border : "rgba(71,85,105,0.35)"}`,
                    color: found ? color!.text : "#64748b",
                    textDecoration: found ? "line-through" : "none",
                    transform: isFlashing ? "scale(1.1)" : "scale(1)",
                    boxShadow: isFlashing ? `0 0 14px ${color!.border}` : "none",
                  }}
                >
                  {word}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
