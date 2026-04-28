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
    },
    teamMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    teamInvite: {
      findMany: jest.fn(),
    },
  },
}));

describe("GET /api/teams/[id]/applications", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock };
    teamMember: { findUnique: jest.Mock; findMany: jest.Mock };
    teamInvite: { findMany: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns only self-submitted application rows", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "admin@example.com" } } as any);
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com" });

    mockedPrisma.teamMember.findUnique.mockResolvedValueOnce({
      teamId: "team-1",
      userId: "admin-1",
      role: "admin",
    });

    mockedPrisma.teamMember.findMany.mockResolvedValueOnce([]);

    mockedPrisma.teamInvite.findMany.mockResolvedValueOnce([
      {
        id: "app-1",
        teamId: "team-1",
        userId: "u-app",
        invitedBy: "u-app",
        status: "pending",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        user: { id: "u-app", name: "Applicant", email: "app@example.com", image: null },
      },
      {
        id: "inv-1",
        teamId: "team-1",
        userId: "u-inv",
        invitedBy: "admin-1",
        status: "pending",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        user: { id: "u-inv", name: "Invited User", email: "inv@example.com", image: null },
      },
    ]);

    const request = new NextRequest("http://localhost:3000/api/teams/team-1/applications");
    const response = await GET(request, { params: Promise.resolve({ id: "team-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("app-1");
  });
});
