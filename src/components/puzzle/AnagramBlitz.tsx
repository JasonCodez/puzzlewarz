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

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full rounded-xl p-6 shadow-2xl"
        style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-extrabold" style={{ color: "#FDE74C" }}>How to Play — Anagram Blitz</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none ml-4">✕</button>
        </div>
        <div className="space-y-3 text-sm text-gray-300">
          <p>Unscramble a series of words before the timer runs out. Each word is shown as a jumble of letters — figure out what word they spell.</p>
          <p><strong className="text-white">Answering:</strong> Type the correct word and press Enter (or the ✓ button). If you&apos;re correct, it&apos;s marked off and the next word appears.</p>
          <p><strong className="text-white">Skipping:</strong> If you&apos;re stuck, use the Skip button to move the current word to the back of the queue. Come back to it if time allows.</p>
          <p><strong className="text-white">Winning:</strong> Unscramble every word before the clock hits zero to complete the puzzle.</p>
        </div>
        <div className="mt-5 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "#FDE74C", color: "#000" }}>Got it</button>
        </div>
      </div>
    </div>
  );
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
      {(skin._key === "ice" || skin._key === "skin_ice" || skin._key === "christmas" || skin._key === "skin_christmas") && <IceBackground />}
      {(skin._key === "neon" || skin._key === "skin_neon") && <NeonBackground />}
      {(skin._key === "retro" || skin._key === "skin_retro") && <RetroBackground />}
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
  const [queue, setQueue] = useState<string[]>(() => [...words]);
  const [input, setInput] = useState("");
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs so the timer callback can read latest state without stale closure
  const queueRef = useRef<string[]>(queue);
  const solvedWordsRef = useRef<string[]>(solvedWords);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { solvedWordsRef.current = solvedWords; }, [solvedWords]);

  function handleReset() {
    setQueue([...words]);
    setInput("");
    setSolvedWords([]);
    setTimeLeft(totalTime);
    setStarted(false);
    setFinished(false);
    setFlash(null);
    setShake(false);
  }

  const endGame = useCallback(
    async (solved: string[]) => {
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
          endGame(solvedWordsRef.current);
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
  }, [started, finished, queue]);

  function handleStart() {
    setStarted(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!started || finished) return;
    const guess = input.trim().toUpperCase();
    const currentWord = queue[0];

    if (guess === currentWord) {
      setFlash("correct");
      setTimeout(() => setFlash(null), 500);
      const newSolved = [...solvedWords, currentWord];
      setSolvedWords(newSolved);
      const newQueue = queue.slice(1);
      setQueue(newQueue);
      setInput("");
      if (newQueue.length === 0) {
        endGame(newSolved);
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
    if (!started || finished || queue.length <= 1) return;
    // Move current word to the back of the queue
    setQueue(q => [...q.slice(1), q[0]]);
    setInput("");
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
          <>
            <p className="text-gray-400">Better luck next time — keep practicing!</p>
            <button
              onClick={handleReset}
              className="mt-1 px-8 py-3 rounded-xl font-bold text-base text-black transition-transform hover:scale-105 active:scale-95"
              style={{ background: skin.btnBg }}
            >
              🔄 Try Again
            </button>
          </>
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
  const currentWord = queue[0] ?? words[0];
  const currentScrambled = scrambledWords[words.indexOf(currentWord)];

  return skinWrap(
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{
        background: skin.boardBg,
        border: `1px solid ${skin.boardBorder}`,
        borderRadius: skin.boardRadius,
      }}
    >
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "#e2e8f0", textShadow: "0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)" }}>
          ✓ {solvedWords.length} / {words.length} · {queue.length} left
        </span>
        <span
          className="text-lg font-extrabold tabular-nums"
          style={{ color: timerColor }}
        >
          ⏱️ {timeLeft}s
        </span>
        <button
          onClick={() => setShowHelp(true)}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
          style={{ background: "rgba(253,231,76,0.08)", border: "1px solid rgba(253,231,76,0.3)", color: "#FDE74C" }}
        >
          ? How to play
        </button>
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
          const active = !solved && queue[0] === w;
          return (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                background: solved
                  ? "#4ade80"
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
        disabled={queue.length <= 1}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors text-center disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Skip — come back later →
      </button>
    </div>
  );
}
