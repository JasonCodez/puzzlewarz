'use client';

import { motion } from 'framer-motion';
import type { AnonStreakState } from '@/lib/gridlockAnon';
import { estimateArcXp } from '@/lib/gridlockAnon';
import type { GridlockRank } from '@/lib/gridlockFile';
import { GRIDLOCK_RANK_LABELS, GRIDLOCK_RANK_COLORS } from '@/lib/gridlockFile';
import Link from 'next/link';

interface GridlockArcCompleteProps {
  streak: AnonStreakState;
  rank: GridlockRank;
  elapsedSeconds: number;
  guestMode: boolean;
  onClose: () => void;
}

const DAY_LABELS: Record<number, string> = {
  1: 'The Multiplication Alphabet',
  2: 'The Fibonacci Tile',
  3: 'The Compound Cross',
  4: 'The Anomaly',
  5: 'The Three Languages',
  6: 'The Hidden Axis',
  7: 'Six Frequencies',
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function GridlockArcComplete({
  streak,
  rank,
  elapsedSeconds,
  guestMode,
  onClose,
}: GridlockArcCompleteProps) {
  const xp = estimateArcXp(streak.arcSolvedDays);
  const rankColor = GRIDLOCK_RANK_COLORS[rank];

  return (
    // Full-screen overlay
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,2,2,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,208,0,0.3)', background: 'linear-gradient(160deg, #0a0a0a 0%, #111 100%)' }}
      >
        {/* Header */}
        <div className="text-center p-8 pb-4">
          <div
            className="text-xs font-mono font-bold tracking-widest uppercase mb-3"
            style={{ color: '#FFD700' }}
          >
            ARC 001 — SIX FREQUENCIES
          </div>
          <div className="text-4xl font-black font-mono mb-2" style={{ color: '#FFD700', textShadow: '0 0 32px #FFD70066' }}>
            ARC COMPLETE
          </div>
          <div className="text-sm font-mono text-gray-400">
            All 7 files cracked · {streak.arcSolvedDays.length} of 7 days
          </div>
        </div>

        {/* Arc badge */}
        <div
          className="mx-6 my-4 rounded-xl p-4 flex items-center gap-4"
          style={{ background: 'rgba(255,208,0,0.06)', border: '1px solid rgba(255,208,0,0.2)' }}
        >
          <div className="text-4xl">📁</div>
          <div>
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-0.5">Arc Badge Earned</div>
            <div className="font-mono font-bold text-white text-sm">ARC 001 — SIX FREQUENCIES</div>
            <div
              className="text-xs font-mono mt-0.5"
              style={{ color: rankColor }}
            >
              {rank} — {GRIDLOCK_RANK_LABELS[rank]} · {fmt(elapsedSeconds)} on final file
            </div>
          </div>
        </div>

        {/* Days solved */}
        <div className="mx-6 mb-4 space-y-1.5">
          <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Files Cracked</div>
          {Array.from({ length: 7 }, (_, i) => i + 1).map(day => {
            const solved = streak.arcSolvedDays.includes(day);
            return (
              <div
                key={day}
                className="flex items-center gap-2 text-xs font-mono"
                style={{ color: solved ? '#7DF9AA' : '#374151' }}
              >
                <span>{solved ? '✓' : '○'}</span>
                <span>Day {day} — {DAY_LABELS[day] ?? `File ${String(day).padStart(3, '0')}`}</span>
              </div>
            );
          })}
        </div>

        {/* Assembled transmission */}
        {streak.fragments.length > 0 && (
          <div
            className="mx-6 mb-4 rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(125,249,170,0.05)', border: '1px solid rgba(125,249,170,0.15)' }}
          >
            <div className="text-xs font-mono text-green-400/70 uppercase tracking-widest">
              Decoded Transmission — Arc 001
            </div>
            {streak.fragments.map((f, i) => (
              <p key={i} className="text-xs font-mono text-gray-300 leading-relaxed border-t border-gray-800 pt-2 first:border-t-0 first:pt-0">
                {f}
              </p>
            ))}
          </div>
        )}

        {/* XP / reward */}
        <div
          className="mx-6 mb-4 rounded-xl p-4 flex items-center justify-between"
          style={{ background: 'rgba(125,249,170,0.07)', border: '1px solid rgba(125,249,170,0.2)' }}
        >
          <div>
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-0.5">Arc Reward</div>
            <div className="font-mono font-black text-2xl" style={{ color: '#7DF9AA' }}>
              {xp.toLocaleString()} XP
            </div>
          </div>
          {guestMode && (
            <div className="text-right">
              <div className="text-xs font-mono text-gray-500 mb-1">Waiting to be claimed</div>
              <Link
                href="/auth/register"
                className="inline-block px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors"
                style={{ background: 'rgba(125,249,170,0.15)', color: '#7DF9AA', border: '1px solid rgba(125,249,170,0.3)' }}
              >
                Create Account →
              </Link>
            </div>
          )}
        </div>

        {/* Arc 2 unlock notice */}
        <div
          className="mx-6 mb-6 rounded-xl p-3 text-center"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}
        >
          <div className="text-xs font-mono" style={{ color: '#a78bfa' }}>
            🔓 ARC 002 UNLOCKED — {guestMode ? 'Sign up to carry your progress forward' : 'Coming soon'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          {guestMode && (
            <Link
              href="/auth/register"
              className="flex-1 py-2.5 rounded-lg font-mono font-bold text-sm text-center uppercase tracking-widest transition-all"
              style={{ background: '#7C3AED', color: '#fff' }}
            >
              Bank My XP
            </Link>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-mono text-sm uppercase tracking-widest transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid #374151' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
