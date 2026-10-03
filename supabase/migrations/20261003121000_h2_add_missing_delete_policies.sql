-- Task H2 item 3 (TEST_ENVIRONMENT_PLAN.md Part IV, section 22): nine admin delete
-- buttons have had no matching DELETE policy since RLS was enabled, so every one of
-- them has always silently no-op'd (confirmed via H0 query 1 -- RLS is enabled on all
-- 26 tables, and a separate policy inventory found zero DELETE policies on these nine).
--
-- Role level on each policy matches that table's existing INSERT/UPDATE policies, not
-- a blanket choice: `events` and `players` only ever grant insert/update to is_admin(),
-- so delete matches that; everything else already grants insert/update to
-- is_committee_or_admin(), so delete matches that instead.

CREATE POLICY events_delete_admin ON public.events
    FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY players_delete_admin ON public.players
    FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY teams_delete_committee ON public.teams
    FOR DELETE TO authenticated USING (public.is_committee_or_admin());

CREATE POLICY matches_delete_committee ON public.matches
    FOR DELETE TO authenticated USING (public.is_committee_or_admin());

CREATE POLICY courses_delete_committee ON public.courses
    FOR DELETE TO authenticated USING (public.is_committee_or_admin());

CREATE POLICY lodging_delete_committee ON public.lodging
    FOR DELETE TO authenticated USING (public.is_committee_or_admin());

CREATE POLICY travel_info_delete_committee ON public.travel_info
    FOR DELETE TO authenticated USING (public.is_committee_or_admin());

CREATE POLICY rerounds_delete_committee ON public.rerounds
    FOR DELETE TO authenticated USING (public.is_committee_or_admin());

CREATE POLICY event_participants_delete_committee ON public.event_participants
    FOR DELETE TO authenticated USING (public.is_committee_or_admin());
