import {
  extractAndNumberEntriesFromGrid,
  normalizeCrosswordAnswer,
  validateCrosswordPuzzleData,
} from "./crosswordCore";

const valid5x5 = {
  clues: {
    across: [
      { number: 1, row: 0, col: 0, answer: "ABCDE", text: "Across 1" },
      { number: 6, row: 1, col: 0, answer: "FGHIJ", text: "Across 6" },
      { number: 7, row: 2, col: 0, answer: "KLMNO", text: "Across 7" },
      { number: 8, row: 3, col: 0, answer: "PQRST", text: "Across 8" },
      { number: 9, row: 4, col: 0, answer: "UVWXY", text: "Across 9" },
    ],
    down: [
      { number: 1, row: 0, col: 0, answer: "AFKPU", text: "Down 1" },
      { number: 2, row: 0, col: 1, answer: "BGLQV", text: "Down 2" },
      { number: 3, row: 0, col: 2, answer: "CHMRW", text: "Down 3" },
      { number: 4, row: 0, col: 3, answer: "DINSX", text: "Down 4" },
      { number: 5, row: 0, col: 4, answer: "EJOTY", text: "Down 5" },
    ],
  },
};

describe("crosswordCore", () => {
  test("normalizeCrosswordAnswer strips punctuation and uppercases", () => {
    expect(normalizeCrosswordAnswer(" Plan-B! ")).toBe("PLANB");
  });

  test("validateCrosswordPuzzleData accepts a valid crossword", () => {
    const result = validateCrosswordPuzzleData(valid5x5);
    expect(result.valid).toBe(true);
    expect(result.normalized?.rows).toBe(5);
    expect(result.normalized?.cols).toBe(5);
    expect(result.normalized?.blackSquareRatio).toBe(0);
  });

  test("validateCrosswordPuzzleData catches numbering mismatches", () => {
    const invalid = {
      clues: {
        across: [...valid5x5.clues.across],
        down: [
          valid5x5.clues.down[0],
          { ...valid5x5.clues.down[1], number: 99 },
          valid5x5.clues.down[2],
          valid5x5.clues.down[3],
          valid5x5.clues.down[4],
        ],
      },
    };

    const result = validateCrosswordPuzzleData(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("should be numbered");
  });

  test("validateCrosswordPuzzleData catches conflicting overlaps", () => {
    const invalid = {
      clues: {
        across: [...valid5x5.clues.across],
        down: [
          { ...valid5x5.clues.down[0], answer: "ZFKPU" },
          valid5x5.clues.down[1],
          valid5x5.clues.down[2],
          valid5x5.clues.down[3],
          valid5x5.clues.down[4],
        ],
      },
    };

    const result = validateCrosswordPuzzleData(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("conflicting letters");
  });

  test("validateCrosswordPuzzleData style checks can be relaxed", () => {
    const rectangular = {
      clues: {
        across: [
          { number: 1, row: 0, col: 0, answer: "ABCDE", text: "Across 1" },
          { number: 6, row: 1, col: 0, answer: "FGHIJ", text: "Across 6" },
          { number: 7, row: 2, col: 0, answer: "KLMNO", text: "Across 7" },
        ],
        down: [
          { number: 1, row: 0, col: 0, answer: "AFK", text: "Down 1" },
          { number: 2, row: 0, col: 1, answer: "BGL", text: "Down 2" },
          { number: 3, row: 0, col: 2, answer: "CHM", text: "Down 3" },
          { number: 4, row: 0, col: 3, answer: "DIN", text: "Down 4" },
          { number: 5, row: 0, col: 4, answer: "EJO", text: "Down 5" },
        ],
      },
    };

    const strictResult = validateCrosswordPuzzleData(rectangular, { enforceStyle: true });
    expect(strictResult.valid).toBe(false);
    expect(strictResult.error).toContain("square");

    const relaxedResult = validateCrosswordPuzzleData(rectangular, { enforceStyle: false });
    expect(relaxedResult.valid).toBe(true);
  });

  test("validateCrosswordPuzzleData rejects duplicate answers", () => {
    const invalid = {
      clues: {
        across: [
          valid5x5.clues.across[0],
          { ...valid5x5.clues.across[1], answer: "ABCDE" },
          valid5x5.clues.across[2],
          valid5x5.clues.across[3],
          valid5x5.clues.across[4],
        ],
        down: [
          { ...valid5x5.clues.down[0], answer: "AAKPU" },
          { ...valid5x5.clues.down[1], answer: "BBLQV" },
          { ...valid5x5.clues.down[2], answer: "CCMRW" },
          { ...valid5x5.clues.down[3], answer: "DDNSX" },
          { ...valid5x5.clues.down[4], answer: "EEOTY" },
        ],
      },
    };

    const result = validateCrosswordPuzzleData(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Duplicate crossword answer");
  });

  test("validateCrosswordPuzzleData rejects unchecked cells", () => {
    const unchecked = {
      clues: {
        across: [
          { number: 1, row: 0, col: 0, answer: "ABC", text: "Across 1" },
          { number: 4, row: 1, col: 0, answer: "DEF", text: "Across 4" },
          { number: 5, row: 2, col: 0, answer: "GHI", text: "Across 5" },
        ],
        down: [
          { number: 1, row: 0, col: 0, answer: "ADG", text: "Down 1" },
          { number: 2, row: 0, col: 1, answer: "BEH", text: "Down 2" },
        ],
      },
    };

    const result = validateCrosswordPuzzleData(unchecked, { enforceStyle: false });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("unchecked cell");
  });

  test("validateCrosswordPuzzleData accepts unchecked cells when allowed", () => {
    const unchecked = {
      allowUncheckedCells: true,
      clues: {
        across: [
          { number: 1, row: 0, col: 0, answer: "ABC", text: "Across 1" },
          { number: 4, row: 1, col: 0, answer: "DEF", text: "Across 4" },
          { number: 5, row: 2, col: 0, answer: "GHI", text: "Across 5" },
        ],
        down: [
          { number: 1, row: 0, col: 0, answer: "ADG", text: "Down 1" },
          { number: 2, row: 0, col: 1, answer: "BEH", text: "Down 2" },
        ],
      },
    };

    const result = validateCrosswordPuzzleData(unchecked, { enforceStyle: false });
    expect(result.valid).toBe(true);
  });

  test("validateCrosswordPuzzleData rejects disconnected white-cell components", () => {
    const disconnected = {
      clues: {
        across: [
          { number: 1, row: 0, col: 0, answer: "ABC", text: "Across 1" },
          { number: 4, row: 0, col: 4, answer: "DEF", text: "Across 4" },
          { number: 7, row: 1, col: 0, answer: "GHI", text: "Across 7" },
          { number: 8, row: 1, col: 4, answer: "JKL", text: "Across 8" },
          { number: 9, row: 2, col: 0, answer: "MNO", text: "Across 9" },
          { number: 10, row: 2, col: 4, answer: "PQR", text: "Across 10" },
        ],
        down: [
          { number: 1, row: 0, col: 0, answer: "AGM", text: "Down 1" },
          { number: 2, row: 0, col: 1, answer: "BHN", text: "Down 2" },
          { number: 3, row: 0, col: 2, answer: "CIO", text: "Down 3" },
          { number: 4, row: 0, col: 4, answer: "DJP", text: "Down 4" },
          { number: 5, row: 0, col: 5, answer: "EKQ", text: "Down 5" },
          { number: 6, row: 0, col: 6, answer: "FLR", text: "Down 6" },
        ],
      },
    };

    const result = validateCrosswordPuzzleData(disconnected, { enforceStyle: false });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("single connected");
  });

  test("extractAndNumberEntriesFromGrid emits numbered across/down entries", () => {
    const extracted = extractAndNumberEntriesFromGrid([
      ["A", "B", "C"],
      ["D", "E", "F"],
      ["G", "H", "I"],
    ]);

    expect(extracted).not.toBeNull();
    expect(extracted?.across.map((c) => c.number)).toEqual([1, 4, 5]);
    expect(extracted?.down.map((c) => c.number)).toEqual([1, 2, 3]);
    expect(extracted?.across[0].answer).toBe("ABC");
    expect(extracted?.down[0].answer).toBe("ADG");
  });
});
