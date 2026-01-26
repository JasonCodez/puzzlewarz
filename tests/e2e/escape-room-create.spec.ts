require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('Escape Room API', () => {
  let puzzleId: string;
  let categoryId: string;
  beforeAll(async () => {
    // Create a test category
    const category = await prisma.puzzleCategory.create({
      data: {
        name: 'Test Category',
        description: 'Category for escape room test',
        color: '#000000',
        icon: 'test-icon',
      },
    });
    categoryId = category.id;
    // Create a test puzzle
    const puzzle = await prisma.puzzle.create({
      data: {
        title: 'Test Puzzle',
        description: 'Puzzle for escape room test',
        content: '{}',
        categoryId,
        difficulty: 'easy',
        puzzleType: 'escape',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    puzzleId = puzzle.id;
  });

  afterAll(async () => {
    // Clean up test puzzle, category, and escape room
    await prisma.escapeRoomPuzzle.deleteMany({ where: { puzzleId } });
    await prisma.puzzle.delete({ where: { id: puzzleId } });
    await prisma.puzzleCategory.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it('should create a new escape room', async () => {
    jest.setTimeout(15000);
    // Wait for DB transaction to commit
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    try {
      const response = await axios.post('http://localhost:3000/api/escape-rooms/create', {
        puzzleId,
        roomTitle: 'Test Room',
        roomDescription: 'A room for testing',
        minTeamSize: 3,
        maxTeamSize: 6,
        timeLimitSeconds: 1800
      });
      expect(response.status).toBe(201);
      expect(response.data.escapeRoom).toBeDefined();
      expect(response.data.escapeRoom.roomTitle).toBe('Test Room');
    } catch (error: any) {
      if (error && error.response) {
        console.error('API Error Response:', error.response.data);
      } else {
        console.error('Unexpected Error:', error);
      }
      throw error;
    }
  });
});
