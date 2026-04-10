'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { dismissNudge, getNudgeDismissed, estimateArcXp } from '@/lib/gridlockAnon';

interface GridlockStreakNudgeProps {
  arcDay: number;
  streakCount: number;
  arcSolvedDays: number[];
  guestMode: boolean;
}

type NudgeVariant = 'protect-streak' | 'protect-arc' | 'bank-xp' | 'day7';

function getNudgeVariant(
  arcDay: number,
  streakCount: number,
  solvedDays: number[],
): NudgeVariant | null {
  if (arcDay === 7) return 'day7';
  if (solvedDays.length >= 5) return 'bank-xp';
  if (solvedDays.length >= 3) return 'protect-arc';
  if (streakCount >= 2) return 'protect-streak';
  if (streakCount >= 1) return 'protect-streak';
  return null;
}

const NUDGE_CONFIG: Record<
  NudgeVariant,
  { icon: string; headline: string; body: (xp: number, streak: number) => string; cta: string }
> = {
  'protect-streak': {
    icon: '🔥',
    headline: 'Your streak lives in this browser only.',
    body: (_, streak) =>
      `${streak}-day streak. If you clear your cookies or switch devices, it's gone. A free account backs it up permanently.`,
    cta: 'Protect My Streak',
  },
  'protect-arc': {
    icon: '📁',
    headline: "You're halfway through Arc 001.",
    body: (xp) =>
      `${xp} XP earned so far — only stored in this browser. Create a free account to bank it before you lose it.`,
    cta: 'Bank My Progress',
  },
  'bank-xp': {
    icon: '⚡',
    headline: 'Almost at the arc reward.',
    body: (xp) =>
      `You've built up ${xp} XP this arc. Sign up before Day 7 to claim your arc completion bonus.`,
    cta: 'Claim My XP',
  },
  'day7': {
    icon: '🏆',
    headline: 'Arc complete — full XP waiting.',
    body: (xp) =>
      `${xp} XP earned + an arc badge — yours to keep. Create a free account to claim everything and start Arc 002.`,
    cta: 'Claim Everything',
  },
};

export default function GridlockStreakNudge({
  arcDay,
  streakCount,
  arcSolvedDays,
  guestMode,
}: GridlockStreakNudgeProps) {
  const [show, setShow] = useState(false);

  const variant = getNudgeVariant(arcDay, streakCount, arcSolvedDays);
  const nudgeKey = `gridlock-nudge-${variant}-arc${Math.ceil(arcDay / 7)}`;

  useEffect(() => {
    if (!variant || !guestMode) return;
    const dismissed = getNudgeDismissed();
    if (!dismissed[nudgeKey]) {
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, [variant, nudgeKey, guestMode]);

  const handleDismiss = () => {
    setShow(false);
    dismissNudge(nudgeKey);
  };

  if (!variant || !guestMode) return null;

  const config = NUDGE_CONFIG[variant];
  const xp = estimateArcXp(arcSolvedDays);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="rounded-xl p-4 mt-4"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-xl flex-shrink-0 mt-0.5">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-mono font-bold text-sm text-white mb-1">
                {config.headline}
              </div>
              <p className="text-xs font-mono text-gray-400 leading-relaxed mb-3">
                {config.body(xp, streakCount)}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/auth/register"
                  className="inline-block px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors"
                  style={{ background: '#7C3AED', color: '#fff' }}
                >
                  {config.cta} →
                </Link>
                <button
                  onClick={handleDismiss}
                  className="text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
