"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FrequencyAnswer {
  id: string;
  displayText: string;
  text: string;
  count: number;
}

interface Question {
  id: string;
  question: string;
  status: string;
  scheduledFor: string;
}

interface FrequencyGameProps {
  /** Pre-fetched question. If null, shows "no puzzle today" state. */
  question: Question | null;
  /** Whether the current user already submitted */
  alreadySubmitted?: boolean;
  /** Existing submission (if alreadySubmitted=true) */
  existingSubmission?: { answers: string[]; score: number } | null;
  /** Pre-fetched results (if revealed or already submitted) */
  initialResults?: { answers: FrequencyAnswer[]; totalSubmissions: number } | null;
  /** Session ID for guest tracking */
  sessionId?: string;
}

const MAX_ANSWERS = 5;
const TEAL = "#3891A6";

export default function FrequencyGame({
  question,
  alreadySubmitted = false,
  existingSubmission = null,
  initialResults = null,
  sessionId,
}: FrequencyGameProps) {
  const [phase, setPhase] = useState<"input" | "submitted" | "reveal">(
    alreadySubmitted ? (initialResults ? "reveal" : "submitted") : "input"
  );
  const [inputs, setInputs] = useState<string[]>(
    alreadySubmitted && existingSubmission ? existingSubmission.answers : ["", "", "", "", ""]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ answers: FrequencyAnswer[]; totalSubmissions: number } | null>(
    initialResults ?? null
  );
  const [score, setScore] = useState<number>(existingSubmission?.score ?? 0);
  const [revealedCount, setRevealedCount] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-reveal bars one by one after results arrive
  useEffect(() => {
    if (phase !== "reveal" || !results) return;
    setRevealedCount(0);
    const total = results.answers.length;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setRevealedCount(i);
      if (i >= total) clearInterval(timer);
    }, 120);
    return () => clearInterval(timer);
  }, [phase, results]);

  const handleInputChange = (idx: number, value: string) => {
    if (phase !== "input") return;
    setInputs((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const next = idx + 1;
      if (next < MAX_ANSWERS) {
        setActiveIndex(next);
        inputRefs.current[next]?.focus();
      }
    }
  };

  const filledAnswers = inputs.filter((a) => a.trim().length > 0);

  const handleSubmit = useCallback(async () => {
    if (submitting || !question || filledAnswers.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/frequency/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          answers: filledAnswers,
          sessionId,
        }),
        credentials: "same-origin",
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setScore(data.score ?? 0);
      if (data.results) {
        setResults(data.results);
        setPhase("reveal");
      } else {
        setPhase("submitted");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, question, filledAnswers, sessionId]);

  // Compute max count for bar scaling
  const maxCount = results ? Math.max(...results.answers.map((a) => a.count), 1) : 1;

  // Which of the user's submitted answers matched a result bar
  const userNormalized = new Set(
    filledAnswers.map((a) =>
      a.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ")
    )
  );

  function getShareText() {
    if (!results) return "";
    const lines = results.answers.slice(0, 6).map((a) => {
      const pct = Math.round((a.count / results.totalSubmissions) * 100);
      const bars = "█".repeat(Math.round(pct / 10)).padEnd(10, "░");
      const mine = userNormalized.has(a.text) ? " ✓" : "";
      return `${bars} ${a.displayText}${mine}`;
    });
    return `FREQUENCY #${question?.id.slice(-4).toUpperCase() ?? "?"}  🎯 ${score}pts\n"${question?.question}"\n\n${lines.join("\n")}\n\npuzzlewarz.com`;
  }

  // ── No question today ────────────────────────────────────────────────────
  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl mb-4">📡</p>
        <p className="text-lg font-semibold text-white">No question scheduled for today.</p>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Check back tomorrow!</p>
      </div>
    );
  }

  // ── Submitted but not yet revealed ──────────────────────────────────────
  if (phase === "submitted") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <p className="text-5xl">📡</p>
        </motion.div>
        <p className="text-xl font-bold text-white">Answers locked in!</p>
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Results will be revealed once the question closes. Come back later to see how the crowd thinks!
        </p>
        <div className="mt-4 rounded-xl p-4 border w-full max-w-sm" style={{ background: "rgba(56,145,166,0.08)", borderColor: "rgba(56,145,166,0.3)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: TEAL }}>YOUR ANSWERS</p>
          {filledAnswers.map((a, i) => (
            <p key={i} className="text-sm text-white py-0.5">{i + 1}. {a}</p>
          ))}
        </div>
      </div>
    );
  }

  // ── Results reveal ────────────────────────────────────────────────────────
  if (phase === "reveal" && results) {
    const maxScore = 500;
    const pct = Math.min(Math.round((score / maxScore) * 100), 100);

    return (
      <div className="flex flex-col gap-5 w-full max-w-lg mx-auto">
        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-center border"
          style={{ background: "rgba(56,145,166,0.1)", borderColor: "rgba(56,145,166,0.4)" }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: TEAL }}>YOUR SCORE</p>
          <p className="text-5xl font-black text-white">{score}</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>out of ~{maxScore} · {pct}% crowd match</p>
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: TEAL }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
        </motion.div>

        {/* Bar chart */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wider" style={{ color: "#64748b" }}>
            {results.totalSubmissions.toLocaleString()} PLAYER{results.totalSubmissions !== 1 ? "S" : ""} ANSWERED
          </p>
          {results.answers.map((answer, i) => {
            const pctBar = Math.round((answer.count / results.totalSubmissions) * 100);
            const widthPct = Math.round((answer.count / maxCount) * 100);
            const isMine = userNormalized.has(answer.text);
            const visible = i < revealedCount;

            return (
              <AnimatePresence key={answer.id}>
                {visible && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-3"
                  >
                    {/* Bar */}
                    <div className="flex-1 relative h-9 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-lg"
                        style={{
                          background: isMine
                            ? `linear-gradient(90deg, ${TEAL}, rgba(56,145,166,0.6))`
                            : "rgba(255,255,255,0.12)",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.5, delay: 0.05 }}
                      />
                      <div className="absolute inset-0 flex items-center px-3 justify-between">
                        <span className="text-sm font-semibold text-white truncate">
                          {isMine && <span className="mr-1">✓</span>}
                          {answer.displayText}
                        </span>
                        <span className="text-xs font-bold ml-2 shrink-0" style={{ color: isMine ? "#fff" : "#94a3b8" }}>
                          {pctBar}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        {/* Share */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ text: getShareText() }).catch(() => {});
            } else {
              navigator.clipboard.writeText(getShareText());
            }
          }}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
          style={{ background: TEAL }}
        >
          Share Results 📡
        </button>
      </div>
    );
  }

  // ── Input phase ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto">
      {/* Question */}
      <div className="rounded-2xl p-5 border text-center" style={{ background: "rgba(56,145,166,0.08)", borderColor: "rgba(56,145,166,0.3)" }}>
        <p className="text-xs font-semibold tracking-widest mb-2" style={{ color: TEAL }}>TODAY&apos;S QUESTION</p>
        <p className="text-xl font-bold text-white leading-snug">{question.question}</p>
      </div>

      {/* Instructions */}
      <p className="text-sm text-center" style={{ color: "#94a3b8" }}>
        Name up to {MAX_ANSWERS} things you think the crowd will say.
        Score = % of players who agreed with you.
      </p>

      {/* Answer inputs */}
      <div className="flex flex-col gap-2">
        {inputs.map((val, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-6 text-center text-sm font-bold shrink-0" style={{ color: "#64748b" }}>{i + 1}</span>
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              value={val}
              placeholder={i === 0 ? "Your best answer…" : "Another answer…"}
              maxLength={60}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none transition-all"
              style={{
                background: activeIndex === i ? "rgba(56,145,166,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${activeIndex === i ? TEAL : "rgba(255,255,255,0.1)"}`,
              }}
              onFocus={() => setActiveIndex(i)}
              onChange={(e) => handleInputChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || filledAnswers.length === 0}
        className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
        style={{ background: TEAL }}
      >
        {submitting ? "Submitting…" : `Lock In ${filledAnswers.length} Answer${filledAnswers.length !== 1 ? "s" : ""}`}
      </button>

      <p className="text-xs text-center" style={{ color: "#475569" }}>
        Results revealed daily · No account required
      </p>
    </div>
  );
}
