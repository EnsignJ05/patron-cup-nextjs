-- Task H1 (TEST_ENVIRONMENT_PLAN.md Part IV, section 22): put is_admin() and
-- is_committee_or_admin() in version control with the same hardening
-- current_player_id() already has (STABLE, SET search_path). No behavior change --
-- both bodies already schema-qualify every reference (public.players, auth.uid()), so
-- this only closes the STABLE/search_path gap found via H0 query 7, it doesn't fix a
-- live vulnerability.
--
-- Bodies captured verbatim from the production pg_dump (see TEST_ENVIRONMENT_PLAN.md
-- section 24) -- only the function attributes change, not the SQL inside.

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.players
    where auth_user_id = auth.uid()
    and role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_committee_or_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.players
    where auth_user_id = auth.uid()
    and role in ('committee', 'admin')
  );
$$;
