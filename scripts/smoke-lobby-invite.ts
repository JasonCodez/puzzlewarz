import { PrismaClient } from "@prisma/client";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@test.local';

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    console.error('Admin user not found:', adminEmail);
    await prisma.$disconnect();
    process.exit(1);
  }

  const membership = await prisma.teamMember.findFirst({ where: { userId: admin.id } });
  if (!membership) {
    console.error('Admin is not a member of any team');
    await prisma.$disconnect();
    process.exit(1);
  }
  const teamId = membership.teamId;

  const otherMember = await prisma.teamMember.findFirst({ where: { teamId, NOT: { userId: admin.id } }, include: { user: true } });
  if (!otherMember) {
    console.error('No other team member to invite');
    await prisma.$disconnect();
    process.exit(1);
  }

  const inviteeId = otherMember.userId;

  const puzzle = await prisma.puzzle.findFirst({ where: { isTeamPuzzle: true }, include: { parts: true } });
  if (!puzzle) {
    console.error('No team puzzle found');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('Admin:', admin.email, admin.id);
  console.log('Team:', teamId);
  console.log('Invitee:', otherMember.user.email, inviteeId);
  console.log('Puzzle:', puzzle.title, puzzle.id, 'parts:', (puzzle.parts || []).length);

  let teamInvite;
  try {
    teamInvite = await prisma.teamInvite.create({ data: { teamId, userId: inviteeId, invitedBy: admin.id, status: 'pending', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } });
    console.log('Created teamInvite:', teamInvite.id);
  } catch (e: any) {
    console.warn('TeamInvite create failed (maybe exists).', e.message || e);
    teamInvite = await prisma.teamInvite.findFirst({ where: { teamId, userId: inviteeId } });
    if (teamInvite) console.log('Existing invite id:', teamInvite.id);
  }

  const relatedId = `${teamId}::${puzzle.id}`;
  const notification = await prisma.notification.create({ data: { userId: inviteeId, type: 'team_lobby_invite', title: `Lobby invite from ${admin.name || admin.email}`, message: `You've been invited to join a lobby for '${puzzle.title}'. Click Join to go to the lobby.`, relatedId } });
  console.log('Created notification:', notification.id);

  try {
    const url = `http://localhost:3000/api/team/lobby?teamId=${encodeURIComponent(teamId)}&puzzleId=${encodeURIComponent(puzzle.id)}`;
    const res = await fetch(url);
    const json = await res.json();
    console.log('Lobby GET response:', JSON.stringify(json, null, 2));
  } catch (e: any) {
    console.error('Failed to fetch lobby GET:', e.message || e);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
