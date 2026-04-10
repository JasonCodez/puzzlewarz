'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  ParasiteCodeClientCase,
  QuarantineFeedback,
  Rank,
  StrainFamily,
} from '@/lib/parasiteCode';
import { RANK_LABELS, RANK_COLORS, STRAIN_DESCRIPTIONS, OPCODE_DESCRIPTIONS } from '@/lib/parasiteCode';

// ── Props ─────────────────────────────────────────────────────────────────────
interface ParasiteCodePuzzleProps {
  puzzleId: string;
  onSolved: () => void;
}

// ── Server state shape ────────────────────────────────────────────────────────
interface ServerState {
  puzzle: ParasiteCodeClientCase;
  solved: boolean;
  solvedAt: string | null;
  submissionCount: number;
  rank: Rank;
  lastFeedback: QuarantineFeedback | null;
  activationCondition: string | null;
  retentionUnlock: string | null;
}

// ── Submit result shape ───────────────────────────────────────────────────────
interface SubmitResult {
  correct: boolean;
  feedback: QuarantineFeedback;
  foundCount: number;
  totalParasiteCount: number;
  submissionCount: number;
  rank: Rank;
  activationCondition?: string;
  retentionUnlock?: string | null;
}

// ── Opcode colour map ─────────────────────────────────────────────────────────
const OPCODE_COLORS: Record<string, string> = {
  SET:  '#7DF9AA',  // mint
  ADD:  '#A8DAFF',  // sky blue
  SUB:  '#A8DAFF',
  MUL:  '#A8DAFF',
  CMP:  '#FFD580',  // amber
  IF:   '#FFD580',
  GOTO: '#FF9EC4',  // pink
  CALL: '#FF9EC4',
  RET:  '#FF9EC4',
  LOAD: '#C9B8FF',  // purple
  OUT:  '#60FFF0',  // cyan
  HALT: '#FF6060',  // red
};

// ── Feedback messages ─────────────────────────────────────────────────────────
const FEEDBACK_TEXT: Record<QuarantineFeedback, string> = {
  'exact':         '✓ Quarantine confirmed. All malicious segments isolated.',
  'over-flagged':  '⚠ False positives detected. Clean lines included in quarantine.',
  'under-flagged': '⚠ Incomplete isolation. Additional parasite segments remain active.',
  'off':           '✗ Quarantine rejected. Wrong lines flagged — re-analyse.',
};
const FEEDBACK_COLOR: Record<QuarantineFeedback, string> = {
  'exact':         '#7DF9AA',
  'over-flagged':  '#FFD580',
  'under-flagged': '#FFD580',
  'off':           '#FF6060',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// ── Rank badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank, size = 'sm' }: { rank: Rank; size?: 'sm' | 'lg' }) {
  const color = RANK_COLORS[rank];
  const label = RANK_LABELS[rank];
  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="text-5xl font-black font-mono tracking-tighter"
          style={{ color, textShadow: `0 0 20px ${color}` }}
        >
          {rank}
        </div>
        <div className="text-xs font-mono tracking-widest uppercase" style={{ color }}>
          {label}
        </div>
      </div>
    );
  }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-black font-mono tracking-wider"
      style={{ color, border: `1px solid ${color}`, background: `${color}15` }}
    >
      {rank} — {label}
    </span>
  );
}

// ── Strain chip ───────────────────────────────────────────────────────────────
function StrainChip({ strain }: { strain: StrainFamily }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-mono tracking-wide"
      style={{ color: '#C9B8FF', border: '1px solid #C9B8FF44', background: '#C9B8FF15' }}>
      {strain.replace(/-/g, '\u200B-')}
    </span>
  );
}

// ── Briefing screen ───────────────────────────────────────────────────────────
function BriefingScreen({
  puzzle,
  onBegin,
}: {
  puzzle: ParasiteCodeClientCase;
  onBegin: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="border border-green-500/30 rounded-lg p-6 bg-black/60 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-green-400/70 tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          MALWARE ANALYSIS TERMINAL — CASE INCOMING
        </div>
        <h2 className="text-2xl font-black font-mono text-white">{puzzle.caseTitle}</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-mono text-gray-400">Program:</span>
          <span className="text-xs font-mono text-green-300">{puzzle.programName}</span>
          <span className="text-gray-600">·</span>
          <span className="text-xs font-mono text-gray-400">Strain family:</span>
          <StrainChip strain={puzzle.strainFamily} />
        </div>
      </div>

      {/* Narrative */}
      <div className="border border-gray-700 rounded-lg p-5 bg-gray-900/40 space-y-2">
        <div className="text-xs font-mono text-gray-500 tracking-widest uppercase">FIELD BRIEF</div>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
          {puzzle.contextNarrative}
        </p>
      </div>

      {/* Strain info */}
      <div className="border border-purple-500/20 rounded-lg p-4 bg-purple-900/10 space-y-1">
        <div className="text-xs font-mono text-purple-300/70 tracking-widest uppercase">STRAIN CLASSIFICATION</div>
        <div className="text-sm text-purple-200">
          <span className="font-mono font-bold">{puzzle.strainFamily}</span>
          {' — '}
          {STRAIN_DESCRIPTIONS[puzzle.strainFamily]}
        </div>
      </div>

      {/* Instructions */}
      <div className="border border-yellow-500/20 rounded-lg p-4 bg-yellow-900/10 space-y-2 text-sm text-yellow-200/80">
        <div className="text-xs font-mono text-yellow-400/70 tracking-widest uppercase mb-1">ANALYST BRIEFING</div>
        <ul className="space-y-1 list-disc list-inside">
          <li>Read through the program listing using the <span className="font-mono text-yellow-300">OPCODE GUIDE</span> if needed</li>
          <li>Run the <span className="font-mono text-yellow-300">TEST INPUTS</span> to observe program behaviour</li>
          <li>Click lines you believe are malicious to <span className="font-mono text-yellow-300">quarantine</span> them</li>
          <li>Submit when you have isolated every parasite segment</li>
          <li>You are scored on attempts — fewer is better</li>
        </ul>
      </div>

      <button
        onClick={onBegin}
        className="w-full py-3 rounded-lg font-mono font-bold tracking-widest text-sm uppercase transition-all hover:scale-[1.02] active:scale-100"
        style={{
          background: 'linear-gradient(to right, #0f2a0f, #1a3a1a)',
          border: '1px solid #7DF9AA55',
          color: '#7DF9AA',
          boxShadow: '0 0 20px #7DF9AA20',
        }}
      >
        ▶ BEGIN ANALYSIS
      </button>
    </motion.div>
  );
}

// ── Program line ──────────────────────────────────────────────────────────────
function ProgramLineRow({
  line,
  flagged,
  tracing,
  solved,
  onClick,
}: {
  line: ParasiteCodeClientCase['program'][number];
  flagged: boolean;
  tracing: boolean;
  solved: boolean;
  onClick: () => void;
}) {
  const opcodeColor = OPCODE_COLORS[line.opcode] ?? '#e2e8f0';
  return (
    <motion.div
      layout
      onClick={solved ? undefined : onClick}
      className="flex items-start gap-3 px-3 py-1.5 rounded cursor-pointer select-none transition-colors"
      style={{
        background: flagged
          ? 'rgba(255, 96, 96, 0.15)'
          : tracing
          ? 'rgba(125, 249, 170, 0.08)'
          : 'transparent',
        borderLeft: flagged
          ? '2px solid #FF6060'
          : tracing
          ? '2px solid #7DF9AA'
          : '2px solid transparent',
        cursor: solved ? 'default' : 'pointer',
      }}
      whileHover={solved ? {} : { backgroundColor: 'rgba(255,255,255,0.04)' }}
    >
      {/* Line ID */}
      <span className="text-xs font-mono text-gray-600 w-8 shrink-0 pt-0.5">
        {line.id}
      </span>

      {/* Tracing arrow */}
      <span className="text-xs font-mono w-4 shrink-0 pt-0.5" style={{ color: '#7DF9AA' }}>
        {tracing ? '▶' : ' '}
      </span>

      {/* Opcode */}
      <span className="text-sm font-mono font-bold w-12 shrink-0" style={{ color: opcodeColor }}>
        {line.opcode}
      </span>

      {/* Operands */}
      <span className="text-sm font-mono text-gray-200 flex-1">
        {line.operands.join(' ')}
        {line.comment && (
          <span className="text-gray-500 ml-3">{'; '}{line.comment}</span>
        )}
      </span>

      {/* Quarantine indicator */}
      {flagged && (
        <span className="text-xs font-mono shrink-0 pt-0.5" style={{ color: '#FF6060' }}>
          [QUARANTINE]
        </span>
      )}
    </motion.div>
  );
}

// ── Opcode guide panel ────────────────────────────────────────────────────────
function OpcodeGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors"
      >
        <span>{open ? '▼' : '▶'}</span>
        OPCODE REFERENCE
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 border border-gray-700 rounded p-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
              {(Object.entries(OPCODE_DESCRIPTIONS) as [string, string][]).map(([op, desc]) => (
                <div key={op} className="flex gap-2 text-xs font-mono">
                  <span className="w-10 shrink-0 font-bold" style={{ color: OPCODE_COLORS[op] ?? '#e2e8f0' }}>
                    {op}
                  </span>
                  <span className="text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Test input panel ──────────────────────────────────────────────────────────
function TestInputPanel({
  inputs,
  activeId,
  onActivate,
}: {
  inputs: ParasiteCodeClientCase['testInputs'];
  activeId: string | null;
  onActivate: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-mono text-gray-500 tracking-widest uppercase">TEST INPUTS</div>
      {inputs.map(inp => {
        const active = inp.id === activeId;
        return (
          <div
            key={inp.id}
            className="border rounded p-3 space-y-1 cursor-pointer transition-colors"
            style={{
              borderColor: active ? '#60FFF0' : '#374151',
              background: active ? 'rgba(96,255,240,0.05)' : 'transparent',
            }}
            onClick={() => onActivate(inp.id)}
          >
            <div className="text-xs font-mono font-bold" style={{ color: active ? '#60FFF0' : '#9ca3af' }}>
              {inp.label}
            </div>
            {active && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1 mt-1"
              >
                <div className="text-xs font-mono text-gray-400">
                  {Object.entries(inp.values).map(([k, v]) => (
                    <span key={k} className="mr-3">
                      <span className="text-purple-300">{k}</span>=<span className="text-green-300">{String(v)}</span>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 text-xs font-mono mt-1">
                  <span className="text-gray-500">Expected output:</span>
                  <span className="text-yellow-300">{inp.expectedOutput}</span>
                </div>
                {inp.activatesParasite && (
                  <div className="text-xs font-mono text-red-400">
                    ⚠ This input activates an anomalous execution path
                  </div>
                )}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Quarantine panel ──────────────────────────────────────────────────────────
function QuarantinePanel({
  flaggedIds,
  onRemove,
  onSubmit,
  submitting,
  submitResult,
  submissionCount,
  solved,
}: {
  flaggedIds: Set<string>;
  onRemove: (id: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitResult: SubmitResult | null;
  submissionCount: number;
  solved: boolean;
}) {
  const ids = [...flaggedIds];
  const lastFeedback = submitResult && !submitResult.correct ? submitResult.feedback : null;

  return (
    <div className="space-y-3">
      <div className="text-xs font-mono text-gray-500 tracking-widest uppercase">QUARANTINE WORKSPACE</div>

      {ids.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded p-4 text-center text-xs font-mono text-gray-600">
          Click program lines above to quarantine them
        </div>
      ) : (
        <div className="border border-red-900/50 rounded p-3 bg-red-900/10 space-y-1">
          {ids.map(id => (
            <div key={id} className="flex items-center justify-between text-xs font-mono">
              <span style={{ color: '#FF6060' }}>{id}</span>
              {!solved && (
                <button
                  onClick={() => onRemove(id)}
                  className="text-gray-500 hover:text-gray-200 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feedback from last attempt */}
      {lastFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="border rounded p-3 text-xs font-mono"
          style={{
            borderColor: `${FEEDBACK_COLOR[lastFeedback]}44`,
            background: `${FEEDBACK_COLOR[lastFeedback]}10`,
            color: FEEDBACK_COLOR[lastFeedback],
          }}
        >
          {FEEDBACK_TEXT[lastFeedback]}
        </motion.div>
      )}

      {/* Attempt counter */}
      {submissionCount > 0 && !solved && (
        <div className="text-xs font-mono text-gray-500">
          Attempts: {submissionCount}
        </div>
      )}

      {!solved && (
        <button
          onClick={onSubmit}
          disabled={submitting || ids.length === 0}
          className="w-full py-2.5 rounded font-mono font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: ids.length === 0 ? 'transparent' : 'rgba(255,96,96,0.15)',
            border: '1px solid rgba(255,96,96,0.4)',
            color: '#FF6060',
          }}
        >
          {submitting ? '▶ SUBMITTING…' : `▶ SUBMIT QUARANTINE (${ids.length} line${ids.length !== 1 ? 's' : ''})`}
        </button>
      )}
    </div>
  );
}

// ── Solved screen ─────────────────────────────────────────────────────────────
function SolvedScreen({
  rank,
  submissionCount,
  activationCondition,
  retentionUnlock,
  strainFamily,
}: {
  rank: Rank;
  submissionCount: number;
  activationCondition: string | null;
  retentionUnlock: string | null;
  strainFamily: StrainFamily;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5 max-w-2xl mx-auto"
    >
      {/* Rank display */}
      <div className="border border-green-500/30 rounded-lg p-6 bg-black/60 text-center space-y-3">
        <div className="text-xs font-mono text-green-400/70 tracking-widest uppercase">QUARANTINE SUCCESSFUL</div>
        <RankBadge rank={rank} size="lg" />
        <div className="text-sm font-mono text-gray-400">
          Isolated in <span className="text-white font-bold">{submissionCount}</span> attempt{submissionCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Activation condition */}
      {activationCondition && (
        <div className="border border-yellow-500/20 rounded-lg p-4 bg-yellow-900/10 space-y-2">
          <div className="text-xs font-mono text-yellow-400/70 tracking-widest uppercase">ACTIVATION CONDITION</div>
          <p className="text-sm font-mono text-yellow-200">{activationCondition}</p>
        </div>
      )}

      {/* Strain classification */}
      <div className="border border-purple-500/20 rounded-lg p-4 bg-purple-900/10 space-y-2">
        <div className="text-xs font-mono text-purple-300/70 tracking-widest uppercase">STRAIN LOGGED</div>
        <div className="text-sm text-purple-200">
          <StrainChip strain={strainFamily} />
          <span className="ml-2 text-purple-300/70">{STRAIN_DESCRIPTIONS[strainFamily]}</span>
        </div>
      </div>

      {/* Retention unlock */}
      {retentionUnlock && (
        <div className="border border-gray-600 rounded-lg p-4 bg-gray-900/50 space-y-2">
          <div className="text-xs font-mono text-gray-500 tracking-widest uppercase">DECLASSIFIED</div>
          <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
            {retentionUnlock}
          </pre>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ParasiteCodePuzzle({ puzzleId, onSolved }: ParasiteCodePuzzleProps) {
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [phase, setPhase] = useState<'briefing' | 'analysis' | 'solved'>('briefing');
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [tracingLine, setTracingLine] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  // ── Load state ──────────────────────────────────────────────────────────────
  const loadState = useCallback(async () => {
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/parasite/state`);
      if (!res.ok) throw new Error('Failed to load');
      const data: ServerState = await res.json();
      setServerState(data);
      if (data.solved) {
        setPhase('solved');
      }
      if (data.lastFeedback) {
        // Restore last feedback as a synthetic result
        setSubmitResult({
          correct: false,
          feedback: data.lastFeedback,
          foundCount: 0,
          totalParasiteCount: 0,
          submissionCount: data.submissionCount,
          rank: data.rank,
        });
      }
    } catch (e) {
      setError('Failed to load puzzle. Please refresh.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [puzzleId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // ── Toggle quarantine ───────────────────────────────────────────────────────
  const toggleFlag = useCallback((lineId: string) => {
    setFlaggedIds(prev => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }, []);

  // ── Tracer ─────────────────────────────────────────────────────────────────
  const handleActivateInput = useCallback((inputId: string) => {
    setActiveInput(prev => (prev === inputId ? null : inputId));
    if (!serverState?.puzzle?.program?.length) return;
    // Animate the tracer cursor stepping through lines
    const lines = serverState.puzzle.program;
    let i = 0;
    const step = () => {
      if (i >= lines.length) {
        setTracingLine(null);
        return;
      }
      setTracingLine(lines[i].id);
      i++;
      setTimeout(step, 120);
    };
    setTracingLine(null);
    setTimeout(step, 200);
  }, [serverState?.puzzle?.program]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitting || flaggedIds.size === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/parasite/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarantinedIds: [...flaggedIds] }),
      });
      const data: SubmitResult = await res.json();
      setSubmitResult(data);
      setServerState(prev => prev ? {
        ...prev,
        submissionCount: data.submissionCount,
        rank: data.rank,
        solved: data.correct,
        activationCondition: data.activationCondition ?? prev.activationCondition,
        retentionUnlock: data.retentionUnlock ?? prev.retentionUnlock,
      } : prev);
      if (data.correct) {
        setPhase('solved');
        onSolved();
      }
    } catch (e) {
      console.error('[submit]', e);
    } finally {
      setSubmitting(false);
    }
  }, [flaggedIds, puzzleId, submitting, onSolved]);

  // ── Render states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-green-400 font-mono text-sm animate-pulse">
        ▶ INITIALISING ANALYSIS TERMINAL…
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

  // ── Briefing ────────────────────────────────────────────────────────────────
  if (phase === 'briefing') {
    return (
      <div className="min-h-64 py-4 font-mono">
        <BriefingScreen puzzle={puzzle} onBegin={() => setPhase('analysis')} />
      </div>
    );
  }

  // ── Solved ──────────────────────────────────────────────────────────────────
  if (phase === 'solved') {
    return (
      <div className="py-4 font-mono">
        <SolvedScreen
          rank={serverState.rank}
          submissionCount={serverState.submissionCount}
          activationCondition={serverState.activationCondition}
          retentionUnlock={serverState.retentionUnlock}
          strainFamily={puzzle.strainFamily}
        />
      </div>
    );
  }

  // ── Analysis layout ─────────────────────────────────────────────────────────
  return (
    <div className="font-mono space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-400/70 tracking-widest uppercase">
            {puzzle.programName}
          </span>
          <StrainChip strain={puzzle.strainFamily} />
        </div>
        <div className="flex items-center gap-3">
          {serverState.submissionCount > 0 && (
            <RankBadge rank={serverState.rank} />
          )}
          <span className="text-xs text-gray-500">
            Attempts: {serverState.submissionCount}
          </span>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT — program listing */}
        <div className="lg:col-span-2 space-y-3">
          {/* Opcode guide collapsible */}
          <div className="px-1">
            <OpcodeGuide />
          </div>

          {/* Program listing */}
          <div
            className="border border-gray-800 rounded-lg p-2 bg-black/70 space-y-0.5 overflow-y-auto"
            style={{ maxHeight: '60vh' }}
          >
            <div className="px-3 py-1 text-xs text-gray-600 flex gap-3 border-b border-gray-800 mb-1">
              <span className="w-8">ID</span>
              <span className="w-4" />
              <span className="w-12">OP</span>
              <span>OPERANDS + COMMENT</span>
            </div>
            {puzzle.program.map(line => (
              <ProgramLineRow
                key={line.id}
                line={line}
                flagged={flaggedIds.has(line.id)}
                tracing={tracingLine === line.id}
                solved={serverState.solved}
                onClick={() => toggleFlag(line.id)}
              />
            ))}
          </div>

          {/* Submit result banner */}
          <AnimatePresence>
            {submitResult?.correct && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-green-500/40 rounded p-3 text-xs font-mono text-green-300 bg-green-900/15"
              >
                {FEEDBACK_TEXT['exact']}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT — sidebar */}
        <div className="space-y-5">
          {/* Test inputs */}
          <TestInputPanel
            inputs={puzzle.testInputs}
            activeId={activeInput}
            onActivate={handleActivateInput}
          />

          {/* Quarantine workspace */}
          <QuarantinePanel
            flaggedIds={flaggedIds}
            onRemove={id => setFlaggedIds(prev => { const n = new Set(prev); n.delete(id); return n; })}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitResult={submitResult}
            submissionCount={serverState.submissionCount}
            solved={serverState.solved}
          />
        </div>
      </div>
    </div>
  );
}
