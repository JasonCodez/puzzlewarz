"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { RatingInput } from "./RatingInput";
import { useRegisterModal } from "@/hooks/useRegisterModal";

interface PuzzleCompletionRatingModalProps {
  puzzleId: string;
  puzzleTitle: string;
  difficulty?: string;
  onClose: () => void;
  onSubmit?: () => void;
  initialAwardedPoints?: number | null;
  completionSeconds?: number | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function buildShareText(puzzleTitle: string, puzzleId: string, completionSeconds: number | null, difficulty?: string): string {
  const url = `https://puzzlewarz.com/puzzles/${puzzleId}`;
  const lines = [`🧩 I just cracked "${puzzleTitle}" on Puzzle Warz!`];
  if (typeof completionSeconds === "number") lines.push(`⏱️ Time: ${formatTime(completionSeconds)}`);
  if (difficulty) lines.push(`🔥 Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`);
  lines.push(`Think you can beat it? → ${url}`);
  return lines.join("\n");
}

export default function PuzzleCompletionRatingModal({
  puzzleId,
  puzzleTitle,
  difficulty,
  onClose,
  onSubmit,
  initialAwardedPoints = null,
  completionSeconds = null,
}: PuzzleCompletionRatingModalProps) {
  useRegisterModal('puzzle-rating-modal');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState<number | null>(initialAwardedPoints ?? null);
  const [copied, setCopied] = useState(false);

  const handleRatingSubmitted = () => {
    setIsSubmitted(true);
  };

  const handleCopy = async () => {
    const text = buildShareText(puzzleTitle, puzzleId, completionSeconds, difficulty);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTwitterShare = () => {
    const text = buildShareText(puzzleTitle, puzzleId, completionSeconds, difficulty);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const handleWhatsAppShare = () => {
    const text = buildShareText(puzzleTitle, puzzleId, completionSeconds, difficulty);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Modal Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="bg-gray-900 rounded-lg border p-8 w-full sm:max-w-md mx-4 shadow-2xl"
          style={{
            backgroundColor: "rgba(2, 2, 2, 0.95)",
            borderColor: "#FDE74C",
            borderWidth: "2px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Great Job! 🎉</h2>
              <p
                className="text-sm mt-1"
                style={{ color: "#DDDBF1" }}
              >
                You solved the puzzle
              </p>
              {typeof completionSeconds === 'number' ? (
                <div className="text-sm mt-2" style={{ color: '#AB9F9D' }}>
                  Completed in <span style={{ color: '#FDE74C', fontWeight: 700 }}>{Math.floor(completionSeconds/60).toString().padStart(2,'0')}:{(completionSeconds%60).toString().padStart(2,'0')}</span>
                </div>
              ) : null}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">✕</button>
          </div>

          {/* Success Message */}
          { (initialAwardedPoints || awardedPoints) && !isSubmitted && (
            <div
              className="mb-4 p-3 rounded-lg border text-center"
              style={{ backgroundColor: 'rgba(253,231,76,0.06)', borderColor: '#FDE74C' }}
            >
              <div style={{ color: '#FDE74C', fontWeight: 700 }}>{`+${initialAwardedPoints ?? awardedPoints} points awarded`}</div>
            </div>
          )}

          {isSubmitted && (
            <div
              className="mb-6 p-4 rounded-lg border text-white text-center"
              style={{
                backgroundColor: "rgba(56, 189, 248, 0.2)",
                borderColor: "#38B9F8",
              }}
            >
              ✓ Thanks for your rating!
              {awardedPoints ? (
                <div style={{ marginTop: 6, color: '#FDE74C', fontWeight: 700 }}>+{awardedPoints} points awarded</div>
              ) : null}
            </div>
          )}

          {/* Rating Input Component */}
          {!isSubmitted && (
            <div>
              {/* Bonus incentive */}
              <div
                className="mb-4 flex items-center justify-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(253,231,76,0.08)', border: '1px solid rgba(253,231,76,0.25)' }}
              >
                <span style={{ fontSize: 18 }}>🌟</span>
                <p className="text-sm font-semibold" style={{ color: '#FDE74C' }}>
                  Leave a rating and earn <strong>+10 bonus points!</strong>
                </p>
              </div>
              <p
                className="text-center mb-4 text-sm"
                style={{ color: "#DDDBF1" }}
              >
                How would you rate this puzzle?
              </p>
              <RatingInput
                puzzleId={puzzleId}
                onSubmit={async (rating, review, pointsAwarded) => {
                  if (typeof pointsAwarded === 'number' && pointsAwarded > 0) {
                    setAwardedPoints(pointsAwarded);
                  }
                  handleRatingSubmitted();
                }}
              />
            </div>
          )}

          {/* Share section — always visible */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs text-center mb-3" style={{ color: "#6b7280" }}>Challenge your friends</p>
            <div className="flex items-center gap-2">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: copied ? "rgba(56,211,153,0.15)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${copied ? "#38D399" : "rgba(255,255,255,0.12)"}`,
                  color: copied ? "#38D399" : "#DDDBF1",
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy Result"}
              </button>
              {/* Twitter/X */}
              <button
                onClick={handleTwitterShare}
                title="Share on X"
                className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 16 }}
              >
                𝕏
              </button>
              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppShare}
                title="Share on WhatsApp"
                className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors text-lg"
                style={{ backgroundColor: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366" }}
              >
                💬
              </button>
            </div>
          </div>

          {/* Close Button */}
          {isSubmitted && (
            <button
              onClick={() => { onClose(); onSubmit?.(); }}
              className="w-full mt-4 px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{
                backgroundColor: "#FDE74C",
                color: "#020202",
              }}
            >
              Continue
            </button>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
