const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const teams = await p.team.findMany({
    include: { members: { select: { userId: true } } },
  });

  let deleted = 0;
  for (const team of teams) {
    console.log(`"${team.name}" (${team.id}) — ${team.members.length} members`);
    if (team.members.length === 0) {
      await p.lobbyMessage.deleteMany({ where: { teamId: team.id } });
      await p.team.delete({ where: { id: team.id } });
      console.log(`  → Deleted`);
      deleted++;
    }
  }

  console.log(`\nDone. Deleted ${deleted} empty team(s).`);
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e); p.$disconnect(); process.exit(1); });
