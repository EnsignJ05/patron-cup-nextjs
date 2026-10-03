-- Task H8 (TEST_ENVIRONMENT_PLAN.md Part IV, section 22 / findings 21.1, 21.3, 20.7.5).
--
-- MANUAL STEP FIRST, outside this file: pg_dump each table below being dropped to a file
-- stored outside the database, per this task's own instruction. This migration does not
-- do that part -- it's a pg_dump/CLI step, not SQL.
--   pg_dump --data-only --table=public.match_bandon --table=public.player
--     --table=public.records_bandon --table=public.team_bandon
--     --table=public.branson_captains --table=public.branson_roster
--     --table=public.reround_signups <connection> > h8_dropped_tables_backup.sql
--
-- Code-side prerequisite already done: Part III Task R0 deleted every route/component
-- that read match_bandon/player/records_bandon/team_bandon/branson_* (confirmed via a
-- full source grep -- zero references remain anywhere in src/). reround_signups was
-- never read by any live code (20.7.4 decided to keep rerounds' denormalized
-- player1-4_id columns instead). Safe to drop the tables now.

-- Drop order respects the one real cross-dependency among these: records_bandon and
-- team_bandon both have a FK to player(id), so they go first. Everything else here is
-- already confirmed to have zero inbound FKs from any other table.
DROP TABLE IF EXISTS public.records_bandon CASCADE;
DROP TABLE IF EXISTS public.team_bandon CASCADE;
DROP TABLE IF EXISTS public.branson_captains CASCADE;
DROP TABLE IF EXISTS public.branson_roster CASCADE;
DROP TABLE IF EXISTS public.reround_signups CASCADE;
DROP TABLE IF EXISTS public.match_bandon CASCADE;
DROP TABLE IF EXISTS public.player CASCADE;

-- 20.7.5, corrected: the "updated_at has no triggers" half of this finding was already
-- wrong by the time H8 was written -- the real baseline (not the hand-pasted export) shows
-- a shared public.update_updated_at() trigger already attached to all 10 tables that need
-- one (courses, event_participants, events, lodging, matches, players, rerounds,
-- round_scores, teams, travel_info), and match_results_pending's updated_at is
-- deliberately trigger-less because its SECURITY DEFINER RPCs already set it explicitly.
-- Nothing to add there.
--
-- The nullability half was real, though: every created_at/updated_at below has
-- DEFAULT now() but still allows NULL. Reconcile any existing NULL first (defensive --
-- the default makes this a no-op in practice), then add NOT NULL. Skips tables just
-- dropped above and match_results_pending/ceremony_award_nominations.created_at, which
-- the baseline already has NOT NULL on.

UPDATE public.course_holes SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.course_holes ALTER COLUMN created_at SET NOT NULL;

UPDATE public.courses SET created_at = now() WHERE created_at IS NULL;
UPDATE public.courses SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.courses
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.event_participants SET created_at = now() WHERE created_at IS NULL;
UPDATE public.event_participants SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.event_participants
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.events SET created_at = now() WHERE created_at IS NULL;
UPDATE public.events SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.events
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.hole_scores SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.hole_scores ALTER COLUMN created_at SET NOT NULL;

UPDATE public.lodging SET created_at = now() WHERE created_at IS NULL;
UPDATE public.lodging SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.lodging
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.lodging_assignments SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.lodging_assignments ALTER COLUMN created_at SET NOT NULL;

UPDATE public.match_players SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.match_players ALTER COLUMN created_at SET NOT NULL;

UPDATE public.matches SET created_at = now() WHERE created_at IS NULL;
UPDATE public.matches SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.matches
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.players SET created_at = now() WHERE created_at IS NULL;
UPDATE public.players SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.players
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.team_captains SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.team_captains ALTER COLUMN created_at SET NOT NULL;

UPDATE public.team_rosters SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.team_rosters ALTER COLUMN created_at SET NOT NULL;

UPDATE public.teams SET created_at = now() WHERE created_at IS NULL;
UPDATE public.teams SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.teams
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.rerounds SET created_at = now() WHERE created_at IS NULL;
UPDATE public.rerounds SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.rerounds
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.round_scores SET created_at = now() WHERE created_at IS NULL;
UPDATE public.round_scores SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.round_scores
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.travel_info SET created_at = now() WHERE created_at IS NULL;
UPDATE public.travel_info SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.travel_info
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;
