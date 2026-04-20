'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  GridlockFileClientData,
  GridlockRank,
  RuleFamily,
  RuleAxis,
  GridCell,
} from '@/lib/gridlockFile';
import { GRIDLOCK_RANK_LABELS, GRIDLOCK_RANK_COLORS } from '@/lib/gridlockFile';
import {
  getAnonId,
  getAnonStreak,
  updateAnonStreak,
  getAnonSolved,
  setAnonSolved,
  addPendingRewards,
  isStreakAlive,
  type AnonStreakState,
} from '@/lib/gridlockAnon';
import GridlockStreakNudge from '@/components/puzzle/GridlockStreakNudge';
import GridlockArcComplete from '@/components/puzzle/GridlockArcComplete';
import GridlockStandings from '@/components/puzzle/GridlockStandings';
import GuestRewardModal from '@/components/puzzle/GuestRewardModal';
import { useAchievementModalStore } from '@/lib/achievement-modal-store';
import StreakTimer from '@/components/StreakTimer';

// ── Props ────────────────────────────────────────────────────────────────────
interface GridlockFilePuzzleProps {
  puzzleId: string;
  onSolved: () => void;
  /** When true: uses public guest API routes and tracks state in localStorage only */
  guestMode?: boolean;
  /** When true: hides the internal file header (use when a parent wrapper already shows it) */
  hideHeader?: boolean;
}

// ── Server state ──────────────────────────────────────────────────────────────
interface ServerState {
  puzzle: GridlockFileClientData;
  solved: boolean;
  solvedAt: string | null;
  submissionCount: number;
  hintsUsed: number;
  rank: GridlockRank;
  ruleExplanation: string | null;
  retentionUnlock: string | null;
  streakShields: number;
  currentStreak: number;
  hintTokens: number;
}

interface SubmitResult {
  correct: boolean;
  answerResult: { correct: boolean; correctCount: number; totalMissing: number };
  lawResult: string;
  partialHint: string | null;
  submissionCount: number;
  rank: GridlockRank;
  ruleExplanation?: string;
  retentionUnlock?: string | null;
  arcDay?: number;
  arcNumber?: number;
  streak?: number;
  arcXpBonus?: number;
  xpReward?: number;
  pointsReward?: number;
  streakBonusPoints?: number;
  streakBonusXp?: number;
  shieldConsumed?: boolean;
  arcAchievement?: { id: string; title: string; description: string; icon: string; rarity: string } | null;
}

// ── Law Declaration options ────────────────────────────────────────────────────
const RULE_FAMILIES: { value: RuleFamily; label: string }[] = [
  { value: 'arithmetic',    label: 'Arithmetic (constant step)' },
  { value: 'geometric',     label: 'Geometric (constant ratio)' },
  { value: 'fibonacci',     label: 'Fibonacci / Recursive sum' },
  { value: 'polynomial',    label: 'Polynomial / Power rule' },
  { value: 'alphabetic',    label: 'Alphabetic position' },
  { value: 'compound-word', label: 'Compound word structure' },
  { value: 'constraint',    label: 'Logical constraint' },
  { value: 'positional',    label: 'Positional encoding' },
  { value: 'semantic',      label: 'Semantic / Word meaning' },
  { value: 'hybrid',        label: 'Hybrid (multiple systems)' },
];

const RULE_AXES: { value: RuleAxis; label: string }[] = [
  { value: 'rows',          label: 'Rows' },
  { value: 'columns',       label: 'Columns' },
  { value: 'both',          label: 'Both rows and columns' },
  { value: 'diagonal',      label: 'Diagonal' },
  { value: 'spiral',        label: 'Spiral / outward' },
  { value: 'cell-position', label: 'Cell position (r × c)' },
];

const LAW_RESULT_TEXT: Record<string, string> = {
  'confirmed':     '✓ Law confirmed — exact match.',
  'alternate':     '✓ Alternate law accepted — both descriptions are valid.',
  'partial':       '◑ Partially correct — one component of the law is right.',
  'incorrect':     '✗ Law rejected — try re-examining the structure.',
  'not-declared':  '',
};
// ── Timer helpers ───────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const LAW_RESULT_COLOR: Record<string, string> = {
  'confirmed':    '#7DF9AA',
  'alternate':    '#7DF9AA',
  'partial':      '#FFD580',
  'incorrect':    '#FF9EC4',
  'not-declared': '#6b7280',
};

// ── Rank badge ─────────────────────────────────────────────────────────────────
function RankBadge({ rank, size = 'sm' }: { rank: GridlockRank; size?: 'sm' | 'lg' }) {
  const color = GRIDLOCK_RANK_COLORS[rank];
  const label = GRIDLOCK_RANK_LABELS[rank];
  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-5xl font-black font-mono tracking-tighter" style={{ color, textShadow: `0 0 20px ${color}` }}>
          {rank}
        </div>
        <div className="text-xs font-mono tracking-widest uppercase" style={{ color }}>{label}</div>
      </div>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-black font-mono tracking-wider"
      style={{ color, border: `1px solid ${color}`, background: `${color}15` }}>
      {rank} — {label}
    </span>
  );
}

// ── Grid display component ────────────────────────────────────────────────────
function GridDisplay({
  grid,
  answers,
  onAnswer,
  solved,
  illuminated,
}: {
  grid: GridCell[][];
  answers: string[];
  onAnswer: (missingIndex: number, value: string) => void;
  solved: boolean;
  lastResult: SubmitResult | null;
  illuminated: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const cols = grid[0]?.length ?? 1;

  // Measure available container width so cells never overflow on mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Ideal sizes per column count; clamp to available width
  const idealCellSize = cols <= 3 ? 84 : cols <= 5 ? 68 : 54;
  const gap = 8;
  const cellSize = containerWidth > 0
    ? Math.min(idealCellSize, Math.floor((containerWidth - gap * (cols - 1)) / cols))
    : idealCellSize;
  const fontSize = cellSize >= 70 ? '1.6rem' : cellSize >= 56 ? '1.3rem' : cellSize >= 44 ? '1.05rem' : '0.85rem';

  let missingIdx = 0;

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
    <div
      style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gap,
      }}
    >
      {grid.map((row, ri) =>
        row.map((cell, ci) => {
          const delay = (ri * cols + ci) * 0.055;

          if (cell.isMissing) {
            const idx = missingIdx++;
            const answered = (answers[idx] ?? '').trim() !== '';
            return (
              <motion.div
                key={`${ri}-${ci}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={illuminated
                  ? { opacity: 1, scale: [1, 1.1, 1] }
                  : { opacity: 1, scale: 1 }
                }
                transition={{ duration: 0.45, delay }}
                style={{ position: 'relative' }}
              >
                <input
                  ref={el => { inputRefs.current[idx] = el; }}
                  type="text"
                  value={answers[idx] ?? ''}
                  onChange={e => onAnswer(idx, e.target.value)}
                  disabled={solved}
                  placeholder="?"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    textAlign: 'center',
                    fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
                    fontWeight: 900,
                    fontSize,
                    letterSpacing: '0.02em',
                    borderRadius: 10,
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: solved
                      ? 'linear-gradient(135deg, rgba(125,249,170,0.32), rgba(125,249,170,0.16))'
                      : answered
                      ? 'linear-gradient(135deg, rgba(125,249,170,0.22), rgba(125,249,170,0.1))'
                      : 'linear-gradient(135deg, rgba(255,208,0,0.2), rgba(255,208,0,0.08))',
                    border: solved
                      ? '2px solid #7DF9AA'
                      : answered
                      ? '2px solid #7DF9AA'
                      : '2px solid #FFD700',
                    boxShadow: solved
                      ? '0 0 22px rgba(125,249,170,0.55), inset 0 1px 0 rgba(125,249,170,0.3)'
                      : answered
                      ? '0 0 14px rgba(125,249,170,0.35), inset 0 1px 0 rgba(125,249,170,0.15)'
                      : '0 0 16px rgba(255,208,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
                    color: solved ? '#7DF9AA' : '#FFD700',
                    caretColor: '#FFD700',
                  }}
                />
              </motion.div>
            );
          }

          return (
            <motion.div
              key={`${ri}-${ci}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay }}
              style={{
                width: cellSize,
                height: cellSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
                fontWeight: 700,
                fontSize,
                letterSpacing: '0.02em',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.09))',
                border: '2px solid rgba(255,255,255,0.42)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.5)',
                color: '#ffffff',
                userSelect: 'none',
              }}
            >
              {String(cell.value)}
            </motion.div>
          );
        })
      )}
    </div>
    </div>
  );
}

// ── Law declaration panel ─────────────────────────────────────────────────────
function LawDeclarationPanel({
  declaredFamily,
  declaredAxis,
  onFamily,
  onAxis,
  lawResult,
  disabled,
}: {
  declaredFamily: RuleFamily | '';
  declaredAxis: RuleAxis | '';
  onFamily: (v: RuleFamily) => void;
  onAxis: (v: RuleAxis) => void;
  lawResult: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasResult = lawResult && lawResult !== 'not-declared';
  const confirmed = lawResult === 'confirmed' || lawResult === 'alternate';

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${hasResult ? (confirmed ? 'rgba(125,249,170,0.5)' : 'rgba(255,150,100,0.45)') : 'rgba(255,255,255,0.18)'}`, background: 'rgba(255,255,255,0.04)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
          letterSpacing: '0.06em',
          color: '#d1d5db',
          transition: 'color 0.15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, opacity: 0.6 }}>{open ? '▼' : '▶'}</span>
          <span style={{ color: '#e5e7eb', fontWeight: 700 }}>DECLARE A LAW</span>
          <span style={{ color: '#9ca3af' }}>— optional bonus</span>
        </span>
        {hasResult && (
          <span style={{ fontSize: 12, color: LAW_RESULT_COLOR[lawResult], fontWeight: 800 }}>
            {confirmed ? '✓ CONFIRMED' : '◑ PARTIAL'}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12, lineHeight: 1.6, fontFamily: 'inherit' }}>
                Identify the hidden rule. Correct declarations boost your rank — wrong ones never penalise.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'inherit' }}>RULE FAMILY</div>
                  <select
                    value={declaredFamily}
                    onChange={e => onFamily(e.target.value as RuleFamily)}
                    disabled={disabled}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', color: '#e5e7eb', outline: 'none' }}
                  >
                    <option value="" style={{ background: '#1a1a1a', color: '#e5e7eb' }}>— select —</option>
                    {RULE_FAMILIES.map(f => (
                      <option key={f.value} value={f.value} style={{ background: '#1a1a1a', color: '#e5e7eb' }}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'inherit' }}>AXIS</div>
                  <select
                    value={declaredAxis}
                    onChange={e => onAxis(e.target.value as RuleAxis)}
                    disabled={disabled}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', color: '#e5e7eb', outline: 'none' }}
                  >
                    <option value="" style={{ background: '#1a1a1a', color: '#e5e7eb' }}>— select —</option>
                    {RULE_AXES.map(a => (
                      <option key={a.value} value={a.value} style={{ background: '#1a1a1a', color: '#e5e7eb' }}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {hasResult && (
                <p style={{ marginTop: 10, fontSize: 13, fontFamily: 'inherit', color: LAW_RESULT_COLOR[lawResult] }}>
                  {LAW_RESULT_TEXT[lawResult]}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Hint panel ────────────────────────────────────────────────────────────────
function HintPanel({
  hints,
  usedHintIds,
  onUse,
  disabled,
  hintTokens,
}: {
  hints: GridlockFileClientData['hints'];
  usedHintIds: Set<string>;
  onUse: (id: string) => void;
  disabled: boolean;
  hintTokens?: number; // undefined = guest mode (don't show token count)
}) {
  if (!hints || hints.length === 0) return null;
  const usedCount = [...usedHintIds].filter(id => hints.some(h => h.id === id)).length;
  const hasLockedHints = hints.some(h => !usedHintIds.has(h.id));
  const showAddMore = hintTokens !== undefined && hintTokens === 0 && hasLockedHints && !disabled;
  return (
    <div style={{ borderRadius: 10, border: '1px solid rgba(255,208,0,0.35)', background: 'rgba(255,208,0,0.05)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px', borderBottom: '1px solid rgba(255,208,0,0.1)' }}>
        <span style={{ fontSize: 10, fontFamily: 'inherit', color: '#fbbf24', letterSpacing: '0.14em', fontWeight: 700 }}>📡 SIGNALS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hintTokens !== undefined && (
            <span style={{ fontSize: 10, fontFamily: 'inherit', color: hintTokens === 0 ? '#6b7280' : '#fcd34d' }}>
              🎫 {hintTokens} token{hintTokens !== 1 ? 's' : ''}
            </span>
          )}
          {showAddMore && (
            <a
              href="/store"
              style={{ fontSize: 10, fontFamily: 'inherit', color: '#6b7280', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Add more →
            </a>
          )}
          <span style={{ fontSize: 10, fontFamily: 'inherit', color: '#6b7280' }}>{usedCount}/{hints.length} used</span>
        </div>
      </div>
      <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hints.map((h, i) => {
          const used = usedHintIds.has(h.id);
          return (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                background: used ? 'rgba(255,213,128,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${used ? 'rgba(255,213,128,0.4)' : 'rgba(255,255,255,0.15)'}`,
              }}
            >
              {used ? (
                <p style={{ fontSize: 13, fontFamily: 'inherit', color: '#fcd34d', lineHeight: 1.6, margin: 0 }}>{h.text}</p>
              ) : (
                <>
                  <span style={{ fontSize: 12, fontFamily: 'inherit', color: '#d1d5db' }}>Signal {i + 1} · {h.cost} token{h.cost !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => onUse(h.id)}
                    disabled={disabled}
                    style={{
                      fontSize: 10,
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                      color: '#FFD580',
                      border: '1px solid rgba(255,213,128,0.4)',
                      background: 'rgba(255,213,128,0.08)',
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    UNLOCK
                  </button>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Solved screen ──────────────────────────────────────────────────────────────
function SolvedScreen({
  puzzleId,
  rank,
  submissionCount,
  hintsUsed,
  ruleExplanation,
  retentionUnlock,
  lawResult,
  elapsedSeconds,
  fileNumber,
  fileTitle,
}: {
  puzzleId: string;
  rank: GridlockRank;
  submissionCount: number;
  hintsUsed: number;
  ruleExplanation: string | null;
  retentionUnlock: string | null;
  lawResult: string;
  elapsedSeconds: number;
  fileNumber?: number;
  fileTitle?: string;
}) {
  const shareText = generateShareText(
    fileNumber ?? 0,
    fileTitle ?? 'Classified File',
    rank,
    submissionCount,
    hintsUsed,
    lawResult,
    elapsedSeconds,
  );
  const shareUrl = 'https://puzzlewarz.com';

  const handleFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      '_blank',
      'width=600,height=500',
    );
  };

  const handleTwitter = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`,
      '_blank',
      'width=600,height=500',
    );
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
  };

  const handleReddit = () => {
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=500');
  };

  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=500');
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText + '\n' + shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 max-w-xl mx-auto">
      <div className="border border-green-500/30 rounded-lg p-6 bg-black/60 text-center space-y-3">
        <div className="text-xs font-mono text-green-400/70 tracking-widest uppercase">FILE CRACKED</div>
        <RankBadge rank={rank} size="lg" />
        {elapsedSeconds > 0 && (
          <div className="text-2xl font-black font-mono tracking-tighter" style={{ color: '#7DF9AA', textShadow: '0 0 12px #7DF9AA55' }}>
            ⏱ {formatTime(elapsedSeconds)}
          </div>
        )}
        <div className="text-sm font-mono text-gray-400">
          {submissionCount} attempt{submissionCount !== 1 ? 's' : ''} · {hintsUsed} signal{hintsUsed !== 1 ? 's' : ''} used
        </div>
        {lawResult && lawResult !== 'not-declared' && (
          <div className="text-xs font-mono" style={{ color: LAW_RESULT_COLOR[lawResult] }}>
            Law Declaration: {LAW_RESULT_TEXT[lawResult]}
          </div>
        )}

        {/* Social share buttons */}
        <div style={{ paddingTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#6b7280', marginBottom: 8, fontFamily: 'monospace' }}>
            Share Your Result
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <button
              onClick={handleTwitter}
              title="Share on X / Twitter"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zM17.083 20.248h1.833L7.084 4.126H5.117z"/></svg>
              X
            </button>
            <button
              onClick={handleFacebook}
              title="Share on Facebook"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(24,119,242,0.4)', background: 'rgba(24,119,242,0.1)', color: '#5b9cf6', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(24,119,242,0.22)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(24,119,242,0.1)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              Facebook
            </button>
            <button
              onClick={handleWhatsApp}
              title="Share on WhatsApp"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.1)', color: '#4ade80', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.22)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.1)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <button
              onClick={handleReddit}
              title="Share on Reddit"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(255,69,0,0.4)', background: 'rgba(255,69,0,0.1)', color: '#f97316', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.22)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.1)'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
              Reddit
            </button>
            <button
              onClick={handleTelegram}
              title="Share on Telegram"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(0,136,204,0.4)', background: 'rgba(0,136,204,0.1)', color: '#38bdf8', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,136,204,0.22)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,136,204,0.1)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Telegram
            </button>
            <button
              onClick={handleCopy}
              title="Copy to clipboard"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: copied ? '1px solid rgba(125,249,170,0.5)' : '1px solid rgba(255,255,255,0.15)', background: copied ? 'rgba(125,249,170,0.12)' : 'rgba(255,255,255,0.04)', color: copied ? '#7DF9AA' : '#9ca3af', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>
      </div>

      <GridlockStandings
        puzzleId={puzzleId}
        playerRank={rank}
        elapsedSeconds={elapsedSeconds}
      />

      {ruleExplanation && (
        <div className="border border-yellow-500/20 rounded-lg p-4 bg-yellow-900/10 space-y-2">
          <div className="text-xs font-mono text-yellow-400/70 tracking-widest uppercase">RULE DISCLOSED</div>
          <p className="text-sm font-mono text-yellow-200 leading-relaxed">{ruleExplanation}</p>
        </div>
      )}

      {retentionUnlock && (
        <div className="border border-gray-600 rounded-lg p-4 bg-gray-900/50 space-y-2">
          <div className="text-xs font-mono text-gray-500 tracking-widest uppercase">DECLASSIFIED</div>
          <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">{retentionUnlock}</pre>
        </div>
      )}
    </motion.div>
  );
}

// ── Share card generator ───────────────────────────────────────────────────────
function generateShareText(
  fileNumber: number,
  fileTitle: string,
  rank: GridlockRank,
  submissionCount: number,
  hintsUsed: number,
  lawResult: string,
  elapsedSeconds: number,
): string {
  const rankEmoji: Record<GridlockRank, string> = { S: '🟡', A: '🟢', B: '🔵', C: '⚪', F: '🔴' };
  const lines = [
    `📁 GRIDLOCK FILE #${fileNumber.toString().padStart(3, '0')}`,
    `"${fileTitle}"`,
    ``,
    `${rankEmoji[rank]} ${rank}-RANK — ${GRIDLOCK_RANK_LABELS[rank]}`,
    elapsedSeconds > 0 ? `⏱ Solved in ${formatTime(elapsedSeconds)}` : '',
    `${submissionCount === 1 ? '🎯' : '🔁'} ${submissionCount} attempt${submissionCount !== 1 ? 's' : ''}${hintsUsed > 0 ? ` · ${hintsUsed} hint${hintsUsed !== 1 ? 's' : ''}` : ' · no hints'}`,
    lawResult === 'confirmed' || lawResult === 'alternate'
      ? `🧠 Law declared correctly`
      : '',
    ``,
    `Can you crack today's file?`,
    `puzzlewarz.com/puzzles`,
  ].filter(l => l !== '');
  return lines.join('\n');
}

// ── How To Play modal ────────────────────────────────────────────────────────

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const steps = [
    { icon: "🗂️", title: "Study the grid", body: "A number or word grid is displayed with some cells missing. Your goal is to figure out the hidden rule and fill in the blanks correctly." },
    { icon: "🧠", title: "Declare the law (optional)", body: "Think you know the pattern? Declare the Rule Family and Axis for a rank bonus. Wrong declarations never penalise you." },
    { icon: "📡", title: "Use signals wisely", body: "Signals (hints) cost tokens. Each one nudges you toward the pattern. You can earn more from the store." },
    { icon: "🏆", title: "Earn your rank", body: "S = first try, no hints. Each extra attempt or hint lowers your rank. Fastest solvers top the standings." },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 460,
          backgroundColor: "#0d1117",
          border: "1px solid rgba(255,208,0,0.3)",
          borderRadius: 16,
          padding: "28px 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#fbbf24", marginBottom: 6 }}>
            How to play
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono, ui-monospace, monospace)" }}>
            GRIDLOCK
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "12px 14px",
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb", marginBottom: 3, fontFamily: "inherit" }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, fontFamily: "inherit" }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "11px",
            borderRadius: 9, border: "none",
            backgroundColor: "#FFD700", color: "#000",
            fontWeight: 800, fontSize: 13, cursor: "pointer",
            letterSpacing: "0.06em", fontFamily: "inherit",
          }}
        >
          GOT IT — START CRACKING
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function GridlockFilePuzzle({ puzzleId, onSolved, guestMode = false, hideHeader = false }: GridlockFilePuzzleProps) {
  const enqueueAchievement = useAchievementModalStore((s) => s.enqueueAchievement);
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Answer inputs — one entry per missing cell
  const [answers, setAnswers] = useState<string[]>([]);
  // Hints revealed client-side
  const [usedHintIds, setUsedHintIds] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [illuminated, setIlluminated] = useState(false);
  const [shieldConsumed, setShieldConsumed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── Guest-mode tracking ─────────────────────────────────────────────────────────
  const [guestSubmissionCount, setGuestSubmissionCount] = useState(0);
  const [streak, setStreak] = useState<AnonStreakState | null>(null);
  const [arcCompleteVisible, setArcCompleteVisible] = useState(false);
  const [guestRewardData, setGuestRewardData] = useState<{ xp: number; points: number } | null>(null);

  // ── Timer ────────────────────────────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerStartRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return; // already running
    timerStartRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (timerStartRef.current ?? Date.now())) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (timerStartRef.current) {
      setElapsedSeconds(Math.floor((Date.now() - timerStartRef.current) / 1000));
    }
  }, []);

  // Clean up on unmount
  useEffect(() => () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); }, []);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadState = useCallback(async () => {
    try {
      const endpoint = guestMode
        ? `/api/gridlock/guest/${puzzleId}/state`
        : `/api/puzzles/${puzzleId}/gridlock/state`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();

      if (guestMode) {
        // Build a client-only ServerState — progress read from localStorage
        const anonSolved = getAnonSolved();
        const record = anonSolved[puzzleId];
        const anonStreak = getAnonStreak();
        setStreak(anonStreak);

        setServerState({
          puzzle: data.puzzle,
          solved: Boolean(record),
          solvedAt: record ? record.date : null,
          submissionCount: record?.submissionCount ?? 0,
          hintsUsed: 0,
          rank: (record?.rank as GridlockRank) ?? 'F',
          ruleExplanation: null,
          retentionUnlock: null,
          streakShields: 0,
          currentStreak: anonStreak.count,
          hintTokens: 0,
        });

        if (record) {
          setElapsedSeconds(record.elapsedSeconds);
          setIlluminated(true);
          // If already solved and it was today, re-surface the rule explanation via a fresh fetch
        } else {
          startTimer();
        }
      } else {
        setServerState(data);
        if (data.solved) {
          setIlluminated(true);
        } else {
          startTimer();
        }
      }

      const missingCount = data.puzzle.grid.flat().filter((c: GridCell) => c.isMissing).length;
      setAnswers(Array(missingCount).fill(''));
    } catch (e) {
      setError('Failed to load puzzle. Please refresh.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [puzzleId, guestMode, startTimer]);

  useEffect(() => { loadState(); }, [loadState]);

  // ── Answer handler ──────────────────────────────────────────────────────────
  const handleAnswer = useCallback((idx: number, value: string) => {
    setAnswers(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitting || answers.every(a => a.trim() === '')) return;
    setSubmitting(true);

    const nextGuestCount = guestMode ? guestSubmissionCount + 1 : undefined;

    try {
      const endpoint = guestMode
        ? `/api/gridlock/guest/${puzzleId}/submit`
        : `/api/puzzles/${puzzleId}/gridlock/submit`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answers.map(a => a.trim()),
          elapsedSeconds,
          ...(guestMode && { submissionCount: nextGuestCount, anonId: getAnonId() }),
        }),
      });
      const data: SubmitResult = await res.json();
      setSubmitResult(data);

      const resolvedSubmissionCount = guestMode ? (nextGuestCount ?? 1) : data.submissionCount;

      if (data.correct) {
        stopTimer();
        setIlluminated(true);

        if (data.shieldConsumed) setShieldConsumed(true);

        if (!guestMode && data.arcAchievement) {
          enqueueAchievement(data.arcAchievement);
        }

        if (guestMode) {
          // Persist solve to localStorage
          setAnonSolved(puzzleId, {
            rank: data.rank,
            elapsedSeconds,
            date: new Date().toISOString().slice(0, 10),
            arcDay: data.arcDay,
            submissionCount: resolvedSubmissionCount,
          });
          // Update streak
          const updated = updateAnonStreak(
            streak ?? getAnonStreak(),
            data.arcDay ?? 0,
            data.retentionUnlock ?? undefined,
          );
          setStreak(updated);
          // Trigger arc complete overlay when all 7 days solved
          if (updated.arcSolvedDays.length === 7) {
            setArcCompleteVisible(true);
          }
          // Store pending rewards and show the reward modal
          const xp = data.xpReward ?? 100;
          const pts = data.pointsReward ?? 100;
          addPendingRewards(xp, pts);
          setGuestRewardData({ xp, points: pts });
        }

        setServerState(prev => prev ? {
          ...prev,
          solved: true,
          submissionCount: resolvedSubmissionCount,
          rank: data.rank,
          ruleExplanation: data.ruleExplanation ?? null,
          retentionUnlock: data.retentionUnlock ?? null,
          ...(data.shieldConsumed ? { streakShields: Math.max(0, (prev.streakShields ?? 1) - 1) } : {}),
        } : prev);
        onSolved();
      } else {
        if (guestMode) {
          setGuestSubmissionCount(nextGuestCount ?? 1);
        }
        setServerState(prev => prev ? {
          ...prev,
          submissionCount: resolvedSubmissionCount,
          rank: data.rank,
        } : prev);
      }
    } catch (e) {
      console.error('[submit]', e);
    } finally {
      setSubmitting(false);
    }
  }, [answers, puzzleId, submitting, onSolved, guestMode, guestSubmissionCount, elapsedSeconds, streak, stopTimer]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-green-400 font-mono text-sm animate-pulse">
        ▶ LOADING GRIDLOCK FILE…
      </div>
    );
  }
  if (error || !serverState) {
    return (
      <div className="p-6 border border-red-700/50 rounded-lg bg-red-900/10 text-red-400 font-mono text-sm">
        {error ?? 'Puzzle data unavailable.'}
      </div>
    );
  }

  const { puzzle } = serverState;
  const solved = serverState.solved;
  const streakAlive = streak ? isStreakAlive(streak.lastSolvedDate) : false;

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }} className="space-y-6">
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
      {/* Arc complete overlay */}
      <AnimatePresence>
        {arcCompleteVisible && streak && (
          <GridlockArcComplete
            streak={streak}
            rank={serverState.rank}
            elapsedSeconds={elapsedSeconds}
            guestMode={guestMode}
            onClose={() => setArcCompleteVisible(false)}
          />
        )}
      </AnimatePresence>

      {/* Guest reward modal — shown once after a guest solves */}
      <AnimatePresence>
        {guestRewardData && (
          <GuestRewardModal
            xpEarned={guestRewardData.xp}
            pointsEarned={guestRewardData.points}
            puzzleTitle={serverState.puzzle.fileTitle}
            onDismiss={() => setGuestRewardData(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      {!hideHeader && (
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.22)' }}>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            GRIDLOCK FILE #{String(puzzle.fileNumber ?? '?').padStart(3, '0')}
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', marginTop: 4, lineHeight: 1.2 }}>
            {puzzle.fileTitle}
          </div>
          <div style={{ fontSize: 13, color: '#d1d5db', marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 }}>
            {puzzle.flavorText}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Streak shield count — authenticated users only */}
          {!guestMode && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              title="Streak shields protect your daily streak if you miss a day"
              style={{
                background: (serverState.streakShields ?? 0) > 0 ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${(serverState.streakShields ?? 0) > 0 ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: (serverState.streakShields ?? 0) > 0 ? '#93c5fd' : '#6b7280',
              }}
            >
              <span>🛡️</span>
              <span>{serverState.streakShields ?? 0}</span>
              {(serverState.streakShields ?? 0) === 0 && !solved && (
                <a
                  href="/store"
                  className="ml-1 underline underline-offset-2 hover:text-blue-300 transition-colors"
                  style={{ fontSize: 10, color: '#6b7280' }}
                >
                  Add more →
                </a>
              )}
            </div>
          )}
          {streak && streak.count > 0 && (
            <StreakTimer
              streak={streak.count}
              solvedToday={solved}
              size="sm"
            />
          )}
          {!solved && (
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#7DF9AA', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(elapsedSeconds)}
            </div>
          )}
          {serverState.submissionCount > 0 && (
            <RankBadge rank={serverState.rank} />
          )}
          {!solved && (
            <button
              onClick={() => setShowHelp(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ background: "rgba(253,231,76,0.08)", border: "1px solid rgba(253,231,76,0.3)", color: "#FDE74C" }}
            >
              ? How to play
            </button>
          )}
        </div>
      </div>
      )}

      {solved ? (
        // ── Solved view ────────────────────────────────────────────────────────
        <div className="space-y-5">
          {/* Grid (read-only, illuminated) */}
          <div className="flex justify-center py-4" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)' }}>
            <GridDisplay
              grid={puzzle.grid}
              answers={answers}
              onAnswer={() => {}}
              solved
              lastResult={submitResult}
              illuminated={illuminated}
            />
          </div>

          {/* Shield-saved banner — shown after a solve consumed a streaks shield */}
          <AnimatePresence>
            {shieldConsumed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-mono font-bold"
                style={{
                  background: 'rgba(96,165,250,0.1)',
                  border: '1px solid rgba(96,165,250,0.35)',
                  color: '#93c5fd',
                }}
              >
                <span>🛡️</span>
                <span>A streak shield protected your streak — 1 shield consumed.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <SolvedScreen
            puzzleId={puzzleId}
            rank={serverState.rank}
            submissionCount={serverState.submissionCount}
            hintsUsed={serverState.hintsUsed}
            ruleExplanation={serverState.ruleExplanation}
            retentionUnlock={serverState.retentionUnlock}
            lawResult={submitResult?.lawResult ?? 'not-declared'}
            elapsedSeconds={elapsedSeconds}
            fileNumber={serverState.puzzle.fileNumber}
            fileTitle={serverState.puzzle.fileTitle}
          />

          {/* Nudge after solve (guest only) */}
          <GridlockStreakNudge
            arcDay={puzzle.arcDay ?? 1}
            streakCount={streak?.count ?? 0}
            arcSolvedDays={streak?.arcSolvedDays ?? []}
            guestMode={guestMode}
          />
        </div>
      ) : (
        // ── Active play view ───────────────────────────────────────────────────
        <div className="space-y-5">
          {/* Grid */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 20px', background: 'radial-gradient(ellipse at center, rgba(255,208,0,0.12) 0%, rgba(0,0,0,0) 70%), rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.2)' }}>
            <GridDisplay
              grid={puzzle.grid}
              answers={answers}
              onAnswer={handleAnswer}
              solved={false}
              lastResult={submitResult}
              illuminated={false}
            />
          </div>

          {/* Wrong answer feedback */}
          <AnimatePresence>
            {submitResult && !submitResult.correct && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  borderRadius: 10,
                  padding: '12px 16px',
                  border: '1px solid rgba(255,96,96,0.35)',
                  background: 'linear-gradient(135deg, rgba(255,60,60,0.12), rgba(255,60,60,0.05))',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FF6060', marginBottom: submitResult.partialHint ? 4 : 0 }}>
                  ✕ Incorrect — {submitResult.submissionCount} attempt{submitResult.submissionCount !== 1 ? 's' : ''} so far
                </div>
                {submitResult.partialHint && (
                  <div style={{ fontSize: 12, color: '#FCD34D', marginTop: 4 }}>{submitResult.partialHint}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || answers.every(a => !a.trim())}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 10,
              fontFamily: 'inherit',
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.18s',
              background: submitting
                ? 'rgba(255,208,0,0.06)'
                : 'linear-gradient(135deg, rgba(255,208,0,0.18), rgba(255,208,0,0.08))',
              border: '1px solid rgba(255,208,0,0.5)',
              boxShadow: '0 0 20px rgba(255,208,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
              color: '#FFD700',
              opacity: (submitting || answers.every(a => !a.trim())) ? 0.4 : 1,
            }}
          >
            {submitting ? '▶ ANALYSING…' : `▶ SUBMIT ANSWER${answers.filter(a => a.trim()).length > 1 ? 'S' : ''}`}
          </button>

          <div style={{ fontSize: 12, textAlign: 'center', color: '#9ca3af', fontFamily: 'inherit', letterSpacing: '0.04em' }}>
            {serverState.submissionCount > 0 ? `${serverState.submissionCount} attempt${serverState.submissionCount !== 1 ? 's' : ''} · ${serverState.hintsUsed} signal${serverState.hintsUsed !== 1 ? 's' : ''} used` : 'No attempts yet'}
          </div>

          {/* Streak nudge (guest only, shows after a solve) */}
          {submitResult?.correct === false && (
            <GridlockStreakNudge
              arcDay={puzzle.arcDay ?? 1}
              streakCount={streak?.count ?? 0}
              arcSolvedDays={streak?.arcSolvedDays ?? []}
              guestMode={guestMode}
            />
          )}
        </div>
      )}
    </div>
  );
}
