# Puzzle Warz Documentation Index

This file maps the documentation that should still be treated as current and separates it from dated delivery reports.

## Start Here

1. Read `README.md` for the current stack, setup, scripts, and API overview.
2. Use `package.json`, `prisma/schema.prisma`, and `src/app/api` when you need the live implementation details.
3. Use the feature-specific guides below for subsystem details.

## Current Reference Docs

| Document | Use it for |
|----------|------------|
| `README.md` | Current project overview, setup, and API namespaces |
| `API_REFERENCE.md` | Current route inventory for `src/app/api` |
| `DOCUMENTATION_INDEX.md` | This project-wide map |
| `README_DOCS_INDEX.md` | Notification and email subsystem docs |
| `README_MEDIA.md` | Media upload subsystem overview |
| `TEAM_PUZZLE_INDEX.md` | Team puzzle docs |
| `PUZZLE_CONSTRAINT_MASTER_INDEX.md` | Puzzle constraint docs |
| `ESCAPE_ROOM_CHAINING_GUIDE.md` | Escape-room progression and chaining reference |
| `INTERACTIVE_WITNESS_SETUP.md` | Interactive witness setup details |

## Feature-Specific Docs

### Notifications and Email

- `README_DOCS_INDEX.md`
- `QUICK_START.md`
- `src/lib/NOTIFICATION_SYSTEM_README.md`
- `src/lib/EMAIL_INTEGRATION_GUIDE.md`
- `STATUS_REPORT.md`

### Media Uploads

- `README_MEDIA.md`
- `MEDIA_QUICK_START.md`
- `MEDIA_SYSTEM.md`
- `MEDIA_SYSTEM_VERIFICATION.md`
- `00_START_HERE.md`

### Team and Collaborative Puzzle Systems

- `TEAM_PUZZLE_INDEX.md`
- `TEAM_PUZZLE_QUICK_START.md`
- `TEAM_PUZZLE_ARCHITECTURE.md`
- `TEAM_PUZZLE_CONSTRAINTS.md`

### Puzzle Constraints

- `PUZZLE_CONSTRAINT_MASTER_INDEX.md`
- `PUZZLE_CONSTRAINTS_QUICK_START.md`
- `PUZZLE_CONSTRAINT_VISUAL_GUIDE.md`
- `PUZZLE_CONSTRAINT_IMPLEMENTATION.md`

### Escape Rooms and Special Modes

- `ESCAPE_ROOM_CHAINING_GUIDE.md`
- `INTERACTIVE_WITNESS_SETUP.md`
- `SUDOKU_ENGINE_README.md`

## Historical Snapshot Docs

These files are useful as implementation history, but they are not a reliable source for the current route count, database choice, or active feature scope:

- `FINAL_DELIVERY.md`
- `EXEC_SUMMARY.md`
- `PHASE_4_COMPLETE.md`
- `INTEGRATION_COMPLETE.md`
- `PROJECT_COMPLETE_SUMMARY.md`
- `IMPLEMENTATION_SUMMARY.md`
- `INTEGRATION_CODE_CHANGES.md`

If one of these files conflicts with the current codebase, prefer the codebase.

## Source of Truth

When documentation conflicts, use this order of precedence:

1. `src/` implementation
2. `prisma/schema.prisma`
3. `package.json`
4. current entry-point docs such as `README.md` and this file
5. historical delivery and status reports

## Common Tasks

| Task | Best starting point |
|------|---------------------|
| Set up the app locally | `README.md` |
| Understand the API surface | `API_REFERENCE.md` and `src/app/api` |
| Work on notifications | `README_DOCS_INDEX.md` |
| Work on media uploads | `README_MEDIA.md` |
| Work on team puzzles | `TEAM_PUZZLE_INDEX.md` |
| Work on constraints | `PUZZLE_CONSTRAINT_MASTER_INDEX.md` |
| Verify the database model | `prisma/schema.prisma` |

## Quick Commands

```bash
npm install
npx prisma migrate dev
npm run dev
npm run build
```
