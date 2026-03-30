import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser, type AuthenticatedUser } from "@/lib/requireAuthenticatedUser";

export type RelayRole = "solver" | "decoder";

export type RelayParticipantContext = {
  currentUser: AuthenticatedUser;
  relay: {
    id: string;
    roomId: string;
    status: string;
    expiresAt: Date;
    solverUserId: string | null;
    decoderUserId: string | null;
  };
  role: RelayRole;
};

export async function requireRelayParticipant(
  roomId: string,
  options?: { requiredRole?: RelayRole }
): Promise<RelayParticipantContext | NextResponse> {
  const currentUser = await requireAuthenticatedUser();
  if (currentUser instanceof NextResponse) {
    return currentUser;
  }

  const relay = await prisma.relayRiddle.findUnique({
    where: { roomId },
    select: {
      id: true,
      roomId: true,
      status: true,
      expiresAt: true,
      solverUserId: true,
      decoderUserId: true,
    },
  });

  if (!relay) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const role = relay.solverUserId === currentUser.id
    ? "solver"
    : relay.decoderUserId === currentUser.id
      ? "decoder"
      : null;

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (options?.requiredRole && role !== options.requiredRole) {
    return NextResponse.json(
      { error: `Only the ${options.requiredRole} can perform this action` },
      { status: 403 }
    );
  }

  return { currentUser, relay, role };
}