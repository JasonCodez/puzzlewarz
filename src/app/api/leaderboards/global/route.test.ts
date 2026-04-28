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
    user: {
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

describe("GET /api/leaderboards/global", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedPrisma = prisma as unknown as {
    user: { findMany: jest.Mock };
    userSeasonPass: { findMany: jest.Mock };
    userPuzzleProgress: { groupBy: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 401 when user is not authenticated", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/leaderboards/global");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("uses solved progress rows for puzzlesSolved instead of deriving from points", async () => {
    mockedGetServerSession.mockResolvedValueOnce({
      user: { id: "u1", email: "player@example.com" },
    } as any);

    mockedPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: "u1",
        name: "Alpha",
        image: null,
        totalPoints: 220,
        purchasedPoints: 170,
        activeFlair: "none",
      },
      {
        id: "u2",
        name: "Beta",
        image: null,
        totalPoints: 130,
        purchasedPoints: 120,
        activeFlair: "none",
      },
    ]);

    mockedPrisma.userPuzzleProgress.groupBy.mockResolvedValueOnce([
      { userId: "u1", _count: { _all: 12 } },
      { userId: "u2", _count: { _all: 3 } },
    ]);

    mockedPrisma.userSeasonPass.findMany.mockResolvedValueOnce([]);

    const request = new NextRequest("http://localhost:3000/api/leaderboards/global");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries).toHaveLength(2);

    expect(body.entries[0]).toEqual(
      expect.objectContaining({
        userId: "u1",
        totalPoints: 50,
        puzzlesSolved: 12,
        rank: 1,
      })
    );

    expect(body.entries[1]).toEqual(
      expect.objectContaining({
        userId: "u2",
        totalPoints: 10,
        puzzlesSolved: 3,
        rank: 2,
      })
    );
  });
});
