"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  alreadySolved?: boolean;
}

// â”€â”€â”€ Keyboard layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

// â”€â”€â”€ Colour palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const COLORS = {
  correct: { bg: "#22c55e", border: "#16a34a", glow: "rgba(34,197,94,0.6)" },
  present: { bg: "#eab308", border: "#ca8a04", glow: "rgba(234,179,8,0.6)" },
  absent:  { bg: "#374151", border: "#4b5563", glow: "none" },
  empty:   { bg: "transparent", border: "#374151", glow: "none" },
  active:  { bg: "rgba(99,102,241,0.15)", border: "#818cf8", glow: "rgba(129,140,248,0.4)" },
};

const KEY_COLORS: Record<LetterStatus | "unused", string> = {
  correct: "#16a34a",
  present: "#ca8a04",
  absent:  "#374151",
  unused:  "#4b5563",
};

// â”€â”€â”€ Confetti particle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Particle { id: number; x: number; color: string; delay: number; duration: number; size: number; }

function makeConfetti(): Particle[] {
  const palette = ["#22c55e","#eab308","#818cf8","#f472b6","#38bdf8","#fb923c"];
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
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          border: "1px solid rgba(129,140,248,0.3)",
          boxShadow: "0 0 40px rgba(129,140,248,0.2), 0 25px 50px rgba(0,0,0,0.6)",
        }}
      >
        {/* Title */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🔡</div>
          <h2 className="text-2xl font-black tracking-widest" style={{ color: "#818cf8" }}>HOW TO PLAY</h2>
          <p className="text-gray-400 text-sm mt-1">Crack the hidden word!</p>
        </div>

        {/* Rules */}
        <ul className="space-y-3 text-sm mb-6">
          <li className="flex items-start gap-3">
            <span className="text-lg">🎯</span>
            <span>Guess the <strong className="text-white">{wordLength}-letter word</strong> in {maxGuesses} tries.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-lg">⌨️</span>
            <span>Type using your keyboard or tap the on-screen keys, then press <strong className="text-white">ENTER</strong>.</span>
          </li>
        </ul>

        {/* Colour examples */}
        <div className="space-y-3 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tile colours mean:</p>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
              style={{ background: COLORS.correct.bg, boxShadow: `0 0 12px ${COLORS.correct.glow}` }}>C</div>
            <span className="text-sm text-gray-300">🟢 <strong className="text-white">Correct</strong> — right letter, right spot</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
              style={{ background: COLORS.present.bg, boxShadow: `0 0 12px ${COLORS.present.glow}` }}>P</div>
            <span className="text-sm text-gray-300">🟡 <strong className="text-white">Present</strong> — in the word, wrong spot</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
              style={{ background: COLORS.absent.bg, border: `2px solid ${COLORS.absent.border}` }}>X</div>
            <span className="text-sm text-gray-300">⚫ <strong className="text-white">Absent</strong> — not in the word</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-black text-lg tracking-widest transition-all duration-150 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 0 20px rgba(99,102,241,0.5)",
          }}
        >
          LET'S GO! 🚀
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function WordCrackPuzzle({ puzzleId, wordCrackData, onSolved, alreadySolved }: Props) {
  const wordLength = Math.max(3, Math.min(10, Number(wordCrackData.wordLength ?? 5)));
  const maxGuesses = Math.max(1, Math.min(10, Number(wordCrackData.maxGuesses ?? 6)));
  const hint = String(wordCrackData.hint ?? "");

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

  const isPlaying = gameStatus === "playing" && !showInstructions;
  const onSolvedFired = useRef(false);

  // â”€â”€ Derived: keyboard letter states â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const keyStates: Record<string, LetterStatus | "unused"> = {};
  for (const guess of guesses) {
    for (const { letter, status } of guess) {
      const current = keyStates[letter];
      if (current === "correct") continue;
      if (status === "correct" || current === undefined) {
        keyStates[letter] = status;
      } else if (status === "present" && current !== "correct") {
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
        body: JSON.stringify({ guess: word }),
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
        setTimeout(() => setGameStatus("lost"), revealTotal);
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

  // â”€â”€ Build grid rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rows = Array.from({ length: maxGuesses }, (_, r) => {
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
  const PRAISE = ["🔥 Genius!", "🌟 Magnificent!", "✨ Impressive!", "👏 Splendid!", "😊 Great!", "😅 Phew!"];
  const praiseIndex = Math.min(guesses.length - 1, PRAISE.length - 1);

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
        className="flex flex-col items-center gap-4 select-none pb-6"
        style={{
          fontFamily: "'Clear Sans', 'Helvetica Neue', Arial, sans-serif",
          "--tile-sz": `min(56px, calc((100vw - 3rem - ${(wordLength - 1) * 4}px) / ${wordLength}))`,
        } as React.CSSProperties}
      >
        {/* â”€â”€ Header â”€â”€ */}
        <div className="text-center relative w-full px-8">
          <h2
            className="text-2xl sm:text-3xl font-black tracking-[0.25em] mb-1"
            style={{
              background: "linear-gradient(135deg, #818cf8, #c084fc, #f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 12px rgba(129,140,248,0.5))",
            }}
          >
            WORD CRACK
          </h2>
          <button
            onClick={() => setShowInstructions(true)}
            className="absolute right-0 top-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(129,140,248,0.2)", border: "1px solid rgba(129,140,248,0.4)", color: "#818cf8" }}
            title="How to play"
          >
            ?
          </button>
          {hint && (
            <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
              💡 <span className="italic">{hint}</span>
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>
            {wordLength} letters · {maxGuesses - guesses.length} guess{maxGuesses - guesses.length !== 1 ? "es" : ""} left
          </p>
        </div>

        {/* â”€â”€ Error toast â”€â”€ */}
        {error && (
          <div
            className="px-5 py-2 rounded-full text-sm font-bold"
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.5)",
              color: "#fca5a5",
              boxShadow: "0 0 16px rgba(239,68,68,0.3)",
            }}
          >
            {error}
          </div>
        )}

        {/* â”€â”€ Win banner â”€â”€ */}
        {gameStatus === "won" && (
          <div
            className={`px-6 py-3 rounded-2xl text-center font-black text-lg ${bounceWin ? "wc-win-bounce" : ""}`}
            style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2))",
              border: "1px solid rgba(34,197,94,0.5)",
              boxShadow: "0 0 30px rgba(34,197,94,0.3)",
            }}
          >
            <div style={{ color: "#4ade80", fontSize: "2rem" }}>🎉</div>
            <div style={{ color: "#4ade80" }}>{PRAISE[praiseIndex]}</div>
            <div className="text-sm font-normal mt-1" style={{ color: "#86efac" }}>
              Solved in {guesses.length} {guesses.length === 1 ? "guess" : "guesses"}
            </div>
          </div>
        )}

        {/* â”€â”€ Loss banner â”€â”€ */}
        {gameStatus === "lost" && (
          <div
            className="px-6 py-3 rounded-2xl text-center"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <div className="text-2xl mb-1">💀</div>
            <div className="font-black" style={{ color: "#f87171" }}>Better luck next time!</div>
          </div>
        )}

        {/* â”€â”€ Grid â”€â”€ */}
        <div className="flex flex-col gap-1 sm:gap-2">
          {rows.map(({ letters, rowIndex }) => {
            const isCurrentRow = rowIndex === guesses.length && gameStatus === "playing";
            const isRevealing = revealingRow === rowIndex;
            const isDone = revealDone.includes(rowIndex);
            const isShaking = isCurrentRow && shakingRow;

            return (
              <div
                key={rowIndex}
                className={`flex gap-1 sm:gap-2 ${isShaking ? "wc-shake" : ""}`}
              >
                {letters.map(({ char, kind }, colIndex) => {
                  const c = COLORS[kind];
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
                      <div className="wc-tile-front" style={{ borderColor: COLORS[kind === "empty" || kind === "active" ? kind : "empty"].border }}>
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
        {gameStatus === "playing" && (
          <div className="flex flex-col items-center gap-1.5 mt-2 w-full max-w-[95vw] sm:max-w-sm">
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                {row.map((key) => {
                  const state = keyStates[key] ?? "unused";
                  const isWide = key === "ENTER" || key === "⌫";
                  const bg = KEY_COLORS[state as keyof typeof KEY_COLORS];
                  const glow = state === "correct" ? "0 0 10px rgba(34,197,94,0.5)" :
                               state === "present" ? "0 0 10px rgba(234,179,8,0.5)" : "none";
                  return (
                    <button
                      key={key}
                      onClick={() => handleKey(key)}
                      className="rounded-lg font-bold text-white transition-all duration-150 active:scale-90"
                      style={{
                        width: isWide ? "clamp(50px, 14vw, 62px)" : "clamp(28px, 8.5vw, 36px)",
                        height: "clamp(42px, 12vw, 54px)",
                        background: bg,
                        boxShadow: glow,
                        fontSize: isWide ? "clamp(9px, 2.5vw, 11px)" : "clamp(11px, 3.5vw, 14px)",
                        border: "1px solid rgba(255,255,255,0.05)",
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
      </div>

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
          background: transparent;
          border-color: #374151;
        }
        .wc-tile-back {
          background: var(--tile-bg);
          border-color: var(--tile-border);
          box-shadow: 0 0 16px var(--tile-glow);
          transform: rotateX(180deg);
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
