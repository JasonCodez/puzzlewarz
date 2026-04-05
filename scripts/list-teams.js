const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const teams = await p.team.findMany({ select: { id: true, name: true } });
  console.log("All teams in DB:", JSON.stringify(teams, null, 2));
  console.log("Total:", teams.length);
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e); p.$disconnect(); });
