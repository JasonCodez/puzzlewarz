import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { validateSameOrigin } from "@/lib/requestSecurity";
import { POST } from "./route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/requestSecurity", () => ({
  validateSameOrigin: jest.fn(),
}));

jest.mock("@/lib/notification-service", () => ({
  notifyTeamUpdate: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    teamInvite: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
  },
}));

describe("POST /api/teams/invitations/[id]", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedValidateSameOrigin = validateSameOrigin as jest.MockedFunction<typeof validateSameOrigin>;
  const mockedPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock };
    teamInvite: { findUnique: jest.Mock; update: jest.Mock };
    teamMember: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    team: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedValidateSameOrigin.mockReturnValue(null);
  });

  test("rejects accepting a self-submitted application through invitation endpoint", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "player@example.com" } } as any);
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: "u1", email: "player@example.com" });

    mockedPrisma.teamInvite.findUnique.mockResolvedValueOnce({
      id: "inv-1",
      teamId: "team-1",
      userId: "u1",
      invitedBy: "u1",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
    });

    const request = new NextRequest("http://localhost:3000/api/teams/invitations/inv-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitationId: "inv-1", action: "accept" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/application/i);
    expect(mockedPrisma.teamInvite.update).not.toHaveBeenCalled();
    expect(mockedPrisma.teamMember.create).not.toHaveBeenCalled();
  });
});
