-- Task H7 (TEST_ENVIRONMENT_PLAN.md Part IV, section 22 / findings 20.8.2-20.8.4): RLS
-- performance rewrite. Highest-regression task in Phase H, so every claim below was
-- read directly out of supabase/migrations/00000000000000_baseline_schema.sql's real
-- CREATE POLICY statements first (learned from H5/H6's audit-text misses) -- all three
-- findings checked out exactly against the real policies, unlike 20.7.1/20.8.1.
--
-- No behavior change anywhere in this file: every USING/WITH CHECK expression below is
-- logically equivalent to what it replaces, just evaluated once per statement instead of
-- once per row (20.8.2: wrap auth.uid() so Postgres hoists it into an InitPlan, or reuse
-- the already-STABLE current_player_id()/is_admin()/is_committee_or_admin() helpers),
-- with fewer separate permissive policies doing the OR'ing (20.8.3), scoped away from
-- `public`/anon where the policy can never actually pass for anon anyway (20.8.4).

-- ── 20.8.2: wrap bare auth.uid() so it's evaluated once, not per row ───────────────────

-- players_update_own's own-row check gets the same auth.uid() wrap, but it's folded
-- directly into the 20.8.3 merge below (it's being merged with players_update_committee
-- into one policy anyway) rather than altered here and immediately replaced there.
--
-- The two profiles own-row policies have no committee counterpart to merge with, so
-- they're a rewrite only: can't use current_player_id() here (that function itself
-- queries players, which would be circular/pointless against profiles), so just wrap the
-- bare auth.uid() call directly.
ALTER POLICY "Users can read own profile" ON public.profiles
  USING ((SELECT auth.uid()) = id);

ALTER POLICY "Users can update own profile" ON public.profiles
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- reround_signups has no committee counterpart policy to merge with (20.8.3's merge list
-- doesn't include it), so these two are a rewrite only.
ALTER POLICY reround_signups_insert_own ON public.reround_signups
  WITH CHECK (player_id = public.current_player_id());

ALTER POLICY reround_signups_delete_own ON public.reround_signups
  USING (player_id = public.current_player_id());

-- ceremony_award_nominations_select_committee's EXISTS block re-derives exactly what
-- is_committee_or_admin() already computes, with a raw auth.uid() inside it.
ALTER POLICY ceremony_award_nominations_select_committee ON public.ceremony_award_nominations
  USING (public.is_committee_or_admin());

-- match_results_pending_select's first OR-branch has the same re-derivation; its second
-- branch already uses current_player_id() correctly, left untouched.
ALTER POLICY match_results_pending_select ON public.match_results_pending
  USING (
    public.is_committee_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = match_results_pending.match_id
        AND mp.player_id = public.current_player_id()
    )
  );

-- ── 20.8.3: merge redundant permissive policies (same two roles, same command) ─────────
-- Postgres OR's every matching permissive policy together regardless; one policy with an
-- OR'd expression is behaviorally identical to two separate ones and cheaper to evaluate.

DROP POLICY IF EXISTS players_update_committee ON public.players;
DROP POLICY IF EXISTS players_update_own ON public.players;
CREATE POLICY players_update_own_or_committee ON public.players
  FOR UPDATE TO authenticated
  USING (public.is_committee_or_admin() OR auth_user_id = (SELECT auth.uid()))
  WITH CHECK (public.is_committee_or_admin() OR auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS round_scores_insert_committee ON public.round_scores;
DROP POLICY IF EXISTS round_scores_insert_own ON public.round_scores;
CREATE POLICY round_scores_insert ON public.round_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_committee_or_admin() OR player_id = public.current_player_id());

DROP POLICY IF EXISTS round_scores_update_committee ON public.round_scores;
DROP POLICY IF EXISTS round_scores_update_own ON public.round_scores;
CREATE POLICY round_scores_update ON public.round_scores
  FOR UPDATE TO authenticated
  USING (public.is_committee_or_admin() OR player_id = public.current_player_id());

DROP POLICY IF EXISTS travel_info_insert_committee ON public.travel_info;
DROP POLICY IF EXISTS travel_info_insert_own ON public.travel_info;
CREATE POLICY travel_info_insert ON public.travel_info
  FOR INSERT TO authenticated
  WITH CHECK (public.is_committee_or_admin() OR player_id = public.current_player_id());

DROP POLICY IF EXISTS travel_info_update_committee ON public.travel_info;
DROP POLICY IF EXISTS travel_info_update_own ON public.travel_info;
CREATE POLICY travel_info_update ON public.travel_info
  FOR UPDATE TO authenticated
  USING (public.is_committee_or_admin() OR player_id = public.current_player_id());

DROP POLICY IF EXISTS hole_scores_insert_committee ON public.hole_scores;
DROP POLICY IF EXISTS hole_scores_insert_own ON public.hole_scores;
CREATE POLICY hole_scores_insert ON public.hole_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_committee_or_admin()
    OR round_score_id IN (
      SELECT id FROM public.round_scores WHERE player_id = public.current_player_id()
    )
  );

-- events/matches: the anon and authenticated SELECT policies have the identical USING
-- (true) expression already -- only the role list differs, so widen the existing policy
-- in place and drop the now-redundant anon-only one, instead of a full merge rewrite.
ALTER POLICY events_select_all ON public.events TO authenticated, anon;
DROP POLICY IF EXISTS "Enable Read for Anon" ON public.events;

ALTER POLICY matches_select_all ON public.matches TO authenticated, anon;
DROP POLICY IF EXISTS "Enable read access for anon" ON public.matches;

-- ── 20.8.4: scope public-role policies to authenticated ────────────────────────────────
-- Both tables' USING clauses already guard correctly (anon could never actually pass
-- either), so this isn't closing an exposure -- it just stops anon from evaluating these
-- subqueries on every request.

ALTER POLICY match_results_pending_select ON public.match_results_pending TO authenticated;
ALTER POLICY match_results_pending_no_delete ON public.match_results_pending TO authenticated;
ALTER POLICY match_results_pending_no_direct_write ON public.match_results_pending TO authenticated;
ALTER POLICY match_results_pending_no_update ON public.match_results_pending TO authenticated;

ALTER POLICY ceremony_award_nominations_insert_participant ON public.ceremony_award_nominations TO authenticated;
ALTER POLICY ceremony_award_nominations_select_committee ON public.ceremony_award_nominations TO authenticated;
