'use client';

import { useEffect, useState } from 'react';

function getMidnightCountdown(): { h: number; m: number; s: number; totalSeconds: number } {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  const diff = next.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
    totalSeconds,
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

interface StreakTimerProps {
  streak: number;
  /** Whether the streak has already been extended today (no danger of reset today) */
  solvedToday?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Displays the current streak count alongside a live countdown to midnight UTC
 * (when the streak resets if the user hasn't played today).
 *
 * - When solvedToday=true the timer shows dimmed "resets in…" copy — streak is safe.
 * - When solvedToday=false (default) and < 3 h remain the timer pulses amber/red.
 */
export default function StreakTimer({ streak, solvedToday = false, size = 'md', className = '' }: StreakTimerProps) {
  const [cd, setCd] = useState(getMidnightCountdown);

  useEffect(() => {
    const id = setInterval(() => setCd(getMidnightCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  if (streak <= 0) return null;

  const urgent = !solvedToday && cd.totalSeconds < 3 * 3600;   // < 3 h left and not yet solved
  const warning = !solvedToday && cd.totalSeconds < 6 * 3600;  // < 6 h left and not yet solved

  const timerColor = solvedToday
    ? '#6B7280'
    : urgent
      ? '#f87171'
      : warning
        ? '#FDE74C'
        : '#9CA3AF';

  const badgeColor = solvedToday
    ? 'rgba(56,211,153,0.15)'
    : urgent
      ? 'rgba(248,113,113,0.12)'
      : warning
        ? 'rgba(253,231,76,0.1)'
        : 'rgba(255,208,0,0.1)';

  const badgeBorder = solvedToday
    ? 'rgba(56,211,153,0.3)'
    : urgent
      ? 'rgba(248,113,113,0.4)'
      : warning
        ? 'rgba(253,231,76,0.35)'
        : 'rgba(255,208,0,0.3)';

  const streakColor = solvedToday ? '#38D399' : urgent ? '#f87171' : '#FFD700';

  const isSm = size === 'sm';
  const timeStr = `${pad(cd.h)}:${pad(cd.m)}:${pad(cd.s)}`;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full ${className}`}
      style={{
        background: badgeColor,
        border: `1px solid ${badgeBorder}`,
        padding: isSm ? '3px 10px' : '5px 14px',
        animation: urgent ? 'streak-pulse 1.4s ease-in-out infinite' : undefined,
      }}
    >
      <style>{`
        @keyframes streak-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
      `}</style>

      {/* Flame + count */}
      <span style={{ fontSize: isSm ? 13 : 15 }}>🔥</span>
      <span
        style={{
          fontSize: isSm ? 11 : 13,
          fontWeight: 800,
          color: streakColor,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {streak}
      </span>

      {/* Divider */}
      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: isSm ? 11 : 13 }}>|</span>

      {/* Timer label */}
      <span style={{ fontSize: isSm ? 9 : 11, color: timerColor, letterSpacing: '0.04em' }}>
        {solvedToday ? 'resets in' : 'expires in'}
      </span>

      {/* Countdown */}
      <span
        style={{
          fontSize: isSm ? 10 : 12,
          fontWeight: 700,
          fontFamily: 'ui-monospace, monospace',
          color: timerColor,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
        }}
      >
        {timeStr}
      </span>
    </div>
  );
}
