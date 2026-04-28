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
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userPuzzleProgress: {
      count: jest.fn(),
    },
    teamMember: {
      count: jest.fn(),
    },
  },
}));

describe("GET /api/user/stats", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    userPuzzleProgress: { count: jest.Mock };
    teamMember: { count: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 401 when user is not authenticated", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/user/stats");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("returns solved count from solved progress rows, not from points", async () => {
    mockedGetServerSession.mockResolvedValueOnce({
      user: { email: "player@example.com" },
    } as any);

    mockedPrisma.user.findUnique.mockResolvedValueOnce({
      id: "u1",
      totalPoints: 180,
      purchasedPoints: 80,
    });

    mockedPrisma.userPuzzleProgress.count.mockResolvedValueOnce(14);
    mockedPrisma.teamMember.count.mockResolvedValueOnce(2);

    mockedPrisma.user.findMany.mockResolvedValueOnce([
      { id: "u1", totalPoints: 180, purchasedPoints: 80 },
      { id: "u2", totalPoints: 300, purchasedPoints: 0 },
    ]);

    const request = new NextRequest("http://localhost:3000/api/user/stats");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      totalPuzzlesSolved: 14,
      totalPoints: 100,
      currentTeams: 2,
      rank: 2,
    });
  });
});
