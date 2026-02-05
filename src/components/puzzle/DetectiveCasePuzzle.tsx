'use client';

import { useEffect, useMemo, useState } from 'react';

type DetectiveCaseState = {
  puzzleId: string;
  noirTitle: string;
  intro: string | null;
  totalStages: number;
  solved: boolean;
  locked: boolean;
  lockedReason: string | null;
  currentStageIndex: number;
  stage: null | { id: string; title: string; prompt: string; kind: 'text' };
};

export default function DetectiveCasePuzzle({ puzzleId }: { puzzleId: string }) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<DetectiveCaseState | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const stageLabel = useMemo(() => {
    if (!state) return '';
    const stageNum = Math.min(state.currentStageIndex + 1, state.totalStages);
    return `Stage ${stageNum} of ${state.totalStages}`;
  }, [state]);

  async function loadState() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/detective/state`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data && (data.error as string)) || 'Failed to load case');
        setState(null);
        return;
      }
      setState(data);
    } catch (e) {
      setError('Failed to load case');
      setState(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleId]);

  async function submitStage() {
    if (!state?.stage) return;
    if (state.locked) return;
    if (state.solved) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/detective/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: state.stage.id, answer }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (data && (data.error as string)) || 'Submission failed';
        setError(msg);
        await loadState();
        return;
      }

      if (data && data.correct === false) {
        setError('Incorrect. Case locked — no retry.');
        await loadState();
        return;
      }

      setAnswer('');
      await loadState();
    } catch (e) {
      setError('Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-6">
        <div className="text-yellow-200">Loading case…</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-6">
        <div className="text-red-300">
          {error || 'Unable to load detective case.'}
          {error && error.toLowerCase().includes('not configured') ? (
            <div className="mt-2 text-zinc-300 text-sm">
              This puzzle is marked as <span className="text-zinc-100 font-semibold">detective_case</span> but has no
              <span className="text-zinc-100 font-semibold"> puzzleData.detectiveCase</span> stages. Ask an admin to add the case JSON
              in the puzzle creator.
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (state.locked) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-black/50 p-6">
        <div className="text-red-200 text-xl font-semibold">Case Closed</div>
        <div className="mt-2 text-zinc-300">You made a wrong call. This case is locked forever.</div>
      </div>
    );
  }

  if (state.solved) {
    return (
      <div className="rounded-xl border border-emerald-900/60 bg-black/50 p-6">
        <div className="text-emerald-200 text-xl font-semibold">Case Solved</div>
        <div className="mt-2 text-zinc-300">The city exhales. Another secret buried.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-yellow-200 text-2xl font-semibold tracking-wide">{state.noirTitle}</div>
          <div className="mt-1 text-zinc-400 text-sm">{stageLabel}</div>
        </div>
        <div className="text-zinc-500 text-xs">No retries</div>
      </div>

      {state.intro ? <div className="mt-4 text-zinc-300 italic">{state.intro}</div> : null}

      {state.stage ? (
        <div className="mt-6">
          <div className="text-zinc-200 text-lg font-semibold">{state.stage.title}</div>
          <div className="mt-2 whitespace-pre-wrap text-zinc-300">{state.stage.prompt}</div>

          <div className="mt-6">
            <label className="block text-sm text-zinc-400">Your answer</label>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
              placeholder="Type the code phrase…"
              disabled={submitting}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />

            {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}

            <button
              onClick={submitStage}
              disabled={submitting || !answer.trim()}
              className="mt-4 rounded-lg bg-yellow-500/20 px-4 py-2 text-yellow-200 border border-yellow-500/30 hover:bg-yellow-500/25 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-zinc-400">No active stage.</div>
      )}
    </div>
  );
}
