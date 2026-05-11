-- Remove legacy Dead Drop persistence table now that Debrief is scenario-only.
DROP TABLE IF EXISTS "dead_drop_results";
