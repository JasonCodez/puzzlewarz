export type CrosswordDirection = "across" | "down";

export interface CrosswordClueInput {
  number: number;
  text?: string;
  answer?: string;
  length?: number;
  row: number;
  col: number;
}

export interface CrosswordPuzzleDataInput {
  clues?: {
    across?: CrosswordClueInput[];
    down?: CrosswordClueInput[];
  };
}

export interface CrosswordClueNormalized {
  number: number;
  text: string;
  answer: string | null;
  length: number;
  row: number;
  col: number;
}

export interface CrosswordNormalizedData {
  clues: {
    across: CrosswordClueNormalized[];
    down: CrosswordClueNormalized[];
  };
  rows: number;
  cols: number;
  whiteCellCount: number;
  blackCellCount: number;
  blackSquareRatio: number;
}

export interface CrosswordValidationOptions {
  requireAnswers?: boolean;
  enforceStyle?: boolean;
  maxBlackSquareRatio?: number;
}

export interface CrosswordValidationResult {
  valid: boolean;
  error?: string;
  normalized?: CrosswordNormalizedData;
}

export interface CrosswordExtractResult {
  across: CrosswordClueNormalized[];
  down: CrosswordClueNormalized[];
  rows: number;
  cols: number;
}

type StartInfo = {
  number: number;
  startsAcross: boolean;
  startsDown: boolean;
  acrossLength: number;
  downLength: number;
};

type PlacementResult = {
  letterGrid: Array<Array<string | null>>;
  acrossCoverage: number[][];
  downCoverage: number[][];
};

const DEFAULT_MAX_BLACK_RATIO = 0.17;

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function normalizePositiveInt(value: unknown): number | null {
  if (!isInteger(value) || value <= 0) return null;
  return value;
}

function normalizeNonNegativeInt(value: unknown): number | null {
  if (!isInteger(value) || value < 0) return null;
  return value;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeCrosswordAnswer(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .trim();
}

function createMatrix<T>(rows: number, cols: number, value: T): T[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

function inBounds(rows: number, cols: number, row: number, col: number): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function isWhite(mask: boolean[][], row: number, col: number): boolean {
  if (!inBounds(mask.length, mask[0]?.length ?? 0, row, col)) return false;
  return mask[row][col];
}

function runLength(mask: boolean[][], row: number, col: number, direction: CrosswordDirection): number {
  let r = row;
  let c = col;
  let length = 0;

  while (isWhite(mask, r, c)) {
    length += 1;
    if (direction === "across") c += 1;
    else r += 1;
  }

  return length;
}

function keyForCell(row: number, col: number): string {
  return `${row},${col}`;
}

function normalizeClue(
  raw: CrosswordClueInput,
  direction: CrosswordDirection,
  index: number,
  requireAnswers: boolean
): { clue?: CrosswordClueNormalized; error?: string } {
  const clueIndex = index + 1;

  const number = normalizePositiveInt(raw.number);
  if (number == null) {
    return {
      error: `Crossword ${direction} clue ${clueIndex}: number must be a positive integer.`,
    };
  }

  const row = normalizeNonNegativeInt(raw.row);
  if (row == null) {
    return {
      error: `Crossword ${direction} clue ${number}: row must be a non-negative integer.`,
    };
  }

  const col = normalizeNonNegativeInt(raw.col);
  if (col == null) {
    return {
      error: `Crossword ${direction} clue ${number}: col must be a non-negative integer.`,
    };
  }

  const text = normalizeText(raw.text);
  if (!text) {
    return {
      error: `Crossword ${direction} clue ${number}: text is required.`,
    };
  }

  const answer = normalizeCrosswordAnswer(raw.answer);
  const rawLength = normalizePositiveInt(raw.length);

  if (requireAnswers && answer.length < 3) {
    return {
      error: `Crossword ${direction} clue ${number}: answer must contain at least 3 letters.`,
    };
  }

  if (!requireAnswers && answer.length === 0 && rawLength == null) {
    return {
      error: `Crossword ${direction} clue ${number}: either answer or length is required.`,
    };
  }

  const inferredLength = answer.length > 0 ? answer.length : rawLength;
  if (inferredLength == null) {
    return {
      error: `Crossword ${direction} clue ${number}: could not determine entry length.`,
    };
  }

  if (inferredLength < 3) {
    return {
      error: `Crossword ${direction} clue ${number}: entries must be at least 3 letters long.`,
    };
  }

  if (rawLength != null && answer.length > 0 && rawLength !== answer.length) {
    return {
      error: `Crossword ${direction} clue ${number}: length does not match answer length.`,
    };
  }

  return {
    clue: {
      number,
      text,
      answer: answer.length > 0 ? answer : null,
      length: inferredLength,
      row,
      col,
    },
  };
}

function normalizeClueList(
  raw: unknown,
  direction: CrosswordDirection,
  requireAnswers: boolean
): { clues?: CrosswordClueNormalized[]; error?: string } {
  if (!Array.isArray(raw)) {
    return { error: `Crossword clues.${direction} must be an array.` };
  }

  const out: CrosswordClueNormalized[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const clueRaw = raw[i];
    if (!clueRaw || typeof clueRaw !== "object") {
      return { error: `Crossword ${direction} clue ${i + 1}: clue must be an object.` };
    }

    const normalized = normalizeClue(
      clueRaw as CrosswordClueInput,
      direction,
      i,
      requireAnswers
    );

    if (!normalized.clue) {
      return { error: normalized.error };
    }

    out.push(normalized.clue);
  }

  if (out.length === 0) {
    return { error: `Crossword clues.${direction} must contain at least one clue.` };
  }

  return { clues: out };
}

function deriveGridBounds(clues: { across: CrosswordClueNormalized[]; down: CrosswordClueNormalized[] }): {
  rows: number;
  cols: number;
} {
  let maxRow = 0;
  let maxCol = 0;

  for (const clue of clues.across) {
    maxRow = Math.max(maxRow, clue.row);
    maxCol = Math.max(maxCol, clue.col + clue.length - 1);
  }

  for (const clue of clues.down) {
    maxRow = Math.max(maxRow, clue.row + clue.length - 1);
    maxCol = Math.max(maxCol, clue.col);
  }

  return { rows: maxRow + 1, cols: maxCol + 1 };
}

function placeClues(clues: { across: CrosswordClueNormalized[]; down: CrosswordClueNormalized[] }): {
  result?: PlacementResult;
  error?: string;
} {
  const { rows, cols } = deriveGridBounds(clues);

  const letterGrid: Array<Array<string | null>> = createMatrix<string | null>(rows, cols, null);
  const acrossCoverage = createMatrix<number>(rows, cols, 0);
  const downCoverage = createMatrix<number>(rows, cols, 0);

  const placeOne = (
    clue: CrosswordClueNormalized,
    direction: CrosswordDirection
  ): string | null => {
    for (let i = 0; i < clue.length; i += 1) {
      const row = direction === "down" ? clue.row + i : clue.row;
      const col = direction === "across" ? clue.col + i : clue.col;
      const char = clue.answer ? clue.answer[i] : "";

      const existing = letterGrid[row][col];
      if (existing == null) {
        letterGrid[row][col] = char;
      } else if (char && existing && existing !== char) {
        return `Crossword has conflicting letters at ${row},${col}.`;
      } else if (!existing && char) {
        letterGrid[row][col] = char;
      }

      if (direction === "across") acrossCoverage[row][col] += 1;
      else downCoverage[row][col] += 1;
    }

    return null;
  };

  for (const clue of clues.across) {
    const error = placeOne(clue, "across");
    if (error) return { error };
  }

  for (const clue of clues.down) {
    const error = placeOne(clue, "down");
    if (error) return { error };
  }

  return {
    result: {
      letterGrid,
      acrossCoverage,
      downCoverage,
    },
  };
}

function validateConnectivity(mask: boolean[][]): string | null {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;

  let start: [number, number] | null = null;
  let whiteCount = 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (!mask[r][c]) continue;
      whiteCount += 1;
      if (!start) start = [r, c];
    }
  }

  if (!start || whiteCount === 0) {
    return "Crossword must include at least one white cell.";
  }

  const visited = createMatrix<boolean>(rows, cols, false);
  const queue: Array<[number, number]> = [start];
  visited[start[0]][start[1]] = true;
  let seen = 0;

  while (queue.length > 0) {
    const [row, col] = queue.shift() as [number, number];
    seen += 1;

    const neighbors: Array<[number, number]> = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];

    for (const [nr, nc] of neighbors) {
      if (!inBounds(rows, cols, nr, nc)) continue;
      if (!mask[nr][nc]) continue;
      if (visited[nr][nc]) continue;
      visited[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }

  if (seen !== whiteCount) {
    return "Crossword white cells must form a single connected region.";
  }

  return null;
}

function buildStarts(mask: boolean[][]): Map<string, StartInfo> {
  const starts = new Map<string, StartInfo>();
  let number = 1;

  for (let r = 0; r < mask.length; r += 1) {
    for (let c = 0; c < (mask[0]?.length ?? 0); c += 1) {
      if (!mask[r][c]) continue;

      const leftBlack = c === 0 || !mask[r][c - 1];
      const upBlack = r === 0 || !mask[r - 1][c];

      const acrossLength = leftBlack ? runLength(mask, r, c, "across") : 0;
      const downLength = upBlack ? runLength(mask, r, c, "down") : 0;

      const startsAcross = leftBlack && acrossLength >= 3;
      const startsDown = upBlack && downLength >= 3;

      if (!startsAcross && !startsDown) continue;

      starts.set(keyForCell(r, c), {
        number,
        startsAcross,
        startsDown,
        acrossLength,
        downLength,
      });
      number += 1;
    }
  }

  return starts;
}

function validateNumberingAndShapes(
  clues: { across: CrosswordClueNormalized[]; down: CrosswordClueNormalized[] },
  mask: boolean[][]
): string | null {
  const starts = buildStarts(mask);

  for (const clue of clues.across) {
    const key = keyForCell(clue.row, clue.col);
    const info = starts.get(key);

    if (!info || !info.startsAcross) {
      return `Across clue ${clue.number} does not start at a valid across entry start (${clue.row},${clue.col}).`;
    }
    if (info.number !== clue.number) {
      return `Across clue at ${clue.row},${clue.col} should be numbered ${info.number}, not ${clue.number}.`;
    }
    if (info.acrossLength !== clue.length) {
      return `Across clue ${clue.number} length does not match its grid slot.`;
    }
  }

  for (const clue of clues.down) {
    const key = keyForCell(clue.row, clue.col);
    const info = starts.get(key);

    if (!info || !info.startsDown) {
      return `Down clue ${clue.number} does not start at a valid down entry start (${clue.row},${clue.col}).`;
    }
    if (info.number !== clue.number) {
      return `Down clue at ${clue.row},${clue.col} should be numbered ${info.number}, not ${clue.number}.`;
    }
    if (info.downLength !== clue.length) {
      return `Down clue ${clue.number} length does not match its grid slot.`;
    }
  }

  return null;
}

function validateCheckedCells(acrossCoverage: number[][], downCoverage: number[][], mask: boolean[][]): string | null {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (!mask[r][c]) continue;
      if (acrossCoverage[r][c] < 1 || downCoverage[r][c] < 1) {
        return `Crossword has an unchecked cell at ${r},${c}; every white cell must belong to both across and down.`;
      }
    }
  }

  return null;
}

function validateDistinctAnswers(clues: { across: CrosswordClueNormalized[]; down: CrosswordClueNormalized[] }): string | null {
  const seen = new Map<string, string>();

  for (const [direction, list] of ([
    ["across", clues.across],
    ["down", clues.down],
  ] as const)) {
    for (const clue of list) {
      if (!clue.answer) continue;
      const existing = seen.get(clue.answer);
      if (existing) {
        return `Duplicate crossword answer "${clue.answer}" found in ${existing} and ${direction}-${clue.number}.`;
      }
      seen.set(clue.answer, `${direction}-${clue.number}`);
    }
  }

  return null;
}

function validateStyle(mask: boolean[][], maxBlackSquareRatio: number): string | null {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;

  if (rows !== cols) {
    return "Crossword grid must be square for American-style construction.";
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const mirrorR = rows - 1 - r;
      const mirrorC = cols - 1 - c;
      if (mask[r][c] !== mask[mirrorR][mirrorC]) {
        return `Crossword grid must have 180-degree rotational symmetry (mismatch at ${r},${c}).`;
      }
    }
  }

  let white = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (mask[r][c]) white += 1;
    }
  }

  const total = rows * cols;
  const black = total - white;
  const ratio = total > 0 ? black / total : 0;

  if (ratio > maxBlackSquareRatio) {
    return `Crossword black-square ratio ${(ratio * 100).toFixed(1)}% exceeds the allowed ${(maxBlackSquareRatio * 100).toFixed(1)}%.`;
  }

  return null;
}

export function validateCrosswordPuzzleData(
  data: unknown,
  options: CrosswordValidationOptions = {}
): CrosswordValidationResult {
  const requireAnswers = options.requireAnswers ?? true;
  const enforceStyle = options.enforceStyle ?? true;
  const maxBlackSquareRatio = options.maxBlackSquareRatio ?? DEFAULT_MAX_BLACK_RATIO;

  if (!data || typeof data !== "object") {
    return { valid: false, error: "Crossword puzzleData is missing." };
  }

  const payload = data as CrosswordPuzzleDataInput;
  if (!payload.clues || typeof payload.clues !== "object") {
    return { valid: false, error: "Crossword requires puzzleData.clues with across and down arrays." };
  }

  const acrossRes = normalizeClueList(payload.clues.across, "across", requireAnswers);
  if (!acrossRes.clues) {
    return { valid: false, error: acrossRes.error };
  }

  const downRes = normalizeClueList(payload.clues.down, "down", requireAnswers);
  if (!downRes.clues) {
    return { valid: false, error: downRes.error };
  }

  const normalizedClues = {
    across: [...acrossRes.clues].sort((a, b) => a.number - b.number || a.row - b.row || a.col - b.col),
    down: [...downRes.clues].sort((a, b) => a.number - b.number || a.row - b.row || a.col - b.col),
  };

  const placed = placeClues(normalizedClues);
  if (!placed.result) {
    return { valid: false, error: placed.error };
  }

  const { letterGrid, acrossCoverage, downCoverage } = placed.result;
  const rows = letterGrid.length;
  const cols = letterGrid[0]?.length ?? 0;
  const mask = letterGrid.map((row) => row.map((cell) => cell != null));

  const numberingErr = validateNumberingAndShapes(normalizedClues, mask);
  if (numberingErr) return { valid: false, error: numberingErr };

  const checkedErr = validateCheckedCells(acrossCoverage, downCoverage, mask);
  if (checkedErr) return { valid: false, error: checkedErr };

  const connectivityErr = validateConnectivity(mask);
  if (connectivityErr) return { valid: false, error: connectivityErr };

  if (requireAnswers) {
    const dupErr = validateDistinctAnswers(normalizedClues);
    if (dupErr) return { valid: false, error: dupErr };
  }

  if (enforceStyle) {
    const styleErr = validateStyle(mask, maxBlackSquareRatio);
    if (styleErr) return { valid: false, error: styleErr };
  }

  let whiteCellCount = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (mask[r][c]) whiteCellCount += 1;
    }
  }
  const totalCells = rows * cols;
  const blackCellCount = totalCells - whiteCellCount;
  const blackSquareRatio = totalCells > 0 ? blackCellCount / totalCells : 0;

  return {
    valid: true,
    normalized: {
      clues: normalizedClues,
      rows,
      cols,
      whiteCellCount,
      blackCellCount,
      blackSquareRatio,
    },
  };
}

export function normalizeGridLayout(input: unknown): string[][] {
  if (!Array.isArray(input)) return [];

  const rows: string[][] = [];
  for (const rawRow of input) {
    if (!Array.isArray(rawRow)) return [];
    const row: string[] = [];
    for (const rawCell of rawRow) {
      const cell = String(rawCell ?? "").trim().toUpperCase();
      if (!cell || cell === "#") {
        row.push("#");
      } else {
        const letter = cell.replace(/[^A-Z]/g, "").charAt(0);
        row.push(letter || "#");
      }
    }
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const width = rows[0].length;
  if (width === 0) return [];
  for (const row of rows) {
    if (row.length !== width) return [];
  }

  return rows;
}

export function extractAndNumberEntriesFromGrid(gridInput: unknown): CrosswordExtractResult | null {
  const grid = normalizeGridLayout(gridInput);
  if (grid.length === 0) return null;

  const rows = grid.length;
  const cols = grid[0].length;
  const across: CrosswordClueNormalized[] = [];
  const down: CrosswordClueNormalized[] = [];

  let number = 1;

  const isBlack = (row: number, col: number): boolean => {
    if (!inBounds(rows, cols, row, col)) return true;
    return grid[row][col] === "#";
  };

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (isBlack(r, c)) continue;

      const startsAcross = isBlack(r, c - 1) && !isBlack(r, c + 1);
      const startsDown = isBlack(r - 1, c) && !isBlack(r + 1, c);

      if (!startsAcross && !startsDown) continue;

      if (startsAcross) {
        let cc = c;
        let answer = "";
        while (!isBlack(r, cc)) {
          answer += grid[r][cc];
          cc += 1;
        }
        if (answer.length >= 3) {
          across.push({
            number,
            text: `${number} Across`,
            answer,
            length: answer.length,
            row: r,
            col: c,
          });
        }
      }

      if (startsDown) {
        let rr = r;
        let answer = "";
        while (!isBlack(rr, c)) {
          answer += grid[rr][c];
          rr += 1;
        }
        if (answer.length >= 3) {
          down.push({
            number,
            text: `${number} Down`,
            answer,
            length: answer.length,
            row: r,
            col: c,
          });
        }
      }

      number += 1;
    }
  }

  return {
    across,
    down,
    rows,
    cols,
  };
}

export function stripCrosswordAnswers(
  data: CrosswordNormalizedData | CrosswordPuzzleDataInput
): CrosswordPuzzleDataInput {
  const clues = (data as CrosswordNormalizedData).clues ?? (data as CrosswordPuzzleDataInput).clues;
  if (!clues) return { clues: { across: [], down: [] } };

  const mapOne = (raw: CrosswordClueInput[]): CrosswordClueInput[] =>
    raw.map((clue) => ({
      number: clue.number,
      text: clue.text,
      row: clue.row,
      col: clue.col,
      length: (clue as CrosswordClueNormalized).length ?? normalizeCrosswordAnswer(clue.answer).length,
    }));

  return {
    clues: {
      across: mapOne((clues.across ?? []) as CrosswordClueInput[]),
      down: mapOne((clues.down ?? []) as CrosswordClueInput[]),
    },
  };
}
