-- Remove duplicate 'E2E Tester' users, keep the earliest createdAt
DELETE FROM users
WHERE name = 'E2E Tester'
  AND id NOT IN (
    SELECT id FROM users WHERE name = 'E2E Tester' ORDER BY "createdAt" ASC LIMIT 1
  );
