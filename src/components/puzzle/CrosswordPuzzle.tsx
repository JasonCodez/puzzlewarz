"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  answer: string; // uppercase letters only; may be empty in public payloads
  length: number;
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

const WORD_SOLVED_ANIMATION_MS = 1400;
const PUZZLE_COMPLETE_ANIMATION_MS = 2600;
const GRID_BORDER_PX = 2;
const GRID_PADDING_PX = 2;

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

interface SavedCrosswordProgress {
  signature: string;
  letters: string[][];
  revealedCells: string[];
  activeClue: ActiveClue | null;
  savedAt: number;
}

interface CrosswordProgressPayload {
  solvedClues?: unknown;
  letters?: unknown;
  revealedCells?: unknown;
  activeClue?: unknown;
  allSolved?: unknown;
  savedAt?: unknown;
}

function createEmptyLetters(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
}

function getCrosswordProgressSignature(data: CrosswordData | null): string {
  if (!data) return "invalid";
  const serialize = (direction: Direction, clue: CrosswordClue) =>
    `${direction}:${clue.number}:${clue.row}:${clue.col}:${clue.length}`;
  return [
    ...data.clues.across.map((clue) => serialize("across", clue)),
    ...data.clues.down.map((clue) => serialize("down", clue)),
  ].join("|");
}

function getCrosswordProgressStorageKey(puzzleId: string): string {
  return `crossword-progress:${puzzleId}`;
}

function normalizeStoredLetters(
  value: unknown,
  rows: number,
  cols: number,
  grid: CellState[][]
): string[][] | null {
  if (!Array.isArray(value) || value.length !== rows) return null;

  const normalized = createEmptyLetters(rows, cols);
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const rawRow = value[rowIndex];
    const rowValues = typeof rawRow === "string"
      ? rawRow.split("")
      : Array.isArray(rawRow)
        ? rawRow
        : null;

    if (!rowValues || rowValues.length !== cols) return null;

    for (let colIndex = 0; colIndex < cols; colIndex++) {
      const cell = grid[rowIndex]?.[colIndex];
      const rawLetter = String(rowValues[colIndex] ?? "").trim().toUpperCase();
      normalized[rowIndex][colIndex] = cell && !cell.isBlack && /^[A-Z]$/.test(rawLetter) ? rawLetter : "";
    }
  }

  return normalized;
}

function normalizeStoredCellKeys(value: unknown, rows: number, cols: number, grid: CellState[][]): string[] {
  if (!Array.isArray(value)) return [];

  const keys = new Set<string>();
  for (const rawValue of value) {
    if (typeof rawValue !== "string") continue;
    const match = /^(\d+),(\d+)$/.exec(rawValue);
    if (!match) continue;

    const row = Number(match[1]);
    const col = Number(match[2]);
    if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
    if (row < 0 || row >= rows || col < 0 || col >= cols) continue;
    if (grid[row]?.[col]?.isBlack) continue;

    keys.add(`${row},${col}`);
  }

  return [...keys];
}

function normalizeStoredActiveClue(value: unknown, data: CrosswordData | null): ActiveClue | null {
  if (!data || !value || typeof value !== "object") return null;
  const raw = value as { direction?: unknown; number?: unknown };
  const direction = raw.direction;
  const number = raw.number;
  if (direction !== "across" && direction !== "down") return null;
  if (typeof number !== "number" || !Number.isInteger(number) || number <= 0) return null;

  const clues = direction === "across" ? data.clues.across : data.clues.down;
  return clues.some((clue) => clue.number === number) ? { direction, number } : null;
}

function hasCrosswordProgress(snapshot: SavedCrosswordProgress): boolean {
  return Boolean(
    snapshot.activeClue ||
    snapshot.revealedCells.length > 0 ||
    snapshot.letters.some((row) => row.some(Boolean))
  );
}

function loadLocalCrosswordProgress(
  storageKey: string,
  signature: string,
  rows: number,
  cols: number,
  grid: CellState[][],
  data: CrosswordData | null
): SavedCrosswordProgress | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.signature !== signature) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const letters = normalizeStoredLetters(parsed.letters, rows, cols, grid);
    if (!letters) return null;

    const progress: SavedCrosswordProgress = {
      signature,
      letters,
      revealedCells: normalizeStoredCellKeys(parsed.revealedCells, rows, cols, grid),
      activeClue: normalizeStoredActiveClue(parsed.activeClue, data),
      savedAt: typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt) ? parsed.savedAt : 0,
    };

    return hasCrosswordProgress(progress) ? progress : null;
  } catch {
    return null;
  }
}

function normalizeSolvedClueKeys(value: unknown, data: CrosswordData | null): Set<string> {
  const solved = new Set<string>();
  if (!data || !Array.isArray(value)) return solved;

  const validKeys = new Set([
    ...data.clues.across.map((clue) => `across:${clue.number}`),
    ...data.clues.down.map((clue) => `down:${clue.number}`),
  ]);

  for (const rawKey of value) {
    if (typeof rawKey !== "string") continue;
    const colonKey = rawKey.replace("-", ":");
    if (!validKeys.has(colonKey)) continue;
    solved.add(colonKey.replace(":", "-"));
  }

  return solved;
}

function applySolvedCluesToLetters(letters: string[][], data: CrosswordData | null, solvedClues: Set<string>): string[][] {
  if (!data || solvedClues.size === 0) return letters;

  const next = letters.map((row) => [...row]);
  const fillClue = (direction: Direction, clue: CrosswordClue) => {
    if (!solvedClues.has(`${direction}-${clue.number}`)) return;
    for (let offset = 0; offset < clue.answer.length; offset++) {
      const row = direction === "across" ? clue.row : clue.row + offset;
      const col = direction === "across" ? clue.col + offset : clue.col;
      if (next[row]?.[col] !== undefined) next[row][col] = clue.answer[offset] ?? "";
    }
  };

  data.clues.across.forEach((clue) => fillClue("across", clue));
  data.clues.down.forEach((clue) => fillClue("down", clue));
  return next;
}

function buildSavedCrosswordProgress(
  signature: string,
  letters: string[][],
  revealed: Set<string>,
  activeClue: ActiveClue | null
): SavedCrosswordProgress {
  return {
    signature,
    letters: letters.map((row) => row.map((letter) => letter || "")),
    revealedCells: [...revealed],
    activeClue,
    savedAt: Date.now(),
  };
}

// ─── Grid builder ─────────────────────────────────────────────────────────────

function buildGrid(data: CrosswordData): { grid: CellState[][]; rows: number; cols: number } {
  const allClues = [...data.clues.across, ...data.clues.down];
  let maxRow = 0;
  let maxCol = 0;

  for (const clue of data.clues.across) {
    const endCol = clue.col + clue.length - 1;
    maxRow = Math.max(maxRow, clue.row);
    maxCol = Math.max(maxCol, endCol);
  }
  for (const clue of data.clues.down) {
    const endRow = clue.row + clue.length - 1;
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
    for (let i = 0; i < clue.length; i++) {
      const cell = grid[clue.row][clue.col + i];
      cell.isBlack = false;
      cell.acrossNumber = clue.number;
    }
  }
  for (const clue of data.clues.down) {
    for (let i = 0; i < clue.length; i++) {
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

function getGridGap(cols: number): number {
  return cols >= 19 ? 0 : 1;
}

function getGridChrome(trackCount: number, gap: number): number {
  return (GRID_BORDER_PX * 2) + (GRID_PADDING_PX * 2) + Math.max(0, trackCount - 1) * gap;
}

function getGridOuterChrome(cols: number): number {
  return getGridChrome(cols, getGridGap(cols));
}

function getGridPixelWidth(cols: number, cellSize: number): number {
  if (cols <= 0) return 0;
  return cols * cellSize + getGridOuterChrome(cols);
}

function getInitialCellSize(cols: number): number {
  if (cols <= 0) return 32;
  const phoneWidth = 336;
  const cellBudget = Math.floor((phoneWidth - getGridOuterChrome(cols)) / cols);
  return Math.max(8, Math.min(36, cellBudget));
}

function useCellSize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  cols: number,
  rows: number
): number {
  const [size, setSize] = useState(() => getInitialCellSize(cols));

  useEffect(() => {
    const update = () => {
      if (cols <= 0) return;
      if (!containerRef.current) return;

      const availableWidth = Math.max(120, containerRef.current.clientWidth);
      const gridGap = getGridGap(cols);
      const chromeWidth = getGridChrome(cols, gridGap);
      const byWidth = Math.floor((availableWidth - chromeWidth) / cols);

      const isMobileWidth = typeof window !== "undefined" && window.innerWidth < 768;
      const heightBudget = typeof window !== "undefined" && isMobileWidth
        ? Math.max(260, window.innerHeight * 0.58)
        : Number.POSITIVE_INFINITY;
      const byHeight = rows > 0 && Number.isFinite(heightBudget)
        ? Math.floor((heightBudget - getGridChrome(rows, gridGap)) / rows)
        : Number.POSITIVE_INFINITY;

      const maxCellSize = isMobileWidth ? 36 : 44;
      const fittedCellSize = Math.min(maxCellSize, byWidth, byHeight);
      setSize(Math.max(5, fittedCellSize));
    };

    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, cols, rows]);

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

function CrosswordCompletionOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex: 2147483647, background: "rgba(2,6,23,0.78)", backdropFilter: "blur(6px)" }}
    >
      <div style={{ position: "relative", width: "min(560px, 94vw)", minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="crossword-completion-ring" style={{ position: "absolute", inset: 4, border: "2px solid rgba(74,222,128,0.56)", borderRadius: 16 }} />
        <div className="crossword-completion-ring" style={{ position: "absolute", inset: 34, border: "1px solid rgba(253,231,76,0.36)", borderRadius: 14, animationDelay: "220ms" }} />
        <div
          className="crossword-completion-card"
          style={{
            position: "relative",
            width: "100%",
            padding: "28px 30px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(6,78,59,0.94))",
            border: "2px solid rgba(134,239,172,0.9)",
            boxShadow: "0 26px 90px rgba(0,0,0,0.65), 0 0 54px rgba(34,197,94,0.42)",
            textAlign: "center",
            opacity: 1,
          }}
        >
          <div style={{ color: "#bbf7d0", fontWeight: 900, fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase" }}>Puzzle Solved</div>
          <div style={{ color: "#f8fafc", fontWeight: 900, fontSize: "clamp(1.7rem, 6vw, 3.1rem)", letterSpacing: 0, lineHeight: 1.05, marginTop: 7 }}>Crossword Complete</div>
          <div style={{ color: "#d1fae5", fontSize: "0.95rem", fontWeight: 800, marginTop: 12, letterSpacing: 0 }}>Preparing your XP and points</div>
          <div style={{ height: 6, marginTop: 20, borderRadius: 999, background: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
            <div className="crossword-completion-bar" style={{ height: "100%", width: "100%", borderRadius: 999, background: "linear-gradient(90deg, #38d399, #fde74c)" }} />
          </div>
        </div>
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
      const raw = crosswordData as {
        clues?: {
          across?: Array<Partial<CrosswordClue>>;
          down?: Array<Partial<CrosswordClue>>;
        };
      };

      if (!Array.isArray(raw.clues?.across) || !Array.isArray(raw.clues?.down)) return null;

      const normalizeClue = (clue: Partial<CrosswordClue>): CrosswordClue | null => {
        const number = Number(clue.number);
        const row = Number(clue.row);
        const col = Number(clue.col);
        const text = String(clue.text ?? "").trim();
        const answer = String(clue.answer ?? "")
          .toUpperCase()
          .replace(/[^A-Z]/g, "");

        const rawLength = Number(clue.length);
        const length =
          Number.isInteger(rawLength) && rawLength > 0
            ? rawLength
            : answer.length;

        if (!Number.isInteger(number) || number <= 0) return null;
        if (!Number.isInteger(row) || row < 0) return null;
        if (!Number.isInteger(col) || col < 0) return null;
        if (!text) return null;
        if (!Number.isInteger(length) || length < 3) return null;

        return {
          number,
          text,
          answer,
          length,
          row,
          col,
        };
      };

      const across = raw.clues.across
        .map(normalizeClue)
        .filter((c): c is CrosswordClue => c != null);
      const down = raw.clues.down
        .map(normalizeClue)
        .filter((c): c is CrosswordClue => c != null);

      if (across.length !== raw.clues.across.length) return null;
      if (down.length !== raw.clues.down.length) return null;

      return {
        clues: {
          across,
          down,
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
  const progressSignature = useMemo(() => getCrosswordProgressSignature(data), [data]);
  const progressStorageKey = useMemo(() => getCrosswordProgressStorageKey(puzzleId), [puzzleId]);
  const localProgressRef = useRef<SavedCrosswordProgress | null>(null);
  const localProgressLoadedRef = useRef(false);

  if (!localProgressLoadedRef.current && !alreadySolved && data && initialGrid.length > 0) {
    localProgressLoadedRef.current = true;
    localProgressRef.current = loadLocalCrosswordProgress(
      progressStorageKey,
      progressSignature,
      rows,
      cols,
      initialGrid,
      data
    );
  }

  // Mutable cell letters stored in state
  const [letters, setLetters] = useState<string[][]>(() =>
    alreadySolved ? createEmptyLetters(rows, cols) : localProgressRef.current?.letters ?? createEmptyLetters(rows, cols)
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
  const solvedCluesRef = useRef<Set<string>>(solvedClues);
  // Hint-revealed cells
  const [revealed, setRevealed] = useState<Set<string>>(() =>
    alreadySolved ? new Set() : new Set(localProgressRef.current?.revealedCells ?? [])
  );

  const [activeClue, setActiveClue] = useState<ActiveClue | null>(() =>
    alreadySolved ? null : localProgressRef.current?.activeClue ?? null
  );
  const [cluePanelDirection, setCluePanelDirection] = useState<Direction>("across");
  const [gameStatus, setGameStatus] = useState<"playing" | "won">(
    alreadySolved ? "won" : "playing"
  );
  const [showInstructions, setShowInstructions] = useState(!alreadySolved && !localProgressRef.current);
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSolvedClues, setJustSolvedClues] = useState<Set<string>>(new Set());
  const [latestSolvedClue, setLatestSolvedClue] = useState<ActiveClue | null>(null);
  const [completionAnimating, setCompletionAnimating] = useState(false);
  const [showRestoreNotice, setShowRestoreNotice] = useState(() =>
    !alreadySolved && Boolean(localProgressRef.current)
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cellSize = useCellSize(containerRef, cols, rows);
  const gridGap = getGridGap(cols);
  const gridPixelWidth = getGridPixelWidth(cols, cellSize);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const checkingCluesRef = useRef<Map<string, string>>(new Map());
  const checkQueueRef = useRef<Promise<void>>(Promise.resolve());
  const solvedAnimationTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionNotifiedRef = useRef(false);
  const lettersRef = useRef<string[][]>(letters);
  const revealedRef = useRef<Set<string>>(revealed);
  const activeClueRef = useRef<ActiveClue | null>(activeClue);
  const lastSavedPayloadRef = useRef<string>("");

  const showRestoredProgressBanner = useCallback(() => {
    if (restoreNoticeTimerRef.current) clearTimeout(restoreNoticeTimerRef.current);
    setShowRestoreNotice(true);
    restoreNoticeTimerRef.current = setTimeout(() => {
      setShowRestoreNotice(false);
      restoreNoticeTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    solvedCluesRef.current = solvedClues;
  }, [solvedClues]);

  useEffect(() => {
    lettersRef.current = letters;
  }, [letters]);

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  useEffect(() => {
    activeClueRef.current = activeClue;
  }, [activeClue]);

  useEffect(() => {
    if (activeClue) setCluePanelDirection(activeClue.direction);
  }, [activeClue]);

  useEffect(() => {
    if (localProgressRef.current) showRestoredProgressBanner();
  }, [showRestoredProgressBanner]);

  useEffect(() => {
    return () => {
      solvedAnimationTimersRef.current.forEach((timer) => clearTimeout(timer));
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      if (restoreNoticeTimerRef.current) clearTimeout(restoreNoticeTimerRef.current);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    if (!data || !alreadySolved) return;

    const all = new Set<string>();
    data.clues.across.forEach((c) => all.add(`across-${c.number}`));
    data.clues.down.forEach((c) => all.add(`down-${c.number}`));

    setSolvedClues(all);
    setGameStatus("won");
    setShowInstructions(false);
  }, [alreadySolved, data]);

  useEffect(() => {
    if (alreadySolved || warzMode || !data || !initialGrid.length) return;

    let cancelled = false;

    const hydrateProgress = async () => {
      try {
        const response = await fetch(`/api/puzzles/${puzzleId}/crossword`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as CrosswordProgressPayload;
        if (cancelled) return;

        const serverSolved = normalizeSolvedClueKeys(payload.solvedClues, data);
        const hasNewSolved = [...serverSolved].some((key) => !solvedCluesRef.current.has(key));
        const savedAt = typeof payload.savedAt === "number" && Number.isFinite(payload.savedAt)
          ? payload.savedAt
          : 0;
        const serverLetters = normalizeStoredLetters(payload.letters, rows, cols, initialGrid);
        const serverRevealed = normalizeStoredCellKeys(payload.revealedCells, rows, cols, initialGrid);
        const serverActiveClue = normalizeStoredActiveClue(payload.activeClue, data);
        const serverSnapshot = serverLetters
          ? {
              signature: progressSignature,
              letters: serverLetters,
              revealedCells: serverRevealed,
              activeClue: serverActiveClue,
              savedAt,
            }
          : null;
        const shouldUseServerSnapshot = Boolean(
          serverSnapshot &&
          hasCrosswordProgress(serverSnapshot) &&
          savedAt >= (localProgressRef.current?.savedAt ?? 0)
        );

        if (serverSolved.size > 0) {
          const nextSolved = new Set([...solvedCluesRef.current, ...serverSolved]);
          solvedCluesRef.current = nextSolved;
          setSolvedClues(nextSolved);
        }

        if (shouldUseServerSnapshot && serverSnapshot) {
          localProgressRef.current = serverSnapshot;
          lastSavedPayloadRef.current = JSON.stringify({
            letters: serverSnapshot.letters,
            revealedCells: serverSnapshot.revealedCells,
            activeClue: serverSnapshot.activeClue,
          });
          setLetters(applySolvedCluesToLetters(serverSnapshot.letters, data, serverSolved));
          setRevealed(new Set(serverSnapshot.revealedCells));
          setActiveClue(serverSnapshot.activeClue);
          setShowInstructions(false);
          showRestoredProgressBanner();
        } else if (hasNewSolved) {
          setLetters((current) => applySolvedCluesToLetters(current, data, serverSolved));
          showRestoredProgressBanner();
        }

        if (payload.allSolved === true) {
          completionNotifiedRef.current = true;
          setGameStatus("won");
          setShowInstructions(false);
        }
      } catch {
        // Local progress is still available if the server hydrate fails.
      }
    };

    hydrateProgress();

    return () => {
      cancelled = true;
    };
  }, [alreadySolved, warzMode, data, initialGrid, puzzleId, rows, cols, progressSignature, showRestoredProgressBanner]);

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

  const triggerSolvedClueAnimation = useCallback((key: string, direction: Direction, number: number) => {
    setJustSolvedClues((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setLatestSolvedClue({ direction, number });

    const timer = setTimeout(() => {
      setJustSolvedClues((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setLatestSolvedClue((current) => (
        current?.direction === direction && current.number === number ? null : current
      ));
    }, WORD_SOLVED_ANIMATION_MS);
    solvedAnimationTimersRef.current.push(timer);
  }, []);

  const startCompletionAnimation = useCallback(() => {
    if (completionNotifiedRef.current) return;
    completionNotifiedRef.current = true;
    setGameStatus("won");
    setCompletionAnimating(true);

    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    completionTimerRef.current = setTimeout(() => {
      setCompletionAnimating(false);
      onSolved?.();
    }, PUZZLE_COMPLETE_ANIMATION_MS);
  }, [onSolved]);

  // ── Check a word against the server ───────────────────────────────────────
  const checkWord = useCallback(
    async (direction: Direction, number: number, answer: string) => {
      const key = `${direction}-${number}`;
      if (solvedCluesRef.current.has(key)) return;
      if (checkingCluesRef.current.get(key) === answer) return;

      checkingCluesRef.current.set(key, answer);

      const runCheck = async () => {
        if (solvedCluesRef.current.has(key)) {
          if (checkingCluesRef.current.get(key) === answer) {
            checkingCluesRef.current.delete(key);
          }
          return;
        }

        setSubmitting(true);
        try {
          const res = await fetch(`/api/puzzles/${puzzleId}/crossword`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ direction, number, answer }),
          });
          const json = await res.json();
          if (json.correct && checkingCluesRef.current.get(key) === answer) {
            if (!solvedCluesRef.current.has(key)) {
              const next = new Set(solvedCluesRef.current);
              next.add(key);
              solvedCluesRef.current = next;
              setSolvedClues(next);
              triggerSolvedClueAnimation(key, direction, number);
            }
            setError("");
            if (json.allSolved) {
              startCompletionAnimation();
            }
          }
        } catch {
          // network error — silently ignore
        } finally {
          if (checkingCluesRef.current.get(key) === answer) {
            checkingCluesRef.current.delete(key);
          }
          setSubmitting(false);
        }
      };

      const queuedCheck = checkQueueRef.current.catch(() => undefined).then(runCheck);
      checkQueueRef.current = queuedCheck;
      await queuedCheck;
    },
    [puzzleId, startCompletionAnimation, triggerSolvedClueAnimation]
  );

  const checkFilledClues = useCallback(
    (currentLetters: string[][]) => {
      if (!data || !initialGrid.length || gameStatus !== "playing") return;

      const checkClueSet = (direction: Direction, clues: CrosswordClue[]) => {
        for (const clue of clues) {
          const key = `${direction}-${clue.number}`;
          if (solvedCluesRef.current.has(key)) continue;

          const cells = getWordCells(initialGrid, clue.row, clue.col, direction);
          if (cells.length !== clue.length) continue;

          const word = cells.map((cell) => currentLetters[cell.row]?.[cell.col] ?? "").join("");
          if (checkingCluesRef.current.get(key) === word) continue;
          if (word.length === clue.length && cells.every((cell) => !!currentLetters[cell.row]?.[cell.col])) {
            checkWord(direction, clue.number, word);
          }
        }
      };

      checkClueSet("across", data.clues.across);
      checkClueSet("down", data.clues.down);
    },
    [data, gameStatus, initialGrid, checkWord]
  );

  useEffect(() => {
    checkFilledClues(letters);
  }, [letters, checkFilledClues]);

  const persistCrosswordProgress = useCallback(
    (sendServer: boolean, keepalive = false) => {
      if (alreadySolved || warzMode || !data || !initialGrid.length || gameStatus !== "playing") return;

      const snapshot = buildSavedCrosswordProgress(
        progressSignature,
        lettersRef.current,
        revealedRef.current,
        activeClueRef.current
      );
      const hasProgress = hasCrosswordProgress(snapshot);

      try {
        if (hasProgress) {
          localStorage.setItem(progressStorageKey, JSON.stringify(snapshot));
          localProgressRef.current = snapshot;
        } else {
          localStorage.removeItem(progressStorageKey);
          localProgressRef.current = null;
        }
      } catch {
        // Storage can fail in private browsing or restricted environments.
      }

      if (!sendServer) return;
      if (!hasProgress && lastSavedPayloadRef.current === "") return;

      const requestBody = JSON.stringify({
        letters: snapshot.letters,
        revealedCells: snapshot.revealedCells,
        activeClue: snapshot.activeClue,
      });
      if (!keepalive && requestBody === lastSavedPayloadRef.current) return;
      lastSavedPayloadRef.current = requestBody;

      void fetch(`/api/puzzles/${puzzleId}/crossword`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive,
        body: requestBody,
      }).catch(() => undefined);
    },
    [alreadySolved, warzMode, data, initialGrid, gameStatus, progressSignature, progressStorageKey, puzzleId]
  );

  useEffect(() => {
    if (alreadySolved || warzMode || !data || gameStatus !== "playing") return;

    persistCrosswordProgress(false);
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      persistCrosswordProgress(true);
      autosaveTimerRef.current = null;
    }, 700);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [letters, revealed, activeClue, alreadySolved, warzMode, data, gameStatus, persistCrosswordProgress]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePageHide = () => persistCrosswordProgress(true, true);
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [persistCrosswordProgress]);

  // ── Move cursor to next empty cell in word ─────────────────────────────────
  const [cursorCell, setCursorCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    if (!activeClue || cursorCell || !data || !initialGrid.length) return;

    const clue = activeClue.direction === "across"
      ? data.clues.across.find((entry) => entry.number === activeClue.number)
      : data.clues.down.find((entry) => entry.number === activeClue.number);
    if (!clue) return;

    const cells = getWordCells(initialGrid, clue.row, clue.col, activeClue.direction);
    const firstEmpty = cells.find((cell) => !letters[cell.row]?.[cell.col]);
    setCursorCell(firstEmpty ?? cells[0] ?? { row: clue.row, col: clue.col });
  }, [activeClue, cursorCell, data, initialGrid, letters]);

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
      }
    },
    [gameStatus, activeClue, cursorCell, letters, initialGrid, goToNextClue, retreatCursor, advanceCursor]
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
      setCluePanelDirection(direction);
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

  const getCellStatus = (row: number, col: number): { isSolved: boolean; isJustSolved: boolean } => {
    const cell = initialGrid[row]?.[col];
    if (!cell || cell.isBlack) return { isSolved: false, isJustSolved: false };

    const acrossKey = cell.acrossNumber ? `across-${cell.acrossNumber}` : null;
    const downKey = cell.downNumber ? `down-${cell.downNumber}` : null;

    return {
      isSolved: !!((acrossKey && solvedClues.has(acrossKey)) || (downKey && solvedClues.has(downKey))),
      isJustSolved: !!((acrossKey && justSolvedClues.has(acrossKey)) || (downKey && justSolvedClues.has(downKey))),
    };
  };

  const cellTextColor = (row: number, col: number): string => {
    const { isSolved } = getCellStatus(row, col);
    if (isSolved) return "#4ade80";
    if (revealed.has(`${row},${col}`)) return "#FDE74C";
    return "#f8fafc";
  };

  // ── Cell colour ────────────────────────────────────────────────────────────
  function cellStyle(row: number, col: number, status = getCellStatus(row, col)): React.CSSProperties {
    const cell = initialGrid[row]?.[col];
    if (!cell || cell.isBlack) {
      return { background: skin.tileBg === "transparent" ? "#111" : "#0a0a0f", border: "1px solid #222" };
    }
    const key = `${row},${col}`;
    const isActive = cursorCell?.row === row && cursorCell?.col === col;
    const isInWord = activeWordCells.has(key);
    const isRevealed = revealed.has(key);

    let bg = "rgba(255,255,255,0.06)";
    let borderColor = "rgba(255,255,255,0.15)";

    if (isInWord)     { bg = "rgba(99,140,248,0.25)";    borderColor = "#6366f1"; }
    if (isRevealed)   { bg = "rgba(253,231,76,0.18)";    borderColor = "#FDE74C"; }
    if (status.isSolved) { bg = "rgba(34,197,94,0.22)";  borderColor = "#22c55e"; }
    if (isActive)     { borderColor = status.isSolved ? "#86efac" : "#818cf8"; }

    return {
      background: bg,
      border: `2px solid ${borderColor}`,
      boxShadow: isActive
        ? status.isSolved
          ? "0 0 0 2px rgba(134,239,172,0.32)"
          : "0 0 0 2px #818cf840"
        : undefined,
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
  const panelClues = cluePanelDirection === "across" ? acrossClues : downClues;
  const panelSolvedCount = panelClues.filter((clue) => solvedClues.has(`${cluePanelDirection}-${clue.number}`)).length;
  const acrossSolvedCount = acrossClues.filter((clue) => solvedClues.has(`across-${clue.number}`)).length;
  const downSolvedCount = downClues.filter((clue) => solvedClues.has(`down-${clue.number}`)).length;
  const completionOverlay = completionAnimating && typeof document !== "undefined"
    ? createPortal(<CrosswordCompletionOverlay />, document.body)
    : null;

  return (
    <>
      <style jsx global>{`
        @keyframes crossword-cell-success {
          0% { transform: scale(1); filter: brightness(1); box-shadow: 0 0 0 rgba(74, 222, 128, 0); }
          18% { transform: scale(1.18); filter: brightness(1.75); box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.35), 0 0 26px rgba(74, 222, 128, 0.95); }
          42% { transform: scale(1.05); filter: brightness(1.35); box-shadow: 0 0 0 2px rgba(253, 231, 76, 0.26), 0 0 18px rgba(253, 231, 76, 0.42); }
          100% { transform: scale(1); filter: brightness(1); box-shadow: 0 0 0 rgba(74, 222, 128, 0); }
        }

        @keyframes crossword-cell-finish {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          35% { transform: scale(1.08); filter: brightness(1.65); }
        }

        @keyframes crossword-clue-success {
          0% { transform: translateX(0) scale(1); }
          20% { transform: translateX(6px) scale(1.03); }
          100% { transform: translateX(0) scale(1); }
        }

        @keyframes crossword-completion-card {
          0% { transform: scale(0.9) translateY(18px); }
          20% { transform: scale(1.05) translateY(0); }
          100% { transform: scale(1) translateY(0); }
        }

        @keyframes crossword-completion-ring {
          0% { opacity: 0; transform: scale(0.58); }
          20% { opacity: 0.9; }
          100% { opacity: 0; transform: scale(1.42); }
        }

        @keyframes crossword-word-toast {
          0% { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.94); }
          18% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.04); }
          78% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.96); }
        }

        @keyframes crossword-completion-bar {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }

        .crossword-cell-success {
          animation: crossword-cell-success ${WORD_SOLVED_ANIMATION_MS}ms ease-out;
          z-index: 2;
        }

        .crossword-cell-finish {
          animation: crossword-cell-finish 900ms ease-in-out 2;
        }

        .crossword-clue-success {
          animation: crossword-clue-success ${WORD_SOLVED_ANIMATION_MS}ms ease-out;
        }

        .crossword-completion-card {
          animation: crossword-completion-card ${PUZZLE_COMPLETE_ANIMATION_MS}ms ease-in-out both;
        }

        .crossword-completion-ring {
          animation: crossword-completion-ring ${PUZZLE_COMPLETE_ANIMATION_MS}ms ease-out both;
        }

        .crossword-word-toast {
          animation: crossword-word-toast ${WORD_SOLVED_ANIMATION_MS}ms ease-out both;
        }

        .crossword-completion-bar {
          transform-origin: left center;
          animation: crossword-completion-bar ${PUZZLE_COMPLETE_ANIMATION_MS}ms linear both;
        }

        .crossword-clue-panel-scroll {
          max-height: min(340px, 42vh);
          scrollbar-width: thin;
          scrollbar-color: rgba(129, 140, 248, 0.5) rgba(15, 23, 42, 0.35);
        }

        .crossword-clue-panel-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .crossword-clue-panel-scroll::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.35);
          border-radius: 999px;
        }

        .crossword-clue-panel-scroll::-webkit-scrollbar-thumb {
          background: rgba(129, 140, 248, 0.5);
          border-radius: 999px;
        }

        @media (min-width: 1024px) {
          .crossword-clue-panel-scroll {
            max-height: min(62vh, 520px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .crossword-cell-success,
          .crossword-cell-finish,
          .crossword-clue-success,
          .crossword-completion-card,
          .crossword-completion-ring,
          .crossword-word-toast,
          .crossword-completion-bar {
            animation: none !important;
          }
        }
      `}</style>
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      {completionOverlay}

      <div
        className="wc-skin-root"
        data-skin={skin._key ?? "default"}
        style={{ position: "relative", borderRadius: "1rem", overflow: "hidden", width: "100%", maxWidth: "100vw" }}
      >
        {(skin._key === "lava"   || skin._key === "skin_lava")   && <LavaBackground />}
        {(skin._key === "galaxy" || skin._key === "skin_galaxy") && <GalaxyBackground />}
        {(skin._key === "ice"    || skin._key === "skin_ice" || skin._key === "christmas" || skin._key === "skin_christmas")    && <IceBackground />}
        {(skin._key === "neon"   || skin._key === "skin_neon")   && <NeonBackground />}
        {(skin._key === "retro"  || skin._key === "skin_retro")  && <RetroBackground />}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: skin.backdropScrim,
            zIndex: 0,
          }}
        />

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

          {showRestoreNotice && gameStatus === "playing" && (
            <div className="px-4 py-2 rounded-full text-xs font-black tracking-wide"
              style={{ background: "rgba(56,211,153,0.14)", border: "1px solid rgba(56,211,153,0.45)", color: "#bbf7d0" }}>
              Progress restored from your last session
            </div>
          )}

          {/* Main layout: grid + clues */}
          <div className="w-full min-w-0 max-w-full px-2 flex flex-col lg:flex-row gap-4 items-start justify-center overflow-hidden">

            {/* Grid */}
            <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-2 lg:w-auto lg:flex-none">
              {/* Active clue banner */}
              <div style={{ position: "relative", width: "100%", maxWidth: "24rem" }}>
              {latestSolvedClue && (
                <div
                  className="crossword-word-toast"
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -38,
                    transform: "translateX(-50%)",
                    width: "max-content",
                    maxWidth: "100%",
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(20,83,45,0.94)",
                    border: "1px solid rgba(134,239,172,0.7)",
                    boxShadow: "0 10px 28px rgba(0,0,0,0.28), 0 0 18px rgba(34,197,94,0.32)",
                    color: "#bbf7d0",
                    fontSize: "0.72rem",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    zIndex: 3,
                  }}
                >
                  Correct: {latestSolvedClue.number} {latestSolvedClue.direction}
                </div>
              )}
              <div className="w-full min-h-[2.5rem] px-3 py-1.5 rounded-lg text-sm text-center"
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
              </div>

              {/* Grid container */}
              <div
                ref={containerRef}
                className="flex w-full min-w-0 justify-center"
                style={{
                  maxWidth: "min(100%, calc(100vw - 1rem))",
                }}
              >
              <div
                style={{
                  boxSizing: "border-box",
                  display: "inline-grid",
                  gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                  gap: gridGap,
                  background: "#1a1a2e",
                  border: `${GRID_BORDER_PX}px solid ${skin.boardBorder ?? "rgba(255,255,255,0.12)"}`,
                  borderRadius: "8px",
                  padding: GRID_PADDING_PX,
                  width: gridPixelWidth > 0 ? `${gridPixelWidth}px` : "100%",
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
                onClick={() => inputRef.current?.focus()}
              >
                {initialGrid.map((rowArr, r) =>
                  rowArr.map((cell, c) => {
                    const status = getCellStatus(r, c);
                    const cellClasses = [
                      status.isJustSolved ? "crossword-cell-success" : "",
                      completionAnimating && !cell.isBlack ? "crossword-cell-finish" : "",
                    ].filter(Boolean).join(" ");

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={cellClasses || undefined}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          ...cellStyle(r, c, status),
                          animation: status.isJustSolved
                            ? `crossword-cell-success ${WORD_SOLVED_ANIMATION_MS}ms ease-out`
                            : completionAnimating && !cell.isBlack
                              ? "crossword-cell-finish 900ms ease-in-out 2"
                              : undefined,
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
                                top: cellSize < 12 ? 0 : 1,
                                left: cellSize < 12 ? 1 : 2,
                                display: cellSize < 9 ? "none" : undefined,
                                fontSize: Math.max(5, Math.min(9, cellSize * 0.24)),
                                lineHeight: 1,
                                color: status.isSolved ? "#86efac" : "#94a3b8",
                                fontWeight: 700,
                                pointerEvents: "none",
                              }}>
                                {cell.clueNumber}
                              </span>
                            )}
                            <span style={{
                              fontSize: Math.min(Math.max(6, cellSize * 0.58), Math.max(4, cellSize - 1)),
                              fontWeight: 900,
                              color: cellTextColor(r, c),
                              lineHeight: 1,
                              transition: "color 180ms ease, text-shadow 180ms ease",
                              textShadow: status.isSolved ? "0 0 10px rgba(74,222,128,0.38)" : "none",
                            }}>
                              {letters[r][c]}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
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

            {/* Clue panel */}
            <div
              className="w-full min-w-0 max-w-full lg:w-[22rem] lg:flex-none"
              style={{
                borderRadius: 12,
                border: "1px solid rgba(129,140,248,0.28)",
                background: "rgba(15,23,42,0.58)",
                boxShadow: "0 14px 38px rgba(0,0,0,0.18)",
                overflow: "hidden",
              }}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(148,163,184,0.18)" }}>
                <div>
                  <div className="text-xs font-black tracking-widest" style={{ color: "#e2e8f0" }}>CLUES</div>
                  <div className="text-[11px] font-semibold" style={{ color: "#94a3b8" }}>
                    {panelSolvedCount}/{panelClues.length} {cluePanelDirection}
                  </div>
                </div>
                <div className="grid grid-cols-2 rounded-lg p-1" style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(148,163,184,0.18)" }}>
                  {(["across", "down"] as const).map((direction) => {
                    const active = cluePanelDirection === direction;
                    const solvedCount = direction === "across" ? acrossSolvedCount : downSolvedCount;
                    const totalCount = direction === "across" ? acrossClues.length : downClues.length;
                    return (
                      <button
                        key={direction}
                        type="button"
                        onClick={() => setCluePanelDirection(direction)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase transition-all"
                        style={{
                          background: active
                            ? direction === "across" ? "rgba(99,102,241,0.32)" : "rgba(192,132,252,0.28)"
                            : "transparent",
                          color: active ? "#f8fafc" : "#94a3b8",
                          border: `1px solid ${active ? direction === "across" ? "rgba(129,140,248,0.5)" : "rgba(216,180,254,0.45)" : "transparent"}`,
                        }}
                      >
                        {direction} {solvedCount}/{totalCount}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="crossword-clue-panel-scroll overflow-y-auto p-2">
                <div className="grid gap-1">
                  {panelClues.map((clue) => {
                    const key = `${cluePanelDirection}-${clue.number}`;
                    const solved = solvedClues.has(key);
                    const justSolved = justSolvedClues.has(key);
                    const isActive = activeClue?.direction === cluePanelDirection && activeClue.number === clue.number;
                    const activeBorder = cluePanelDirection === "across" ? "rgba(129,140,248,0.55)" : "rgba(216,180,254,0.5)";
                    const activeText = cluePanelDirection === "across" ? "#c7d2fe" : "#e9d5ff";

                    return (
                      <button
                        key={clue.number}
                        type="button"
                        onClick={() => handleClueClick(cluePanelDirection, clue.number)}
                        className={`text-left px-2.5 py-2 rounded-lg text-xs transition-all${justSolved ? " crossword-clue-success" : ""}`}
                        style={{
                          background: isActive ? "rgba(99,102,241,0.18)" : solved ? "rgba(34,197,94,0.1)" : "rgba(15,23,42,0.26)",
                          border: `1px solid ${isActive ? activeBorder : solved ? "rgba(34,197,94,0.3)" : "rgba(148,163,184,0.12)"}`,
                          color: solved ? "#4ade80" : isActive ? activeText : "#cbd5e1",
                          textDecoration: solved ? "line-through" : undefined,
                          overflowWrap: "anywhere",
                          width: "100%",
                          lineHeight: 1.25,
                        }}
                      >
                        <span className="font-black mr-1" style={{ color: solved ? "#4ade80" : isActive ? activeText : "#94a3b8" }}>{clue.number}.</span>
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
