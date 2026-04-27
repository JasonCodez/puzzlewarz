import {
  aggregateTeamScoreFromMembershipWindow,
  buildMembershipStartByUserId,
  filterProgressByMembershipWindow,
  indexProgressByUserId,
  summarizeProgressRows,
} from "./team-membership-scoring";

describe("buildMembershipStartByUserId", () => {
  test("keeps the earliest join timestamp per user", () => {
    const memberships = [
      { userId: "u1", joinedAt: new Date("2026-02-10T00:00:00.000Z") },
      { userId: "u2", joinedAt: new Date("2026-03-01T00:00:00.000Z") },
      { userId: "u1", joinedAt: new Date("2026-01-15T00:00:00.000Z") },
    ];

    const result = buildMembershipStartByUserId(memberships);

    expect(result.get("u1")).toBe(new Date("2026-01-15T00:00:00.000Z").getTime());
    expect(result.get("u2")).toBe(new Date("2026-03-01T00:00:00.000Z").getTime());
  });
});

describe("filterProgressByMembershipWindow", () => {
  test("includes only solves at or after membership start", () => {
    const membershipStarts = new Map<string, number>([
      ["u1", new Date("2026-01-10T00:00:00.000Z").getTime()],
      ["u2", new Date("2026-01-20T00:00:00.000Z").getTime()],
    ]);

    const progressRows = [
      { userId: "u1", solvedAt: new Date("2026-01-09T23:59:59.000Z"), pointsEarned: 100 },
      { userId: "u1", solvedAt: new Date("2026-01-10T00:00:00.000Z"), pointsEarned: 150 },
      { userId: "u2", solvedAt: null, pointsEarned: 200 },
      { userId: "u3", solvedAt: new Date("2026-02-01T00:00:00.000Z"), pointsEarned: 300 },
      { userId: "u2", solvedAt: new Date("2026-01-25T00:00:00.000Z"), pointsEarned: 250 },
    ];

    const filtered = filterProgressByMembershipWindow(progressRows, membershipStarts);

    expect(filtered).toEqual([
      { userId: "u1", solvedAt: new Date("2026-01-10T00:00:00.000Z"), pointsEarned: 150 },
      { userId: "u2", solvedAt: new Date("2026-01-25T00:00:00.000Z"), pointsEarned: 250 },
    ]);
  });
});

describe("indexProgressByUserId", () => {
  test("groups rows by user id while preserving row order", () => {
    const rows = [
      { userId: "u2", solvedAt: new Date("2026-02-01T00:00:00.000Z"), pointsEarned: 200 },
      { userId: "u1", solvedAt: new Date("2026-02-02T00:00:00.000Z"), pointsEarned: 100 },
      { userId: "u2", solvedAt: new Date("2026-02-03T00:00:00.000Z"), pointsEarned: 300 },
    ];

    const grouped = indexProgressByUserId(rows);

    expect(grouped.get("u1")).toEqual([
      { userId: "u1", solvedAt: new Date("2026-02-02T00:00:00.000Z"), pointsEarned: 100 },
    ]);
    expect(grouped.get("u2")).toEqual([
      { userId: "u2", solvedAt: new Date("2026-02-01T00:00:00.000Z"), pointsEarned: 200 },
      { userId: "u2", solvedAt: new Date("2026-02-03T00:00:00.000Z"), pointsEarned: 300 },
    ]);
  });
});

describe("summarizeProgressRows", () => {
  test("returns total points and solved count", () => {
    const summary = summarizeProgressRows([
      { pointsEarned: 100 },
      { pointsEarned: null },
      { pointsEarned: 250 },
    ]);

    expect(summary).toEqual({ totalPoints: 350, totalSolved: 3 });
  });
});

describe("aggregateTeamScoreFromMembershipWindow", () => {
  test("aggregates only qualifying solves for current members", () => {
    const members = [
      { userId: "u1", joinedAt: new Date("2026-01-10T00:00:00.000Z") },
      { userId: "u2", joinedAt: new Date("2026-01-20T00:00:00.000Z") },
    ];

    const allRows = [
      { userId: "u1", solvedAt: new Date("2026-01-09T00:00:00.000Z"), pointsEarned: 100 },
      { userId: "u1", solvedAt: new Date("2026-01-10T00:00:00.000Z"), pointsEarned: 150 },
      { userId: "u1", solvedAt: new Date("2026-01-12T00:00:00.000Z"), pointsEarned: 200 },
      { userId: "u2", solvedAt: new Date("2026-01-19T00:00:00.000Z"), pointsEarned: 300 },
      { userId: "u2", solvedAt: new Date("2026-01-25T00:00:00.000Z"), pointsEarned: 250 },
      { userId: "u2", solvedAt: null, pointsEarned: 999 },
      { userId: "u3", solvedAt: new Date("2026-01-30T00:00:00.000Z"), pointsEarned: 999 },
    ];

    const progressByUserId = indexProgressByUserId(allRows);
    const result = aggregateTeamScoreFromMembershipWindow(members, progressByUserId);

    expect(result).toEqual({
      totalPoints: 600,
      totalSolved: 3,
    });
  });
});
