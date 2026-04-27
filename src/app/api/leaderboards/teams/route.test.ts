import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { GET } from "./route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    team: {
      findMany: jest.fn(),
    },
    userPuzzleProgress: {
      findMany: jest.fn(),
    },
  },
}));

describe("GET /api/leaderboards/teams", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedPrisma = prisma as unknown as {
    team: { findMany: jest.Mock };
    userPuzzleProgress: { findMany: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 401 when no authenticated user is present", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/leaderboards/teams");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("ranks teams using only solves earned after each member joined", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "player@example.com" } } as any);

    mockedPrisma.team.findMany.mockResolvedValueOnce([
      {
        id: "team-alpha",
        name: "Alpha",
        isPublic: true,
        members: [
          {
            userId: "u1",
            joinedAt: new Date("2026-01-10T00:00:00.000Z"),
            user: { teamBannerColor: "none" },
          },
          {
            userId: "u2",
            joinedAt: new Date("2026-01-20T00:00:00.000Z"),
            user: { teamBannerColor: "gold" },
          },
        ],
      },
      {
        id: "team-beta",
        name: "Beta",
        isPublic: false,
        members: [
          {
            userId: "u3",
            joinedAt: new Date("2026-01-15T00:00:00.000Z"),
            user: { teamBannerColor: "none" },
          },
        ],
      },
      {
        id: "team-empty",
        name: "Empty",
        isPublic: true,
        members: [],
      },
    ]);

    mockedPrisma.userPuzzleProgress.findMany.mockResolvedValueOnce([
      { userId: "u1", solvedAt: new Date("2026-01-05T00:00:00.000Z"), pointsEarned: 100 },
      { userId: "u1", solvedAt: new Date("2026-01-10T00:00:00.000Z"), pointsEarned: 200 },
      { userId: "u2", solvedAt: new Date("2026-01-19T00:00:00.000Z"), pointsEarned: 300 },
      { userId: "u2", solvedAt: new Date("2026-01-21T00:00:00.000Z"), pointsEarned: 150 },
      { userId: "u3", solvedAt: new Date("2026-01-16T00:00:00.000Z"), pointsEarned: 50 },
    ]);

    mockedPrisma.team.findMany.mockResolvedValueOnce([{ id: "team-beta" }]);

    const request = new NextRequest("http://localhost:3000/api/leaderboards/teams");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries).toEqual([
      {
        teamId: "team-alpha",
        teamName: "Alpha",
        isPublic: true,
        bannerColor: "gold",
        totalPoints: 350,
        totalPuzzlesSolved: 2,
        memberCount: 2,
        rank: 1,
      },
      {
        teamId: "team-beta",
        teamName: "Beta",
        isPublic: false,
        bannerColor: "none",
        totalPoints: 50,
        totalPuzzlesSolved: 1,
        memberCount: 1,
        rank: 2,
      },
    ]);

    expect(body.userTeamRank).toEqual({
      teamId: "team-beta",
      teamName: "Beta",
      isPublic: false,
      bannerColor: "none",
      totalPoints: 50,
      totalPuzzlesSolved: 1,
      memberCount: 1,
      rank: 2,
    });

    expect(body.entries.find((entry: { teamId: string }) => entry.teamId === "team-empty")).toBeUndefined();
  });
});
