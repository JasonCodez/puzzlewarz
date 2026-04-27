export type TeamMembershipWindow = {
  userId: string;
  joinedAt: Date;
};

export type TeamScoringProgressRow = {
  userId: string;
  solvedAt: Date | null;
  pointsEarned: number | null;
};

function toEpochMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function buildMembershipStartByUserId(
  members: TeamMembershipWindow[]
): Map<string, number> {
  const membershipStartByUserId = new Map<string, number>();

  for (const member of members) {
    const joinedAtMs = toEpochMs(member.joinedAt);
    const existing = membershipStartByUserId.get(member.userId);
    if (existing === undefined || joinedAtMs < existing) {
      membershipStartByUserId.set(member.userId, joinedAtMs);
    }
  }

  return membershipStartByUserId;
}

export function filterProgressByMembershipWindow<T extends TeamScoringProgressRow>(
  progressRows: T[],
  membershipStartByUserId: Map<string, number>
): T[] {
  return progressRows.filter((progress) => {
    if (!progress.solvedAt) return false;

    const joinedAtMs = membershipStartByUserId.get(progress.userId);
    if (joinedAtMs === undefined) return false;

    return toEpochMs(progress.solvedAt) >= joinedAtMs;
  });
}

export function indexProgressByUserId<T extends TeamScoringProgressRow>(
  progressRows: T[]
): Map<string, T[]> {
  const progressByUserId = new Map<string, T[]>();

  for (const progress of progressRows) {
    const rows = progressByUserId.get(progress.userId) ?? [];
    rows.push(progress);
    progressByUserId.set(progress.userId, rows);
  }

  return progressByUserId;
}

export function summarizeProgressRows<T extends Pick<TeamScoringProgressRow, "pointsEarned">>(
  progressRows: T[]
): { totalPoints: number; totalSolved: number } {
  return {
    totalPoints: progressRows.reduce((sum, row) => sum + (row.pointsEarned ?? 0), 0),
    totalSolved: progressRows.length,
  };
}

export function aggregateTeamScoreFromMembershipWindow<T extends TeamScoringProgressRow>(
  members: TeamMembershipWindow[],
  progressByUserId: Map<string, T[]>
): { totalPoints: number; totalSolved: number } {
  let totalPoints = 0;
  let totalSolved = 0;

  for (const member of members) {
    const joinedAtMs = toEpochMs(member.joinedAt);
    const memberProgressRows = progressByUserId.get(member.userId) ?? [];

    for (const progress of memberProgressRows) {
      if (!progress.solvedAt) continue;
      if (toEpochMs(progress.solvedAt) < joinedAtMs) continue;

      totalPoints += progress.pointsEarned ?? 0;
      totalSolved += 1;
    }
  }

  return { totalPoints, totalSolved };
}
