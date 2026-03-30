# Puzzle Warz API Reference

This document is the current route inventory for the App Router API under `src/app/api`.

## Scope

- Source of truth: route handler files in `src/app/api/**/route.ts`
- Dynamic segments are shown in Next.js format such as `[id]` and `[inviteId]`
- HTTP methods are listed from the exported handlers in each route file
- Special case: `/api/auth/[...nextauth]` exports `GET` and `POST` through a shared NextAuth handler

When this file conflicts with implementation, prefer the code in `src/app/api`.

## Admin

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/admin/analytics` | `GET` | Fetch admin dashboard metrics, leaderboard slices, and recent solve activity. |
| `/api/admin/check` | `GET` | Check whether the current signed-in user has admin privileges. |
| `/api/admin/import-image` | `POST` | Import a remote image into a jigsaw puzzle and update its stored image URL. |
| `/api/admin/media` | `POST`, `DELETE` | Upload or remove puzzle media assets and related stored files. |
| `/api/admin/puzzles` | `GET`, `POST` | List puzzles for admin management or create a new puzzle with type-specific config. |
| `/api/admin/puzzles/[id]` | `DELETE` | Delete a puzzle and clean up non-cascading references before removal. |
| `/api/admin/reviews` | `GET` | Fetch the latest written puzzle reviews for moderation or analysis. |
| `/api/admin/send-notification` | `POST` | Trigger admin-only test or manual notification sends for supported notification types. |

## ARG

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/arg/phases` | `GET`, `POST` | List published ARG phases with puzzles or create a new ARG phase. |
| `/api/arg/puzzles/create` | `POST` | Create a new ARG puzzle inside a specific phase. |

## Auth

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/auth/[...nextauth]` | `GET`, `POST` | Handle NextAuth session, callback, and credentials authentication flows. |
| `/api/auth/logout` | `GET` | Clear NextAuth cookies for a hard logout response. |
| `/api/auth/register` | `POST` | Register a new user account, process referrals, and optionally start email verification. |
| `/api/auth/resend-verification` | `POST` | Reissue an email verification link for an existing unverified account. |
| `/api/auth/signout` | `POST` | Return a sign-out success response for client-side logout flows. |
| `/api/auth/verify-email` | `POST` | Validate an email verification token and mark the account as verified. |

## Debug

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/debug/users` | `GET` | Return a simple user list for development or debugging checks. |

## Escape Rooms

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/escape-rooms` | `GET` | List stored escape room records with their linked base puzzles. |
| `/api/escape-rooms/[id]` | `GET`, `PUT`, `DELETE` | Read, update, or delete a specific escape room record. |
| `/api/escape-rooms/create` | `POST` | Create a basic escape room record linked to an existing puzzle. |
| `/api/escape-rooms/designer` | `POST` | Create an escape room from the visual designer payload, including scenes and hotspots. |
| `/api/escape-rooms/designer/[id]` | `GET`, `PUT` | Load or persist the full designer configuration for an escape room. |

## Forum

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/forum/posts` | `GET`, `POST` | List forum threads or create a new thread, optionally linked to a puzzle. |
| `/api/forum/posts/[id]` | `GET`, `POST` | Read a thread with comments or add a comment or reply to it. |
| `/api/forum/vote/comment` | `POST` | Add, switch, or remove an upvote or downvote on a forum comment. |
| `/api/forum/vote/post` | `POST` | Add, switch, or remove an upvote or downvote on a forum post. |

## Image Proxy

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/image-proxy` | `GET` | Proxy or serve allowed local and remote media to avoid client CORS issues. |

## Leaderboards

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/leaderboards/global` | `GET` | Return ranked individual standings based on solved-puzzle points. |
| `/api/leaderboards/teams` | `GET` | Return ranked team standings based on aggregate member progress. |

## Puzzle Taxonomy

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/puzzle-categories` | `GET` | List puzzle categories with active-puzzle counts. |
| `/api/puzzle-subcategories` | `GET`, `POST` | List subcategories, optionally by category, or create a new subcategory. |
| `/api/puzzle-subcategories/[id]` | `PATCH`, `DELETE` | Rename, edit, or delete an existing puzzle subcategory. |

## Puzzles

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/puzzles` | `GET` | List active puzzles with filtering, sorting, progress, and lockout metadata. |
| `/api/puzzles/[id]` | `GET` | Load the full public payload for one puzzle, including media and type-specific data. |
| `/api/puzzles/[id]/detective/state` | `GET` | Return the player's current detective-case stage, solved status, and lockout state. |
| `/api/puzzles/[id]/detective/submit` | `POST` | Submit a detective-case stage answer and advance or permanently lock the case. |
| `/api/puzzles/[id]/hints` | `GET`, `POST` | List puzzle hints with usage history or reveal a hint for the current user. |
| `/api/puzzles/[id]/hints/update-effectiveness` | `POST` | Mark recently used hints as contributing to a successful solve. |
| `/api/puzzles/[id]/progress` | `GET`, `POST` | Read or update per-user puzzle progress, sessions, attempts, and lock states. |
| `/api/puzzles/[id]/submit` | `POST` | Validate a standard puzzle answer, including type-specific answer rules. |
| `/api/puzzles/escape-room/[id]` | `GET` | Load the playable escape-room package for a team's current run. |
| `/api/puzzles/escape-room/[id]/action` | `POST` | Process interactive escape-room actions such as hotspot use and item pickup flows. |
| `/api/puzzles/escape-room/[id]/session` | `POST` | Update escape-room run session state like briefing acknowledgements and run control. |
| `/api/puzzles/escape-room/[id]/state` | `GET` | Return live team escape-room run state, inventory, and fail or completion status. |
| `/api/puzzles/escape-room/[id]/submit` | `POST` | Submit an escape-room stage answer and advance team progress when valid. |
| `/api/puzzles/rate` | `GET`, `POST` | Read the current user's rating for a puzzle or create or update a rating. |
| `/api/puzzles/ratings-stats` | `GET` | Return aggregate rating counts, average score, and distribution for one puzzle. |
| `/api/puzzles/relay/create` | `POST` | Create a new relay-riddle room with seeded puzzle data. |
| `/api/puzzles/relay/join` | `POST` | Join a relay room as the solver or decoder and get the role-specific view. |
| `/api/puzzles/relay/message` | `POST` | Send a chat message inside a relay-riddle room. |
| `/api/puzzles/relay/messages` | `GET` | Fetch the ordered message history for a relay-riddle room. |
| `/api/puzzles/relay/state` | `GET` | Fetch relay-room participants, status, and readiness state. |
| `/api/puzzles/relay/submit-answer` | `POST` | Submit the solver's intermediate answer or key for the relay puzzle. |
| `/api/puzzles/relay/submit-solution` | `POST` | Submit the decoder's final solution and mark the relay room solved. |

## Sudoku

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/sudoku/generate` | `POST` | Generate a Sudoku puzzle and solution on the server. |

## Team Lobby and Collaborative Puzzle Flow

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/team/lobby` | `GET`, `POST`, `DELETE` | Read, manage, or delete team lobby state including invites, readiness, and start or reset actions. |
| `/api/team/lobby/chat` | `GET`, `POST`, `DELETE` | Read, post, or moderate chat messages tied to a team puzzle lobby. |
| `/api/team/puzzles/assign-parts` | `GET`, `POST` | Read or create team member assignments for multipart team puzzles. |
| `/api/team/puzzles/submit-part` | `GET`, `POST` | Read team puzzle submission status or submit an assigned part answer. |
| `/api/team/puzzles/validate` | `GET` | Validate whether a team's size and puzzle shape make the puzzle attemptable. |

## Teams

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/teams` | `GET`, `POST` | List visible teams or create a new team with the creator as admin. |
| `/api/teams/[id]` | `GET` | Return a team profile, respecting public visibility and member-only access rules. |
| `/api/teams/[id]/applications` | `GET` | List pending join applications for a team admin or moderator. |
| `/api/teams/[id]/applications/[inviteId]` | `POST` | Approve or deny a pending team application. |
| `/api/teams/[id]/apply` | `POST` | Submit a join request for a public team. |
| `/api/teams/[id]/invite-status` | `GET` | Check the current user's invite or application status for a team. |
| `/api/teams/[id]/members/[memberId]` | `DELETE` | Remove a team member as an admin or moderator. |
| `/api/teams/[id]/membership` | `GET`, `DELETE` | Check the current user's team role or leave the team. |
| `/api/teams/invitations` | `GET`, `POST` | List incoming team invitations or send invitations by display name. |
| `/api/teams/invitations/[id]` | `POST` | Accept or decline a specific team invitation. |
| `/api/teams/invite` | `POST` | Send a direct team invitation to a specific user ID. |
| `/api/teams/user-teams` | `GET` | Return a lightweight list of teams the current user belongs to. |

## User

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/user/achievements` | `GET` | Return achievement definitions plus calculated progress for the current user. |
| `/api/user/achievements/collect` | `POST` | Claim an eligible achievement for the current user. |
| `/api/user/achievements/notify` | `POST` | Create an in-app notification for an achievement unlock. |
| `/api/user/activity` | `GET`, `POST` | Read the user's activity feed or log a new activity entry. |
| `/api/user/activity/[id]` | `DELETE` | Delete one activity item owned by the current user. |
| `/api/user/avatar` | `POST` | Upload an avatar image and set it as the user's profile picture. |
| `/api/user/inbox` | `GET` | Return recent direct-message threads with unread counts. |
| `/api/user/info` | `GET` | Return the authenticated user's core ID and role, creating a lightweight record if needed. |
| `/api/user/invite` | `GET` | List referral invites and referral conversion results for the current user. |
| `/api/user/invite/generate` | `POST` | Generate a new referral invite code and invite URL. |
| `/api/user/notification-preferences` | `GET`, `PUT` | Read or update email and digest notification preferences. |
| `/api/user/notifications` | `GET`, `POST`, `DELETE` | Read, create, or delete the current user's notifications. |
| `/api/user/notifications/read` | `PATCH` | Mark selected notifications, or all notifications, as read. |
| `/api/user/profile` | `GET`, `PUT` | Read or update the current user's public profile details. |
| `/api/user/puzzles` | `GET` | Return the user's archived solved or failed puzzles. |
| `/api/user/settings` | `GET`, `PUT` | Read or update UI and accessibility preference settings. |
| `/api/user/stats` | `GET` | Return summary stats like solves, points, teams, and rank. |
| `/api/user/team-admin` | `GET` | Resolve the user's available teams and admin status for team-puzzle flows. |
| `/api/user/update-name` | `POST` | Change the user's display name under the one-time rename rules. |
| `/api/user/upload-avatar` | `POST` | Upload an avatar image through the alternate avatar upload flow. |

## Users

| Route | Methods | Purpose |
|------|---------|---------|
| `/api/users` | `GET` | Search or browse user profiles with summary stats. |
| `/api/users/count` | `GET` | Return the total user count for authenticated callers. |
| `/api/users/[id]` | `GET` | Return a public user profile with achievements, teams, and follow state. |
| `/api/users/[id]/follow` | `POST` | Follow or unfollow another user. |
| `/api/users/[id]/messages` | `GET`, `POST`, `DELETE` | Read a conversation, send a direct message, or clear conversation history. |

## Maintenance

When routes change:

1. Update this file.
2. Update `README.md` only if the namespace overview changes materially.
3. Prefer this file over scattering route inventories through feature delivery reports.