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
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    follow: {
      findMany: jest.fn(),
    },
    userSeasonPass: {
      findMany: jest.fn(),
    },
    userPuzzleProgress: {
      groupBy: jest.fn(),
    },
  },
}));

describe("GET /api/leaderboards/following", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    follow: { findMany: jest.Mock };
    userSeasonPass: { findMany: jest.Mock };
    userPuzzleProgress: { groupBy: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 401 when user is not authenticated", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("uses solved progress rows for puzzlesSolved instead of deriving from points", async () => {
    mockedGetServerSession.mockResolvedValueOnce({
      user: { email: "player@example.com" },
    } as any);

    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: "u1" });
    mockedPrisma.follow.findMany.mockResolvedValueOnce([{ followingId: "u2" }]);

    mockedPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: "u1",
        name: "Alpha",
        image: null,
        totalPoints: 140,
        purchasedPoints: 130,
        activeFlair: "none",
      },
      {
        id: "u2",
        name: "Beta",
        image: null,
        totalPoints: 120,
        purchasedPoints: 110,
        activeFlair: "none",
      },
    ]);

    mockedPrisma.userPuzzleProgress.groupBy.mockResolvedValueOnce([
      { userId: "u1", _count: { _all: 11 } },
      { userId: "u2", _count: { _all: 7 } },
    ]);

    mockedPrisma.userSeasonPass.findMany.mockResolvedValueOnce([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries).toHaveLength(2);

    expect(body.entries[0]).toEqual(
      expect.objectContaining({
        userId: "u1",
        totalPoints: 10,
        puzzlesSolved: 11,
        isCurrentUser: true,
      })
    );

    expect(body.entries[1]).toEqual(
      expect.objectContaining({
        userId: "u2",
        totalPoints: 10,
        puzzlesSolved: 7,
      })
    );

    expect(body.userRank).toEqual(
      expect.objectContaining({
        userId: "u1",
        puzzlesSolved: 11,
      })
    );
  });
});
