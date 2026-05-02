# Crossword Research And Implementation Plan

## Goal
Build a proper American-style crossword system that is fair, solvable, scalable, and pleasant to play on desktop and mobile.

## Research Sources Reviewed
- https://en.wikipedia.org/wiki/Crossword
- https://www.cruciverb.com/index.php?action=ezportal;sa=page;p=21
- https://www.cruciverb.com/index.php?action=ezportal;sa=page;p=22
- https://www.cruciverb.com/index.php?action=ezportal;sa=page;p=70
- https://crosswords.brightsprout.com/how-to-make-a-crossword-puzzle
- https://www.theguardian.com/crosswords/series/american-style
- https://www.theguardian.com/crosswords/crossword-blog/2020/dec/21/crossword-blog-american-style-puzzle-no-14-let-him-go
- https://crosswords.brightsprout.com/449317/Mini-Crossword-7
- https://crosswords.brightsprout.com/128592/NO-THEME-2-PAD
- https://crosswords.brightsprout.com/8/Cross-Words
- https://crosswords.brightsprout.com/141518/Words-of-Advice

## What A Real Crossword Should Look Like
Observed from live examples and constructor references:

- A fixed square grid (common sizes include 5x5 mini, 13x13, 15x15, 21x21).
- Black and white cell pattern with 180-degree rotational symmetry in American-style puzzles.
- Every white cell belongs to both an Across and a Down entry (checked letters).
- Number labels appear only at valid entry starts.
- Clues are split into Across and Down lists, ordered by number.
- Solver can switch typing direction quickly (spacebar toggles direction is common).
- A selection model links focused cell, active clue, and highlighted word path.

## Core Construction Fundamentals (Must-Have)
Use these as hard validators for puzzle quality:

1. Grid symmetry: 180-degree rotational.
2. Connectivity: all white cells form one connected component.
3. Word length: minimum 3 letters (no 2-letter entries).
4. Checked cells: every filled cell is part of both an Across and a Down answer.
5. Block density: keep black-square ratio moderate (historically around <= 16-17 percent for many American-style norms).
6. No duplicate answers in the same puzzle.
7. Numbering correctness: top-to-bottom, left-to-right numbering at valid starts only.
8. Theme discipline (if themed): long theme entries should be symmetrically placed and consistent.

## Generation Fundamentals (How To Build Them Correctly)
Crossword generation should be treated as a constrained optimization problem.

### 1) Pattern Stage (block layout)
- Generate or select a symmetric block pattern.
- Enforce connectivity and minimum entry length while placing blocks.
- Reject patterns with poor slot distribution or isolated hard zones.

### 2) Slot Extraction Stage
- Derive Across/Down slots from the pattern.
- Store crossing graph: which slot indexes intersect and at what character offsets.

### 3) Fill Stage (CSP + backtracking)
- Use candidate dictionaries indexed by length and letter-position constraints.
- Place hardest slots first using MRV style heuristics:
  - Fewest candidates first.
  - Most intersections first.
- Apply forward-checking after each assignment:
  - Recompute candidate sets for impacted slots.
  - Backtrack early on dead ends.

### 4) Fill Quality Scoring
Among valid fills, prefer higher quality by scoring:
- Lower obscurity.
- Fewer abbreviation-heavy crossings.
- Better crossing support for ambiguous clues.
- Avoid ugly clusters and avoid weak glue entries.

### 5) Difficulty Tuning
Difficulty is not just clue text. Tune with:
- Entry familiarity.
- Clue directness vs ambiguity.
- Theme complexity.
- Long-stack density and crossing support.

## Data Model Recommendation For PuzzleWarz
Separate public and private crossword payloads.

### Private (server-side authoritative)
- Grid pattern
- Entry metadata
- Answers
- Clues
- Optional theme metadata

### Public (client-safe)
- Grid pattern
- Entry numbering and positions
- Clues
- No answers

Suggested structure:
- grid: array of rows with block flags
- entries: list of { number, direction, row, col, length, clue }
- answerKey: server-only map keyed by entry id or number+direction
- metadata: { title, difficulty, theme, size }

## Security And Progress Fundamentals
Do not trust client-submitted progress for crossword completion.

Required approach:

1. Server validates each submitted answer against canonical server-only answer key.
2. Track solved entries as distinct keys (direction + number or stable entry id).
3. Prevent duplicate credit for the same clue.
4. Completion percentage must be computed from distinct solved entries, not incremented blindly.
5. Award points/xp once at first full completion only.

## Current Project Audit (Important)
Current state in this repo indicates crossword is mid-rework and not yet production-safe:

- Crossword gameplay is intentionally disabled in renderer.
- Admin authoring currently relies on raw clue rows and coordinates.
- Admin routes include Word Search validation, but crossword lacks equivalent core validation utility.
- Update route puzzleData allowlist excludes crossword while create route includes it (data consistency risk).
- Crossword submission progress currently increments completion from percentage math, which can miscount if duplicate clue submissions occur.
- Crossword answers appear in crossword data shape used by client component, which should be avoided for anti-cheat robustness.

## Recommended Build Plan (Order)

### Phase 1: Crossword Core Library
Create src/lib/crosswordCore.ts with:
- validateCrosswordPuzzleData
- buildGridFromEntries
- extractAndNumberEntriesFromGrid
- validateGridConstraints
- normalizeCrosswordData

### Phase 2: Admin Validation Integration
- Validate crossword data in both create and update API routes.
- Normalize and persist canonical crossword shape.
- Fix update allowlist to include crossword puzzleData.

### Phase 3: Secure Gameplay Contract
- Split client payload from answer key.
- Keep answers server-side only.
- Rework submit API to track distinct solved clues.

### Phase 4: UX Re-enable
- Re-enable crossword in PuzzleTypeRenderer after core validation and progress fixes pass.
- Add quality-of-life interactions:
  - Active clue highlight
  - Direction toggle
  - Keyboard nav polish
  - Mobile-safe focus model

### Phase 5: Tests
Add targeted tests:
- crosswordCore validators
- numbering correctness
- connectivity checks
- minimum-length checks
- duplicate-answer rejection
- API progress dedupe and one-time reward behavior

## Acceptance Checklist
A crossword puzzle is ready only if all are true:

- Pattern is symmetric, connected, and fully checked.
- No entries shorter than 3.
- Numbering and clue mapping are deterministic and correct.
- Client payload includes no answers.
- Server rejects duplicate solve credit for same clue.
- Completion equals distinct solved clues divided by total clues.
- Unit and integration tests pass for validation and scoring.

## Notes On Example Formats
Observed puzzle ecosystems commonly support:
- .puz export/import for interoperability.
- Printable PDF variant.
- Across/Down clue lists with stable numbering.
- Quality and difficulty labels separate from pure grid geometry.

This can be added after core integrity and anti-cheat work is complete.
