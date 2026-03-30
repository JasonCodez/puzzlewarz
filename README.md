# Puzzle Warz

Puzzle Warz is a multiplayer puzzle platform built on the Next.js App Router. It supports solo and team play, progressive puzzle unlocks, leaderboards, achievements, notifications, forum discussion, direct messaging, and specialized modes such as escape rooms, relay puzzles, sudoku, and ARG phase content.

## Current Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Backend: Next.js route handlers under `src/app/api`
- Database: Prisma with PostgreSQL
- Auth: NextAuth credentials flow
- Real-time: Socket.io client/server support
- Validation: Zod

## Feature Areas

- Puzzles: standard puzzles, hint tiers, ratings, analytics, puzzle relationships, categories and subcategories
- Team play: teams, invites, team puzzle part assignment, team lobbies, relay flows
- Competitive systems: leaderboards, achievements, progress tracking, activity feeds
- Social systems: profiles, follows, direct messages, forum posts and comments, notifications
- Escape rooms and ARG: escape room designer/runtime, ARG phases, interactive witness and chained puzzle flows
- Admin tooling: puzzle management, media uploads, analytics, review flows, notification testing

## Project Structure

```text
src/
├── app/
│   ├── api/                  # Route handlers grouped by feature
│   ├── admin/                # Admin pages and tooling
│   ├── puzzles/              # Player puzzle pages
│   ├── teams/                # Team UX
│   ├── escape-rooms/         # Escape room pages and editors
│   └── forum/, messages/, notifications/, profile/
├── components/               # Shared UI and puzzle-specific components
├── lib/                      # Auth, Prisma, notification, puzzle, and game logic
└── providers.tsx             # Session + global client providers

prisma/
├── schema.prisma             # Current data model (PostgreSQL datasource)
├── migrations/               # Prisma migrations
└── seed.ts                   # Seed script

scripts/                      # Admin utilities, checks, and one-off project helpers
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- npm

### Installation

1. Install dependencies.

```bash
npm install
```

2. Create `.env.local` or `.env` with the core variables.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/puzzlewarz"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-this-with-a-long-random-secret"
```

3. Apply migrations and generate the Prisma client.

```bash
npx prisma migrate dev
```

4. Optionally seed the database.

```bash
npm run seed
```

5. Start the app.

```bash
npm run dev
```

## Common Scripts

- `npm run dev` - start the Next.js dev server
- `npm run build` - production build
- `npm run start` - start the production server
- `npm run seed` - run `prisma/seed.ts`
- `npm run test:e2e` - run Playwright tests
- `npm run socket-server` - start the socket server helper

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Shared Redis connection string for distributed rate limiting and socket fan-out | Yes in production |
| `NEXTAUTH_URL` | Base URL used by NextAuth | Yes |
| `NEXTAUTH_SECRET` | Secret used to sign auth tokens | Yes |
| `NEXT_PUBLIC_SOCKET_URL` | Client socket endpoint | No |
| `REQUIRE_EMAIL_VERIFICATION` | Force email verification outside production | No |

Additional email, storage, and deployment variables may be required depending on which subsystems you enable.

Production deployments should provide `REDIS_URL`; auth abuse protection now uses Redis-backed rate limiting so limits hold across multiple app instances.

## API Overview

The API surface is larger than a simple CRUD puzzle app. Current namespaces include:

- `auth`: registration, verification, sign-out, and the NextAuth handler
- `puzzles`: listing, detail, submission, hints, ratings, escape-room and relay puzzle flows
- `teams` and `team`: team CRUD, invites, applications, lobbies, and collaborative puzzle endpoints
- `leaderboards`: global and team leaderboards
- `user` and `users`: profile, activity, inbox, notifications, achievements, settings, avatar, and social actions
- `forum`: posts, comments, and vote endpoints
- `escape-rooms`: runtime and designer endpoints
- `arg`: ARG phase and puzzle administration
- `admin`: puzzle management, media upload, analytics, review, system checks, notification testing

Representative routes:

- `GET /api/puzzles`
- `POST /api/puzzles/[id]/submit`
- `GET /api/teams`
- `POST /api/teams`
- `GET /api/leaderboards/global`
- `POST /api/auth/register`
- `GET /api/user/profile`
- `GET /api/user/notifications`
- `GET /api/forum/posts`
- `GET /api/escape-rooms`
- `GET /api/admin/puzzles`

If you need the authoritative surface, inspect `src/app/api` directly. Route counts and delivery summaries in older markdown files are historical snapshots, not a live API contract.

## Development Notes

- Auth configuration lives in `src/lib/auth.ts`.
- Prisma client setup lives in `src/lib/prisma.ts`.
- The root providers in `src/providers.tsx` wire session handling, navigation, achievement modals, team lobby invites, and socket-driven notifications.
- The database schema is large and feature-rich; prefer `prisma/schema.prisma` over older architecture summaries when details conflict.

## Documentation

- `API_REFERENCE.md` - current route inventory for `src/app/api`
- `DOCUMENTATION_INDEX.md` - project-wide documentation map
- `README_DOCS_INDEX.md` - notification/email subsystem docs
- `README_MEDIA.md` - media upload subsystem docs
- `TEAM_PUZZLE_INDEX.md` - team puzzle docs
- `PUZZLE_CONSTRAINT_MASTER_INDEX.md` - puzzle constraint docs

Several top-level delivery and completion reports remain in the repository as historical records. Use this README, `DOCUMENTATION_INDEX.md`, `package.json`, `prisma/schema.prisma`, and the code under `src/` as the current source of truth.

## Contributing

1. Make focused changes.
2. Run the relevant validation for the subsystem you touched.
3. Prefer updating current docs over adding another delivery-summary file.
4. If removing a feature, follow `.github/REMOVAL_GUIDELINES.md` and the PR checklist.
Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
