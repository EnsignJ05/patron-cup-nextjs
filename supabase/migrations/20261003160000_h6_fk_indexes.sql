-- Task H6 (TEST_ENVIRONMENT_PLAN.md Part IV, section 22 / finding 20.8.1): index
-- unindexed foreign-key columns. Postgres never creates an index for a FK automatically.
--
-- 20.8.1's own list assumed zero indexes exist beyond primary keys, which (same pattern
-- as the audit errors already found and corrected in H5) isn't true -- cross-checked
-- every FK column in that list directly against the baseline dump rather than trusting
-- either written summary first. A composite UNIQUE constraint's backing index already
-- covers lookups on its *leading* column (not later columns), so several of 20.8.1's
-- "missing" indexes already exist that way:
--   teams(event_id), team_captains(team_id), team_rosters(team_id)+(player_id) [explicit],
--   match_players(match_id), round_scores(player_id)+(event_id) [explicit],
--   hole_scores(round_score_id), travel_info(player_id)+(event_id) [explicit],
--   lodging_assignments(lodging_id), event_participants(event_id), course_holes(course_id),
--   matches(event_id) [explicit], reround_signups(reround_id),
--   match_results_pending(match_id) [explicit], ceremony_award_nominations(event_id) [explicit]
-- Only genuinely-missing columns are indexed below.
--
-- Not indexing round_scores(tee_time_id): no FK constraint exists for it at all --
-- tee_times doesn't exist as a table (20.6.3), so there's nothing to index, just a
-- dangling column tracked separately.
--
-- Not indexing reround_signups(player_id): the table is one of H8's drop targets
-- (20.7.4 decided to retire it in favor of the denormalized rerounds columns), still
-- pending. Indexing a table about to be dropped is wasted work.

CREATE INDEX IF NOT EXISTS idx_team_captains_player_id ON public.team_captains (player_id);

CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON public.match_players (player_id);
CREATE INDEX IF NOT EXISTS idx_match_players_team_id ON public.match_players (team_id);

CREATE INDEX IF NOT EXISTS idx_round_scores_course_id ON public.round_scores (course_id);

CREATE INDEX IF NOT EXISTS idx_lodging_event_id ON public.lodging (event_id);
CREATE INDEX IF NOT EXISTS idx_lodging_assignments_player_id ON public.lodging_assignments (player_id);

CREATE INDEX IF NOT EXISTS idx_event_participants_player_id ON public.event_participants (player_id);

CREATE INDEX IF NOT EXISTS idx_courses_event_id ON public.courses (event_id);

CREATE INDEX IF NOT EXISTS idx_matches_course_id ON public.matches (course_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner_team_id ON public.matches (winner_team_id);

CREATE INDEX IF NOT EXISTS idx_rerounds_event_id ON public.rerounds (event_id);
CREATE INDEX IF NOT EXISTS idx_rerounds_course_id ON public.rerounds (course_id);
CREATE INDEX IF NOT EXISTS idx_rerounds_player1_id ON public.rerounds (player1_id);
CREATE INDEX IF NOT EXISTS idx_rerounds_player2_id ON public.rerounds (player2_id);
CREATE INDEX IF NOT EXISTS idx_rerounds_player3_id ON public.rerounds (player3_id);
CREATE INDEX IF NOT EXISTS idx_rerounds_player4_id ON public.rerounds (player4_id);

CREATE INDEX IF NOT EXISTS idx_match_results_pending_winner_team_id ON public.match_results_pending (winner_team_id);
CREATE INDEX IF NOT EXISTS idx_match_results_pending_proposed_by ON public.match_results_pending (proposed_by_player_id);
CREATE INDEX IF NOT EXISTS idx_match_results_pending_confirmed_by ON public.match_results_pending (confirmed_by_player_id);
CREATE INDEX IF NOT EXISTS idx_match_results_pending_rejected_by ON public.match_results_pending (rejected_by_player_id);
CREATE INDEX IF NOT EXISTS idx_match_results_pending_superseded_by ON public.match_results_pending (superseded_by_proposal_id);

CREATE INDEX IF NOT EXISTS idx_ceremony_award_nominations_nominator ON public.ceremony_award_nominations (nominator_player_id);
CREATE INDEX IF NOT EXISTS idx_ceremony_award_nominations_nominated ON public.ceremony_award_nominations (nominated_player_id);
