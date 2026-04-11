"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePuzzleSkin } from "@/hooks/usePuzzleSkin";

const LavaBackground = dynamic(() => import("@/components/LavaBackground"), { ssr: false });
const GalaxyBackground = dynamic(() => import("@/components/GalaxyBackground"), { ssr: false });
const IceBackground = dynamic(() => import("@/components/IceBackground"), { ssr: false });
const NeonBackground = dynamic(() => import("@/components/NeonBackground"), { ssr: false });
const RetroBackground = dynamic(() => import("@/components/RetroBackground"), { ssr: false });

interface AnagramBlitzProps {
  puzzleId: string;
  anagramData: Record<string, unknown>;
  alreadySolved?: boolean;
  onSolved?: () => void;
  onFailed?: () => void;
}

function scramble(word: string): string {
  const arr = word.split("");
  // Fisher-Yates — keep shuffling until result differs from original
  let result = word;
  let attempts = 0;
  while (result === word && attempts < 20) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    result = arr.join("");
    attempts++;
  }
  return result;
}

export default function AnagramBlitz({
  puzzleId,
  anagramData,
  alreadySolved = false,
  onSolved,
  onFailed,
}: AnagramBlitzProps) {
  const words: string[] = Array.isArray(anagramData.words)
    ? (anagramData.words as string[]).map((w) => String(w).toUpperCase()).filter(Boolean)
    : [];
  const totalTime = Number(anagramData.timeLimit ?? 60);
  const hint = anagramData.hint ? String(anagramData.hint) : null;
  const skin = usePuzzleSkin();

  // Skin background wrapper used by all return paths
  const skinWrap = (children: ReactNode) => (
    <div
      data-skin={skin._key ?? "default"}
      style={{
        position: "relative",
        borderRadius: "1rem",
        overflow: "hidden",
        width: "100%",
        maxWidth: "100vw",
      }}
    >
      {(skin._key === "lava" || skin._key === "skin_lava") && <LavaBackground />}
      {(skin._key === "galaxy" || skin._key === "skin_galaxy") && <GalaxyBackground />}
      {(skin._key === "ice" || skin._key === "skin_ice") && <IceBackground />}
      {(skin._key === "neon" || skin._key === "skin_neon") && <NeonBackground />}
      {(skin._key === "retro" || skin._key === "skin_retro") && <RetroBackground />}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );

  // Guard: no words configured
  if (words.length === 0) {
    return skinWrap(
      <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(15,18,25,0.97)", border: "1px solid rgba(248,113,113,0.3)" }}>
        <p className="text-red-400 font-semibold">⚠️ This puzzle has no words configured yet.</p>
      </div>
    );
  }

  const [scrambledWords] = useState<string[]>(() => words.map(scramble));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState("");
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  const [skippedWords, setSkippedWords] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allDone = solvedWords.length + skippedWords.length === words.length;

  const endGame = useCallback(
    async (solved: string[], skipped: string[]) => {
      setFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const allCorrect = solved.length === words.length;
      if (!allCorrect) {
        onFailed?.();
        return;
      }

      setSubmitting(true);
      try {
        await fetch(`/api/puzzles/${puzzleId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "attempt_success" }),
        });
        onSolved?.();
      } catch {
        // silently ignore — onSolved still fires via outer handler
      } finally {
        setSubmitting(false);
      }
    },
    [puzzleId, words.length, onSolved, onFailed]
  );

  // Timer
  useEffect(() => {
    if (!started || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // mark remaining as skipped
          setSkippedWords((prev) => {
            const remaining = words.slice(solvedWords.length + prev.length);
            const newSkipped = [...prev, ...remaining];
            endGame(solvedWords, newSkipped);
            return newSkipped;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished]);

  useEffect(() => {
    if (started && !finished) inputRef.current?.focus();
  }, [started, finished, currentIdx]);

  function handleStart() {
    setStarted(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!started || finished) return;
    const guess = input.trim().toUpperCase();
    const correct = words[currentIdx];

    if (guess === correct) {
      setFlash("correct");
      setTimeout(() => setFlash(null), 500);
      const newSolved = [...solvedWords, correct];
      setSolvedWords(newSolved);
      setInput("");
      const next = currentIdx + 1;
      if (next >= words.length) {
        endGame(newSolved, skippedWords);
      } else {
        setCurrentIdx(next);
      }
    } else {
      setFlash("wrong");
      setShake(true);
      setTimeout(() => {
        setFlash(null);
        setShake(false);
      }, 500);
    }
  }

  function handleSkip() {
    if (!started || finished) return;
    const newSkipped = [...skippedWords, words[currentIdx]];
    setSkippedWords(newSkipped);
    setInput("");
    const next = currentIdx + 1;
    if (next >= words.length) {
      endGame(solvedWords, newSkipped);
    } else {
      setCurrentIdx(next);
    }
  }

  const timerPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const timerColor =
    timerPct > 50 ? "#4ade80" : timerPct > 25 ? "#FDE74C" : "#f87171";

  // ── Already solved banner ──
  if (alreadySolved) {
    return skinWrap(
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "rgba(56,211,153,0.08)",
          border: "1px solid rgba(56,211,153,0.3)",
        }}
      >
        <p className="text-2xl mb-2">🔀✅</p>
        <p className="text-white font-bold text-lg">You already unscrambled all the words!</p>
        <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Come back for more puzzles on the Puzzles page.</p>
      </div>
    );
  }

  // ── Pre-start screen ──
  if (!started) {
    return skinWrap(
      <div
        className="rounded-2xl p-8 flex flex-col items-center gap-5 text-center"
        style={{
          background: skin.boardBg,
          border: `1px solid ${skin.boardBorder}`,
          borderRadius: skin.boardRadius,
        }}
      >
        <span className="text-5xl">🔀</span>
        <h2 className="text-2xl font-extrabold text-white">Anagram Blitz</h2>
        <p className="text-gray-400 max-w-sm">
          Unscramble each word before the timer runs out. Type your answer and
          press Enter — or skip if you're stuck.
        </p>
        <div className="flex gap-6 text-sm text-gray-300">
          <span>📝 {words.length} words</span>
          <span>⏱️ {totalTime}s</span>
        </div>
        {hint && (
          <p className="text-sm px-4 py-2 rounded-lg" style={{ background: "rgba(253,231,76,0.08)", color: "#FDE74C" }}>
            💡 {hint}
          </p>
        )}
        <button
          onClick={handleStart}
          className="mt-2 px-10 py-3 rounded-xl font-bold text-lg text-black transition-transform hover:scale-105 active:scale-95"
          style={{ background: skin.btnBg }}
        >
          Start!
        </button>
      </div>
    );
  }

  // ── Finished screen ──
  if (finished) {
    const score = solvedWords.length;
    const total = words.length;
    const perfect = score === total;
    return skinWrap(
      <div
        className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
        style={{
          background: perfect ? "rgba(56,211,153,0.08)" : skin.boardBg,
          border: `1px solid ${perfect ? "rgba(56,211,153,0.4)" : skin.boardBorder}`,
          borderRadius: skin.boardRadius,
        }}
      >
        <span className="text-5xl">{perfect ? "🎉" : "⏱️"}</span>
        <h2 className="text-2xl font-extrabold text-white">
          {perfect ? "Perfect Blitz!" : `${score} / ${total} Solved`}
        </h2>
        {perfect ? (
          <p className="text-green-400 font-semibold">You unscrambled every word in time!</p>
        ) : (
          <p className="text-gray-400">Better luck next time — keep practicing!</p>
        )}

        <div className="mt-2 w-full max-w-xs flex flex-col gap-2">
          {words.map((word, i) => {
            const wasSolved = solvedWords.includes(word);
            return (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2 rounded-lg text-sm font-mono"
                style={{
                  background: wasSolved ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                  border: `1px solid ${wasSolved ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.2)"}`,
                }}
              >
                <span style={{ color: "#9ca3af" }}>{scrambledWords[i]}</span>
                <span style={{ color: wasSolved ? "#4ade80" : "#f87171" }}>
                  {wasSolved ? "✓" : "✗"} {word}
                </span>
              </div>
            );
          })}
        </div>

        {submitting && (
          <p className="text-sm text-gray-400 animate-pulse mt-2">Saving result…</p>
        )}
      </div>
    );
  }

  // ── Active game ──
  const currentWord = words[currentIdx];
  const currentScrambled = scrambledWords[currentIdx];

  return skinWrap(
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{
        background: skin.boardBg,
        border: `1px solid ${skin.boardBorder}`,
        borderRadius: skin.boardRadius,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "#e2e8f0", textShadow: "0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)" }}>
          Word {currentIdx + 1} / {words.length}
        </span>
        <span
          className="text-lg font-extrabold tabular-nums"
          style={{ color: timerColor }}
        >
          ⏱️ {timeLeft}s
        </span>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1.5 rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
        />
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 flex-wrap">
        {words.map((w, i) => {
          const solved = solvedWords.includes(w);
          const skipped = skippedWords.includes(w);
          const active = i === currentIdx;
          return (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                background: solved
                  ? "#4ade80"
                  : skipped
                  ? "#f87171"
                  : active
                  ? "#FDE74C"
                  : "rgba(255,255,255,0.15)",
              }}
            />
          );
        })}
      </div>

      {/* Scrambled word */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest mb-2 font-medium" style={{ color: "#cbd5e1", textShadow: "0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)" }}>Unscramble this word</p>
        <div
          className={`flex justify-center gap-2 flex-wrap transition-all ${shake ? "animate-bounce" : ""}`}
        >
          {currentScrambled.split("").map((ch, i) => (
            <div
              key={i}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-xl font-extrabold text-white"
              style={{
                background:
                  flash === "correct"
                    ? "rgba(74,222,128,0.3)"
                    : flash === "wrong"
                    ? "rgba(248,113,113,0.3)"
                    : skin.tileBg,
                border: `2px solid ${
                  flash === "correct"
                    ? "rgba(74,222,128,0.6)"
                    : flash === "wrong"
                    ? "rgba(248,113,113,0.5)"
                    : skin.tileBorder
                }`,
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              {ch}
            </div>
          ))}
        </div>
        {hint && (
          <p className="text-xs mt-3" style={{ color: "#FDE74C" }}>
            💡 {hint}
          </p>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) =>
            setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
          }
          maxLength={currentWord.length}
          placeholder={`${currentWord.length} letters…`}
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border text-white font-mono text-lg tracking-widest uppercase placeholder-gray-600 outline-none focus:ring-2"
          style={{
            borderColor:
              flash === "correct"
                ? "rgba(74,222,128,0.7)"
                : flash === "wrong"
                ? "rgba(248,113,113,0.6)"
                : skin.inputBorder,
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-xl font-bold text-black transition-transform hover:scale-105 active:scale-95"
          style={{ background: skin.btnBg, color: skin.btnText }}
        >
          ✓
        </button>
      </form>

      {/* Skip */}
      <button
        onClick={handleSkip}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors text-center"
      >
        Skip this word →
      </button>
    </div>
  );
}
