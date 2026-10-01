-- Pending player-submitted match results + official lock on matches.
-- Safe to run if objects already exist (IF NOT EXISTS / OR REPLACE).

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS result_set_by_official boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.match_results_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  winner_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  is_halved boolean NOT NULL DEFAULT false,
  proposed_by_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  confirmed_by_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  rejected_by_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  superseded_by_proposal_id uuid REFERENCES public.match_results_pending(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'superseded', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  promoted_at timestamptz,
  CONSTRAINT match_results_pending_halved_consistency CHECK (
    (is_halved = true AND winner_team_id IS NULL)
    OR (is_halved = false AND winner_team_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_match_results_pending_match_id ON public.match_results_pending(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_pending_status ON public.match_results_pending(status);

CREATE UNIQUE INDEX IF NOT EXISTS match_results_pending_one_active
  ON public.match_results_pending (match_id)
  WHERE status = 'pending';

ALTER TABLE public.match_results_pending ENABLE ROW LEVEL SECURITY;

-- Helper: current player's id from JWT
CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.players WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_player_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: propose (player must be in match; after start; not official-locked)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.propose_match_result(
  p_match_id uuid,
  p_winner_team_id uuid,
  p_is_halved boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_old_id uuid;
  v_new_id uuid;
  v_locked boolean;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_players mp
    WHERE mp.match_id = p_match_id AND mp.player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  SELECT m.result_set_by_official
  INTO v_locked
  FROM public.matches m
  WHERE m.id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_locked THEN
    RAISE EXCEPTION 'Result was set by committee; player entry disabled';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = p_match_id
      AND (m.winner_team_id IS NOT NULL OR m.is_halved)
  ) THEN
    RAISE EXCEPTION 'Match already has a recorded result';
  END IF;

  IF (p_is_halved = true AND p_winner_team_id IS NOT NULL) OR (p_is_halved = false AND p_winner_team_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid winner/halved combination';
  END IF;

  IF p_is_halved = false AND p_winner_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = p_match_id AND mp.team_id = p_winner_team_id
    ) THEN
      RAISE EXCEPTION 'Winner must be one of the match teams';
    END IF;
  END IF;

  -- Supersede existing pending row
  UPDATE public.match_results_pending
  SET status = 'superseded', updated_at = now()
  WHERE match_id = p_match_id AND status = 'pending'
  RETURNING id INTO v_old_id;

  INSERT INTO public.match_results_pending (
    match_id, winner_team_id, is_halved, proposed_by_player_id, status, updated_at
  ) VALUES (
    p_match_id,
    CASE WHEN p_is_halved THEN NULL ELSE p_winner_team_id END,
    p_is_halved,
    v_player_id,
    'pending',
    now()
  )
  RETURNING id INTO v_new_id;

  IF v_old_id IS NOT NULL THEN
    UPDATE public.match_results_pending
    SET superseded_by_proposal_id = v_new_id, updated_at = now()
    WHERE id = v_old_id;
  END IF;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.propose_match_result(uuid, uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: confirm (opponent, not proposer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_match_result_from_pending(p_pending_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_row public.match_results_pending%ROWTYPE;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.match_results_pending
  WHERE id = p_pending_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Proposal is not pending';
  END IF;

  IF v_row.proposed_by_player_id = v_player_id THEN
    RAISE EXCEPTION 'Cannot confirm your own proposal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_players mp
    WHERE mp.match_id = v_row.match_id AND mp.player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = v_row.match_id AND m.result_set_by_official = true
  ) THEN
    RAISE EXCEPTION 'Result was set by committee';
  END IF;

  UPDATE public.matches
  SET
    winner_team_id = v_row.winner_team_id,
    is_halved = v_row.is_halved,
    result_set_by_official = false,
    updated_at = now()
  WHERE id = v_row.match_id;

  UPDATE public.match_results_pending
  SET
    status = 'confirmed',
    confirmed_by_player_id = v_player_id,
    confirmed_at = now(),
    promoted_at = now(),
    updated_at = now()
  WHERE id = p_pending_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_match_result_from_pending(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: reject (opponent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_match_result_pending(p_pending_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_row public.match_results_pending%ROWTYPE;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.match_results_pending
  WHERE id = p_pending_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Proposal is not pending';
  END IF;

  IF v_row.proposed_by_player_id = v_player_id THEN
    RAISE EXCEPTION 'Use withdraw for your own proposal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_players mp
    WHERE mp.match_id = v_row.match_id AND mp.player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  UPDATE public.match_results_pending
  SET
    status = 'rejected',
    rejected_by_player_id = v_player_id,
    updated_at = now()
  WHERE id = p_pending_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_match_result_pending(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: withdraw (proposer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_match_result_pending(p_pending_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_row public.match_results_pending%ROWTYPE;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.match_results_pending
  WHERE id = p_pending_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Proposal is not pending';
  END IF;

  IF v_row.proposed_by_player_id <> v_player_id THEN
    RAISE EXCEPTION 'Only the proposer can withdraw';
  END IF;

  UPDATE public.match_results_pending
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_pending_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdraw_match_result_pending(uuid) TO authenticated;

-- RLS: participants and committee can read
DROP POLICY IF EXISTS "match_results_pending_select" ON public.match_results_pending;
CREATE POLICY "match_results_pending_select" ON public.match_results_pending
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.auth_user_id = auth.uid() AND p.role IN ('committee', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = match_results_pending.match_id
        AND mp.player_id = public.current_player_id()
    )
  );

-- No direct insert/update/delete from clients; RPCs use SECURITY DEFINER
DROP POLICY IF EXISTS "match_results_pending_no_direct_write" ON public.match_results_pending;
CREATE POLICY "match_results_pending_no_direct_write" ON public.match_results_pending
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "match_results_pending_no_update" ON public.match_results_pending;
CREATE POLICY "match_results_pending_no_update" ON public.match_results_pending
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "match_results_pending_no_delete" ON public.match_results_pending;
CREATE POLICY "match_results_pending_no_delete" ON public.match_results_pending
  FOR DELETE USING (false);

-- ---------------------------------------------------------------------------
-- RPC: official result (committee/admin); cancels pending rows for the match
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_official_match_result(
  p_match_id uuid,
  p_winner_team_id uuid,
  p_is_halved boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE auth_user_id = auth.uid() AND role IN ('committee', 'admin')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_is_halved AND p_winner_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid winner/halved combination';
  END IF;

  IF NOT p_is_halved AND p_winner_team_id IS NULL THEN
    -- clear result
    UPDATE public.matches
    SET
      winner_team_id = null,
      is_halved = false,
      result_set_by_official = true,
      updated_at = now()
    WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
    SET
      winner_team_id = CASE WHEN p_is_halved THEN null ELSE p_winner_team_id END,
      is_halved = p_is_halved,
      result_set_by_official = true,
      updated_at = now()
    WHERE id = p_match_id;
  END IF;

  UPDATE public.match_results_pending
  SET status = 'cancelled', updated_at = now()
  WHERE match_id = p_match_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_official_match_result(uuid, uuid, boolean) TO authenticated;
