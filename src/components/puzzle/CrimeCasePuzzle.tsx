'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CrimeCaseClientData,
  EvidenceItem,
  EvidenceType,
  InterrogationQuestion,
  SuspectProfile,
  TimelineEvent,
} from '@/lib/crimeCase';

// ─── Props ────────────────────────────────────────────────────────────────────
interface CrimeCasePuzzleProps {
  puzzleId: string;
  onSolved?: () => void;
}

interface PartialScore {
  suspect: boolean;
  mechanism: boolean;
  evidenceMatches: number;
  evidenceRequired: number;
}

interface ServerState {
  puzzle: CrimeCaseClientData;
  solved: boolean;
  solvedAt: string | null;
  lastPartialScore: PartialScore | null;
  retentionUnlock: string | null;
}

type ActiveTab = 'evidence' | 'suspects' | 'timeline' | 'scene' | 'corkboard' | 'notes';
type CorkTag = 'key' | 'suspicious' | 'red-herring' | null;

// ─── Design tokens ────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<EvidenceType, string> = {
  document:  '#FDE74C',
  photo:     '#38bdf8',
  chat_log:  '#a78bfa',
  record:    '#34d399',
  audio_log: '#fb7185',
};

const TYPE_ICON: Record<EvidenceType, string> = {
  document:  '📄',
  photo:     '🖼',
  chat_log:  '💬',
  record:    '📋',
  audio_log: '🎙',
};

// ─── Framer variants ──────────────────────────────────────────────────────────
const fadeUp   = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const fadeIn   = { hidden: { opacity: 0 },         show: { opacity: 1 } };
const scaleIn  = { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1 } };
const stagger  = { show: { transition: { staggerChildren: 0.06 } } };

// ─── Puzzle timing ────────────────────────────────────────────────────────────
const PUZZLE_TIME_SECONDS  = 1200; // 20 minutes
const TIME_PENALTY_SECONDS = 120; // −2 min per wrong accusation

// ─── How to play modal ───────────────────────────────────────────────────────
function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4" onClick={onClose}>
      <div className="max-w-lg w-full rounded-xl p-6 shadow-2xl" style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-extrabold" style={{ color: "#FDE74C" }}>How to Play — Crime Case</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none ml-4">✕</button>
        </div>
        <div className="space-y-3 text-sm text-gray-300">
          <p>🔦 <strong>Goal:</strong> Investigate the case files and identify the killer before time runs out.</p>
          <p>🗂️ <strong>Tabs:</strong> Browse Evidence, Suspects, Timeline, Scene, Corkboard, and Notes to gather clues.</p>
          <p>🔍 <strong>Examine evidence</strong> closely — some items have hidden layers that unlock when you combine them.</p>
          <p>🗣️ <strong>Interrogate suspects</strong> on the Suspects tab to reveal their answers to key questions.</p>
          <p>🎯 <strong>Make your accusation</strong> on the Accusation tab when you’re confident. Select a suspect, the method, and your key evidence.</p>
          <p>⏰ <strong>Timer:</strong> You have 20 minutes. A wrong accusation costs 2 minutes.</p>
        </div>
        <div className="mt-5 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80" style={{ background: "#FDE74C", color: "#000" }}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CrimeCasePuzzle({ puzzleId, onSolved }: CrimeCasePuzzleProps) {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [activeTab, setActiveTab]     = useState<ActiveTab>('evidence');

  // evidence viewer
  const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);
  const [contrastValue, setContrastValue]     = useState(1.0);
  const [isZoomed, setIsZoomed]               = useState(false);
  const [combineMode, setCombineMode]         = useState(false);

  // board state (localStorage)
  const [examinedIds, setExaminedIds]           = useState<Set<string>>(new Set());
  const [discoveredLayers, setDiscoveredLayers] = useState<Set<string>>(new Set());
  const [linkedPairs, setLinkedPairs]           = useState<[string, string][]>([]);
  const [notes, setNotes]                       = useState('');

  // accusation
  const [showAccusation, setShowAccusation]       = useState(false);
  const [accuseSuspectId, setAccuseSuspectId]     = useState('');
  const [accuseMechanism, setAccuseMechanism]     = useState('');
  const [accuseEvidenceIds, setAccuseEvidenceIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting]               = useState(false);
  const [accuseResult, setAccuseResult]           = useState<{
    correct: boolean; partialScore: PartialScore; retentionUnlock?: string | null;
  } | null>(null);

  // interrogation
  const [interrogatingSuspect, setInterrogatingSuspect] = useState<SuspectProfile | null>(null);
  const [revealedAnswers, setRevealedAnswers]           = useState<Set<string>>(new Set());

  // corkboard
  const [cardPositions, setCardPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [cardTags, setCardTags]           = useState<Record<string, CorkTag>>({});

  // briefing
  const [briefingDismissed, setBriefingDismissed] = useState(false);

  // how to play
  const [showHelp, setShowHelp] = useState(false);

  // timer
  const [timeLeft, setTimeLeft] = useState(PUZZLE_TIME_SECONDS);
  const [failed, setFailed]     = useState(false);
  const timerActiveRef          = useRef(false);

  const storageKey = `crime-case:${puzzleId}`;

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadState = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/puzzles/${puzzleId}/crime/state`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || 'Failed to load case'); return; }
      setServerState(data);
      // Timer starts only after the player dismisses the briefing screen
    } catch { setError('Failed to load case'); }
    finally   { setLoading(false); }
  }, [puzzleId]);

  useEffect(() => { loadState(); }, [loadState]);

  // ── Countdown tick ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (!timerActiveRef.current) return;
      let expired = false;
      setTimeLeft(prev => {
        if (prev <= 1) { timerActiveRef.current = false; expired = true; return 0; }
        return prev - 1;
      });
      if (expired) setFailed(true);
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (serverState?.solved) timerActiveRef.current = false;
  }, [serverState?.solved]);

  // ── Persist board ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const p = JSON.parse(saved);
      if (p.examinedIds)      setExaminedIds(new Set(p.examinedIds));
      if (p.discoveredLayers) setDiscoveredLayers(new Set(p.discoveredLayers));
      if (p.linkedPairs)      setLinkedPairs(p.linkedPairs);
      if (typeof p.notes === 'string') setNotes(p.notes);
      if (p.revealedAnswers)  setRevealedAnswers(new Set(p.revealedAnswers));
      if (p.cardPositions)    setCardPositions(p.cardPositions);
      if (p.cardTags)         setCardTags(p.cardTags);
    } catch { /* ignore */ }
  }, [storageKey]);

  const saveBoard = useCallback((
    ex: Set<string>, dl: Set<string>, lp: [string,string][], n: string,
    ra?: Set<string>, cp?: Record<string, { x: number; y: number }>, ct?: Record<string, CorkTag>,
  ) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        examinedIds: [...ex], discoveredLayers: [...dl], linkedPairs: lp, notes: n,
        revealedAnswers: ra ? [...ra] : undefined,
        cardPositions: cp,
        cardTags: ct,
      }));
    } catch { /* ignore */ }
  }, [storageKey]);

  // ── Evidence interactions ─────────────────────────────────────────────────
  const openEvidence = (item: EvidenceItem) => {
    setViewingEvidence(item); setContrastValue(1.0); setIsZoomed(false); setCombineMode(false);
    const next = new Set(examinedIds).add(item.id);
    setExaminedIds(next);
    saveBoard(next, discoveredLayers, linkedPairs, notes);
  };
  const closeViewer = () => {
    setViewingEvidence(null); setContrastValue(1.0); setIsZoomed(false); setCombineMode(false);
  };
  const discoverLayer = (id: string) => {
    const next = new Set(discoveredLayers).add(id);
    setDiscoveredLayers(next);
    saveBoard(examinedIds, next, linkedPairs, notes);
  };

  // contrast trigger
  useEffect(() => {
    if (!viewingEvidence?.hiddenLayers) return;
    for (const l of viewingEvidence.hiddenLayers) {
      if (l.trigger === 'contrast' && !discoveredLayers.has(l.id)) {
        if (contrastValue >= (l.filterThreshold ?? 2.5)) discoverLayer(l.id);
      }
    }
  }, [contrastValue, viewingEvidence]); // eslint-disable-line

  // zoom trigger
  useEffect(() => {
    if (!viewingEvidence?.hiddenLayers || !isZoomed) return;
    for (const l of viewingEvidence.hiddenLayers) {
      if (l.trigger === 'zoom' && !discoveredLayers.has(l.id)) discoverLayer(l.id);
    }
  }, [isZoomed, viewingEvidence]); // eslint-disable-line

  const linkEvidence = (targetId: string) => {
    if (!viewingEvidence) return;
    const a = viewingEvidence.id, b = targetId;
    if (linkedPairs.some(([x,y]) => (x===a&&y===b)||(x===b&&y===a))) return;
    const nextPairs: [string,string][] = [...linkedPairs, [a,b]];
    setLinkedPairs(nextPairs);
    if (viewingEvidence.hiddenLayers) {
      for (const l of viewingEvidence.hiddenLayers) {
        if (l.trigger === 'combine' && l.combineWithId === b && !discoveredLayers.has(l.id))
          discoverLayer(l.id);
      }
    }
    saveBoard(examinedIds, discoveredLayers, nextPairs, notes);
    setCombineMode(false);
  };

  // ── Accusation ────────────────────────────────────────────────────────────
  const toggleAccuseEvidence = (id: string) => {
    setAccuseEvidenceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < (serverState?.puzzle?.evidence?.length ?? 8)) { next.add(id); }
      return next;
    });
  };

  const submitAccusation = async () => {
    if (!accuseSuspectId || !accuseMechanism || accuseEvidenceIds.size === 0) return;
    setSubmitting(true); setAccuseResult(null);
    try {
      const res  = await fetch(`/api/puzzles/${puzzleId}/crime/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspectId: accuseSuspectId, mechanism: accuseMechanism, evidenceIds: [...accuseEvidenceIds] }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || 'Submission failed'); return; }
      setAccuseResult(data);
      if (data.correct) {
        timerActiveRef.current = false;
        await loadState(); onSolved?.();
      } else {
        let expired = false;
        setTimeLeft(prev => {
          const next = Math.max(0, prev - TIME_PENALTY_SECONDS);
          if (next <= 0) expired = true;
          return next;
        });
        if (expired) { timerActiveRef.current = false; setFailed(true); }
      }
    } catch { setError('Submission failed'); }
    finally   { setSubmitting(false); }
  };

  // ─── Early states ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-10 h-10 rounded-full"
          style={{ border: '2px solid rgba(239,68,68,0.15)', borderTopColor: '#f87171' }}
        />
        <p className="text-xs tracking-widest uppercase" style={{ color: '#6b7280' }}>
          Retrieving case file…
        </p>
      </div>
    );
  }

  if (error || !serverState) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-6 text-sm"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
      >
        {error || 'Unable to load case.'}
      </motion.div>
    );
  }

  const { puzzle, solved, retentionUnlock } = serverState;

  if (!briefingDismissed && !solved) {
    return (
      <CaseBriefingScreen
        caseTitle={puzzle.caseTitle}
        premise={puzzle.premise}
        suspectCount={puzzle.suspects.length}
        evidenceCount={puzzle.evidence.length}
        onBegin={() => {
          setBriefingDismissed(true);
          timerActiveRef.current = true;
        }}
      />
    );
  }

  return (
    <div style={{ fontFamily: 'ui-monospace, monospace' }}>
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
      {/* ambient grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          backgroundSize: '128px',
        }}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <CaseHeader caseTitle={puzzle.caseTitle} premise={puzzle.premise}
          caseClockHours={puzzle.caseClockHours} solved={solved} />
      </motion.div>

      {!solved && !failed && <CaseTimer timeLeft={timeLeft} />}

      {failed ? (
        <FailedScreen caseTitle={puzzle.caseTitle} onRetry={() => {
          setFailed(false);
          setTimeLeft(PUZZLE_TIME_SECONDS);
          setAccuseResult(null);
          timerActiveRef.current = true;
        }} />
      ) : solved ? (
        <SolvedScreen retentionUnlock={retentionUnlock} caseTitle={puzzle.caseTitle} />
      ) : (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <TabBar activeTab={activeTab} setActiveTab={setActiveTab}
              hasTimeline={Boolean(puzzle.timeline?.length)}
              hasScene={Boolean(puzzle.sceneImageUrl)} />
            <div className="flex justify-end px-1 py-1">
              <button onClick={() => setShowHelp(true)} className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80" style={{ background: "rgba(253,231,76,0.08)", border: "1px solid rgba(253,231,76,0.3)", color: "#FDE74C" }}>? How to play</button>
            </div>
          </motion.div>

          <div className="min-h-[460px] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'evidence' && (
                  <EvidenceBoard evidence={puzzle.evidence} examinedIds={examinedIds}
                    discoveredLayers={discoveredLayers} linkedPairs={linkedPairs} onOpen={openEvidence} />
                )}
                {activeTab === 'suspects' && (
                  <SuspectBoard suspects={puzzle.suspects}
                    revealedAnswers={revealedAnswers}
                    onInterrogate={setInterrogatingSuspect} />
                )}
                {activeTab === 'timeline' && puzzle.timeline && <TimelineBoard events={puzzle.timeline} />}
                {activeTab === 'scene' && puzzle.sceneImageUrl && <SceneBoard imageUrl={puzzle.sceneImageUrl} />}
                {activeTab === 'corkboard' && (
                  <CorkboardBoard
                    evidence={puzzle.evidence}
                    examinedIds={examinedIds}
                    linkedPairs={linkedPairs}
                    cardPositions={cardPositions}
                    setCardPositions={cp => {
                      setCardPositions(cp);
                      saveBoard(examinedIds, discoveredLayers, linkedPairs, notes, revealedAnswers, cp, cardTags);
                    }}
                    cardTags={cardTags}
                    setCardTags={ct => {
                      setCardTags(ct);
                      saveBoard(examinedIds, discoveredLayers, linkedPairs, notes, revealedAnswers, cardPositions, ct);
                    }}
                    onOpen={openEvidence}
                  />
                )}
                {activeTab === 'notes' && (
                  <NotesBoard notes={notes} onChange={v => {
                    setNotes(v); saveBoard(examinedIds, discoveredLayers, linkedPairs, v, revealedAnswers, cardPositions, cardTags);
                  }} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Partial score bar */}
          <AnimatePresence>
            {(serverState.lastPartialScore && !accuseResult) && (
              <motion.div key="ps-server" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
                <PartialScoreBar score={serverState.lastPartialScore} />
              </motion.div>
            )}
            {(accuseResult && !accuseResult.correct) && (
              <motion.div key="ps-result" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
                <PartialScoreBar score={accuseResult.partialScore} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <motion.div
            className="mt-6 flex justify-end"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 0 32px rgba(239,68,68,0.35)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAccusation(true)}
              className="relative overflow-hidden px-7 py-3 rounded-xl font-bold text-sm uppercase tracking-widest"
              style={{
                background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.45)',
                boxShadow: '0 0 20px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              ⚖ File Accusation
            </motion.button>
          </motion.div>
        </>
      )}

      {/* Evidence viewer */}
      <AnimatePresence>
        {viewingEvidence && (
          <EvidenceViewerModal
            item={viewingEvidence} allEvidence={puzzle.evidence}
            discoveredLayers={discoveredLayers} contrastValue={contrastValue}
            setContrastValue={setContrastValue} isZoomed={isZoomed} setIsZoomed={setIsZoomed}
            combineMode={combineMode} setCombineMode={setCombineMode}
            onClose={closeViewer} onLink={linkEvidence} linkedPairs={linkedPairs}
          />
        )}
      </AnimatePresence>

      {/* Interrogation modal */}
      <AnimatePresence>
        {interrogatingSuspect && (
          <InterrogationModal
            suspect={interrogatingSuspect}
            revealedAnswers={revealedAnswers}
            onReveal={qId => {
              const next = new Set(revealedAnswers).add(qId);
              setRevealedAnswers(next);
              saveBoard(examinedIds, discoveredLayers, linkedPairs, notes, next, cardPositions, cardTags);
            }}
            onClose={() => setInterrogatingSuspect(null)}
          />
        )}
      </AnimatePresence>

      {/* Accusation modal */}
      <AnimatePresence>
        {showAccusation && !failed && (
          <AccusationModal
            suspects={puzzle.suspects} evidence={puzzle.evidence} mechanisms={puzzle.mechanisms}
            suspectId={accuseSuspectId} setSuspectId={setAccuseSuspectId}
            mechanism={accuseMechanism} setMechanism={setAccuseMechanism}
            evidenceIds={accuseEvidenceIds} toggleEvidence={toggleAccuseEvidence}
            onClose={() => { setShowAccusation(false); setAccuseResult(null); }}
            onSubmit={submitAccusation} submitting={submitting} result={accuseResult}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Case Briefing Screen
// ─────────────────────────────────────────────────────────────────────────────
function CaseBriefingScreen({
  caseTitle, premise, suspectCount, evidenceCount, onBegin,
}: {
  caseTitle: string;
  premise: string;
  suspectCount: number;
  evidenceCount: number;
  onBegin: () => void;
}) {
  const mins    = Math.floor(PUZZLE_TIME_SECONDS / 60);
  const penMins = Math.floor(TIME_PENALTY_SECONDS / 60);

  const rules = [
    {
      icon: '⏱',
      title: `${mins}-Minute Investigation Window`,
      body: `You have ${mins} minutes from the moment you begin. The clock counts down in real time — once it reaches zero, the case expires and evidence is locked away.`,
      color: '#34d399',
    },
    {
      icon: '⚖',
      title: 'Filing an Accusation',
      body: 'When you\'re ready, click "File Accusation" to submit your suspect, method, and evidence chain. You can file multiple times — but be careful.',
      color: '#38bdf8',
    },
    {
      icon: '⚠',
      title: `Wrong Accusation = −${penMins} Minutes`,
      body: `Every incorrect accusation removes ${penMins} minutes from the clock. A partial result will show which elements were correct so you can refine your theory.`,
      color: '#f87171',
    },
    {
      icon: '🗂',
      title: 'Examine, Link & Interrogate',
      body: 'Open evidence to study it, adjust contrast, and link related items together. Use the Interrogate button on suspects to reveal answers. Build your case on the Corkboard.',
      color: '#a78bfa',
    },
  ];

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
      style={{ fontFamily: 'ui-monospace, monospace' }}
    >
      {/* Header */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
        className="relative overflow-hidden rounded-2xl p-8 mb-4 text-center"
        style={{
          background: 'linear-gradient(145deg, #0a0303 0%, #110505 40%, #0d0202 100%)',
          border: '1px solid rgba(239,68,68,0.2)',
          boxShadow: '0 8px 48px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.2), transparent)' }} />

        {/* pulsing badge */}
        <motion.div
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          Incoming Case File
        </motion.div>

        <h2
          className="font-extrabold mb-4 tracking-tight"
          style={{ color: '#fff', fontSize: 'clamp(22px,4vw,34px)', textShadow: '0 0 40px rgba(239,68,68,0.4)' }}
        >
          {caseTitle}
        </h2>

        <p className="text-sm leading-relaxed max-w-xl mx-auto mb-6" style={{ color: '#8a8480' }}>
          {premise}
        </p>

        {/* stats row */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: 'Suspects',  value: suspectCount,  color: '#38bdf8' },
            { label: 'Evidence',  value: evidenceCount, color: '#FDE74C' },
            { label: 'Time Limit', value: `${mins} min`, color: '#34d399' },
          ].map(s => (
            <div key={s.label}
              className="flex flex-col items-center px-5 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-xs uppercase tracking-widest mt-0.5" style={{ color: '#4b5563' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Rules */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5"
      >
        {rules.map((r, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="rounded-xl p-4 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${r.color}22`,
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${r.color}44, transparent)` }} />
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0 mt-0.5">{r.icon}</div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: r.color }}>
                  {r.title}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                  {r.body}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
        className="flex justify-center"
      >
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(239,68,68,0.4)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onBegin}
          className="relative overflow-hidden px-10 py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest"
          style={{
            background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)',
            color: '#fca5a5',
            border: '1px solid rgba(239,68,68,0.5)',
            boxShadow: '0 0 24px rgba(239,68,68,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <span className="relative">🔍 Begin Investigation</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Case Header
// ─────────────────────────────────────────────────────────────────────────────
function CaseHeader({ caseTitle, premise, caseClockHours, solved }: {
  caseTitle: string; premise: string; caseClockHours?: number; solved: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 mb-2"
      style={{
        background: 'linear-gradient(145deg, #0a0303 0%, #110505 40%, #0d0202 100%)',
        border: '1px solid rgba(239,68,68,0.2)',
        boxShadow: '0 8px 48px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)' }} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          Active Case File
        </span>

        {caseClockHours && !solved && (
          <motion.span
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'rgba(253,231,76,0.08)', color: '#FDE74C', border: '1px solid rgba(253,231,76,0.25)' }}
          >
            ⏱ Evidence destruction in {caseClockHours}h
          </motion.span>
        )}

        {solved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#4ade80', border: '1px solid rgba(16,185,129,0.3)' }}>
            ✓ Case Closed
          </span>
        )}
      </div>

      <h2 className="font-extrabold mb-3 tracking-tight"
        style={{ color: '#fff', fontSize: 'clamp(20px,3.5vw,30px)', textShadow: '0 0 40px rgba(239,68,68,0.3)' }}>
        {caseTitle}
      </h2>

      <p className="text-sm leading-relaxed max-w-2xl" style={{ color: '#8a8480' }}>
        {premise}
      </p>

      <div className="absolute bottom-3 right-4 grid grid-cols-4 gap-1 opacity-10 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-0.5 h-0.5 rounded-full bg-red-400" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Bar
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({ activeTab, setActiveTab, hasTimeline, hasScene }: {
  activeTab: ActiveTab; setActiveTab: (t: ActiveTab) => void; hasTimeline: boolean; hasScene: boolean;
}) {
  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'evidence',   label: 'Evidence',   icon: '🗂' },
    { id: 'suspects',   label: 'Suspects',   icon: '👤' },
    ...(hasTimeline ? [{ id: 'timeline'  as ActiveTab, label: 'Timeline',  icon: '⏱' }] : []),
    ...(hasScene    ? [{ id: 'scene'     as ActiveTab, label: 'Scene',     icon: '🖼' }] : []),
    { id: 'corkboard',  label: 'Corkboard',  icon: '📌' },
    { id: 'notes',      label: 'Notes',      icon: '📝' },
  ];

  return (
    <div className="flex gap-1 mb-2 overflow-x-auto p-1 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {tabs.map((t) => (
        <motion.button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.97 }}
          className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap"
          style={{ color: activeTab === t.id ? '#f87171' : '#6b7280', minWidth: 90 }}
        >
          {activeTab === t.id && (
            <motion.div
              layoutId="tab-pill"
              className="absolute inset-0 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <span className="relative">{t.icon}</span>
          <span className="relative">{t.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence Board
// ─────────────────────────────────────────────────────────────────────────────
function EvidenceBoard({ evidence, examinedIds, discoveredLayers, linkedPairs, onOpen }: {
  evidence: EvidenceItem[];
  examinedIds: Set<string>;
  discoveredLayers: Set<string>;
  linkedPairs: [string,string][];
  onOpen: (item: EvidenceItem) => void;
}) {
  const examined = evidence.filter(e => examinedIds.has(e.id)).length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#4b5563' }}>
          {evidence.length} items collected
        </p>
        <div className="flex items-center gap-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 80, background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #f87171, #FDE74C)' }}
              initial={{ width: 0 }}
              animate={{ width: `${evidence.length > 0 ? (examined / evidence.length) * 100 : 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs" style={{ color: '#6b7280' }}>{examined}/{evidence.length}</span>
        </div>
      </div>

      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {evidence.map((item) => {
          const isExamined  = examinedIds.has(item.id);
          const hasDiscover = item.hiddenLayers?.some(l => discoveredLayers.has(l.id));
          const isLinked    = linkedPairs.some(([a,b]) => a === item.id || b === item.id);
          const color       = TYPE_COLOR[item.type];
          const rgb         = hexToRgb(color);

          return (
            <motion.button
              key={item.id}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -3, boxShadow: `0 8px 32px rgba(${rgb},0.2)` }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpen(item)}
              className="relative text-left rounded-xl p-3.5 overflow-hidden"
              style={{
                background: isExamined
                  ? `linear-gradient(145deg, rgba(${rgb},0.1), rgba(${rgb},0.04))`
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isExamined ? color+'44' : 'rgba(255,255,255,0.07)'}`,
                transition: 'border-color 0.2s',
              }}
            >
              {isExamined && (
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, rgba(${rgb},0.15), transparent 70%)` }} />
              )}

              <div className="absolute top-2.5 right-2.5 flex gap-1">
                {hasDiscover && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#FDE74C18', color: '#FDE74C', border: '1px solid #FDE74C33', fontSize: 9 }}
                  >⚡</motion.span>
                )}
                {isLinked && !hasDiscover && (
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#38bdf818', color: '#38bdf8', border: '1px solid #38bdf833', fontSize: 9 }}>
                    🔗
                  </span>
                )}
              </div>

              <div className="text-2xl mb-2.5 leading-none">{TYPE_ICON[item.type]}</div>

              <div className="text-xs font-bold mb-1 uppercase tracking-wider truncate"
                style={{ color: isExamined ? color : '#6b7280' }}>
                {item.label}
              </div>

              <div className="text-xs leading-relaxed line-clamp-2" style={{ color: '#4b5563' }}>
                {item.summary}
              </div>

              {!isExamined && (
                <div className="mt-2 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.15)' }}>
                  Unexamined
                </div>
              )}

              {isExamined && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl"
                  style={{ background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Suspect Board
// ─────────────────────────────────────────────────────────────────────────────
function SuspectBoard({
  suspects,
  revealedAnswers,
  onInterrogate,
}: {
  suspects: SuspectProfile[];
  revealedAnswers: Set<string>;
  onInterrogate: (s: SuspectProfile) => void;
}) {
  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      initial="hidden" animate="show"
      className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {suspects.map((s) => {
        const hasFlagged = s.interrogation?.some(
          q => q.isFlaggedAnswer && revealedAnswers.has(q.id)
        ) ?? false;
        const hasInterrogation = (s.interrogation?.length ?? 0) > 0;
        const askedCount = s.interrogation?.filter(q => revealedAnswers.has(q.id)).length ?? 0;

        return (
          <motion.div
            key={s.id}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            className="rounded-xl overflow-hidden relative flex flex-col"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              border: `1px solid ${hasFlagged ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
              style={{ background: 'radial-gradient(circle at top right, rgba(56,145,166,0.06), transparent 70%)' }} />

            {/* flag badge */}
            <AnimatePresence>
              {hasFlagged && (
                <motion.div
                  initial={{ opacity: 0, scale: 0, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    color: '#f87171',
                  }}
                >
                  🚩 Suspicious
                </motion.div>
              )}
            </AnimatePresence>

            {s.photoUrl ? (
              <div className="relative h-44 w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover object-top" />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(5,2,2,0.96) 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                  <div className="font-bold text-white text-sm">{s.name}</div>
                  <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                    <span className="text-xs" style={{ color: '#9ca3af' }}>Age {s.age}</span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#38bdf8' }}>{s.role}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 pb-3">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  👤
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{s.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Age {s.age}</div>
                  <div className="text-xs font-bold mt-0.5 uppercase tracking-wider" style={{ color: '#38bdf8' }}>{s.role}</div>
                </div>
              </div>
            )}

            <p className="text-xs leading-relaxed px-4 pt-2 flex-1" style={{ color: '#6b7280' }}>{s.bio}</p>

            {/* Interrogate button */}
            <div className="px-4 pb-4 pt-3">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: hasFlagged ? '0 0 18px rgba(239,68,68,0.2)' : '0 0 14px rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onInterrogate(s)}
                disabled={!hasInterrogation}
                className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-widest"
                style={{
                  background: hasFlagged
                    ? 'rgba(239,68,68,0.1)'
                    : hasInterrogation
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(255,255,255,0.02)',
                  border: hasFlagged
                    ? '1px solid rgba(239,68,68,0.25)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: hasInterrogation ? (hasFlagged ? '#f87171' : '#9ca3af') : '#374151',
                  cursor: hasInterrogation ? 'pointer' : 'default',
                }}
              >
                {!hasInterrogation
                  ? 'No questions on file'
                  : askedCount === 0
                    ? '🎙 Interrogate'
                    : `🎙 Interrogate (${askedCount}/${s.interrogation!.length})`}
              </motion.button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(56,145,166,0.2), transparent)' }} />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Board
// ─────────────────────────────────────────────────────────────────────────────
function TimelineBoard({ events }: { events: TimelineEvent[] }) {
  const [order, setOrder] = useState<TimelineEvent[]>(() => [...events].sort(() => Math.random() - 0.5));
  const [dragging, setDragging] = useState<number | null>(null);

  const onDragStart = (i: number) => setDragging(i);
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragging === null || dragging === i) return;
    const next = [...order]; const [mv] = next.splice(dragging, 1); next.splice(i, 0, mv);
    setOrder(next); setDragging(i);
  };

  return (
    <div className="p-4">
      <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#4b5563' }}>
        Reconstruct the chronological order — drag to rearrange
      </p>
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden" animate="show"
        className="space-y-2"
      >
        {order.map((evt, i) => (
          <motion.div
            key={evt.id}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={() => setDragging(null)}
            className="flex items-center gap-3 rounded-xl p-3 cursor-grab active:cursor-grabbing select-none"
            style={{
              background: dragging === i ? 'rgba(56,145,166,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${dragging === i ? 'rgba(56,145,166,0.35)' : 'rgba(255,255,255,0.07)'}`,
              transition: 'background 0.15s, border-color 0.15s',
            }}
            whileHover={{ x: 2 }}
          >
            <span style={{ color: '#374151', fontSize: 16 }}>⠿</span>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0"
              style={{ background: 'rgba(253,231,76,0.08)', color: '#FDE74C', border: '1px solid rgba(253,231,76,0.2)', minWidth: 72, textAlign: 'center' }}>
              {evt.time}
            </span>
            <span className="text-xs flex-1" style={{ color: '#d1d5db' }}>{evt.description}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notes Board
// ─────────────────────────────────────────────────────────────────────────────
function NotesBoard({ notes, onChange }: { notes: string; onChange: (v: string) => void }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#4b5563' }}>
          Investigator&apos;s private notes
        </p>
        <span className="text-xs" style={{ color: '#374151' }}>auto-saved locally</span>
      </div>
      <textarea
        value={notes}
        onChange={e => onChange(e.target.value)}
        className="w-full h-64 rounded-xl p-4 text-sm resize-none focus:outline-none"
        style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#d1d5db',
          lineHeight: 1.8,
          fontFamily: 'ui-monospace, monospace',
          caretColor: '#f87171',
        }}
        placeholder="Record your observations, theories, and connections here…"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Partial Score Bar
// ─────────────────────────────────────────────────────────────────────────────
function PartialScoreBar({ score }: { score: PartialScore }) {
  const tumblers = [
    { label: 'Suspect',  correct: score.suspect },
    { label: 'Method',   correct: score.mechanism },
    ...Array.from({ length: score.evidenceRequired }, (_, i) => ({
      label: `Evidence ${i + 1}`,
      correct: i < score.evidenceMatches,
    })),
  ];

  return (
    <div className="mx-4 mt-4 rounded-xl p-4"
      style={{ background: 'rgba(253,231,76,0.04)', border: '1px solid rgba(253,231,76,0.15)' }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#FDE74C88' }}>
        Last Accusation Result
      </p>
      <div className="flex flex-wrap gap-2">
        {tumblers.map((t, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 300 }}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{
              background: t.correct ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${t.correct ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.2)'}`,
              color: t.correct ? '#34d399' : '#f87171',
            }}
          >
            <span className="text-base">{t.correct ? '✓' : '✗'}</span>
            <span style={{ fontSize: 8 }}>{t.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Case Timer
// ─────────────────────────────────────────────────────────────────────────────
function CaseTimer({ timeLeft }: { timeLeft: number }) {
  const mins    = Math.floor(timeLeft / 60);
  const secs    = timeLeft % 60;
  const pct     = Math.min(1, timeLeft / PUZZLE_TIME_SECONDS);
  const urgent  = timeLeft <= 120;
  const warning = timeLeft > 120 && timeLeft <= 300;
  const color    = urgent ? '#f87171' : warning ? '#FDE74C' : '#6b7280';
  const barColor = urgent ? '#f87171' : warning ? '#FDE74C' : '#34d399';
  const bg = urgent ? 'rgba(239,68,68,0.07)' : warning ? 'rgba(253,231,76,0.05)' : 'rgba(255,255,255,0.02)';
  const border = urgent ? 'rgba(239,68,68,0.25)' : warning ? 'rgba(253,231,76,0.18)' : 'rgba(255,255,255,0.06)';

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="my-2 rounded-xl overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          {urgent ? (
            <motion.span
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ repeat: Infinity, duration: 0.55 }}
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#f87171' }}
            >⏱ Time Critical</motion.span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>⏱ Case Timer</span>
          )}
          <span className="text-xs hidden sm:inline" style={{ color: '#374151' }}>wrong accusation −2:00</span>
        </div>
        <motion.span
          animate={urgent ? { scale: [1, 1.08, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.55 }}
          className="font-extrabold text-xl"
          style={{ color, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
        >
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </motion.span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          style={{ height: '100%', background: barColor, originX: 0 }}
          animate={{ scaleX: pct }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene Board
// ─────────────────────────────────────────────────────────────────────────────
function SceneBoard({ imageUrl }: { imageUrl: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: '50%', y: '50%' });

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
      const yPct = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%';
      setOrigin({ x: xPct, y: yPct });
    }
    setZoomed(z => !z);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#4b5563' }}>
          Crime Scene Overview
        </p>
        <span className="text-xs" style={{ color: '#374151' }}>
          {zoomed ? 'Click to zoom out' : 'Click image to zoom in'}
        </span>
      </div>

      <motion.div
        onClick={handleClick}
        className="relative rounded-xl overflow-hidden"
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: zoomed ? 'zoom-out' : 'zoom-in',
          maxHeight: zoomed ? '70vh' : 480,
          overflow: 'hidden',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          animate={{ scale: zoomed ? 2 : 1 }}
          style={{ transformOrigin: `${origin.x} ${origin.y}` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Crime scene"
            className="w-full block select-none"
            draggable={false}
          />
        </motion.div>

        {!zoomed && (
          <div
            className="absolute inset-0 flex items-end pb-4 justify-center pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.45))' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.5)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
              \uD83D\uDD0D Click anywhere to zoom
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Failed Screen
// ─────────────────────────────────────────────────────────────────────────────
function FailedScreen({ caseTitle, onRetry }: { caseTitle: string; onRetry: () => void }) {
  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      initial="hidden" animate="show"
      className="p-4 space-y-4"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1 } }}
        className="rounded-2xl p-8 text-center relative overflow-hidden"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.08), transparent 70%)' }} />
        <motion.div
          initial={{ scale: 0, rotate: 20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="text-5xl mb-4"
        >⏱</motion.div>
        <h3 className="text-2xl font-extrabold mb-3" style={{ color: '#f87171' }}>Case Expired</h3>
        <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: '#6b7280' }}>
          Evidence in <span className="text-white font-semibold">{caseTitle}</span> was destroyed.
          The investigation window has closed.
        </p>
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(239,68,68,0.2)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          className="px-8 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
        >
          Retry Investigation
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Solved Screen
// ─────────────────────────────────────────────────────────────────────────────
function SolvedScreen({ retentionUnlock, caseTitle }: { retentionUnlock: string | null; caseTitle: string }) {
  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      initial="hidden" animate="show"
      className="p-4 space-y-4"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1 } }}
        className="rounded-2xl p-8 text-center relative overflow-hidden"
        style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.08), transparent 70%)' }} />
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="text-5xl mb-4"
        >⚖</motion.div>
        <h3 className="text-2xl font-extrabold mb-3" style={{ color: '#34d399' }}>Case Closed</h3>
        <p className="text-sm max-w-sm mx-auto" style={{ color: '#6b7280' }}>
          Your accusation in <span className="text-white font-semibold">{caseTitle}</span> was
          correct. The record has been sealed.
        </p>
      </motion.div>

      {retentionUnlock && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'rgba(253,231,76,0.04)', border: '1px solid rgba(253,231,76,0.18)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(253,231,76,0.4), transparent)' }} />
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#FDE74C' }}>
            🗝 Sealed Evidence — Unlocked
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#d1d5db', fontFamily: 'ui-monospace, monospace' }}>
            {retentionUnlock}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interrogation Modal
// ─────────────────────────────────────────────────────────────────────────────
function InterrogationModal({
  suspect,
  revealedAnswers,
  onReveal,
  onClose,
}: {
  suspect: SuspectProfile;
  revealedAnswers: Set<string>;
  onReveal: (id: string) => void;
  onClose: () => void;
}) {
  const questions = suspect.interrogation ?? [];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl flex flex-col relative"
        style={{
          background: 'linear-gradient(145deg, #060202, #0e0404)',
          border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 0 80px rgba(239,68,68,0.06), 0 24px 64px rgba(0,0,0,0.75)',
        }}
      >
        {/* top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)' }} />

        {/* header */}
        <div className="flex items-start justify-between p-5"
          style={{ borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
          <div className="flex items-center gap-3">
            {suspect.photoUrl ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"
                style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={suspect.photoUrl} alt={suspect.name} className="w-full h-full object-cover object-top" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                👤
              </div>
            )}
            <div>
              <div className="font-bold text-white text-base">{suspect.name}</div>
              <div className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: '#f87171' }}>
                {suspect.role}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                {questions.length > 0
                  ? `${questions.filter(q => revealedAnswers.has(q.id)).length}/${questions.length} questions asked`
                  : 'No questions on file'}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, color: '#fff' }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{ color: '#4b5563', fontSize: 20, lineHeight: 1, marginTop: 2 }}
          >✕</motion.button>
        </div>

        {/* Q&A list */}
        <div className="p-5 flex-1 space-y-3">
          {questions.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: '#374151' }}>
              This subject has declined to answer any questions.
            </p>
          )}

          {questions.map((q, i) => {
            const revealed = revealedAnswers.has(q.id);
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl overflow-hidden"
                style={{
                  border: `1px solid ${revealed ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  background: revealed ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                }}
              >
                {/* Question row */}
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest shrink-0 mt-0.5"
                    style={{ color: '#4b5563' }}>Q{i + 1}</span>
                  <p className="text-sm flex-1" style={{ color: '#d1d5db' }}>{q.question}</p>
                  {q.isFlaggedAnswer && revealed && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                      title="Suspicious answer"
                      className="text-sm shrink-0"
                    >🚩</motion.span>
                  )}
                </div>

                {/* Answer area */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <AnimatePresence>
                    {revealed ? (
                      <motion.div
                        key="answer"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="px-4 py-3 flex items-start gap-3"
                      >
                        <span className="text-xs font-bold uppercase tracking-widest shrink-0 mt-0.5"
                          style={{ color: '#f87171' }}>A</span>
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af', fontFamily: 'ui-monospace, monospace' }}>
                          {q.answer}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="ask-btn"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="px-4 py-2.5"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: '0 0 14px rgba(239,68,68,0.15)' }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onReveal(q.id)}
                          className="w-full py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest"
                          style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171',
                          }}
                        >
                          Ask Question
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* bottom accent */}
        <div className="h-px mx-5 mb-5"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.15), transparent)' }} />
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Corkboard
// ─────────────────────────────────────────────────────────────────────────────
const CORK_TAG_STYLE: Record<NonNullable<CorkTag>, { bg: string; border: string; color: string; label: string }> = {
  'key':         { bg: 'rgba(253,231,76,0.14)',  border: 'rgba(253,231,76,0.4)',  color: '#FDE74C', label: '🔑 Key' },
  'suspicious':  { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)', color: '#f87171', label: '⚠ Suspicious' },
  'red-herring': { bg: 'rgba(107,114,128,0.1)',  border: 'rgba(107,114,128,0.3)',color: '#6b7280', label: '✗ Red Herring' },
};

function CorkboardBoard({
  evidence, examinedIds, linkedPairs, cardPositions, setCardPositions, cardTags, setCardTags, onOpen,
}: {
  evidence: EvidenceItem[];
  examinedIds: Set<string>;
  linkedPairs: [string, string][];
  cardPositions: Record<string, { x: number; y: number }>;
  setCardPositions: (p: Record<string, { x: number; y: number }>) => void;
  cardTags: Record<string, CorkTag>;
  setCardTags: (t: Record<string, CorkTag>) => void;
  onOpen: (item: EvidenceItem) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tagMenuFor, setTagMenuFor] = useState<string | null>(null);
  const [positions, setPositions]   = useState<Record<string, { x: number; y: number }>>({});

  // Auto-layout new cards into a grid on first mount
  useEffect(() => {
    const initial: Record<string, { x: number; y: number }> = {};
    evidence.forEach((item, i) => {
      if (cardPositions[item.id]) {
        initial[item.id] = cardPositions[item.id];
      } else {
        const col = i % 4;
        const row = Math.floor(i / 4);
        initial[item.id] = { x: 20 + col * 170, y: 20 + row * 130 };
      }
    });
    setPositions(initial);
  }, []); // eslint-disable-line

  const updatePosition = (id: string, x: number, y: number) => {
    const next = { ...positions, [id]: { x, y } };
    setPositions(next);
    setCardPositions(next);
  };

  const setTag = (id: string, tag: CorkTag) => {
    setCardTags({ ...cardTags, [id]: tag });
    setTagMenuFor(null);
  };

  const CARD_W = 148;
  const CARD_H = 90;

  // Build center positions for SVG lines
  const center = (id: string) => {
    const p = positions[id];
    if (!p) return null;
    return { x: p.x + CARD_W / 2, y: p.y + CARD_H / 2 };
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#4b5563' }}>
          Evidence Corkboard — drag cards · right-click to tag
        </p>
        <span className="text-xs" style={{ color: '#374151' }}>{linkedPairs.length} connection{linkedPairs.length !== 1 ? 's' : ''}</span>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden select-none"
        style={{
          height: 540,
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(120,80,40,0.18) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 70%, rgba(90,60,30,0.14) 0%, transparent 60%),
            repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(0,0,0,0.04) 22px, rgba(0,0,0,0.04) 23px),
            repeating-linear-gradient(90deg, transparent, transparent 22px, rgba(0,0,0,0.04) 22px, rgba(0,0,0,0.04) 23px),
            linear-gradient(145deg, #1a0f08, #130b05)
          `,
          border: '1px solid rgba(120,80,40,0.25)',
        }}
        onClick={() => setTagMenuFor(null)}
      >
        {/* SVG string lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <filter id="string-blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
            </filter>
          </defs>
          {linkedPairs.map(([a, b]) => {
            const ca = center(a);
            const cb = center(b);
            if (!ca || !cb) return null;
            const mx = (ca.x + cb.x) / 2;
            const my = (ca.y + cb.y) / 2 - 20;
            return (
              <g key={`${a}-${b}`}>
                {/* shadow */}
                <path
                  d={`M ${ca.x} ${ca.y} Q ${mx} ${my} ${cb.x} ${cb.y}`}
                  stroke="rgba(0,0,0,0.4)" strokeWidth="3" fill="none"
                  filter="url(#string-blur)" strokeOpacity="0.6"
                />
                {/* string */}
                <path
                  d={`M ${ca.x} ${ca.y} Q ${mx} ${my} ${cb.x} ${cb.y}`}
                  stroke="#dc2626" strokeWidth="1.5" fill="none"
                  strokeOpacity="0.65" strokeDasharray="5 3"
                />
              </g>
            );
          })}
        </svg>

        {/* Cards */}
        {evidence.map((item) => {
          const pos = positions[item.id];
          if (!pos) return null;
          const examined = examinedIds.has(item.id);
          const tag      = cardTags[item.id] ?? null;
          const tagStyle = tag ? CORK_TAG_STYLE[tag] : null;
          const color    = TYPE_COLOR[item.type];

          return (
            <motion.div
              key={item.id}
              drag
              dragMomentum={false}
              dragElastic={0}
              dragConstraints={containerRef}
              initial={false}
              animate={{ x: pos.x, y: pos.y }}
              onDragEnd={(_, info) => {
                // info.point is viewport-relative; use offset from container
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const nx = Math.max(0, Math.min(rect.width - CARD_W, pos.x + info.offset.x));
                const ny = Math.max(0, Math.min(rect.height - CARD_H, pos.y + info.offset.y));
                updatePosition(item.id, nx, ny);
              }}
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: CARD_W,
                zIndex: 2,
                cursor: 'grab',
              }}
              whileDrag={{ scale: 1.05, zIndex: 10, cursor: 'grabbing' }}
              onContextMenu={e => { e.preventDefault(); setTagMenuFor(item.id); }}
            >
              {/* pin */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10"
                style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />

              <div
                className="rounded-lg overflow-hidden flex flex-col"
                style={{
                  height: CARD_H,
                  background: examined ? 'rgba(20,12,8,0.96)' : 'rgba(10,6,4,0.92)',
                  border: `1px solid ${examined ? color + '44' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.55)',
                }}
              >
                {/* card header */}
                <div className="flex items-center gap-1.5 px-2.5 py-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-base leading-none">{TYPE_ICON[item.type]}</span>
                  <span className="text-xs font-bold truncate flex-1" style={{ color: examined ? color : '#4b5563' }}>
                    {item.label}
                  </span>
                </div>

                {/* card body */}
                <div className="px-2.5 py-1.5 flex-1 flex flex-col justify-between">
                  <p className="text-xs line-clamp-2 leading-relaxed"
                    style={{ color: examined ? '#9ca3af' : '#374151' }}>
                    {examined ? item.summary : 'UNEXAMINED'}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    {tagStyle && (
                      <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: tagStyle.bg, border: `1px solid ${tagStyle.border}`, color: tagStyle.color, fontSize: 9 }}>
                        {tagStyle.label}
                      </span>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={e => { e.stopPropagation(); if (examined) onOpen(item); }}
                      className="text-xs ml-auto shrink-0"
                      style={{ color: examined ? '#38bdf8' : '#374151', cursor: examined ? 'pointer' : 'default' }}
                    >
                      {examined ? '↗ open' : '—'}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Tag context menu */}
              <AnimatePresence>
                {tagMenuFor === item.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.12 }}
                    onClick={e => e.stopPropagation()}
                    className="absolute left-0 z-20 rounded-xl overflow-hidden"
                    style={{
                      top: CARD_H + 8,
                      minWidth: 148,
                      background: '#0e0606',
                      border: '1px solid rgba(239,68,68,0.25)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                    }}
                  >
                    <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest"
                      style={{ color: '#4b5563', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      Tag Evidence
                    </div>
                    {(Object.entries(CORK_TAG_STYLE) as [NonNullable<CorkTag>, typeof CORK_TAG_STYLE[NonNullable<CorkTag>]][]).map(([key, s]) => (
                      <button
                        key={key}
                        onClick={() => setTag(item.id, key)}
                        className="w-full text-left px-3 py-2 text-xs font-bold"
                        style={{ color: s.color, background: tag === key ? s.bg : 'transparent' }}
                      >
                        {s.label}
                      </button>
                    ))}
                    {tag && (
                      <button
                        onClick={() => setTag(item.id, null)}
                        className="w-full text-left px-3 py-2.5 text-xs"
                        style={{ color: '#6b7280', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        ✕ Clear tag
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-center" style={{ color: '#374151' }}>
        Link evidence in the Evidence tab to draw connections · right-click a card to tag it
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence Viewer Modal
// ─────────────────────────────────────────────────────────────────────────────
function EvidenceViewerModal({
  item, allEvidence, discoveredLayers, contrastValue, setContrastValue,
  isZoomed, setIsZoomed, combineMode, setCombineMode, onClose, onLink, linkedPairs,
}: {
  item: EvidenceItem;
  allEvidence: EvidenceItem[];
  discoveredLayers: Set<string>;
  contrastValue: number;
  setContrastValue: (v: number) => void;
  isZoomed: boolean;
  setIsZoomed: (v: boolean) => void;
  combineMode: boolean;
  setCombineMode: (v: boolean) => void;
  onClose: () => void;
  onLink: (id: string) => void;
  linkedPairs: [string,string][];
}) {
  const color = TYPE_COLOR[item.type];
  const rgb   = hexToRgb(color);

  const contrastLayers = item.hiddenLayers?.filter(l => l.trigger === 'contrast') ?? [];
  const zoomLayers     = item.hiddenLayers?.filter(l => l.trigger === 'zoom')     ?? [];
  const linkedToThis   = linkedPairs.filter(([a,b]) => a===item.id||b===item.id).map(([a,b]) => a===item.id?b:a);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col relative"
        style={{
          background: 'linear-gradient(145deg, #060404, #0c0808)',
          border: `1px solid ${color}33`,
          boxShadow: `0 0 80px rgba(${rgb},0.08), 0 24px 64px rgba(0,0,0,0.7)`,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />

        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: `1px solid ${color}22` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `rgba(${rgb},0.1)`, border: `1px solid ${color}33` }}>
              {TYPE_ICON[item.type]}
            </div>
            <div>
              <div className="font-bold text-white">{item.label}</div>
              <div className="text-xs uppercase tracking-widest mt-0.5" style={{ color }}>
                {item.type.replace('_', ' ')}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, color: '#fff' }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{ color: '#4b5563', fontSize: 20, lineHeight: 1 }}
          >✕</motion.button>
        </div>

        <div className="p-5 flex-1 space-y-4">
          <EvidenceContentRenderer item={item} contrastValue={contrastValue} isZoomed={isZoomed} />

          {/* Supplementary image for non-photo evidence types */}
          {item.imageUrl && item.type !== 'photo' && (
            <div className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(255,255,255,0.03)', color: '#4b5563', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                \uD83D\uDDBC Attached Photo
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.label}
                className="w-full block object-cover"
                style={{
                  maxHeight: isZoomed ? 400 : 220,
                  filter: `contrast(${contrastValue}) brightness(${contrastValue > 2 ? 0.75 : 1})`,
                }}
              />
            </div>
          )}

          <AnimatePresence>
            {item.hiddenLayers?.filter(l => discoveredLayers.has(l.id)).map(layer => (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="rounded-xl p-4"
                style={{ background: 'rgba(253,231,76,0.06)', border: '1px solid rgba(253,231,76,0.25)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <motion.span
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ repeat: 2, duration: 0.4 }}
                    className="text-sm"
                  >⚡</motion.span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FDE74C' }}>
                    Discovery Unlocked
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#d1d5db', fontFamily: 'ui-monospace, monospace' }}>
                  {layer.revealText}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {contrastLayers.length > 0 && (
            <div className="space-y-2.5 rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest" style={{ color: '#4b5563' }}>
                  Contrast filter
                </label>
                <span className="text-xs font-bold" style={{ color: contrastValue > 2 ? '#FDE74C' : '#374151' }}>
                  {contrastValue > 2 ? 'Enhanced' : 'Normal'}
                </span>
              </div>
              <input
                type="range" min={1} max={3} step={0.05}
                value={contrastValue}
                onChange={e => setContrastValue(parseFloat(e.target.value))}
                className="w-full h-1.5"
                style={{ accentColor: '#FDE74C' }}
              />
              <p className="text-xs" style={{ color: '#374151' }}>Push right to reveal hidden markings</p>
            </div>
          )}

          {zoomLayers.length > 0 && zoomLayers.some(l => !discoveredLayers.has(l.id)) && (
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(56,189,248,0.15)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsZoomed(true)}
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest"
              style={{
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.2)',
                color: '#38bdf8',
              }}
            >🔍 Examine Closely</motion.button>
          )}

          {allEvidence.length > 1 && (
            combineMode ? (
              <div className="rounded-xl p-4 space-y-3"
                style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)' }}>
                <p className="text-xs uppercase tracking-widest" style={{ color: '#a78bfa' }}>
                  Link with another item:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {allEvidence.filter(e => e.id !== item.id).map(e => {
                    const al = linkedPairs.some(([a,b]) => (a===item.id&&b===e.id)||(a===e.id&&b===item.id));
                    return (
                      <motion.button
                        key={e.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onLink(e.id)}
                        disabled={al}
                        className="text-left px-3 py-2 rounded-lg text-xs disabled:opacity-40"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${al ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
                          color: al ? '#34d399' : '#d1d5db',
                        }}
                      >
                        {TYPE_ICON[e.type]} {e.label} {al && '🔗'}
                      </motion.button>
                    );
                  })}
                </div>
                <button onClick={() => setCombineMode(false)}
                  className="text-xs hover:text-white transition-colors" style={{ color: '#4b5563' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCombineMode(true)}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest"
                style={{
                  background: 'rgba(167,139,250,0.07)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  color: '#a78bfa',
                }}
              >
                🔗 Link with another evidence item
                {linkedToThis.length > 0 && (
                  <span className="ml-2" style={{ color: '#34d399' }}>({linkedToThis.length} linked)</span>
                )}
              </motion.button>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence Content Renderer
// ─────────────────────────────────────────────────────────────────────────────
function EvidenceContentRenderer({ item, contrastValue, isZoomed }: {
  item: EvidenceItem; contrastValue: number; isZoomed: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    filter: `contrast(${contrastValue}) brightness(${contrastValue > 2 ? 0.75 : 1})`,
    transform: isZoomed ? 'scale(1.14)' : 'scale(1)',
    transformOrigin: 'top left',
    transition: 'filter 0.12s, transform 0.25s',
  };

  if (item.type === 'document' || item.type === 'record') {
    return (
      <div className="rounded-xl p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-auto"
        style={{
          ...baseStyle,
          background: 'rgba(240,235,225,0.03)',
          border: '1px solid rgba(240,235,225,0.08)',
          color: '#b8b4ae',
          maxHeight: isZoomed ? 520 : 300,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.02) 23px, rgba(255,255,255,0.02) 24px)',
        }}>
        {item.content}
      </div>
    );
  }

  if (item.type === 'chat_log') {
    const lines = item.content.split('\n');
    return (
      <div className="rounded-xl p-4 space-y-2 overflow-auto"
        style={{ ...baseStyle, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(167,139,250,0.15)', maxHeight: isZoomed ? 520 : 300 }}>
        {lines.map((line, i) => {
          const isSystem = line.startsWith('[');
          const ci       = line.indexOf(':');
          const sender   = ci > 0 ? line.slice(0, ci) : '';
          const msg      = ci > 0 ? line.slice(ci + 1).trim() : line;
          return (
            <div key={i} className={`text-xs ${isSystem ? 'text-center' : 'flex gap-2'}`}>
              {!isSystem && sender && (
                <span className="font-bold shrink-0" style={{ color: '#a78bfa' }}>{sender}:</span>
              )}
              <span style={{ color: isSystem ? '#374151' : '#c4b5fd' }}>{msg}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (item.type === 'photo') {
    return (
      <div className="rounded-xl overflow-hidden" style={{ ...baseStyle, border: '1px solid rgba(56,189,248,0.2)' }}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.label}
            className="w-full object-cover block"
            style={{ maxHeight: isZoomed ? 520 : 320 }}
          />
        ) : (
          <div className="w-full flex items-center justify-center"
            style={{ height: isZoomed ? 200 : 130, background: 'rgba(56,189,248,0.05)' }}>
            <div className="text-center">
              <div className="text-4xl mb-2">🖼</div>
              <div className="text-xs" style={{ color: '#4b5563' }}>{item.label}</div>
            </div>
          </div>
        )}
        {item.content && (
          <div className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap"
            style={{ color: '#6b7280', background: 'rgba(0,0,0,0.3)' }}>
            {item.content}
          </div>
        )}
      </div>
    );
  }

  if (item.type === 'audio_log') {
    return (
      <div className="rounded-xl p-5"
        style={{ ...baseStyle, background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.15)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
            style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.2)' }}>🎙</div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fb7185' }}>Audio Transcript</div>
            <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{item.label}</div>
          </div>
        </div>
        <div className="flex items-end gap-px h-8 mb-4">
          {Array.from({ length: 48 }, (_, i) => (
            <motion.div
              key={i}
              animate={{ scaleY: [1, 1.4 + Math.random() * 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 + Math.random() * 0.6, delay: i * 0.03 }}
              style={{
                width: 3,
                height: `${16 + Math.sin(i * 0.9) * 10 + Math.cos(i * 1.4) * 6}px`,
                background: 'rgba(251,113,133,0.5)',
                borderRadius: 1,
                transformOrigin: 'bottom',
              }}
            />
          ))}
        </div>
        <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: '#c4b5fd' }}>
          {item.content}
        </p>
      </div>
    );
  }

  return <div className="text-sm font-mono" style={{ color: '#d1d5db' }}>{item.content}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Accusation Modal
// ─────────────────────────────────────────────────────────────────────────────
function AccusationModal({
  suspects, evidence, mechanisms,
  suspectId, setSuspectId, mechanism, setMechanism,
  evidenceIds, toggleEvidence, onClose, onSubmit, submitting, result,
}: {
  suspects: SuspectProfile[];
  evidence: EvidenceItem[];
  mechanisms: string[];
  suspectId: string; setSuspectId: (v: string) => void;
  mechanism: string; setMechanism: (v: string) => void;
  evidenceIds: Set<string>; toggleEvidence: (id: string) => void;
  onClose: () => void; onSubmit: () => void; submitting: boolean;
  result: { correct: boolean; partialScore: PartialScore; retentionUnlock?: string | null } | null;
}) {
  const [step, setStep] = useState(1);
  const canSubmit = suspectId && mechanism && evidenceIds.size > 0 && !submitting;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto flex flex-col rounded-t-3xl sm:rounded-2xl"
        style={{
          background: 'linear-gradient(160deg, #1c0f0f, #261212)',
          border: '1px solid rgba(239,68,68,0.4)',
          boxShadow: '0 -8px 60px rgba(239,68,68,0.12), 0 0 80px rgba(0,0,0,0.7)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>

        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">⚖</span>
            <div>
              <div className="font-bold text-white text-base">File Accusation</div>
              {!result?.correct && (
                <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Step {step} of 3</div>
              )}
            </div>
          </div>
          {!result?.correct && (
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{ color: '#4b5563', fontSize: 20 }}
            >✕</motion.button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {result?.correct ? (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260 }}
              className="text-center py-8 space-y-4"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ repeat: 2, duration: 0.5, delay: 0.3 }}
                className="text-6xl"
              >⚖</motion.div>
              <h3 className="text-2xl font-extrabold" style={{ color: '#34d399' }}>Accusation Accepted</h3>
              <p className="text-sm max-w-xs mx-auto" style={{ color: '#6b7280' }}>
                Your evidence chain was airtight. The case is closed.
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="mt-2 px-8 py-2.5 rounded-xl font-bold text-sm inline-block"
                style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }}
              >Close</motion.button>
            </motion.div>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                {[1,2,3].map(s => (
                  <div key={s} className="h-0.5 flex-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: s <= step ? '#f87171' : 'transparent' }}
                      initial={{ width: 0 }} animate={{ width: s <= step ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                ))}
              </div>

              {/* Step 1 – Suspect */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: step >= 1 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)', color: step >= 1 ? '#f87171' : '#4b5563' }}>
                    1
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>
                    Principal Suspect
                  </span>
                </div>
                <div className="space-y-2">
                  {suspects.map(s => (
                    <motion.label
                      key={s.id}
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-3 rounded-xl p-3 cursor-pointer"
                      style={{
                        background: suspectId === s.id ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${suspectId === s.id ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.12)'}`,
                        color: '#e5e7eb',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onClick={() => { setSuspectId(s.id); setStep(Math.max(step, 2)); }}
                    >
                      <input type="radio" name="suspect" value={s.id}
                        checked={suspectId === s.id} onChange={() => setSuspectId(s.id)}
                        className="accent-red-500 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">{s.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{s.role}</div>
                      </div>
                      {suspectId === s.id && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="ml-auto text-xs font-bold" style={{ color: '#f87171' }}>✓</motion.span>
                      )}
                    </motion.label>
                  ))}
                </div>
              </div>

              {/* Step 2 – Mechanism */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: step >= 2 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)', color: step >= 2 ? '#f87171' : '#4b5563' }}>
                    2
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>Mechanism</span>
                </div>
                <select
                  value={mechanism}
                  onChange={e => { setMechanism(e.target.value); setStep(Math.max(step, 3)); }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${mechanism ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    color: mechanism ? '#f3f4f6' : '#9ca3af',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <option value="">Select the method used…</option>
                  {mechanisms.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Step 3 – Evidence chain */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: step >= 3 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)', color: step >= 3 ? '#f87171' : '#4b5563' }}>
                    3
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>Evidence Chain</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {evidence.map(e => {
                    const sel = evidenceIds.has(e.id);
                    return (
                      <motion.label
                        key={e.id}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 rounded-xl p-2.5 cursor-pointer text-xs"
                        style={{
                          background: sel ? 'rgba(253,231,76,0.14)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${sel ? 'rgba(253,231,76,0.4)' : 'rgba(255,255,255,0.12)'}`,
                          color: sel ? '#FDE74C' : '#d1d5db',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        <input type="checkbox" checked={sel}
                          onChange={() => toggleEvidence(e.id)}
                          className="accent-yellow-400 shrink-0" />
                        {TYPE_ICON[e.type]} {e.label}
                      </motion.label>
                    );
                  })}
                </div>
              </div>

              {result && !result.correct && (
                <>
                  <PartialScoreBar score={result.partialScore} />
                  <motion.p
                    initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-semibold px-1"
                    style={{ color: '#fb7185' }}
                  >
                    ⏱ −2:00 removed from the clock
                  </motion.p>
                </>
              )}

              <motion.button
                whileHover={canSubmit ? { scale: 1.02, boxShadow: '0 0 32px rgba(239,68,68,0.25)' } : {}}
                whileTap={canSubmit ? { scale: 0.97 } : {}}
                onClick={onSubmit}
                disabled={!canSubmit}
                className="relative w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest overflow-hidden"
                style={{
                  background: canSubmit ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${canSubmit ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: canSubmit ? '#fca5a5' : '#4b5563',
                  transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-4 h-4 rounded-full inline-block"
                      style={{ border: '2px solid rgba(252,165,165,0.2)', borderTopColor: '#fca5a5' }}
                    />
                    Submitting…
                  </span>
                ) : 'File Accusation'}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
    : '255,255,255';
}
