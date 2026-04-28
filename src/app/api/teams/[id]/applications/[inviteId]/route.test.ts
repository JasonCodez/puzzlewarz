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
    teamMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    teamInvite: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
  },
}));

describe("POST /api/teams/[id]/applications/[inviteId]", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedValidateSameOrigin = validateSameOrigin as jest.MockedFunction<typeof validateSameOrigin>;
  const mockedPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock };
    teamMember: { findUnique: jest.Mock; create: jest.Mock };
    teamInvite: { findUnique: jest.Mock; update: jest.Mock };
    team: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedValidateSameOrigin.mockReturnValue(null);
  });

  test("rejects processing leader-sent invitations as applications", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "admin@example.com" } } as any);
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com" });

    mockedPrisma.teamMember.findUnique.mockResolvedValueOnce({
      teamId: "team-1",
      userId: "admin-1",
      role: "admin",
    });

    mockedPrisma.teamInvite.findUnique.mockResolvedValueOnce({
      id: "inv-1",
      teamId: "team-1",
      userId: "u-inv",
      invitedBy: "admin-1",
      status: "pending",
    });

    const request = new NextRequest("http://localhost:3000/api/teams/team-1/applications/inv-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "team-1", inviteId: "inv-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invitation/i);
    expect(mockedPrisma.teamMember.create).not.toHaveBeenCalled();
    expect(mockedPrisma.teamInvite.update).not.toHaveBeenCalled();
  });
});
