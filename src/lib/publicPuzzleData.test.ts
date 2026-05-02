import { sanitizePublicPuzzleData } from "./publicPuzzleData";

describe("sanitizePublicPuzzleData", () => {
  test("strips word_crack secret while preserving word length", () => {
    const sanitized = sanitizePublicPuzzleData("word_crack", {
      word: "apple",
      wordLength: 5,
      maxAttempts: 6,
    }) as Record<string, unknown>;

    expect(sanitized.word).toBeUndefined();
    expect(sanitized.wordLength).toBe(5);
    expect(sanitized.maxAttempts).toBe(6);
  });

  test("strips crossword clue answers from public payload", () => {
    const sanitized = sanitizePublicPuzzleData("crossword", {
      clues: {
        across: [
          { number: 1, row: 0, col: 0, answer: "ABC", text: "Across 1" },
          { number: 4, row: 1, col: 0, answer: "DEF", text: "Across 4" },
          { number: 5, row: 2, col: 0, answer: "GHI", text: "Across 5" },
        ],
        down: [
          { number: 1, row: 0, col: 0, answer: "ADG", text: "Down 1" },
          { number: 2, row: 0, col: 1, answer: "BEH", text: "Down 2" },
          { number: 3, row: 0, col: 2, answer: "CFI", text: "Down 3" },
        ],
      },
    }) as Record<string, unknown>;

    const clues = sanitized.clues as {
      across: Array<Record<string, unknown>>;
      down: Array<Record<string, unknown>>;
    };

    expect(clues.across[0].answer).toBeUndefined();
    expect(clues.down[0].answer).toBeUndefined();
    expect(clues.across[0].length).toBe(3);
    expect(clues.down[0].length).toBe(3);
    expect(sanitized.rows).toBe(3);
    expect(sanitized.cols).toBe(3);
    expect(sanitized.blackSquareRatio).toBe(0);
  });
});