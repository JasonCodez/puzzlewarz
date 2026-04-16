"use client";

import { useEffect, useState } from "react";

export interface ComparisonStats {
  puzzleType: string;
  puzzleTitle: string;
  solverCount: number;
  attemptCount: number;
  solveRate: number;
  avgGuesses: number | null;
  userGuesses: number | null;
  guessPercentile: number | null;
}

interface Props {
  puzzleId: string;
  stats: ComparisonStats;
  onDismiss: () => void;
}

function percentileLabel(p: number): string {
  if (p >= 90) return `Top ${100 - p}% — exceptional!`;
  if (p >= 70) return `You beat ${p}% of solvers.`;
  if (p >= 50) return `You beat ${p}% of solvers. Above average.`;
  if (p >= 25) return `You beat ${p}% of solvers.`;
  return `You beat ${p}% of solvers. Room to improve.`;
}

function difficultyLabel(rate: number): string {
  if (rate >= 70) return "Most players solve this one.";
  if (rate >= 45) return "Moderately challenging.";
  if (rate >= 25) return "Most players struggle with this.";
  return "A tough one — you're in rare company.";
}

export default function PuzzleComparisonModal({ puzzleId, stats, onDismiss }: Props) {
  const [barVisible, setBarVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBarVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  const isWordCrack = stats.puzzleType === "word_crack";
  const hasGuessData = isWordCrack && stats.userGuesses !== null && stats.avgGuesses !== null;
  const hasPercentile = stats.guessPercentile !== null;

  const shareText = hasGuessData
    ? `I just cracked "${stats.puzzleTitle}" on PuzzleWarz in ${stats.userGuesses} guess${stats.userGuesses !== 1 ? "es" : ""}!${stats.guessPercentile !== null ? ` Beat ${stats.guessPercentile}% of players.` : ""} 🎯\n\nhttps://puzzlewarz.com/puzzles/${puzzleId}`
    : `I just solved "${stats.puzzleTitle}" on PuzzleWarz! Only ${stats.solveRate}% of players crack this one 🧩\n\nhttps://puzzlewarz.com/puzzles/${puzzleId}`;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard not available — silently fail
    }
  };

  const solveBarColor =
    stats.solveRate >= 60 ? "#38D399" : stats.solveRate >= 35 ? "#FDE74C" : "#f97316";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #071016 0%, #09313a 100%)",
          border: "1px solid rgba(56,145,166,0.35)",
        }}
      >
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-1.5">📊</div>
          <h2 className="font-black text-xl text-white">How You Compared</h2>
          <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
            {stats.solverCount.toLocaleString()} player{stats.solverCount !== 1 ? "s" : ""} have solved this puzzle
          </p>
        </div>

        {/* Solve rate */}
        <div>
          <div className="flex justify-between text-xs mb-2" style={{ color: "#9ca3af" }}>
            <span className="font-bold tracking-widest">COMPLETION RATE</span>
            <span style={{ color: "#FDE74C", fontWeight: 700 }}>{stats.solveRate}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{
                width: barVisible ? `${Math.max(stats.solveRate, 2)}%` : "0%",
                background: solveBarColor,
              }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "#6b7280" }}>
            {difficultyLabel(stats.solveRate)}
          </p>
        </div>

        {/* Word Crack — guess comparison */}
        {hasGuessData && (
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex justify-around items-center">
              <div className="text-center">
                <div
                  className="text-xs mb-1 font-bold tracking-widest"
                  style={{ color: "#6b7280" }}
                >
                  YOUR GUESSES
                </div>
                <div
                  className="text-4xl font-black"
                  style={{
                    color:
                      stats.userGuesses! <= Math.ceil(stats.avgGuesses ?? 6)
                        ? "#38D399"
                        : "#FDE74C",
                  }}
                >
                  {stats.userGuesses}
                </div>
              </div>
              <div
                className="w-px self-stretch mx-2"
                style={{ background: "rgba(255,255,255,0.1)" }}
              />
              <div className="text-center">
                <div
                  className="text-xs mb-1 font-bold tracking-widest"
                  style={{ color: "#6b7280" }}
                >
                  AVG GUESSES
                </div>
                <div className="text-4xl font-black text-white">{stats.avgGuesses}</div>
              </div>
            </div>
          </div>
        )}

        {/* Percentile ranking bar (word crack only) */}
        {hasPercentile && (
          <div>
            <div className="flex justify-between text-xs mb-2" style={{ color: "#9ca3af" }}>
              <span className="font-bold tracking-widest">YOUR RANKING</span>
              <span style={{ color: "#a78bfa", fontWeight: 700 }}>
                Top {100 - stats.guessPercentile!}%
              </span>
            </div>
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-3 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: barVisible ? `${Math.max(stats.guessPercentile!, 2)}%` : "0%",
                  background: "linear-gradient(90deg, #7C3AED, #a78bfa)",
                }}
              />
            </div>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: "#a78bfa" }}>
              {percentileLabel(stats.guessPercentile!)}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{
              background: "rgba(56,145,166,0.15)",
              border: "1px solid rgba(56,145,166,0.4)",
              color: "#3891A6",
            }}
          >
            {copied ? "✓ Copied!" : "📤 Share Result"}
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: "#FDE74C", color: "#020202" }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
