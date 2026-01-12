import { PrismaClient } from "@prisma/client";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test team lobby data...");

  // Create or get admin user
  const adminEmail = "admin@test.local";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({ data: { email: adminEmail, name: "Lobby Admin", role: "admin" } });
    console.log(`Created admin user: ${admin.id}`);
  }

  // Create or get member users
  const memberEmails = ["alice@test.local", "bob@test.local"];
  const members: any[] = [];
  for (const em of memberEmails) {
    let u = await prisma.user.findUnique({ where: { email: em } });
    if (!u) {
      u = await prisma.user.create({ data: { email: em, name: em.split("@")[0] } });
      console.log(`Created user: ${u.id} (${em})`);
    }
    members.push(u);
  }

  // Create or reuse team
  const teamName = "Test Team Lobby";
  let team = await prisma.team.findFirst({ where: { name: teamName } });
  if (!team) {
    team = await prisma.team.create({ data: { name: teamName, description: "Team for lobby testing", createdBy: admin.id } });
    console.log(`Created team: ${team.id}`);
  } else {
    console.log(`Reusing team: ${team.id}`);
  }

  // Ensure admin is team member with admin role
  try {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: admin.id } },
      update: { role: "admin" },
      create: { teamId: team.id, userId: admin.id, role: "admin" },
    });
  } catch (e) {
    console.error("Failed to upsert admin membership", e);
  }

  // Ensure other members are in the team
  for (const u of members) {
    try {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId: u.id } },
        update: {},
        create: { teamId: team.id, userId: u.id, role: "member" },
      });
    } catch (e) {
      console.error("Failed to upsert member", e);
    }
  }

  // Create a team puzzle with 3 parts (requires 3 players)
  const puzzleTitle = "Test Team Puzzle (3-player)";
  let puzzle = await prisma.puzzle.findFirst({ where: { title: puzzleTitle } });
  if (!puzzle) {
    // find or create a default category
    let category = await prisma.puzzleCategory.findFirst({ where: { name: "Team Test" } });
    if (!category) {
      category = await prisma.puzzleCategory.create({ data: { name: "Team Test", description: "Category for team lobby testing" } });
    }

    puzzle = await prisma.puzzle.create({
      data: {
        title: puzzleTitle,
        description: "A test puzzle requiring 3 players (3 parts)",
        categoryId: category.id,
        isTeamPuzzle: true,
        minTeamSize: 3,
      },
    });
    console.log(`Created puzzle: ${puzzle.id}`);

    // create 3 parts
    const partsData = [
      { title: "Part A", content: "Solve part A", order: 0 },
      { title: "Part B", content: "Solve part B", order: 1 },
      { title: "Part C", content: "Solve part C", order: 2 },
    ];

    for (const p of partsData) {
      await prisma.puzzlePart.create({ data: { puzzleId: puzzle.id, title: p.title, content: p.content, order: p.order } });
    }
    console.log("Created 3 puzzle parts");
  } else {
    console.log(`Reusing puzzle: ${puzzle.id}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
