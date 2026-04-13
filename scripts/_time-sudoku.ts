// Quick timing script for sudoku generation
// Run: npx ts-node scripts/_time-sudoku.ts
import { generateSudoku } from '../src/lib/sudoku-engine';

console.time('easy');
const easy = generateSudoku('easy');
console.timeEnd('easy');
console.log('easy clues:', easy.puzzle.flat().filter(n => n !== 0).length);
