// ─────────────────────────────────────────────────────────────────────────────
// Gridlock File — anonymous (guest) streak + state helpers
// All functions are client-safe: they guard against SSR with typeof window checks.
// ─────────────────────────────────────────────────────────────────────────────

export const ANON_ID_KEY           = 'gridlock_anon_id';
export const ANON_STREAK_KEY       = 'gridlock_streak';
export const ANON_SOLVED_KEY       = 'gridlock_solved';
export const ANON_NUDGE_KEY        = 'gridlock_nudge_dismissed'; // stringified Record<string, true>
export const ANON_PENDING_REWARDS  = 'gridlock_pending_rewards';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnonStreakState = {
  count: number;
  lastSolvedDate: string;     // YYYY-MM-DD
  arcId: string;              // e.g. 'arc-001'
  arcSolvedDays: number[];    // [1, 2, 3] sorted
  fragments: string[];        // retentionUnlock texts collected
  arcCompletedAt?: string;    // YYYY-MM-DD — set when all 7 days are solved
};

export type AnonSolvedRecord = {
  rank: string;
  elapsedSeconds: number;
  date: string;               // YYYY-MM-DD
  arcDay?: number;
  submissionCount?: number;
};

// ── Anon identity ─────────────────────────────────────────────────────────────

export function getAnonId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

// ── Streak ────────────────────────────────────────────────────────────────────

const EMPTY_STREAK: AnonStreakState = {
  count: 0,
  lastSolvedDate: '',
  arcId: 'arc-001',
  arcSolvedDays: [],
  fragments: [],
};

export function getAnonStreak(): AnonStreakState {
  if (typeof window === 'undefined') return { ...EMPTY_STREAK };
  try {
    const raw = localStorage.getItem(ANON_STREAK_KEY);
    if (!raw) return { ...EMPTY_STREAK };
    return { ...EMPTY_STREAK, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_STREAK };
  }
}

export function updateAnonStreak(
  current: AnonStreakState,
  arcDay: number,
  fragment?: string,
): AnonStreakState {
  const today     = todayStr();
  const yesterday = yesterdayStr();

  // Don't double-count a day already solved
  if (current.arcSolvedDays.includes(arcDay) && current.lastSolvedDate === today) {
    return current;
  }

  let newCount: number;
  if (current.lastSolvedDate === today) {
    newCount = current.count; // already counted today (different arc day)
  } else if (current.count === 0 || current.lastSolvedDate === yesterday) {
    newCount = current.count + 1;
  } else {
    newCount = 1; // streak broken
  }

  const newDays = current.arcSolvedDays.includes(arcDay)
    ? current.arcSolvedDays
    : [...current.arcSolvedDays, arcDay].sort((a, b) => a - b);

  const newFragments =
    fragment && !current.fragments.includes(fragment)
      ? [...current.fragments, fragment]
      : current.fragments;

  const arcCompletedAt =
    newDays.length === 7 && !current.arcCompletedAt ? today : current.arcCompletedAt;

  const next: AnonStreakState = {
    count: newCount,
    lastSolvedDate: today,
    arcId: current.arcId,
    arcSolvedDays: newDays,
    fragments: newFragments,
    arcCompletedAt,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(ANON_STREAK_KEY, JSON.stringify(next));
  }

  return next;
}

// ── Solved records ────────────────────────────────────────────────────────────

export function getAnonSolved(): Record<string, AnonSolvedRecord> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(ANON_SOLVED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function setAnonSolved(puzzleId: string, record: AnonSolvedRecord): void {
  if (typeof window === 'undefined') return;
  const existing = getAnonSolved();
  existing[puzzleId] = record;
  localStorage.setItem(ANON_SOLVED_KEY, JSON.stringify(existing));
}

// ── Nudge dismissed tracking ──────────────────────────────────────────────────

export function getNudgeDismissed(): Record<string, true> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(ANON_NUDGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function dismissNudge(key: string): void {
  if (typeof window === 'undefined') return;
  const existing = getNudgeDismissed();
  existing[key] = true;
  localStorage.setItem(ANON_NUDGE_KEY, JSON.stringify(existing));
}

// ── Streak helpers ────────────────────────────────────────────────────────────

export function isStreakAlive(lastSolvedDate: string): boolean {
  if (!lastSolvedDate) return false;
  return lastSolvedDate === todayStr() || lastSolvedDate === yesterdayStr();
}

export function isSolvedToday(lastSolvedDate: string): boolean {
  return lastSolvedDate === todayStr();
}

export function getSecondsUntilMidnight(): number {
  const now      = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

// ── XP estimates (for nudge copy) ────────────────────────────────────────────

export function estimateArcXp(solvedDays: number[]): number {
  // Base: 120 XP per file solved. Arc completion bonus: 240 XP.
  const base = solvedDays.length * 120;
  const bonus = solvedDays.length === 7 ? 240 : 0;
  return base + bonus;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

// ── Pending rewards (shown to guest until they create an account) ─────────────

export type PendingRewards = {
  xp: number;
  points: number;
  solves: number;    // how many puzzles contributed
  updatedAt: string; // ISO date
};

export function getPendingRewards(): PendingRewards {
  if (typeof window === 'undefined') return { xp: 0, points: 0, solves: 0, updatedAt: '' };
  try {
    return JSON.parse(localStorage.getItem(ANON_PENDING_REWARDS) ?? '{"xp":0,"points":0,"solves":0,"updatedAt":""}');
  } catch {
    return { xp: 0, points: 0, solves: 0, updatedAt: '' };
  }
}

export function addPendingRewards(xp: number, points: number): PendingRewards {
  if (typeof window === 'undefined') return { xp, points, solves: 1, updatedAt: new Date().toISOString() };
  const existing = getPendingRewards();
  const next: PendingRewards = {
    xp: existing.xp + xp,
    points: existing.points + points,
    solves: existing.solves + 1,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(ANON_PENDING_REWARDS, JSON.stringify(next));
  return next;
}

export function clearPendingRewards(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ANON_PENDING_REWARDS);
}
