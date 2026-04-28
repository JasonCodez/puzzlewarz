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

jest.mock("@/lib/levels", () => ({
  calcLevel: jest.fn(() => ({
    level: 6,
    title: "Cipher Adept",
    currentXp: 300,
    nextLevelXp: 450,
    progress: 67,
  })),
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
  },
}));

describe("GET /api/user/profile", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    userPuzzleProgress: { count: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 401 when user is not authenticated", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/user/profile");
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
      name: "Player One",
      email: "player@example.com",
      image: null,
      role: "user",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      xp: 300,
      level: 4,
      xpTitle: "Solver",
      activeTheme: "default",
      activeFrame: "none",
      activeSkin: "default",
      activeFlair: "none",
      activeNameColor: "none",
      activeTitle: "none",
      isFounder: false,
      totalPoints: 260,
      purchasedPoints: 160,
    });

    mockedPrisma.userPuzzleProgress.count.mockResolvedValueOnce(21);

    mockedPrisma.user.findMany.mockResolvedValueOnce([
      { id: "u2", totalPoints: 500, purchasedPoints: 0 },
      { id: "u1", totalPoints: 260, purchasedPoints: 160 },
    ]);

    const request = new NextRequest("http://localhost:3000/api/user/profile");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalPoints).toBe(100);
    expect(body.totalPuzzlesSolved).toBe(21);
    expect(body.rank).toBe(2);
  });
});
