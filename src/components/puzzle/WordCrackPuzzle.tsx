"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePuzzleSkin } from "@/hooks/usePuzzleSkin";

const LavaBackground = dynamic(() => import("@/components/LavaBackground"), { ssr: false });
const GalaxyBackground = dynamic(() => import("@/components/GalaxyBackground"), { ssr: false });
const IceBackground = dynamic(() => import("@/components/IceBackground"), { ssr: false });
const NeonBackground = dynamic(() => import("@/components/NeonBackground"), { ssr: false });
const RetroBackground = dynamic(() => import("@/components/RetroBackground"), { ssr: false });

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type LetterStatus = "correct" | "present" | "absent";

interface GuessResult {
  letter: string;
  status: LetterStatus;
}

interface Props {
  puzzleId: string;
  wordCrackData: Record<string, unknown>;
  onSolved?: () => void;
  onFailed?: () => void;
  alreadySolved?: boolean;
  warzMode?: boolean;
  failedAttempts?: number;
}

// â”€â”€â”€ Keyboard layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

// â”€â”€â”€ Colour palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// CRACKED = right letter, right spot  |  CLOSE = in word, wrong spot  |  COLD = not in word
const COLORS = {
  correct: { bg: "#38D399", border: "#10b981", glow: "rgba(56,211,153,0.65)" },
  present: { bg: "#FDE74C", border: "#d97706", glow: "rgba(253,231,76,0.65)" },
  absent:  { bg: "rgba(56,145,166,0.22)", border: "rgba(56,145,166,0.5)", glow: "none" },
  empty:   { bg: "transparent", border: "#374151", glow: "none" },
  active:  { bg: "rgba(253,231,76,0.08)", border: "#FDE74C", glow: "rgba(253,231,76,0.3)" },
};

const KEY_COLORS: Record<LetterStatus | "unused", string> = {
  correct: "#10b981",
  present: "#d97706",
  absent:  "rgba(56,145,166,0.4)",
  unused:  "#4b5563",
};

// â”€â”€â”€ Confetti particle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Particle { id: number; x: number; color: string; delay: number; duration: number; size: number; }

function makeConfetti(): Particle[] {
  const palette = ["#38D399","#FDE74C","#3891A6","#f472b6","#818cf8","#fb923c"];
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: palette[i % palette.length],
    delay: Math.random() * 0.6,
    duration: 0.8 + Math.random() * 0.8,
    size: 6 + Math.random() * 8,
  }));
}

// â”€â”€â”€ Instructions Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function InstructionsModal({ wordLength, maxGuesses, onClose }: { wordLength: number; maxGuesses: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div
        className="relative w-full max-w-md rounded-2xl p-6 text-white"
        style={{
          background: "linear-gradient(135deg, #040e0a 0%, #0c1a14 100%)",
          border: "1px solid rgba(56,211,153,0.3)",
          boxShadow: "0 0 40px rgba(56,211,153,0.15), 0 25px 50px rgba(0,0,0,0.6)",
        }}
      >
        {/* Title */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">⚡</div>
          <h2 className="text-2xl font-black tracking-widest" style={{ color: "#38D399" }}>HOW TO CRACK IT</h2>
          <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Decode the hidden {wordLength}-letter word.</p>
        </div>

        {/* Rules */}
        <ul className="space-y-3 text-sm mb-6">
          <li className="flex items-start gap-3">
            <span className="text-lg">🎯</span>
            <span>You have <strong className="text-white">{maxGuesses} attempts</strong> to break the {wordLength}-letter code.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-lg">⌨️</span>
            <span>Type a word and press <strong className="text-white">ENTER</strong>. Each tile flips to reveal intel.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-lg">📊</span>
            <span>Crack faster for a better <strong className="text-white">grade</strong> — S, A, B, C, or D.</span>
          </li>
        </ul>

        {/* Colour examples */}
        <div className="space-y-3 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>Tile intel codes:</p>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg text-black"
              style={{ background: COLORS.correct.bg, boxShadow: `0 0 12px ${COLORS.correct.glow}` }}>C</div>
            <span className="text-sm">
              🔓 <strong className="text-white">CRACKED</strong>
              <span style={{ color: "#9ca3af" }}> — right letter, right position</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg text-black"
              style={{ background: COLORS.present.bg, boxShadow: `0 0 12px ${COLORS.present.glow}` }}>P</div>
            <span className="text-sm">
              🔍 <strong className="text-white">CLOSE</strong>
              <span style={{ color: "#9ca3af" }}> — letter exists, wrong position</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
              style={{ background: COLORS.absent.bg, border: `2px solid ${COLORS.absent.border}`, color: "#9ca3af" }}>X</div>
            <span className="text-sm">
              ❌ <strong className="text-white">COLD</strong>
              <span style={{ color: "#9ca3af" }}> — letter not in the word</span>
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-black text-lg tracking-widest transition-all duration-150 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #10b981, #38D399)",
            boxShadow: "0 0 20px rgba(56,211,153,0.4)",
            color: "#020202",
          }}
        >
          START CRACKING ⚡
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function WordCrackPuzzle({ puzzleId, wordCrackData, onSolved, onFailed, alreadySolved, warzMode, failedAttempts: initialFailedAttempts = 0 }: Props) {
  const skin = usePuzzleSkin();
  const wordLength = Math.max(3, Math.min(10, Number(wordCrackData.wordLength ?? 5)));
  const maxGuesses = Math.max(1, Math.min(10, Number(wordCrackData.maxGuesses ?? 6)));
  const hint = String(wordCrackData.hint ?? "");
  const MAX_ATTEMPTS = 3;

  const [showInstructions, setShowInstructions] = useState(!alreadySolved);
  const [guesses, setGuesses] = useState<GuessResult[][]>([]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">(alreadySolved ? "won" : "playing");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [shakingRow, setShakingRow] = useState(false);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [revealDone, setRevealDone] = useState<number[]>([]);
  const [popCol, setPopCol] = useState<{ row: number; col: number } | null>(null);
  const [confetti, setConfetti] = useState<Particle[]>([]);
  const [bounceWin, setBounceWin] = useState(false);
  // Hint system: 0 = unused, 1 = clue shown, 2 = letter revealed
  const [hintLevel, setHintLevel] = useState(0);
  const [hintReveal, setHintReveal] = useState<{ position: number; letter: string } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  // 3-attempt system
  const [failedAttempts, setFailedAttempts] = useState(initialFailedAttempts);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);
  const attemptsLocked = !alreadySolved && failedAttempts >= MAX_ATTEMPTS;
  const gameLossRecorded = useRef(false);

  /** Reset game state for a fresh attempt (same word, new board). */
  const resetForNewAttempt = () => {
    setGuesses([]);
    setCurrentInput("");
    setGameStatus("playing");
    setError("");
    setShakingRow(false);
    setRevealingRow(null);
    setRevealDone([]);
    setPopCol(null);
    setConfetti([]);
    setBounceWin(false);
    gameLossRecorded.current = false;
  };

  const isPlaying = gameStatus === "playing" && !showInstructions;
  const onSolvedFired = useRef(false);

  // skin-derived colour overrides
  const tileColors = {
    ...COLORS,
    empty: { bg: "transparent", border: skin.tileBorder, glow: "none" },
    active: { bg: skin.accentActive, border: skin.boardBorder, glow: "none" },
  };

  // Per-skin keyboard key background — opaque so keys are readable over canvas backgrounds
  const KEY_SURFACES: Record<string, string> = {
    retro:      "rgba(12,4,32,0.88)",
    skin_retro: "rgba(12,4,32,0.88)",
    neon:       "rgba(4,12,18,0.88)",
    skin_neon:  "rgba(4,12,18,0.88)",
    lava:       "rgba(40,8,2,0.85)",
    skin_lava:  "rgba(40,8,2,0.85)",
    galaxy:     "rgba(10,6,28,0.88)",
    skin_galaxy:"rgba(10,6,28,0.88)",
    ice:        "rgba(6,16,32,0.85)",
    skin_ice:   "rgba(6,16,32,0.85)",
    minimal:    "rgba(255,255,255,0.09)",
    skin_minimal:"rgba(255,255,255,0.09)",
    default:    "rgba(56,145,166,0.18)",
  };
  const keySurface = KEY_SURFACES[skin._key ?? "default"] ?? KEY_SURFACES.default;

  const keyBg: Record<string, string> = {
    ...KEY_COLORS,
    unused: keySurface,
    absent: skin.tileBg,
  };

  // â”€â”€ Derived: keyboard letter states â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const keyStates: Record<string, LetterStatus | "unused"> = {};
  for (const guess of guesses) {
    for (const { letter, status } of guess) {
      const current = keyStates[letter];
      if (current === "correct") continue;
      if (status === "correct" || current === undefined) {
        keyStates[letter] = status;
      } else if (status === "present" && current !== "present") {
        keyStates[letter] = "present";
      } else if (status === "absent" && !current) {
        keyStates[letter] = "absent";
      }
    }
  }

  // â”€â”€ Pop animation when typing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const triggerPop = useCallback((col: number) => {
    const row = guesses.length;
    setPopCol({ row, col });
    setTimeout(() => setPopCol(null), 120);
  }, [guesses.length]);

  // â”€â”€ Submit guess â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const submitGuess = useCallback(async () => {
    if (!isPlaying || submitting) return;
    const word = currentInput.toUpperCase().trim();

    if (word.length !== wordLength) {
      setError(`Need ${wordLength} letters!`);
      setShakingRow(true);
      setTimeout(() => { setShakingRow(false); setError(""); }, 700);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const resp = await fetch(`/api/puzzles/${puzzleId}/word_crack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: word, ...(warzMode && { warzMode: true }) }),
        credentials: "same-origin",
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error ?? "Something went wrong");
        setShakingRow(true);
        setTimeout(() => { setShakingRow(false); setError(""); }, 700);
        setSubmitting(false);
        return;
      }

      const newGuesses = [...guesses, data.result as GuessResult[]];
      const rowIndex = newGuesses.length - 1;

      setGuesses(newGuesses);
      setCurrentInput("");

      // Stagger-reveal tiles
      setRevealingRow(rowIndex);
      const revealTotal = wordLength * 350 + 400;
      setTimeout(() => {
        setRevealingRow(null);
        setRevealDone(prev => [...prev, rowIndex]);
      }, revealTotal);

      if (data.solved) {
        setTimeout(() => {
          setGameStatus("won");
          setConfetti(makeConfetti());
          setBounceWin(true);
          if (!onSolvedFired.current) {
            onSolvedFired.current = true;
            setTimeout(() => onSolved?.(), 1800);
          }
        }, revealTotal);
      } else if (newGuesses.length >= maxGuesses) {
        setTimeout(() => {
          setGameStatus("lost");
          if (warzMode) {
            onFailed?.();
          } else if (!gameLossRecorded.current) {
            gameLossRecorded.current = true;
            fetch(`/api/puzzles/${puzzleId}/progress`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "record_game_loss" }),
              credentials: "same-origin",
            })
              .then((r) => r.json())
              .then((d) => {
                if (d.failedAttempts !== undefined) setFailedAttempts(d.failedAttempts);
              })
              .catch(() => {});
          }
        }, revealTotal);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }, [isPlaying, submitting, currentInput, wordLength, puzzleId, guesses, maxGuesses, onSolved]);

  // â”€â”€ Physical keyboard handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isPlaying || submitting) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER") {
        submitGuess();
      } else if (key === "BACKSPACE") {
        setCurrentInput(prev => prev.slice(0, -1));
        setError("");
      } else if (/^[A-Z]$/.test(key) && currentInput.length < wordLength) {
        triggerPop(currentInput.length);
        setCurrentInput(prev => prev + key);
        setError("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, submitting, currentInput, wordLength, submitGuess, triggerPop]);

  // â”€â”€ On-screen key press â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleKey = useCallback((key: string) => {
    if (!isPlaying || submitting) return;
    if (key === "ENTER") {
      submitGuess();
    } else if (key === "⌫") {
      setCurrentInput(prev => prev.slice(0, -1));
      setError("");
    } else if (/^[A-Z]$/.test(key) && currentInput.length < wordLength) {
      triggerPop(currentInput.length);
      setCurrentInput(prev => prev + key);
      setError("");
    }
  }, [isPlaying, submitting, currentInput, wordLength, submitGuess, triggerPop]);

  // Derived: positions already guessed correctly
  const revealedPositions = Array.from(
    new Set(
      guesses.flatMap((guess) =>
        guess.map((g, i) => (g.status === "correct" ? i : -1)).filter((i) => i >= 0)
      )
    )
  );

  // Hint handler
  const useHint = useCallback(async () => {
    if (hintLevel === 0) {
      setHintLevel(1);
    } else if (hintLevel === 1) {
      setHintLoading(true);
      try {
        const resp = await fetch(`/api/puzzles/${puzzleId}/word_crack/hint`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revealedPositions }),
          credentials: "same-origin",
        });
        const data = await resp.json();
        if (resp.ok) {
          setHintReveal({ position: data.position, letter: data.letter });
          setHintLevel(2);
        }
      } catch {
        // silently ignore
      } finally {
        setHintLoading(false);
      }
    }
  }, [hintLevel, puzzleId, revealedPositions]);

  // â”€â”€ Build grid rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Only render rows that have been played + the current active row (no ghost rows below)
  const displayRowCount = gameStatus === "playing" ? guesses.length + 1 : guesses.length;
  const rows = Array.from({ length: Math.min(displayRowCount, maxGuesses) }, (_, r) => {
    if (r < guesses.length) {
      return { rowIndex: r, letters: guesses[r].map(g => ({ char: g.letter, kind: g.status as LetterStatus | "empty" | "active" })) };
    } else if (r === guesses.length && gameStatus === "playing") {
      return {
        rowIndex: r,
        letters: Array.from({ length: wordLength }, (_, i) => ({
          char: currentInput[i] ?? "",
          kind: (currentInput[i] ? "active" : "empty") as LetterStatus | "empty" | "active",
        })),
      };
    }
    return { rowIndex: r, letters: Array.from({ length: wordLength }, () => ({ char: "", kind: "empty" as const })) };
  });

  // â”€â”€ Guess quality label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const PRAISE = ["⚡ LEGENDARY!", "🔓 MASTERCRACK!", "💥 IMPRESSIVE!", "👏 NICE WORK!", "😅 BARELY CRACKED!", "😤 BY A THREAD!"];
  const praiseIndex = Math.min(guesses.length - 1, PRAISE.length - 1);

  const getGrade = (count: number, max: number): { grade: string; color: string } => {
    if (count === 1) return { grade: "S", color: "#38D399" };
    if (count === 2) return { grade: "A", color: "#a3e635" };
    if (count <= Math.ceil(max * 0.5)) return { grade: "B", color: "#FDE74C" };
    if (count <= Math.ceil(max * 0.75)) return { grade: "C", color: "#f97316" };
    return { grade: "D", color: "#ef4444" };
  };
  const grade = getGrade(guesses.length, maxGuesses);

  // Locked overlay — all 3 games used up
  if (attemptsLocked) {
    return (
      <div className="flex flex-col items-center gap-6 p-8 text-center">
        <div className="text-5xl">🔒</div>
        <h3 className="font-black text-2xl" style={{ color: "#ef4444" }}>PUZZLE LOCKED</h3>
        <p style={{ color: "#9ca3af" }}>You&apos;ve used all {MAX_ATTEMPTS} attempts on this puzzle.</p>
        {revealedWord && (
          <div className="mt-2">
            <p className="text-sm mb-1" style={{ color: "#9ca3af" }}>The word was:</p>
            <span className="font-black text-2xl tracking-widest" style={{ color: "#FDE74C" }}>
              {revealedWord.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Instructions modal */}
      {showInstructions && (
        <InstructionsModal
          wordLength={wordLength}
          maxGuesses={maxGuesses}
          onClose={() => setShowInstructions(false)}
        />
      )}

      {/* Confetti burst */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {confetti.map(p => (
            <div
              key={p.id}
              className="absolute rounded-sm"
              style={{
                left: `${p.x}%`,
                top: "-10px",
                width: p.size,
                height: p.size * 0.6,
                background: p.color,
                animation: `wc-fall ${p.duration}s ${p.delay}s ease-in forwards`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className="wc-skin-root"
        data-skin={skin._key ?? "default"}
        style={{
          position: "relative",
          borderRadius: "1rem",
          overflow: "hidden",
          width: "100%",
          maxWidth: "100vw",
        }}
      >
        {/* Animated skin backgrounds */}
        {(skin._key === "lava" || skin._key === "skin_lava") && <LavaBackground />}
        {(skin._key === "galaxy" || skin._key === "skin_galaxy") && <GalaxyBackground />}
        {(skin._key === "ice" || skin._key === "skin_ice") && <IceBackground />}
        {(skin._key === "neon" || skin._key === "skin_neon") && <NeonBackground />}
        {(skin._key === "retro" || skin._key === "skin_retro") && <RetroBackground />}

      <div
        className="flex flex-col items-center gap-4 select-none pb-6"
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: skin.tileFontFamily !== "inherit" ? skin.tileFontFamily : "'Clear Sans', 'Helvetica Neue', Arial, sans-serif",
          "--tile-sz": `clamp(26px, calc((100vw - 4rem - ${(wordLength - 1) * 4}px) / ${wordLength}), 56px)`,
          "--tile-sz-sm": `clamp(26px, calc((100vw - 5rem - ${(wordLength - 1) * 8}px) / ${wordLength}), 56px)`,
          "--skin-tile-bg": skin.tileBg,
          "--skin-tile-border": skin.tileBorder,
          "--skin-tile-text": skin.tileText,
          "--skin-board-border": skin.boardBorder,
          "--skin-accent-active": skin.accentActive,
        } as React.CSSProperties}
      >
        {/* â”€â”€ Header â”€â”€ */}
        <div className="text-center relative w-full px-8">
          <h2
            className="text-2xl sm:text-3xl font-black tracking-[0.25em] mb-1"
            style={(() => {
              const key = skin._key ?? "default";
              const gradients: Record<string, string> = {
                retro:       "linear-gradient(135deg, #B43CFF, #FF55AA, #00FF88)",
                skin_retro:  "linear-gradient(135deg, #B43CFF, #FF55AA, #00FF88)",
                neon:        "linear-gradient(135deg, #00FFE5, #FFFFFF, #FF00CC)",
                skin_neon:   "linear-gradient(135deg, #00FFE5, #FFFFFF, #FF00CC)",
                lava:        "linear-gradient(135deg, #FF5500, #FFAA00, #FF3000)",
                skin_lava:   "linear-gradient(135deg, #FF5500, #FFAA00, #FF3000)",
                galaxy:      "linear-gradient(135deg, #8B5CF6, #E0BAFF, #C026D3)",
                skin_galaxy: "linear-gradient(135deg, #8B5CF6, #E0BAFF, #C026D3)",
                ice:         "linear-gradient(135deg, #67E8F9, #FFFFFF, #38BDF8)",
                skin_ice:    "linear-gradient(135deg, #67E8F9, #FFFFFF, #38BDF8)",
                default:     "linear-gradient(135deg, #818cf8, #c084fc, #f472b6)",
              };
              const glows: Record<string, string> = {
                retro:       "drop-shadow(0 0 14px rgba(180,60,255,0.7))",
                skin_retro:  "drop-shadow(0 0 14px rgba(180,60,255,0.7))",
                neon:        "drop-shadow(0 0 16px rgba(0,255,229,0.85))",
                skin_neon:   "drop-shadow(0 0 16px rgba(0,255,229,0.85))",
                lava:        "drop-shadow(0 0 14px rgba(255,85,0,0.75))",
                skin_lava:   "drop-shadow(0 0 14px rgba(255,85,0,0.75))",
                galaxy:      "drop-shadow(0 0 14px rgba(139,92,246,0.7))",
                skin_galaxy: "drop-shadow(0 0 14px rgba(139,92,246,0.7))",
                ice:         "drop-shadow(0 0 14px rgba(103,232,249,0.65))",
                skin_ice:    "drop-shadow(0 0 14px rgba(103,232,249,0.65))",
                default:     "drop-shadow(0 0 12px rgba(129,140,248,0.5))",
              };
              return {
                display: "inline-block",
                backgroundImage: gradients[key] ?? gradients.default,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              };
            })()}
          >
            WORD CRACK
          </h2>
          <button
            onClick={() => setShowInstructions(true)}
            className="absolute right-0 top-0 w-8 h-8 sm:w-6 sm:h-6 rounded-full text-sm sm:text-xs font-bold flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(129,140,248,0.2)", border: "1px solid rgba(129,140,248,0.4)", color: "#818cf8" }}
            title="How to play"
          >
            ?
          </button>
          {hint && hintLevel >= 1 && (
            <p className="text-sm mt-1" style={{ color: "#cbd5e1", textShadow: "0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)" }}>
              💡 <span className="italic">{hint}</span>
            </p>
          )}
          <p className="text-xs mt-1 font-medium" style={{ color: "#e2e8f0", textShadow: "0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)" }}>
            {wordLength} letters · {maxGuesses - guesses.length} attempt{maxGuesses - guesses.length !== 1 ? "s" : ""} remaining
          </p>
          {!warzMode && gameStatus === "playing" && MAX_ATTEMPTS > 0 && (
            <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
              Game {failedAttempts + 1} of {MAX_ATTEMPTS}
            </p>
          )}
        </div>

        {/* ─── Crack Meter ─── */}
        {gameStatus === "playing" && (
          <div className="w-full px-4" style={{ maxWidth: "320px" }}>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "#9ca3af" }}>
              <span className="font-bold tracking-widest">CRACK METER</span>
              <span>{guesses.length} / {maxGuesses}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(guesses.length / maxGuesses) * 100}%`,
                  background: guesses.length / maxGuesses < 0.5
                    ? "#38D399"
                    : guesses.length / maxGuesses < 0.75
                    ? "#FDE74C"
                    : "#ef4444",
                  boxShadow: guesses.length / maxGuesses >= 0.75
                    ? "0 0 8px rgba(239,68,68,0.6)"
                    : guesses.length / maxGuesses >= 0.5
                    ? "0 0 8px rgba(253,231,76,0.5)"
                    : "0 0 8px rgba(56,211,153,0.5)",
                }}
              />
            </div>
          </div>
        )}

        {/* ─── Status toast (error or decrypting) ─── */}
        {(error || submitting) && (
          <div
            className="px-5 py-2 rounded-full text-sm font-bold"
            style={{
              background: submitting ? "rgba(56,211,153,0.1)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${submitting ? "rgba(56,211,153,0.4)" : "rgba(239,68,68,0.5)"}`,
              color: submitting ? "#38D399" : "#fca5a5",
              boxShadow: submitting ? "0 0 16px rgba(56,211,153,0.25)" : "0 0 16px rgba(239,68,68,0.3)",
              letterSpacing: submitting ? "0.15em" : undefined,
            }}
          >
            {submitting ? "⚡ DECRYPTING..." : error}
          </div>
        )}

        {/* â”€â”€ Win banner â”€â”€ */}
        {gameStatus === "won" && (
          <div
            className={`px-6 py-4 rounded-2xl text-center ${bounceWin ? "wc-win-bounce" : ""}`}
            style={{
              background: "linear-gradient(135deg, rgba(56,211,153,0.15), rgba(16,185,129,0.15))",
              border: `1px solid ${grade.color}55`,
              boxShadow: `0 0 30px ${grade.color}40`,
            }}
          >
            <div style={{ fontSize: "2rem" }}>⚡</div>
            <div className="font-black text-lg mt-1" style={{ color: grade.color }}>{PRAISE[praiseIndex]}</div>
            <div className="flex items-center justify-center gap-3 mt-2">
              <div
                className="font-black text-3xl px-4 py-1 rounded-xl"
                style={{ color: grade.color, background: `${grade.color}18`, border: `2px solid ${grade.color}` }}
              >
                {grade.grade}
              </div>
              <div className="text-sm" style={{ color: "#9ca3af" }}>
                Cracked in {guesses.length}<br />
                {guesses.length === 1 ? "attempt" : "attempts"}
              </div>
            </div>
          </div>
        )}

        {/* Loss banner */}
        {gameStatus === "lost" && (
          <div
            className="px-6 py-3 rounded-2xl text-center"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <div className="text-2xl mb-1">💀</div>
            <div className="font-black" style={{ color: "#f87171" }}>CODE NOT CRACKED</div>
            {!warzMode && failedAttempts < MAX_ATTEMPTS && (
              <>
                <div className="text-sm mt-1" style={{ color: "#9ca3af" }}>
                  {MAX_ATTEMPTS - failedAttempts} game{MAX_ATTEMPTS - failedAttempts !== 1 ? "s" : ""} remaining
                </div>
                <button
                  onClick={resetForNewAttempt}
                  className="mt-3 px-5 py-2 rounded-xl font-black text-sm tracking-wider transition-all hover:scale-105 active:scale-95"
                  style={{ background: "#FDE74C", color: "#020202" }}
                >
                  PLAY AGAIN
                </button>
              </>
            )}
            {!warzMode && failedAttempts >= MAX_ATTEMPTS && (
              <div className="text-sm mt-1" style={{ color: "#9ca3af" }}>No attempts remaining — puzzle locked</div>
            )}
            {warzMode && (
              <div className="text-sm mt-1" style={{ color: "#9ca3af" }}>Better intel next time!</div>
            )}
          </div>
        )}

        {/* Grid */}
        <div
          className="wc-board"
          data-skin={skin._key ?? "default"}
          style={{
            background: skin.boardBg,
            border: `2px solid ${skin.boardBorder}`,
            boxShadow: skin.boardShadow !== "none" ? skin.boardShadow : undefined,
            borderRadius: skin.boardRadius,
            padding: "1.25rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div className="wc-skin-overlay" />
          <div className="flex flex-col gap-[3px] sm:gap-1.5" style={{ position: "relative", zIndex: 1 }}>
          {rows.map(({ letters, rowIndex }) => {
            const isCurrentRow = rowIndex === guesses.length && gameStatus === "playing";
            const isRevealing = revealingRow === rowIndex;
            const isDone = revealDone.includes(rowIndex);
            const isShaking = isCurrentRow && shakingRow;

            return (
              <div
                key={rowIndex}
                className={`flex gap-[3px] sm:gap-1.5 ${isShaking ? "wc-shake" : ""}`}
              >
                {letters.map(({ char, kind }, colIndex) => {
                  const c = tileColors[kind];
                  const isPopping = popCol?.row === rowIndex && popCol?.col === colIndex;
                  const revealDelay = isRevealing ? colIndex * 350 : 0;
                  const shouldFlip = isRevealing || isDone;

                  return (
                    <div
                      key={colIndex}
                      className={`wc-tile ${shouldFlip ? "wc-flipped" : ""} ${isPopping ? "wc-pop" : ""}`}
                      style={{
                        "--tile-bg": c.bg,
                        "--tile-border": c.border,
                        "--tile-glow": c.glow,
                        "--flip-delay": `${revealDelay}ms`,
                        width: "var(--tile-sz)",
                        height: "var(--tile-sz)",
                      } as React.CSSProperties}
                    >
                      <div className="wc-tile-front" style={{ borderColor: tileColors[kind === "empty" || kind === "active" ? kind : "empty"].border }}>
                        {char}
                      </div>
                      <div className="wc-tile-back">{char}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* â”€â”€ On-screen keyboard â”€â”€ */}
        </div>

        {gameStatus === "playing" && (
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 mt-2 w-full max-w-[100vw] px-1 sm:px-0 sm:max-w-sm">
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-[3px] sm:gap-1">
                {row.map((key) => {
                  const state = keyStates[key] ?? "unused";
                  const isWide = key === "ENTER" || key === "⌫";
                  const bg = keyBg[state] ?? keyBg.unused;
                  const glow = state === "correct" ? "0 0 10px rgba(34,197,94,0.5)" :
                               state === "present" ? "0 0 10px rgba(234,179,8,0.5)" : "none";
                  return (
                    <button
                      key={key}
                      onClick={() => handleKey(key)}
                      className="rounded-lg font-bold text-white transition-all duration-150 active:scale-90"
                      style={{
                        width: isWide ? "clamp(40px, 12vw, 62px)" : "clamp(24px, 8vw, 36px)",
                        height: "clamp(40px, 11vw, 54px)",
                        background: bg,
                        boxShadow: glow,
                        fontSize: isWide ? "clamp(9px, 2.5vw, 11px)" : "clamp(11px, 3.5vw, 14px)",
                        border: `1px solid ${skin.boardBorder}`,
                        color: skin.tileText,
                      }}
                      aria-label={key}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {gameStatus === "playing" && (
          <div className="mt-3 flex flex-col items-center gap-2">
            {hintLevel < 2 && (
              <button
                onClick={useHint}
                disabled={hintLoading}
                className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: "rgba(56,145,166,0.2)", border: "1px solid rgba(56,145,166,0.5)", color: "#3891A6" }}
              >
                {hintLoading ? "..." : hintLevel === 0 ? "💡 Hint" : "🔤 Reveal a letter"}
              </button>
            )}
            {hintLevel === 2 && hintReveal && (
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Letter at position{" "}
                <span className="font-bold" style={{ color: "#3891A6" }}>{hintReveal.position + 1}</span>{" "}is{" "}
                <span className="font-bold text-lg" style={{ color: "#ffffff" }}>{hintReveal.letter}</span>
              </p>
            )}
            {hintLevel >= 2 && (
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>No more hints available</p>
            )}
          </div>
        )}      </div>      </div>
      {/* â”€â”€ All animations â”€â”€ */}
      <style>{`
        /* Tile 3D structure */
        .wc-tile {
          position: relative;
          display: inline-block;
          transform-style: preserve-3d;
        }
        .wc-tile-front,
        .wc-tile-back {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(0.8rem, 4vw, 1.4rem);
          font-weight: 900;
          color: white;
          border-radius: 6px;
          border: 2px solid;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .wc-tile-front {
          background: var(--skin-tile-bg, transparent);
          border-color: var(--skin-tile-border, #374151);
          color: var(--skin-tile-text, white);
        }
        .wc-tile-back {
          background: var(--tile-bg);
          border-color: var(--tile-border);
          box-shadow: 0 0 16px var(--tile-glow);
          transform: rotateX(180deg);
          color: var(--skin-tile-text, white);
        }
        /* Board skin overlay */
        .wc-skin-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          border-radius: inherit;
        }
        /* Lava: board border pulse only */
        .wc-board[data-skin="lava"],
        .wc-board[data-skin="skin_lava"] {
          animation: wc-lava-glow 2.5s ease-in-out infinite;
        }
        @keyframes wc-lava-glow {
          0%, 100% { box-shadow: 0 0 0 2px #FF5500, 0 0 30px rgba(255,85,0,0.5), 0 0 70px rgba(255,85,0,0.18), inset 0 0 30px rgba(255,20,0,0.07); }
          50%      { box-shadow: 0 0 0 2px #FF7700, 0 0 48px rgba(255,110,0,0.75), 0 0 95px rgba(255,60,0,0.3), inset 0 0 38px rgba(255,40,0,0.12); }
        }
        .wc-board[data-skin="lava"] .wc-skin-overlay,
        .wc-board[data-skin="skin_lava"] .wc-skin-overlay {
          background: radial-gradient(ellipse at 50% 110%, rgba(255,60,0,0.18) 0%, transparent 60%);
        }
        /* Neon: electric cyan pulse + scanlines */
        .wc-board[data-skin="neon"],
        .wc-board[data-skin="skin_neon"] {
          animation: wc-neon-glow 2s ease-in-out infinite;
        }
        @keyframes wc-neon-glow {
          0%, 100% { box-shadow: 0 0 0 2px #00FFE5, 0 0 25px rgba(0,255,229,0.65), 0 0 70px rgba(0,255,229,0.2), inset 0 0 25px rgba(0,255,229,0.05); }
          50%      { box-shadow: 0 0 0 2px #00FFE5, 0 0 40px rgba(0,255,229,0.9), 0 0 100px rgba(0,255,229,0.35), inset 0 0 35px rgba(0,255,229,0.1); }
        }
        .wc-board[data-skin="neon"] .wc-skin-overlay,
        .wc-board[data-skin="skin_neon"] .wc-skin-overlay {
          background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,229,0.025) 3px, rgba(0,255,229,0.025) 4px);
        }
        /* Galaxy: purple nebula pulse + starfield */
        .wc-board[data-skin="galaxy"],
        .wc-board[data-skin="skin_galaxy"] {
          animation: wc-galaxy-glow 3s ease-in-out infinite;
        }
        @keyframes wc-galaxy-glow {
          0%, 100% { box-shadow: 0 0 0 2px #8B5CF6, 0 0 25px rgba(139,92,246,0.55), 0 0 65px rgba(200,0,255,0.18), inset 0 0 25px rgba(139,92,246,0.06); }
          50%      { box-shadow: 0 0 0 2px #9B6DFF, 0 0 40px rgba(160,100,255,0.75), 0 0 90px rgba(200,0,255,0.3), inset 0 0 35px rgba(150,80,255,0.1); }
        }
        .wc-board[data-skin="galaxy"] .wc-skin-overlay,
        .wc-board[data-skin="skin_galaxy"] .wc-skin-overlay {
          background:
            radial-gradient(1.5px 1.5px at 15% 20%, rgba(200,160,255,0.9) 0%, transparent 100%),
            radial-gradient(1px 1px at 80% 15%, rgba(220,180,255,0.7) 0%, transparent 100%),
            radial-gradient(2px 2px at 55% 75%, rgba(139,92,246,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 65%, rgba(200,150,255,0.6) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 25% 55%, rgba(170,100,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 40%, rgba(210,170,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 40% 10%, rgba(180,120,255,0.6) 0%, transparent 100%),
            radial-gradient(ellipse at 30% 80%, rgba(139,92,246,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 20%, rgba(200,0,255,0.08) 0%, transparent 50%);
        }
        /* Ice: crystal shimmer + frost gradient */
        .wc-board[data-skin="ice"],
        .wc-board[data-skin="skin_ice"] {
          animation: wc-ice-glow 3.5s ease-in-out infinite;
        }
        @keyframes wc-ice-glow {
          0%, 100% { box-shadow: 0 0 0 2px #67E8F9, 0 0 22px rgba(103,232,249,0.45), 0 0 55px rgba(103,232,249,0.12), inset 0 0 22px rgba(103,232,249,0.05); }
          50%      { box-shadow: 0 0 0 2px #7EEDFF, 0 0 35px rgba(103,232,249,0.65), 0 0 75px rgba(103,232,249,0.2), inset 0 0 30px rgba(103,232,249,0.1); }
        }
        .wc-board[data-skin="ice"] .wc-skin-overlay,
        .wc-board[data-skin="skin_ice"] .wc-skin-overlay {
          background:
            linear-gradient(180deg, rgba(103,232,249,0.1) 0%, transparent 35%),
            linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%);
        }
        /* Retro: CRT flicker + scanlines + vignette */
        .wc-board[data-skin="retro"],
        .wc-board[data-skin="skin_retro"] {
          animation: wc-retro-flicker 8s steps(1) infinite, wc-retro-glow 3s ease-in-out infinite;
        }
        @keyframes wc-retro-flicker {
          0%, 94%, 96%, 100% { opacity: 1; }
          95% { opacity: 0.93; }
        }
        @keyframes wc-retro-glow {
          0%, 100% { box-shadow: 0 0 0 3px #B43CFF, 0 0 30px rgba(180,60,255,0.55), 0 0 70px rgba(180,60,255,0.18); }
          50%      { box-shadow: 0 0 0 3px #D060FF, 0 0 45px rgba(200,80,255,0.75), 0 0 90px rgba(180,60,255,0.28); }
        }
        .wc-board[data-skin="retro"] .wc-skin-overlay,
        .wc-board[data-skin="skin_retro"] .wc-skin-overlay {
          background:
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px),
            radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%);
        }
        /* Reveal flip */
        .wc-flipped {
          animation: wc-flip 0.5s ease var(--flip-delay) both;
        }
        @keyframes wc-flip {
          0%   { transform: rotateX(0deg); }
          50%  { transform: rotateX(-90deg); }
          100% { transform: rotateX(-180deg); }
        }
        /* Type pop */
        @keyframes wc-pop-anim {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .wc-pop { animation: wc-pop-anim 0.12s ease; }
        /* Shake */
        @keyframes wc-shake {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-7px); }
          35%     { transform: translateX(7px); }
          55%     { transform: translateX(-5px); }
          75%     { transform: translateX(5px); }
        }
        .wc-shake { animation: wc-shake 0.5s ease; }
        /* Win bounce */
        @keyframes wc-win-bounce-anim {
          0%,100% { transform: scale(1); }
          25%     { transform: scale(1.08) rotate(-1deg); }
          50%     { transform: scale(1.12) rotate(1deg); }
          75%     { transform: scale(1.06) rotate(-0.5deg); }
        }
        .wc-win-bounce { animation: wc-win-bounce-anim 0.6s ease; }
        /* Confetti fall */
        @keyframes wc-fall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </>
  );
}
