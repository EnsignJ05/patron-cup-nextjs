-- Found while building the E2E test suite (see e2e/README.md / the approved plan at
-- ~/.claude/plans/luminous-hatching-pancake.md), not part of Phase H: admin/lodging's
-- saveAllAssignments does an unguarded DELETE-then-INSERT with no transaction. If the
-- insert fails after the delete already committed, every assignment for that room is lost
-- irrecoverably, and the admin only sees an error toast with no way to recover the prior
-- state.
--
-- SECURITY INVOKER (the default -- no "SECURITY DEFINER" below), deliberately: this runs
-- with the CALLING user's own permissions, so the existing RLS policies
-- (lodging_assignments_insert_committee / _delete_committee, both requiring
-- is_committee_or_admin()) continue to enforce authorization exactly as before. No new
-- privilege escalation, just atomicity -- a single function call is one transaction, so a
-- failing insert rolls back the delete too.

CREATE OR REPLACE FUNCTION public.set_lodging_assignments(p_lodging_id uuid, p_assignments jsonb)
    RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.lodging_assignments WHERE lodging_id = p_lodging_id;

  INSERT INTO public.lodging_assignments (lodging_id, player_id, confirmation_num, is_primary)
  SELECT
    p_lodging_id,
    (a->>'player_id')::uuid,
    a->>'confirmation_num',
    (a->>'is_primary')::boolean
  FROM jsonb_array_elements(p_assignments) AS a;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_lodging_assignments(uuid, jsonb) TO authenticated;
