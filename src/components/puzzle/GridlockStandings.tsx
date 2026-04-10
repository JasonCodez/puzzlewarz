'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GridlockRank } from '@/lib/gridlockFile';
import { GRIDLOCK_RANK_LABELS, GRIDLOCK_RANK_COLORS } from '@/lib/gridlockFile';

type StandingsData = {
  tierCounts: Record<GridlockRank, number>;
  totalSolves: number;
  percentile: number | null;
};

const RANK_ORDER: GridlockRank[] = ['S', 'A', 'B', 'C', 'F'];

function formatTime(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

export default function GridlockStandings({
  puzzleId,
  playerRank,
  elapsedSeconds,
}: {
  puzzleId: string;
  playerRank: GridlockRank;
  elapsedSeconds: number;
}) {
  const [data, setData] = useState<StandingsData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      rank: playerRank,
      elapsedSeconds: String(elapsedSeconds),
    });
    fetch(`/api/gridlock/${puzzleId}/standings?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, [puzzleId, playerRank, elapsedSeconds]);

  if (!data) {
    return (
      <div className="border border-gray-700 rounded-lg p-4 text-center">
        <span className="text-xs font-mono text-gray-600 tracking-widest">LOADING STANDINGS…</span>
      </div>
    );
  }

  const { tierCounts, totalSolves, percentile } = data;
  const maxCount = Math.max(...Object.values(tierCounts), 1);

  // Choose percentile badge phrasing
  let percentileLabel = '';
  let percentileColor = '#C0C0C0';
  if (percentile !== null && totalSolves >= 2) {
    if (percentile >= 90) { percentileLabel = `Top ${100 - percentile}% of all solvers`; percentileColor = '#FFD700'; }
    else if (percentile >= 70) { percentileLabel = `Better than ${percentile}% of solvers`; percentileColor = '#7DF9AA'; }
    else if (percentile >= 40) { percentileLabel = `Better than ${percentile}% of solvers`; percentileColor = '#60CFFF'; }
    else { percentileLabel = `Better than ${percentile}% of solvers`; percentileColor = '#C0C0C0'; }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="border border-gray-700 rounded-lg p-5 bg-black/50 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-gray-500 tracking-widest uppercase">Field Standings</div>
        <div className="text-xs font-mono text-gray-600">
          {totalSolves} solver{totalSolves !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tier bars */}
      <div className="space-y-2">
        {RANK_ORDER.map(rank => {
          const count = tierCounts[rank] ?? 0;
          const pct = totalSolves > 0 ? Math.round((count / totalSolves) * 100) : 0;
          const barWidth = totalSolves > 0 ? Math.round((count / maxCount) * 100) : 0;
          const isPlayer = rank === playerRank;
          const color = GRIDLOCK_RANK_COLORS[rank];

          return (
            <div key={rank} className="flex items-center gap-3">
              {/* Rank label */}
              <div
                className="w-5 text-center text-xs font-black font-mono shrink-0"
                style={{ color }}
              >
                {rank}
              </div>

              {/* Bar track */}
              <div className="flex-1 h-5 bg-gray-800 rounded-sm overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  className="h-full rounded-sm"
                  style={{
                    background: isPlayer
                      ? color
                      : `${color}44`,
                  }}
                />
                {/* Player marker */}
                {isPlayer && (
                  <div
                    className="absolute inset-y-0 right-1 flex items-center"
                    style={{ color }}
                  >
                    <span className="text-[9px] font-mono font-bold">YOU</span>
                  </div>
                )}
              </div>

              {/* Counts */}
              <div className="w-20 text-right shrink-0">
                <span
                  className="text-xs font-mono"
                  style={{ color: isPlayer ? color : '#6b7280' }}
                >
                  {count > 0 ? `${pct}% · ${count}` : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-label: tier name */}
      <div className="border-t border-gray-800 pt-3 space-y-1">
        <div className="text-xs font-mono text-gray-500">
          Your rank: <span style={{ color: GRIDLOCK_RANK_COLORS[playerRank] }}>{playerRank} — {GRIDLOCK_RANK_LABELS[playerRank]}</span>
          {elapsedSeconds > 0 && (
            <span className="text-gray-600"> · {formatTime(elapsedSeconds)}</span>
          )}
        </div>

        {percentileLabel && (
          <div
            className="text-sm font-mono font-bold"
            style={{ color: percentileColor }}
          >
            ▲ {percentileLabel}
          </div>
        )}

        {totalSolves < 2 && (
          <div className="text-xs font-mono text-gray-600">
            Be among the first to complete this file — standings update as more agents solve it.
          </div>
        )}
      </div>
    </motion.div>
  );
}
