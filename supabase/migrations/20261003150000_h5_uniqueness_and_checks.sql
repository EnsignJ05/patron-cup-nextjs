-- Task H5 (TEST_ENVIRONMENT_PLAN.md Part IV, section 22 / findings 20.7.1-20.7.3).
--
-- Correction found while writing this migration: 20.7.1's audit (based on a hand-pasted
-- dashboard export) claimed none of the 11 join tables had a uniqueness constraint. The
-- real pg_dump baseline already captured in this repo shows 9 of them already do:
-- team_rosters, match_players, team_captains, lodging_assignments, event_participants,
-- reround_signups, course_holes, hole_scores, and ceremony_award_nominations all already
-- have one (see supabase/migrations/00000000000000_baseline_schema.sql).
--
-- Second correction, found only after a failed run against test: `teams` ALSO already has
-- one (teams_event_id_name_key, baseline line ~1312) -- missed on the first pass because the
-- search for it used a \b-word-boundary regex, and "teams" has no word boundary before the
-- "_" in "teams_event_id_name_key" (underscore counts as a word character). Re-verified every
-- other constraint/index name in this file directly against the baseline text (not a regex
-- search) and confirmed none of the other 7 have the same problem. Only `matches
-- (event_id, match_number)` genuinely lacks a uniqueness constraint.
--
-- Not blindly deduping matches first, unlike the plan's general guidance for this task: it
-- has children that CASCADE on delete (match_players, match_results_pending), so an
-- automatic "keep the earliest row" pick could silently destroy real scheduled-player data
-- attached to whichever duplicate gets deleted. If the ADD CONSTRAINT below fails, that means
-- a real duplicate exists -- investigate which rows and what's attached to each before
-- deciding which to keep, rather than re-running this with a guessed DELETE.

ALTER TABLE public.matches
  ADD CONSTRAINT matches_event_id_match_number_key UNIQUE (event_id, match_number);

-- 20.7.2: only one event should be active at a time (the home page's pre-trip/on-trip
-- switch assumes a single row). Defensively collapse to one active event first in case
-- more than one already is, keeping whichever was most recently updated.
UPDATE public.events
SET is_active = false
WHERE is_active = true
  AND id <> (
    SELECT id FROM public.events WHERE is_active = true
    ORDER BY updated_at DESC NULLS LAST, id DESC
    LIMIT 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS events_one_active ON public.events (is_active) WHERE is_active;

-- 20.7.3: CHECK constraints. course_holes' (hole_number, par ranges) and hole_scores'
-- (hole_number range) already exist in the baseline -- only strokes/penalty_strokes and
-- the other tables below are actually missing.
--
-- Not included, decided while writing this migration rather than applied blindly:
-- - players.status: moot, the column was dropped in H3.
-- - event_participants.status / payment_status: these columns are completely unused --
--   no code anywhere reads or writes either one (confirmed via a full source grep). With
--   no real call site defining what values are actually valid, a CHECK constraint here
--   would be inventing a business rule rather than encoding one that already exists.
-- - matches.match_type: the plan assumed matchFormatConfig.ts defines a closed set it
--   does not -- that file pattern-matches a few known phrases and falls back to a
--   generic default for anything else, and admin/matches/page.tsx's own UI explicitly
--   keeps whatever non-standard match_type a row already has as a selectable option
--   (line ~334's fallback MenuItem). A CHECK constraint limited to the 2 standard values
--   would reject real, intentionally-supported historical data.

ALTER TABLE public.matches
  ADD CONSTRAINT matches_halved_xor_winner CHECK (NOT (is_halved AND winner_team_id IS NOT NULL));

ALTER TABLE public.events
  ADD CONSTRAINT events_end_after_start CHECK (end_date >= start_date);

ALTER TABLE public.lodging
  ADD CONSTRAINT lodging_checkout_after_checkin CHECK (check_out_date >= check_in_date);

ALTER TABLE public.hole_scores
  ADD CONSTRAINT hole_scores_strokes_positive CHECK (strokes > 0),
  ADD CONSTRAINT hole_scores_penalty_nonnegative CHECK (penalty_strokes >= 0);

ALTER TABLE public.round_scores
  ADD CONSTRAINT round_scores_total_positive CHECK (total_score > 0);
