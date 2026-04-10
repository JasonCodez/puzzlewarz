// ─────────────────────────────────────────────────────────────────────────────
// Parasite Code Puzzle — shared types, parser, and quarantine validator
// Used by:
//   • API routes   src/app/api/puzzles/[id]/parasite/state   (state GET)
//   •              src/app/api/puzzles/[id]/parasite/submit  (quarantine POST)
//   • Component    src/components/puzzle/ParasiteCodePuzzle.tsx
// ─────────────────────────────────────────────────────────────────────────────

export type Opcode =
  | 'SET'   // SET <reg> <value>         — assign a value to a register
  | 'ADD'   // ADD <reg> <a> <b>         — reg = a + b
  | 'SUB'   // SUB <reg> <a> <b>         — reg = a - b
  | 'MUL'   // MUL <reg> <a> <b>         — reg = a * b
  | 'CMP'   // CMP <a> <b>               — compare: sets FLAG register
  | 'IF'    // IF FLAG <op> <val>        — conditional; skips next line if false
  | 'GOTO'  // GOTO <label>              — unconditional jump
  | 'CALL'  // CALL <label>              — call a subroutine
  | 'RET'   // RET                       — return from subroutine
  | 'LOAD'  // LOAD <reg> <key>          — load from input map
  | 'OUT'   // OUT <reg>                 — emit output value
  | 'HALT'; // HALT                      — stop execution

export const OPCODE_DESCRIPTIONS: Record<Opcode, string> = {
  SET:  'Assign a literal value to a register',
  ADD:  'Add two values into a register',
  SUB:  'Subtract one value from another into a register',
  MUL:  'Multiply two values into a register',
  CMP:  'Compare two values; result stored in FLAG',
  IF:   'Conditional branch: skip next line if condition is false',
  GOTO: 'Unconditional jump to a labelled line',
  CALL: 'Call a named subroutine',
  RET:  'Return to the call site',
  LOAD: 'Load a value from the test input map',
  OUT:  'Emit the current value of a register as output',
  HALT: 'Stop execution',
};

export type ProgramLine = {
  id: string;                  // e.g. "L01", "L02" — the IDs players quarantine
  lineNumber: number;          // 1-based display number
  opcode: Opcode;
  operands: string[];
  comment?: string;            // inline comment visible to player
  /** Server-only — stripped before sending to client */
  isParasite?: boolean;
};

export type TestInput = {
  id: string;
  label: string;               // e.g. "Normal invoice — Amount: $450"
  values: Record<string, string | number>;
  expectedOutput: string;      // what the legitimate program should produce
  activatesParasite: boolean;  // true = this input triggers the malicious branch
};

export type StrainFamily =
  | 'timing-parasite'
  | 'input-triggered-sleeper'
  | 'obfuscated-redirect'
  | 'logic-bomb'
  | 'data-exfil'
  | 'privilege-escalation'
  | 'output-manipulator'
  | 'persistence-hook'
  | 'covert-channel';

export const STRAIN_DESCRIPTIONS: Record<StrainFamily, string> = {
  'timing-parasite':        'Activates based on date/time thresholds',
  'input-triggered-sleeper':'Dormant until specific input values are seen',
  'obfuscated-redirect':    'Redirects output to an alias or hidden register',
  'logic-bomb':             'Triggered by a specific logical state in the program',
  'data-exfil':             'Silently copies data to a secondary output channel',
  'privilege-escalation':   'Elevates an internal permission flag during normal execution',
  'output-manipulator':     'Subtly alters numeric or string output values',
  'persistence-hook':       'Injects a hook that persists across program restarts',
  'covert-channel':         'Uses a legitimate instruction sequence to signal externally',
};

export type ParasiteCodeCase = {
  caseTitle: string;
  programName: string;         // e.g. "payroll_v4.prg"
  contextNarrative: string;    // backstory shown on the briefing screen
  strainFamily: StrainFamily;
  activationCondition: string; // revealed AFTER the player solves: describes when it triggers
  program: ProgramLine[];
  parasiteLineIds: string[];   // canonical answer — STRIPPED before client
  testInputs: TestInput[];
  retentionUnlock?: string;    // revealed after solve: declassified note / lore
};

/** Shape sent to the browser: secrets removed */
export type ParasiteCodeClientCase = {
  caseTitle: string;
  programName: string;
  contextNarrative: string;
  strainFamily: StrainFamily;
  program: Omit<ProgramLine, 'isParasite'>[];
  testInputs: TestInput[];
};

// ── Parser ────────────────────────────────────────────────────────────────────

export function getParasiteCodeData(puzzleData: unknown): ParasiteCodeCase | null {
  if (!puzzleData || typeof puzzleData !== 'object') return null;
  const d = puzzleData as Record<string, unknown>;
  if (!d.parasiteCode || typeof d.parasiteCode !== 'object') return null;
  const c = d.parasiteCode as Record<string, unknown>;

  if (
    typeof c.caseTitle !== 'string' ||
    typeof c.programName !== 'string' ||
    typeof c.contextNarrative !== 'string' ||
    typeof c.strainFamily !== 'string' ||
    typeof c.activationCondition !== 'string' ||
    !Array.isArray(c.program) ||
    !Array.isArray(c.parasiteLineIds) ||
    !Array.isArray(c.testInputs)
  ) {
    return null;
  }

  return c as unknown as ParasiteCodeCase;
}

// ── Sanitizer ─────────────────────────────────────────────────────────────────

export function sanitizeParasiteForClient(data: ParasiteCodeCase): ParasiteCodeClientCase {
  return {
    caseTitle: data.caseTitle,
    programName: data.programName,
    contextNarrative: data.contextNarrative,
    strainFamily: data.strainFamily,
    program: data.program.map(({ isParasite: _dropped, ...rest }) => rest),
    testInputs: data.testInputs,
  };
}

// ── Validator ─────────────────────────────────────────────────────────────────

export type QuarantineFeedback =
  | 'exact'           // perfect match
  | 'over-flagged'    // correct lines included + extras
  | 'under-flagged'   // subset of correct lines, nothing wrong
  | 'off';            // at least one wrong line in the submission

export type QuarantineResult = {
  correct: boolean;
  feedback: QuarantineFeedback;
  /** How many of the parasite lines the player found (0–n) */
  foundCount: number;
  totalParasiteCount: number;
};

export function validateQuarantine(
  data: ParasiteCodeCase,
  submittedIds: string[],
): QuarantineResult {
  const canonical = new Set(data.parasiteLineIds);
  const submitted = new Set(submittedIds);

  const correct = canonical.size === submitted.size &&
    [...canonical].every(id => submitted.has(id));

  if (correct) {
    return { correct: true, feedback: 'exact', foundCount: canonical.size, totalParasiteCount: canonical.size };
  }

  const foundCount = [...canonical].filter(id => submitted.has(id)).length;
  const hasWrongLine = [...submitted].some(id => !canonical.has(id));

  let feedback: QuarantineFeedback;
  if (!hasWrongLine && foundCount < canonical.size) {
    feedback = 'under-flagged';       // only genuine parasite lines, but incomplete
  } else if (!hasWrongLine && foundCount === canonical.size) {
    feedback = 'over-flagged';        // all correct + extras (shouldn't happen — but guard anyway)
  } else if (hasWrongLine && foundCount === canonical.size) {
    feedback = 'over-flagged';        // all correct plus false positives
  } else {
    feedback = 'off';                 // at least one wrong line and/or missing parasite lines
  }

  return { correct: false, feedback, foundCount, totalParasiteCount: canonical.size };
}

// ── Rank calculator ───────────────────────────────────────────────────────────

export type Rank = 'S' | 'A' | 'B' | 'C' | 'F';

export function calcRank(submissionCount: number): Rank {
  if (submissionCount === 1) return 'S';
  if (submissionCount === 2) return 'A';
  if (submissionCount <= 4) return 'B';
  if (submissionCount <= 7) return 'C';
  return 'F';
}

export const RANK_LABELS: Record<Rank, string> = {
  S: 'ANALYST ELITE',
  A: 'SENIOR ANALYST',
  B: 'FIELD ANALYST',
  C: 'JUNIOR ANALYST',
  F: 'CASE OPEN',
};

export const RANK_COLORS: Record<Rank, string> = {
  S: '#FFD700',
  A: '#7DF9AA',
  B: '#60CFFF',
  C: '#C0C0C0',
  F: '#FF6060',
};
