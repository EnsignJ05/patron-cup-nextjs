-- Task H3 (TEST_ENVIRONMENT_PLAN.md Part IV, section 22): resolve the players.is_active
-- / players.status split-brain by standardizing on is_active, the direction Part III's
-- admin redesign already took in code across 5 pages (travel/lodging/teams/matches-setup/
-- participants) -- not the plan's original "standardize on status" draft, which this
-- migration supersedes. See TEST_ENVIRONMENT_PLAN.md's Task H3 note and
-- [[patron-cup-hifi-redesign]]/[[project_schema_audit]] memory for why the direction
-- flipped.
--
-- `status` has been the only column anything ever wrote (is_active defaults true at
-- insert and nothing updated it after), so it's the real source of truth being
-- reconciled FROM here, even though is_active is the column becoming canonical. This
-- also collapses status's three values (active/inactive/pending) onto a boolean --
-- "pending" already behaved identically to "inactive" everywhere that filtered on
-- status = 'active' (every public page did exactly that, nothing branched on pending
-- specifically except the admin players page's display label).

-- 1. Reconcile: derive is_active from status for every row before status disappears.
UPDATE public.players SET is_active = (status = 'active');
UPDATE public.players SET is_active = true WHERE is_active IS NULL;

-- 2. Anon could SELECT players.status (public roster/players listings filter on it as
--    an unauthenticated visitor) -- grant the replacement column before the old one
--    disappears under it. See supabase/migrations/20260927120000_players_pii_column_grants.sql.
GRANT SELECT (is_active) ON public.players TO anon;

-- 3. Drop the column being retired. Implicitly revokes anon's now-pointless grant on it.
ALTER TABLE public.players DROP COLUMN status;

-- 4. Harden is_active the same way the plan originally wanted status hardened.
ALTER TABLE public.players
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true;
