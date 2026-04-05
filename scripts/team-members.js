const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const teamId = "cml4c0i0a0004m10kiupamfqq";
  const members = await p.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  console.log("Members:");
  for (const m of members) {
    console.log(` - [${m.role}] ${m.user?.name} <${m.user?.email}>`);
  }
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e); p.$disconnect(); });
