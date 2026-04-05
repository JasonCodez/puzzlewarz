const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const team = await p.team.findFirst({
    where: { name: "Demo Team Escape" },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });

  if (!team) {
    console.log("Team not found in DB.");
    return;
  }

  console.log(`Team: ${team.name} (${team.id})`);
  console.log(`Members (${team.members.length}):`, JSON.stringify(team.members, null, 2));

  if (team.members.length === 0) {
    console.log("No members — deleting...");
    await p.lobbyMessage.deleteMany({ where: { teamId: team.id } });
    await p.team.delete({ where: { id: team.id } });
    console.log("Deleted.");
  } else {
    console.log("Team still has members, not deleting.");
  }
}

main()
  .then(() => p.$disconnect())
  .catch((e) => { console.error(e); p.$disconnect(); process.exit(1); });
