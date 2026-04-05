const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const teamId = "cml4c0i0a0004m10kiupamfqq";

  // Delete all related data that doesn't cascade automatically
  await p.lobbyMessage.deleteMany({ where: { teamId } });

  // Everything else has onDelete: Cascade, but just be explicit
  await p.teamMember.deleteMany({ where: { teamId } });
  await p.teamInvite.deleteMany({ where: { teamId } });

  await p.team.delete({ where: { id: teamId } });

  console.log("Team 'Demo Team Escape (4)' and all related data deleted.");
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e); p.$disconnect(); process.exit(1); });
