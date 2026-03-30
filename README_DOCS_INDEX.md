# Notification Documentation Index

This index covers the email and in-app notification subsystem.

## Current Status

The notification subsystem is implemented in the live codebase. It includes:

- SMTP and email helper logic in `src/lib/mail.ts`
- notification orchestration in `src/lib/notification-service.ts`
- user notification preference management
- user notification list, delete, and mark-as-read endpoints
- an admin notification test endpoint
- a settings UI component and notification UI surface

Project-wide route counts and old delivery metrics are intentionally omitted here because they age quickly.

## Where to Start

1. `QUICK_START.md` for copy-paste examples and integration snippets
2. `src/lib/NOTIFICATION_SYSTEM_README.md` for architecture and behavior
3. `src/lib/EMAIL_INTEGRATION_GUIDE.md` for trigger integration guidance
4. `STATUS_REPORT.md` for the current subsystem status summary

## Code Map

### Library Code

- `src/lib/mail.ts` - outbound email helpers and templates
- `src/lib/notification-service.ts` - notification creation and trigger helpers
- `src/lib/auth.ts` - session/auth utilities used by route handlers
- `src/lib/prisma.ts` - Prisma client singleton

### API Endpoints

- `GET /api/user/notification-preferences`
- `PUT /api/user/notification-preferences`
- `GET /api/user/notifications`
- `POST /api/user/notifications`
- `DELETE /api/user/notifications`
- `PATCH /api/user/notifications/read`
- `POST /api/admin/send-notification`

### UI Surface

- `src/components/NotificationSettings.tsx`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/NotificationsPanel.tsx`
- `src/app/notifications/page.tsx`

## By Use Case

### I need to wire notification triggers into another feature

Read `QUICK_START.md` first, then `src/lib/EMAIL_INTEGRATION_GUIDE.md`.

### I need to understand the subsystem design

Read `src/lib/NOTIFICATION_SYSTEM_README.md`, then inspect `src/lib/notification-service.ts`.

### I need to test the feature

Use `POST /api/admin/send-notification` and the user notification endpoints.

### I need to troubleshoot user preferences or inbox behavior

Check:

- `STATUS_REPORT.md`
- `src/app/api/user/notification-preferences/route.ts`
- `src/app/api/user/notifications/route.ts`
- `src/app/api/user/notifications/read/route.ts`

## Database Notes

The notification subsystem relies on the Prisma models in `prisma/schema.prisma`, including:

- `Notification`
- `NotificationPreference`
- the `User.notificationPreference` relation

The project now uses PostgreSQL. Older docs that mention MySQL describe an earlier deployment phase.

## Historical Docs

Files such as `FINAL_DELIVERY.md` and `PHASE_4_COMPLETE.md` remain useful as implementation history, but they should not be treated as the current operational contract for this subsystem.
