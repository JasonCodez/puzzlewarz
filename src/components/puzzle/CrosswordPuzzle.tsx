"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePuzzleSkin } from "@/hooks/usePuzzleSkin";

const LavaBackground = dynamic(() => import("@/components/LavaBackground"), { ssr: false });
const GalaxyBackground = dynamic(() => import("@/components/GalaxyBackground"), { ssr: false });
const IceBackground = dynamic(() => import("@/components/IceBackground"), { ssr: false });
const NeonBackground = dynamic(() => import("@/components/NeonBackground"), { ssr: false });
const RetroBackground = dynamic(() => import("@/components/RetroBackground"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrosswordClue {
  number: number;
  text: string;
  answer: string; // uppercase, letters only — must not be sent to client
  row: number;    // 0-based top-left start
  col: number;
}

export interface CrosswordData {
  clues: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
}

interface Props {
  puzzleId: string;
  crosswordData: Record<string, unknown>;
  alreadySolved?: boolean;
  hintTokens?: number;
  onHintUsed?: () => Promise<boolean>;
  onSolved?: () => void;
  warzMode?: boolean;
}

type Direction = "across" | "down";

interface ActiveClue {
  direction: Direction;
  number: number;
}

interface CellState {
  isBlack: boolean;
  clueNumber?: number;  // label printed in corner
  acrossNumber?: number;
  downNumber?: number;
  userLetter: string;
  correctLetter: string; // only populated for already-solved
  revealed?: boolean;    // hint-revealed
}

// ─── Grid builder ─────────────────────────────────────────────────────────────

function buildGrid(data: CrosswordData): { grid: CellState[][]; rows: number; cols: number } {
  const allClues = [...data.clues.across, ...data.clues.down];
  let maxRow = 0;
  let maxCol = 0;

  for (const clue of data.clues.across) {
    const endCol = clue.col + clue.answer.length - 1;
    maxRow = Math.max(maxRow, clue.row);
    maxCol = Math.max(maxCol, endCol);
  }
  for (const clue of data.clues.down) {
    const endRow = clue.row + clue.answer.length - 1;
    maxRow = Math.max(maxRow, endRow);
    maxCol = Math.max(maxCol, clue.col);
  }

  const rows = maxRow + 1;
  const cols = maxCol + 1;

  // Start as all-black
  const grid: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isBlack: true,
      userLetter: "",
      correctLetter: "",
    }))
  );

  // Fill white cells from clues
  for (const clue of data.clues.across) {
    for (let i = 0; i < clue.answer.length; i++) {
      const cell = grid[clue.row][clue.col + i];
      cell.isBlack = false;
      cell.acrossNumber = clue.number;
    }
  }
  for (const clue of data.clues.down) {
    for (let i = 0; i < clue.answer.length; i++) {
      const cell = grid[clue.row + i][clue.col];
      cell.isBlack = false;
      cell.downNumber = clue.number;
    }
  }

  // Assign clue-number labels (top-left of each numbered word start)
  const numbered = new Set<string>();
  for (const clue of allClues) {
    const key = `${clue.row},${clue.col}`;
    if (!numbered.has(key)) {
      numbered.add(key);
      grid[clue.row][clue.col].clueNumber = clue.number;
    }
  }

  return { grid, rows, cols };
}

// ─── Cell sizing ──────────────────────────────────────────────────────────────

function useCellSize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  cols: number
): number {
  const [size, setSize] = useState(36);
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const available = containerRef.current.clientWidth - 4; // 2px border each side
      const s = Math.max(24, Math.min(44, Math.floor(available / cols)));
      setSize(s);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [containerRef, cols]);
  return size;
}

// ─── Clue word cells helper ────────────────────────────────────────────────────

function getWordCells(
  grid: CellState[][],
  row: number,
  col: number,
  direction: Direction
): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  if (direction === "across") {
    // find start
    let c = col;
    while (c > 0 && !grid[row][c - 1].isBlack) c--;
    while (c < grid[0].length && !grid[row][c].isBlack) {
      cells.push({ row, col: c });
      c++;
    }
  } else {
    let r = row;
    while (r > 0 && !grid[r - 1][col].isBlack) r--;
    while (r < grid.length && !grid[r][col].isBlack) {
      cells.push({ row: r, col });
      r++;
    }
  }
  return cells;
}

// ─── Instructions modal ───────────────────────────────────────────────────────

function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full rounded-xl p-6 shadow-2xl"
        style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-extrabold" style={{ color: "#FDE74C" }}>How to Play — Crossword</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none ml-4">✕</button>
        </div>
        <div className="space-y-3 text-sm text-gray-300">
          <p><strong className="text-white">Click a white cell</strong> to select it. Click again to toggle between Across and Down.</p>
          <p>The <strong className="text-white">active clue</strong> is highlighted in blue. Type letters to fill in the cells.</p>
          <p>Press <strong className="text-white">Backspace</strong> to erase the previous letter. Press <strong className="text-white">Tab</strong> or <strong className="text-white">Enter</strong> to jump to the next clue.</p>
          <p>When you complete a word correctly it <strong className="text-white" style={{ color: "#38D399" }}>turns green</strong>. Solve every word to finish the puzzle.</p>
          <p><strong className="text-white">Hint tokens</strong> reveal a letter in the selected cell.</p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl font-black text-lg tracking-widest transition-all duration-150 active:scale-95"
          style={{ background: "linear-gradient(135deg, #10b981, #38D399)", color: "#020202" }}
        >
          START ⚡
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CrosswordPuzzle({
  puzzleId,
  crosswordData,
  alreadySolved = false,
  hintTokens = 0,
  onHintUsed,
  onSolved,
  warzMode = false,
}: Props) {
  const skin = usePuzzleSkin();

  // Parse + validate incoming data
  const data = useMemo<CrosswordData | null>(() => {
    try {
      const raw = crosswordData as { clues?: { across?: CrosswordClue[]; down?: CrosswordClue[] } };
      if (!raw.clues?.across || !raw.clues?.down) return null;
      return {
        clues: {
          across: raw.clues.across.map((c) => ({ ...c, answer: String(c.answer).toUpperCase() })),
          down: raw.clues.down.map((c) => ({ ...c, answer: String(c.answer).toUpperCase() })),
        },
      };
    } catch {
      return null;
    }
  }, [crosswordData]);

  const { grid: initialGrid, rows, cols } = useMemo(
    () => (data ? buildGrid(data) : { grid: [], rows: 0, cols: 0 }),
    [data]
  );

  // Mutable cell letters stored in state
  const [letters, setLetters] = useState<string[][]>(() =>
    Array.from({ length: rows }, () => Array(cols).fill(""))
  );
  // Track which clues are correctly solved
  const [solvedClues, setSolvedClues] = useState<Set<string>>(() => {
    if (alreadySolved && data) {
      const all = new Set<string>();
      data.clues.across.forEach((c) => all.add(`across-${c.number}`));
      data.clues.down.forEach((c) => all.add(`down-${c.number}`));
      return all;
    }
    return new Set();
  });
  // Hint-revealed cells
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [activeClue, setActiveClue] = useState<ActiveClue | null>(null);
  const [gameStatus, setGameStatus] = useState<"playing" | "won">(
    alreadySolved ? "won" : "playing"
  );
  const [showInstructions, setShowInstructions] = useState(!alreadySolved);
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cellSize = useCellSize(containerRef, cols);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Pre-fill correct letters when already solved
  useEffect(() => {
    if (alreadySolved && data) {
      const filled = Array.from({ length: rows }, () => Array(cols).fill(""));
      data.clues.across.forEach((clue) => {
        for (let i = 0; i < clue.answer.length; i++) {
          filled[clue.row][clue.col + i] = clue.answer[i];
        }
      });
      data.clues.down.forEach((clue) => {
        for (let i = 0; i < clue.answer.length; i++) {
          filled[clue.row + i][clue.col] = clue.answer[i];
        }
      });
      setLetters(filled);
    }
  }, [alreadySolved, data, rows, cols]);

  // ── Compute active word cells ──────────────────────────────────────────────
  const activeWordCells = useMemo<Set<string>>(() => {
    if (!activeClue || !initialGrid.length) return new Set();
    const startClue =
      activeClue.direction === "across"
        ? data?.clues.across.find((c) => c.number === activeClue.number)
        : data?.clues.down.find((c) => c.number === activeClue.number);
    if (!startClue) return new Set();
    const cells = getWordCells(initialGrid, startClue.row, startClue.col, activeClue.direction);
    return new Set(cells.map((c) => `${c.row},${c.col}`));
  }, [activeClue, initialGrid, data]);

  // ── Check a word against the server ───────────────────────────────────────
  const checkWord = useCallback(
    async (direction: Direction, number: number, answer: string) => {
      const key = `${direction}-${number}`;
      if (solvedClues.has(key)) return;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/puzzles/${puzzleId}/crossword`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ direction, number, answer }),
        });
        const json = await res.json();
        if (json.correct) {
          setSolvedClues((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
          });
          setError("");
          if (json.allSolved) {
            setGameStatus("won");
            onSolved?.();
          }
        }
      } catch {
        // network error — silently ignore
      } finally {
        setSubmitting(false);
      }
    },
    [puzzleId, solvedClues, onSolved]
  );

  // ── Move cursor to next empty cell in word ─────────────────────────────────
  const [cursorCell, setCursorCell] = useState<{ row: number; col: number } | null>(null);

  const advanceCursor = useCallback(
    (row: number, col: number, direction: Direction) => {
      if (!initialGrid.length) return;
      const next =
        direction === "across"
          ? initialGrid[row]?.[col + 1]
          : initialGrid[row + 1]?.[col];
      if (next && !next.isBlack) {
        const nr = direction === "across" ? row : row + 1;
        const nc = direction === "across" ? col + 1 : col;
        setCursorCell({ row: nr, col: nc });
      }
    },
    [initialGrid]
  );

  const retreatCursor = useCallback(
    (row: number, col: number, direction: Direction) => {
      if (!initialGrid.length) return;
      const prev =
        direction === "across"
          ? initialGrid[row]?.[col - 1]
          : initialGrid[row - 1]?.[col];
      if (prev && !prev.isBlack) {
        const nr = direction === "across" ? row : row - 1;
        const nc = direction === "across" ? col - 1 : col;
        setCursorCell({ row: nr, col: nc });
      }
    },
    [initialGrid]
  );

  // ── Select all clues sorted numerically for Tab navigation ────────────────
  const sortedClues = useMemo<ActiveClue[]>(() => {
    if (!data) return [];
    const all: ActiveClue[] = [];
    [...data.clues.across.map((c) => ({ direction: "across" as Direction, number: c.number })),
     ...data.clues.down.map((c) => ({ direction: "down" as Direction, number: c.number }))]
      .sort((a, b) => a.number - b.number || a.direction.localeCompare(b.direction))
      .forEach((c) => all.push(c));
    return all;
  }, [data]);

  const goToNextClue = useCallback(() => {
    if (!activeClue || !sortedClues.length) return;
    const idx = sortedClues.findIndex(
      (c) => c.direction === activeClue.direction && c.number === activeClue.number
    );
    const next = sortedClues[(idx + 1) % sortedClues.length];
    setActiveClue(next);
    // move cursor to first empty cell in next clue
    if (data) {
      const clue =
        next.direction === "across"
          ? data.clues.across.find((c) => c.number === next.number)
          : data.clues.down.find((c) => c.number === next.number);
      if (clue) setCursorCell({ row: clue.row, col: clue.col });
    }
  }, [activeClue, sortedClues, data]);

  // ── Cell click ─────────────────────────────────────────────────────────────
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameStatus !== "playing") return;
      const cell = initialGrid[row]?.[col];
      if (!cell || cell.isBlack) return;

      const hasAcross = !!cell.acrossNumber;
      const hasDown = !!cell.downNumber;

      if (cursorCell?.row === row && cursorCell?.col === col && activeClue) {
        // Toggle direction on same cell
        if (hasAcross && hasDown) {
          const newDir: Direction = activeClue.direction === "across" ? "down" : "across";
          const num = newDir === "across" ? cell.acrossNumber! : cell.downNumber!;
          setActiveClue({ direction: newDir, number: num });
        }
      } else {
        setCursorCell({ row, col });
        // prefer current direction if the cell belongs to it
        if (activeClue?.direction === "across" && hasAcross) {
          setActiveClue({ direction: "across", number: cell.acrossNumber! });
        } else if (activeClue?.direction === "down" && hasDown) {
          setActiveClue({ direction: "down", number: cell.downNumber! });
        } else if (hasAcross) {
          setActiveClue({ direction: "across", number: cell.acrossNumber! });
        } else if (hasDown) {
          setActiveClue({ direction: "down", number: cell.downNumber! });
        }
      }
      inputRef.current?.focus();
    },
    [gameStatus, initialGrid, cursorCell, activeClue]
  );

  // ── Keyboard handling ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (gameStatus !== "playing" || !activeClue || !cursorCell) return;
      const { row, col } = cursorCell;
      const key = e.key.toUpperCase();

      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        goToNextClue();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        if (letters[row][col]) {
          // erase current
          setLetters((prev) => {
            const next = prev.map((r) => [...r]);
            next[row][col] = "";
            return next;
          });
        } else {
          // move back and erase
          retreatCursor(row, col, activeClue.direction);
          const pr = activeClue.direction === "across" ? row : row - 1;
          const pc = activeClue.direction === "across" ? col - 1 : col;
          if (pr >= 0 && pc >= 0 && !initialGrid[pr]?.[col === 0 ? col : pc]?.isBlack) {
            setLetters((prev) => {
              const next = prev.map((r) => [...r]);
              const tr = activeClue.direction === "across" ? row : pr;
              const tc = activeClue.direction === "across" ? pc : col;
              if (tr >= 0 && tc >= 0) next[tr][tc] = "";
              return next;
            });
          }
        }
        return;
      }

      // Arrow keys
      if (e.key === "ArrowRight") { e.preventDefault(); advanceCursor(row, col, "across"); setActiveClue((a) => a && { ...a, direction: "across", number: initialGrid[row][col].acrossNumber ?? a.number }); return; }
      if (e.key === "ArrowLeft")  { e.preventDefault(); retreatCursor(row, col, "across"); setActiveClue((a) => a && { ...a, direction: "across", number: initialGrid[row][col].acrossNumber ?? a.number }); return; }
      if (e.key === "ArrowDown")  { e.preventDefault(); advanceCursor(row, col, "down");   setActiveClue((a) => a && { ...a, direction: "down",   number: initialGrid[row][col].downNumber   ?? a.number }); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); retreatCursor(row, col, "down");   setActiveClue((a) => a && { ...a, direction: "down",   number: initialGrid[row][col].downNumber   ?? a.number }); return; }

      if (/^[A-Z]$/.test(key)) {
        e.preventDefault();
        setLetters((prev) => {
          const next = prev.map((r) => [...r]);
          next[row][col] = key;
          return next;
        });
        advanceCursor(row, col, activeClue.direction);

        // Check if the whole word is now filled in
        if (data) {
          const clue =
            activeClue.direction === "across"
              ? data.clues.across.find((c) => c.number === activeClue.number)
              : data.clues.down.find((c) => c.number === activeClue.number);
          if (clue) {
            const cells = getWordCells(initialGrid, clue.row, clue.col, activeClue.direction);
            const updatedLetters = letters.map((r) => [...r]);
            updatedLetters[row][col] = key;
            const word = cells.map((c) => updatedLetters[c.row][c.col]).join("");
            if (word.length === clue.answer.length && !word.includes("")) {
              checkWord(activeClue.direction, activeClue.number, word);
            }
          }
        }
      }
    },
    [gameStatus, activeClue, cursorCell, letters, initialGrid, data, goToNextClue, retreatCursor, advanceCursor, checkWord]
  );

  // ── Hint: reveal a letter in the current cell ──────────────────────────────
  const useHintToken = useCallback(async () => {
    if (!cursorCell || !activeClue || hintTokens < 1 || hintLoading) return;
    if (!data) return;
    const { row, col } = cursorCell;
    const key = `${row},${col}`;
    if (revealed.has(key)) return;

    setHintLoading(true);
    try {
      const ok = onHintUsed ? await onHintUsed() : true;
      if (!ok) { setHintLoading(false); return; }

      const res = await fetch(`/api/puzzles/${puzzleId}/crossword/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ row, col }),
      });
      const json = await res.json();
      if (res.ok && json.letter) {
        setLetters((prev) => {
          const next = prev.map((r) => [...r]);
          next[row][col] = json.letter;
          return next;
        });
        setRevealed((prev) => new Set(prev).add(key));
      }
    } catch {
      // ignore
    } finally {
      setHintLoading(false);
    }
  }, [cursorCell, activeClue, hintTokens, hintLoading, revealed, onHintUsed, puzzleId, data]);

  // ── Clue list click ────────────────────────────────────────────────────────
  const handleClueClick = useCallback(
    (direction: Direction, number: number) => {
      if (gameStatus !== "playing") return;
      setActiveClue({ direction, number });
      if (data) {
        const clue =
          direction === "across"
            ? data.clues.across.find((c) => c.number === number)
            : data.clues.down.find((c) => c.number === number);
        if (clue) {
          // Move cursor to first empty cell in this clue
          const cells = getWordCells(initialGrid, clue.row, clue.col, direction);
          const firstEmpty = cells.find((c) => !letters[c.row][c.col]);
          setCursorCell(firstEmpty ?? cells[0] ?? { row: clue.row, col: clue.col });
        }
      }
      inputRef.current?.focus();
    },
    [gameStatus, data, initialGrid, letters]
  );

  // ── Cell colour ────────────────────────────────────────────────────────────
  function cellStyle(row: number, col: number): React.CSSProperties {
    const cell = initialGrid[row]?.[col];
    if (!cell || cell.isBlack) {
      return { background: skin.tileBg === "transparent" ? "#111" : "#0a0a0f", border: "1px solid #222" };
    }
    const key = `${row},${col}`;
    const isActive = cursorCell?.row === row && cursorCell?.col === col;
    const isInWord = activeWordCells.has(key);
    const isRevealed = revealed.has(key);

    // Determine if the containing across/down word is solved
    const acrossSolved = cell.acrossNumber ? solvedClues.has(`across-${cell.acrossNumber}`) : false;
    const downSolved = cell.downNumber ? solvedClues.has(`down-${cell.downNumber}`) : false;
    const isSolved = acrossSolved || downSolved;

    let bg = "rgba(255,255,255,0.06)";
    let borderColor = "rgba(255,255,255,0.15)";

    if (isSolved)     { bg = "rgba(34,197,94,0.22)";     borderColor = "#22c55e"; }
    if (isInWord)     { bg = "rgba(99,140,248,0.25)";    borderColor = "#6366f1"; }
    if (isRevealed)   { bg = "rgba(253,231,76,0.18)";    borderColor = "#FDE74C"; }
    if (isActive)     { bg = "rgba(99,140,248,0.55)";    borderColor = "#818cf8"; }

    return {
      background: bg,
      border: `2px solid ${borderColor}`,
      boxShadow: isActive ? "0 0 0 2px #818cf840" : undefined,
      cursor: "pointer",
      position: "relative",
    };
  }

  if (!data) {
    return (
      <div className="p-8 text-center" style={{ color: "#ef4444" }}>
        Invalid crossword data — check puzzle configuration.
      </div>
    );
  }

  const acrossClues = [...data.clues.across].sort((a, b) => a.number - b.number);
  const downClues = [...data.clues.down].sort((a, b) => a.number - b.number);

  return (
    <>
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}

      <div
        className="wc-skin-root"
        data-skin={skin._key ?? "default"}
        style={{ position: "relative", borderRadius: "1rem", overflow: "hidden", width: "100%", maxWidth: "100vw" }}
      >
        {(skin._key === "lava"   || skin._key === "skin_lava")   && <LavaBackground />}
        {(skin._key === "galaxy" || skin._key === "skin_galaxy") && <GalaxyBackground />}
        {(skin._key === "ice"    || skin._key === "skin_ice")    && <IceBackground />}
        {(skin._key === "neon"   || skin._key === "skin_neon")   && <NeonBackground />}
        {(skin._key === "retro"  || skin._key === "skin_retro")  && <RetroBackground />}

        <div
          className="flex flex-col items-center gap-4 select-none pb-6"
          style={{
            position: "relative",
            zIndex: 1,
            fontFamily: "'Clear Sans','Helvetica Neue',Arial,sans-serif",
          }}
        >
          {/* Header */}
          <div className="text-center relative w-full px-8 pt-4">
            <h2 className="text-2xl sm:text-3xl font-black tracking-[0.2em] mb-1"
              style={{
                display: "inline-block",
                backgroundImage: "linear-gradient(135deg, #818cf8, #c084fc, #f472b6)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              }}
            >
              CROSSWORD
            </h2>
            <button
              onClick={() => setShowInstructions(true)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center"
              style={{ background: "rgba(129,140,248,0.2)", border: "1px solid rgba(129,140,248,0.4)", color: "#818cf8" }}
            >?</button>
            <p className="text-xs mt-1 font-medium" style={{ color: "#e2e8f0", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
              {acrossClues.length + downClues.length} clues · {solvedClues.size} solved
            </p>
          </div>

          {/* Win banner */}
          {gameStatus === "won" && (
            <div className="px-6 py-4 rounded-2xl text-center"
              style={{ background: "linear-gradient(135deg,rgba(56,211,153,.15),rgba(16,185,129,.15))", border: "1px solid #38D39955" }}>
              <div style={{ fontSize: "2rem" }}>⚡</div>
              <div className="font-black text-lg mt-1" style={{ color: "#38D399" }}>CROSSWORD CRACKED!</div>
              <div className="text-sm mt-1" style={{ color: "#9ca3af" }}>All words solved</div>
            </div>
          )}

          {error && (
            <div className="px-5 py-2 rounded-full text-sm font-bold"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {/* Main layout: grid + clues */}
          <div className="w-full px-2 flex flex-col lg:flex-row gap-4 items-start justify-center">

            {/* Grid */}
            <div className="flex flex-col items-center gap-2">
              {/* Active clue banner */}
              <div className="w-full max-w-sm min-h-[2.5rem] px-3 py-1.5 rounded-lg text-sm text-center"
                style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "#c7d2fe" }}>
                {activeClue ? (
                  <>
                    <span className="font-black">{activeClue.number} {activeClue.direction.toUpperCase()} </span>
                    {activeClue.direction === "across"
                      ? acrossClues.find((c) => c.number === activeClue.number)?.text
                      : downClues.find((c) => c.number === activeClue.number)?.text}
                  </>
                ) : (
                  <span style={{ color: "#6b7280" }}>Click a cell to begin</span>
                )}
              </div>

              {/* Grid container */}
              <div
                ref={containerRef}
                style={{
                  display: "inline-grid",
                  gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                  gap: "1px",
                  background: "#1a1a2e",
                  border: `2px solid ${skin.boardBorder ?? "rgba(255,255,255,0.12)"}`,
                  borderRadius: "8px",
                  padding: "2px",
                  width: "100%",
                  maxWidth: `${cols * cellSize + cols + 8}px`,
                }}
                onClick={() => inputRef.current?.focus()}
              >
                {initialGrid.map((rowArr, r) =>
                  rowArr.map((cell, c) => (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        ...cellStyle(r, c),
                        borderRadius: "3px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        userSelect: "none",
                      }}
                      onClick={() => handleCellClick(r, c)}
                    >
                      {!cell.isBlack && (
                        <>
                          {cell.clueNumber !== undefined && (
                            <span style={{
                              position: "absolute",
                              top: 1,
                              left: 2,
                              fontSize: Math.max(7, cellSize * 0.22),
                              lineHeight: 1,
                              color: "#94a3b8",
                              fontWeight: 700,
                              pointerEvents: "none",
                            }}>
                              {cell.clueNumber}
                            </span>
                          )}
                          <span style={{
                            fontSize: Math.max(12, cellSize * 0.5),
                            fontWeight: 900,
                            color: revealed.has(`${r},${c}`) ? "#FDE74C" : (skin.tileText ?? "#fff"),
                            lineHeight: 1,
                          }}>
                            {letters[r][c]}
                          </span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Hidden input to capture keyboard on mobile */}
              <input
                ref={inputRef}
                className="sr-only"
                readOnly
                onKeyDown={handleKeyDown}
                aria-label="Crossword input"
              />

              {/* Hint button */}
              {gameStatus === "playing" && (
                <button
                  onClick={useHintToken}
                  disabled={hintLoading || hintTokens < 1 || !cursorCell}
                  className="mt-1 px-4 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: hintTokens < 1 ? "rgba(255,107,107,0.1)" : "rgba(56,145,166,0.15)",
                    border: `1px solid ${hintTokens < 1 ? "rgba(255,107,107,0.5)" : "rgba(56,145,166,0.4)"}`,
                    color: hintTokens < 1 ? "#FF6B6B" : "#3891A6",
                  }}
                >
                  {hintLoading ? "..." : hintTokens < 1 ? "🔤 No Hint Tokens" : `🔤 Reveal Letter (${hintTokens} token${hintTokens !== 1 ? "s" : ""})`}
                </button>
              )}
            </div>

            {/* Clue lists */}
            <div className="flex flex-row lg:flex-col gap-4 w-full lg:w-auto lg:max-w-xs overflow-x-auto lg:overflow-visible">
              {/* Across */}
              <div className="min-w-[140px] flex-1 lg:flex-none">
                <div className="text-xs font-black tracking-widest mb-2" style={{ color: "#818cf8" }}>ACROSS</div>
                <div className="flex flex-col gap-0.5">
                  {acrossClues.map((clue) => {
                    const solved = solvedClues.has(`across-${clue.number}`);
                    const isActive = activeClue?.direction === "across" && activeClue.number === clue.number;
                    return (
                      <button
                        key={clue.number}
                        onClick={() => handleClueClick("across", clue.number)}
                        className="text-left px-2 py-1 rounded text-xs transition-all"
                        style={{
                          background: isActive ? "rgba(99,102,241,0.25)" : solved ? "rgba(34,197,94,0.1)" : "transparent",
                          border: `1px solid ${isActive ? "rgba(99,102,241,0.5)" : solved ? "rgba(34,197,94,0.3)" : "transparent"}`,
                          color: solved ? "#4ade80" : isActive ? "#c7d2fe" : "#9ca3af",
                          textDecoration: solved ? "line-through" : undefined,
                        }}
                      >
                        <span className="font-black mr-1" style={{ color: solved ? "#4ade80" : isActive ? "#818cf8" : "#6b7280" }}>{clue.number}.</span>
                        {clue.text}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Down */}
              <div className="min-w-[140px] flex-1 lg:flex-none">
                <div className="text-xs font-black tracking-widest mb-2" style={{ color: "#c084fc" }}>DOWN</div>
                <div className="flex flex-col gap-0.5">
                  {downClues.map((clue) => {
                    const solved = solvedClues.has(`down-${clue.number}`);
                    const isActive = activeClue?.direction === "down" && activeClue.number === clue.number;
                    return (
                      <button
                        key={clue.number}
                        onClick={() => handleClueClick("down", clue.number)}
                        className="text-left px-2 py-1 rounded text-xs transition-all"
                        style={{
                          background: isActive ? "rgba(192,132,252,0.25)" : solved ? "rgba(34,197,94,0.1)" : "transparent",
                          border: `1px solid ${isActive ? "rgba(192,132,252,0.5)" : solved ? "rgba(34,197,94,0.3)" : "transparent"}`,
                          color: solved ? "#4ade80" : isActive ? "#e9d5ff" : "#9ca3af",
                          textDecoration: solved ? "line-through" : undefined,
                        }}
                      >
                        <span className="font-black mr-1" style={{ color: solved ? "#4ade80" : isActive ? "#c084fc" : "#6b7280" }}>{clue.number}.</span>
                        {clue.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
