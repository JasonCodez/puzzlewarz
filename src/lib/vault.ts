export type VaultLineKey = "row1" | "row2" | "row3" | "col1" | "col2" | "col3";
export type VaultCornerKey = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";
export type VaultDigitPosition = "hundreds" | "tens" | "ones";

export interface VaultClueLine {
  key: VaultLineKey;
  label: string;
}

export interface VaultExtractionStep {
  cell?: VaultCornerKey;
  row?: number;
  col?: number;
  digit: VaultDigitPosition;
}

export interface VaultPuzzleData {
  intro: string;
  grid: number[][];
  missing: {
    row: number;
    col: number;
  };
  stageOnePrompt: string;
  stageTwoPrompt: string;
  stageThreePrompt: string;
  clueLines: VaultClueLine[];
  targetWord: string;
  extraction: VaultExtractionStep[];
  finalCode: string;
  completionMessage: string;
}

const DEFAULT_VAULT_DATA: VaultPuzzleData = {
  intro:
    "Nine numbers guard the vault. Solve the missing center, turn the right totals into letters, then use that instruction on the ring of numbers to unlock the chamber.",
  grid: [
    [100, 104, 108],
    [209, 213, 217],
    [318, 322, 326],
  ],
  missing: {
    row: 1,
    col: 1,
  },
  stageOnePrompt:
    "Every move to the right changes by one fixed amount. Every move down changes by a different fixed amount. Use both rules to recover the center.",
  stageTwoPrompt:
    "Use the solved grid. For each clue, total that line, reduce the result to a digit sum, then convert 1=A through 26=Z. Those letters form the instruction word.",
  stageThreePrompt:
    "The instruction word tells you how many numbers to take from the outer ring. Start at the top-left, move clockwise, and keep the last digit of each chosen number.",
  clueLines: [
    { key: "row1", label: "Top row total" },
    { key: "col1", label: "Left column total" },
    { key: "row3", label: "Bottom row total" },
    { key: "row2", label: "Middle row total" },
  ],
  targetWord: "FOUR",
  extraction: [
    { row: 0, col: 0, digit: "ones" },
    { row: 0, col: 1, digit: "ones" },
    { row: 0, col: 2, digit: "ones" },
    { row: 1, col: 2, digit: "ones" },
  ],
  finalCode: "0487",
  completionMessage: "The lock clicks open. The vault door swings back and the chamber is finally yours.",
};

const LINE_TO_COORDS: Record<VaultLineKey, Array<[number, number]>> = {
  row1: [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  row2: [
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  row3: [
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  col1: [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  col2: [
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  col3: [
    [0, 2],
    [1, 2],
    [2, 2],
  ],
};

const CORNER_TO_COORDS: Record<VaultCornerKey, [number, number]> = {
  topLeft: [0, 0],
  topRight: [0, 2],
  bottomRight: [2, 2],
  bottomLeft: [2, 0],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneDefault(): VaultPuzzleData {
  return JSON.parse(JSON.stringify(DEFAULT_VAULT_DATA)) as VaultPuzzleData;
}

function sanitizeGrid(value: unknown): number[][] | null {
  if (!Array.isArray(value) || value.length !== 3) {
    return null;
  }

  const rows = value.map((row) => {
    if (!Array.isArray(row) || row.length !== 3) {
      return null;
    }

    const numbers = row.map((cell) => {
      const numeric = Number(cell);
      return Number.isFinite(numeric) ? Math.trunc(numeric) : NaN;
    });

    return numbers.every((cell) => Number.isFinite(cell)) ? numbers : null;
  });

  return rows.every((row) => Array.isArray(row)) ? (rows as number[][]) : null;
}

function sanitizeClueLines(value: unknown): VaultClueLine[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const next = value
    .map((entry) => {
      if (!isRecord(entry) || typeof entry.key !== "string") {
        return null;
      }

      if (!(entry.key in LINE_TO_COORDS)) {
        return null;
      }

      return {
        key: entry.key as VaultLineKey,
        label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : entry.key,
      } satisfies VaultClueLine;
    })
    .filter((entry): entry is VaultClueLine => entry !== null);

  return next.length > 0 ? next : null;
}

function sanitizeExtraction(value: unknown): VaultExtractionStep[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const next: VaultExtractionStep[] = [];

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.digit !== "string") {
      continue;
    }

    if (!["hundreds", "tens", "ones"].includes(entry.digit)) {
      continue;
    }

    if (typeof entry.cell === "string" && entry.cell in CORNER_TO_COORDS) {
      next.push({
        cell: entry.cell as VaultCornerKey,
        digit: entry.digit as VaultDigitPosition,
      });
      continue;
    }

    const row = Number(entry.row);
    const col = Number(entry.col);
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 2 || col < 0 || col > 2) {
      continue;
    }

    next.push({
      row,
      col,
      digit: entry.digit as VaultDigitPosition,
    });
  }

  return next.length > 0 ? next : null;
}

function sanitizeMissing(value: unknown): { row: number; col: number } | null {
  if (!isRecord(value)) {
    return null;
  }

  const row = Number(value.row);
  const col = Number(value.col);
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 2 || col < 0 || col > 2) {
    return null;
  }

  return { row, col };
}

export function createDefaultVaultData(): VaultPuzzleData {
  return cloneDefault();
}

export function getVaultPuzzleData(input: unknown): VaultPuzzleData | null {
  const source = isRecord(input) && isRecord(input.vault) ? input.vault : input;
  if (!isRecord(source)) {
    return null;
  }

  const defaults = cloneDefault();
  const grid = sanitizeGrid(source.grid) ?? defaults.grid;
  const missing = sanitizeMissing(source.missing) ?? defaults.missing;
  const clueLines = sanitizeClueLines(source.clueLines) ?? defaults.clueLines;
  const extraction = sanitizeExtraction(source.extraction) ?? defaults.extraction;
  const targetWord = typeof source.targetWord === "string" && source.targetWord.trim()
    ? source.targetWord.trim().toUpperCase()
    : defaults.targetWord;

  const next: VaultPuzzleData = {
    intro: typeof source.intro === "string" && source.intro.trim() ? source.intro.trim() : defaults.intro,
    grid,
    missing,
    stageOnePrompt:
      typeof source.stageOnePrompt === "string" && source.stageOnePrompt.trim()
        ? source.stageOnePrompt.trim()
        : defaults.stageOnePrompt,
    stageTwoPrompt:
      typeof source.stageTwoPrompt === "string" && source.stageTwoPrompt.trim()
        ? source.stageTwoPrompt.trim()
        : defaults.stageTwoPrompt,
    stageThreePrompt:
      typeof source.stageThreePrompt === "string" && source.stageThreePrompt.trim()
        ? source.stageThreePrompt.trim()
        : defaults.stageThreePrompt,
    clueLines,
    targetWord,
    extraction,
    finalCode:
      typeof source.finalCode === "string" && source.finalCode.trim()
        ? source.finalCode.replace(/\D/g, "")
        : computeVaultFinalCode({
            ...defaults,
            grid,
            extraction,
          }),
    completionMessage:
      typeof source.completionMessage === "string" && source.completionMessage.trim()
        ? source.completionMessage.trim()
        : defaults.completionMessage,
  };

  if (!next.finalCode) {
    next.finalCode = computeVaultFinalCode(next);
  }

  return next;
}

export function sumDigits(value: number): number {
  return Math.abs(value)
    .toString()
    .split("")
    .reduce((total, digit) => total + Number(digit), 0);
}

export function numberToLetter(value: number): string {
  if (value < 1 || value > 26) {
    return "?";
  }
  return String.fromCharCode(64 + value);
}

export function getVaultLineTotal(data: VaultPuzzleData, key: VaultLineKey): number {
  return LINE_TO_COORDS[key].reduce((total, [row, col]) => total + data.grid[row][col], 0);
}

export function getVaultCellValue(data: VaultPuzzleData, row: number, col: number): number {
  return data.grid[row][col];
}

export function getVaultDerivedLetters(data: VaultPuzzleData): Array<{
  key: VaultLineKey;
  label: string;
  total: number;
  digitSum: number;
  letter: string;
}> {
  return data.clueLines.map((line) => {
    const total = getVaultLineTotal(data, line.key);
    const digitValue = sumDigits(total);
    return {
      key: line.key,
      label: line.label,
      total,
      digitSum: digitValue,
      letter: numberToLetter(digitValue),
    };
  });
}

export function extractVaultDigit(value: number, digit: VaultDigitPosition): string {
  const normalized = Math.abs(Math.trunc(value)).toString().padStart(3, "0");
  if (digit === "hundreds") {
    return normalized[0];
  }
  if (digit === "tens") {
    return normalized[1];
  }
  return normalized[2];
}

function getVaultExtractionCoords(step: VaultExtractionStep): [number, number] | null {
  if (step.cell) {
    return CORNER_TO_COORDS[step.cell];
  }

  if (typeof step.row === "number" && typeof step.col === "number") {
    return [step.row, step.col];
  }

  return null;
}

export function computeVaultFinalCode(data: Pick<VaultPuzzleData, "grid" | "extraction">): string {
  return data.extraction
    .map((step) => {
      const coords = getVaultExtractionCoords(step);
      if (!coords) {
        return "";
      }
      const [row, col] = coords;
      return extractVaultDigit(data.grid[row][col], step.digit);
    })
    .join("");
}
