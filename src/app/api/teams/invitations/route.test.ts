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
    teamInvite: {
      findMany: jest.fn(),
    },
  },
}));

describe("GET /api/teams/invitations", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock };
    teamInvite: { findMany: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("filters out self-submitted applications from invitation list", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "player@example.com" } } as any);
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: "u1", email: "player@example.com" });
    mockedPrisma.teamInvite.findMany.mockResolvedValueOnce([]);

    const request = new NextRequest("http://localhost:3000/api/teams/invitations");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockedPrisma.teamInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          status: "pending",
          NOT: { invitedBy: "u1" },
        }),
      })
    );
  });
});
