-- Clamp any existing negative balances to 0
UPDATE "users" SET "totalPoints" = 0 WHERE "totalPoints" < 0;

-- Prevent totalPoints from ever going below 0 at the DB level
ALTER TABLE "users" ADD CONSTRAINT "users_totalPoints_nonnegative" CHECK ("totalPoints" >= 0);
