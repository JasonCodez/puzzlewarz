import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePuzzleData() {
  try {
    const puzzleId = 'cmkvbec9f0001m1g0ab7f7e67';

    console.log('Updating puzzle data...');

    // Create test escape room data
    const testData = {
      escapeRoomData: {
        title: "Test Escape Room",
        description: "A test escape room created with the designer",
        timeLimit: 1200,
        scenes: [
          {
            id: "scene1",
            name: "Main Room",
            backgroundUrl: "",
            description: "The main room of the escape room",
            items: [],
            interactiveZones: []
          }
        ],
        userSpecialties: []
      }
    };

    // Update the puzzle
    const updated = await (prisma as any).puzzle.update({
      where: { id: puzzleId },
      data: {
        data: testData
      }
    });

    console.log('Updated puzzle data successfully');
    console.log('New data:', updated.data);
  } catch (error) {
    console.error('Error updating puzzle:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePuzzleData();