"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useRegisterModal } from "@/hooks/useRegisterModal";

export interface PuzzleXpModalProps {
  xpGained: number;
  /** Points (coins/score) awarded for this solve — shown alongside XP. */
  pointsEarned?: number;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  /** Progress percentage (0-100) within the OLD level, before XP was added. */
  oldProgress: number;
  /** Progress percentage (0-100) within the NEW level, after XP was added. */
  newProgress: number;
  /** Level-up reward granted by the server, if any. */
  levelReward?: { points?: number; hintTokens?: number; skipTokens?: number; label: string } | null;
  onDismiss: () => void;
}

const COUNTER_DURATION = 1400; // ms

// ─── Sub-component: standard puzzle-complete modal ────────────────────────────
function NormalModal({
  xpGained,
  pointsEarned,
  newLevel,
  newTitle,
  newProgress,
  oldProgress,
  onDismiss,
}: Omit<PuzzleXpModalProps, "oldLevel">) {
  const [displayXp, setDisplayXp] = useState(0);
  const [displayPts, setDisplayPts] = useState(0);
  const [barWidth, setBarWidth] = useState(oldProgress);
  const rafRef = useRef<number | null>(null);
  const ptsRafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const ptsStartRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / COUNTER_DURATION, 1);
      setDisplayXp(Math.round((1 - Math.pow(1 - t, 3)) * xpGained));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [xpGained]);

  useEffect(() => {
    if (!pointsEarned) return;
    ptsStartRef.current = null;
    const animate = (ts: number) => {
      if (ptsStartRef.current === null) ptsStartRef.current = ts;
      const t = Math.min((ts - ptsStartRef.current) / COUNTER_DURATION, 1);
      setDisplayPts(Math.round((1 - Math.pow(1 - t, 3)) * pointsEarned));
      if (t < 1) ptsRafRef.current = requestAnimationFrame(animate);
    };
    ptsRafRef.current = requestAnimationFrame(animate);
    return () => { if (ptsRafRef.current !== null) cancelAnimationFrame(ptsRafRef.current); };
  }, [pointsEarned]);

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(newProgress), 350);
    return () => clearTimeout(t);
  }, [newProgress]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-start overflow-y-auto py-4 justify-center bg-black/65 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.75, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.75, opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="w-full sm:max-w-sm mx-4 my-auto rounded-2xl border-2 p-5 sm:p-8 shadow-2xl text-center"
        style={{ backgroundColor: "rgba(2,2,2,0.97)", borderColor: "#FDE74C" }}
      >
        <div className="text-5xl mb-3 select-none">🏆</div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Puzzle Complete!</h2>
        <p className="text-sm mb-5" style={{ color: "#DDDBF1" }}>Lv.{newLevel} · {newTitle}</p>

        {/* XP + Points counters side by side */}
        <div className="flex items-end justify-center gap-6 mb-5">
          <div className="text-center">
            <div>
              <span className="text-5xl font-extrabold tabular-nums" style={{ color: "#FDE74C" }}>
                +{displayXp}
              </span>
              <span className="text-2xl font-bold ml-1" style={{ color: "#FFB86B" }}>XP</span>
            </div>
            <div className="text-xs mt-1" style={{ color: "#6b7280" }}>Experience</div>
          </div>
          {(pointsEarned ?? 0) > 0 && (
            <div className="text-center">
              <div>
                <span className="text-5xl font-extrabold tabular-nums" style={{ color: "#38D399" }}>
                  +{displayPts}
                </span>
                <span className="text-2xl font-bold ml-1" style={{ color: "#6EE7B7" }}>pts</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "#6b7280" }}>Points</div>
            </div>
          )}
        </div>

        {/* XP progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#AB9F9D" }}>
            <span>Level {newLevel}</span>
            <span>{newProgress}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a2e" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${barWidth}%`,
                background: "linear-gradient(90deg, #FDE74C, #FFB86B)",
                transition: "width 1.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl font-bold text-sm tracking-wide transition-colors"
          style={{ backgroundColor: "#FDE74C", color: "#020202" }}
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-component: LEVEL-UP celebration modal ────────────────────────────────
function LevelUpModal({
  xpGained,
  pointsEarned,
  oldLevel,
  newLevel,
  newTitle,
  newProgress,
  levelReward,
  onDismiss,
}: Omit<PuzzleXpModalProps, "oldProgress">) {
  const [displayXp, setDisplayXp] = useState(0);
  const [displayPts, setDisplayPts] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // Confetti burst on mount
  useEffect(() => {
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.55 },
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      });
    };

    // Staggered multi-burst for a dramatic cannon effect
    const t1 = setTimeout(() => {
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }, 300);

    // Second burst from the sides
    const t2 = setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } });
      confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
    }, 800);

    // Gentle tail
    const t3 = setTimeout(() => {
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 }, gravity: 0.6 });
    }, 1600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // XP counter
  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / COUNTER_DURATION, 1);
      setDisplayXp(Math.round((1 - Math.pow(1 - t, 3)) * xpGained));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [xpGained]);

  // Points counter
  useEffect(() => {
    if (!pointsEarned) return;
    const ptsRef = { id: 0, start: null as number | null };
    const animate = (ts: number) => {
      if (ptsRef.start === null) ptsRef.start = ts;
      const t = Math.min((ts - ptsRef.start) / COUNTER_DURATION, 1);
      setDisplayPts(Math.round((1 - Math.pow(1 - t, 3)) * pointsEarned));
      if (t < 1) ptsRef.id = requestAnimationFrame(animate);
    };
    ptsRef.id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ptsRef.id);
  }, [pointsEarned]);

  // XP bar — starts at 0 (bar just filled!) then animates to newProgress
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(newProgress), 700);
    return () => clearTimeout(t);
  }, [newProgress]);

  // Show subtitle details after the big number lands
  useEffect(() => {
    const t = setTimeout(() => setShowDetails(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-start overflow-y-auto py-4 justify-center backdrop-blur-sm"
      style={{ background: "radial-gradient(ellipse at center, rgba(30,20,0,0.92) 0%, rgba(2,2,2,0.97) 100%)" }}
    >
      {/* Animated gold shimmer ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 420,
          height: 420,
          background: "conic-gradient(from 0deg, #FDE74C33, #FFB86B55, #FDE74C33, #FF8C0055, #FDE74C33)",
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      />

      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.6, opacity: 0, y: 30 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="relative w-full sm:max-w-md mx-4 my-auto rounded-3xl p-5 sm:p-8 shadow-2xl text-center overflow-hidden"
        style={{
          backgroundColor: "rgba(10, 8, 0, 0.98)",
          border: "2px solid #FDE74C",
          boxShadow: "0 0 60px rgba(253,231,76,0.25), 0 0 120px rgba(253,231,76,0.1)",
        }}
      >
        {/* Inner glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(253,231,76,0.08) 0%, transparent 70%)" }}
        />

        {/* LEVEL UP label */}
        <motion.div
          initial={{ scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 350, damping: 18 }}
          className="inline-block mb-2 px-5 py-1.5 rounded-full text-xs font-black tracking-[0.2em] uppercase"
          style={{ background: "linear-gradient(90deg, #FDE74C, #FFB86B)", color: "#020202" }}
        >
          ⬆ Level Up!
        </motion.div>

        {/* New level number */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 16 }}
          className="my-2"
        >
          <span
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: "clamp(3rem, 15vw, 6rem)",
              background: "linear-gradient(180deg, #FDE74C 30%, #FF8C00 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 24px rgba(253,231,76,0.5))",
            }}
          >
            {newLevel}
          </span>
        </motion.div>

        {/* "Lv.X → Lv.Y" and new title */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="mb-5"
            >
              <div className="text-sm font-semibold mb-1" style={{ color: "#AB9F9D" }}>
                Lv.{oldLevel} → Lv.{newLevel}
              </div>
              <div
                className="text-xl font-extrabold tracking-wide"
                style={{ color: "#FDE74C" }}
              >
                {newTitle}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* XP + Points counters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex items-end justify-center gap-6 mb-5"
        >
          <div className="text-center">
            <div>
              <span className="text-3xl font-extrabold tabular-nums" style={{ color: "#FFB86B" }}>
                +{displayXp}
              </span>
              <span className="text-xl font-bold ml-1" style={{ color: "#AB9F9D" }}>XP</span>
            </div>
            <div className="text-xs mt-1" style={{ color: "#6b7280" }}>Experience</div>
          </div>
          {(pointsEarned ?? 0) > 0 && (
            <div className="text-center">
              <div>
                <span className="text-3xl font-extrabold tabular-nums" style={{ color: "#38D399" }}>
                  +{displayPts}
                </span>
                <span className="text-xl font-bold ml-1" style={{ color: "#6EE7B7" }}>pts</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "#6b7280" }}>Points</div>
            </div>
          )}
        </motion.div>

        {/* XP progress bar for new level */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-5"
        >
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#6b7280" }}>
            <span>Level {newLevel} progress</span>
            <span>{newProgress}%</span>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a2e" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #FDE74C, #FFB86B, #FF8C00)" }}
              initial={{ width: "0%" }}
              animate={{ width: `${barWidth}%` }}
              transition={{ delay: 0.75, duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </motion.div>

        {/* Level-up reward banner */}
        {levelReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 220, damping: 20 }}
            className="mb-5 rounded-xl border px-4 py-3 text-left"
            style={{ borderColor: "#38D399", backgroundColor: "rgba(56,211,153,0.08)" }}
          >
            <div
              className="text-xs font-black tracking-widest uppercase mb-1.5"
              style={{ color: "#38D399" }}
            >
              🎁 Level-Up Reward
            </div>
            <div className="flex flex-wrap gap-2">
              {(levelReward.points ?? 0) > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: "rgba(56,211,153,0.15)", color: "#6EE7B7" }}
                >
                  +{(levelReward.points!).toLocaleString()} pts
                </span>
              )}
              {(levelReward.hintTokens ?? 0) > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: "rgba(253,231,76,0.12)", color: "#FDE74C" }}
                >
                  💡 {levelReward.hintTokens} Hint Token{levelReward.hintTokens !== 1 ? "s" : ""}
                </span>
              )}
              {(levelReward.skipTokens ?? 0) > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "#C4B5FD" }}
                >
                  ⏭ {levelReward.skipTokens} Skip Token{levelReward.skipTokens !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </motion.div>
        )}

        <button
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl font-bold text-sm tracking-wide transition-colors"
          style={{ backgroundColor: "#FDE74C", color: "#020202" }}
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────
export default function PuzzleXpModal(props: PuzzleXpModalProps) {  useRegisterModal('puzzle-xp-modal');  if (props.newLevel > props.oldLevel) {
    return <LevelUpModal {...props} />;
  }
  return <NormalModal {...props} />;
}
