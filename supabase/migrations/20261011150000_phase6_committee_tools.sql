-- Phase 6 of LIVE_SCORING_PLAN.md: committee tools backing /admin/scores --
-- format/allowance admin (Task P6.3) and dispute resolution (Task P6.1).
-- Settling a match "as of thru X" (Task P6.2) and hole-level override (Task P6.1)
-- reuse existing RPCs (set_official_match_result, upsert_match_hole_score) from the
-- client, so no new SQL is needed for those.
-- Safe to run repeatedly (IF NOT EXISTS / OR REPLACE throughout).

-- ---------------------------------------------------------------------------
-- Internal helper: the handicap-snapshot arithmetic extracted out of
-- start_match_scorecard so set_match_scorecard_format can reuse it when the
-- committee changes a scorecard's allowance after the fact. Not part of the public
-- RPC surface (no GRANT to authenticated) -- only called from other
-- SECURITY DEFINER functions in this file.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_match_player_handicaps(p_match_id uuid, p_allowance numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_course public.courses%ROWTYPE;
BEGIN
  SELECT course_id INTO v_course_id FROM public.matches WHERE id = p_match_id;
  IF v_course_id IS NOT NULL THEN
    SELECT * INTO v_course FROM public.courses WHERE id = v_course_id;
  END IF;

  WITH snapshot AS (
    SELECT
      mp.player_id,
      CASE
        WHEN tr.handicap_at_event IS NULL OR v_course.slope IS NULL OR v_course.rating IS NULL OR v_course.par IS NULL
          THEN NULL
        ELSE round(tr.handicap_at_event * (v_course.slope / 113.0) + (v_course.rating - v_course.par))
      END AS course_handicap
    FROM public.match_players mp
    LEFT JOIN public.team_rosters tr ON tr.team_id = mp.team_id AND tr.player_id = mp.player_id
    WHERE mp.match_id = p_match_id
  ),
  playing AS (
    SELECT
      player_id,
      course_handicap,
      CASE WHEN course_handicap IS NULL THEN NULL ELSE round(course_handicap * p_allowance) END AS playing_handicap
    FROM snapshot
  ),
  withlowest AS (
    SELECT player_id, course_handicap, playing_handicap,
      MIN(playing_handicap) OVER () AS lowest_playing_handicap
    FROM playing
  )
  UPDATE public.match_players mp
  SET
    handicap_used = w.course_handicap,
    strokes_received = CASE
      WHEN w.playing_handicap IS NULL OR w.lowest_playing_handicap IS NULL THEN NULL
      ELSE w.playing_handicap - w.lowest_playing_handicap
    END
  FROM withlowest w
  WHERE mp.match_id = p_match_id AND mp.player_id = w.player_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- start_match_scorecard now delegates its snapshot step to the helper above.
-- Identical behavior; the inline CTE from the Phase 3 migration moved out.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_match_scorecard(p_match_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_match public.matches%ROWTYPE;
  v_scorecard_id uuid;
  v_format_key text;
  v_allowance numeric := 1.0;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.match_players mp WHERE mp.match_id = p_match_id AND mp.player_id = v_player_id)
    OR public.is_committee_or_admin()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  IF v_match.result_set_by_official THEN
    RAISE EXCEPTION 'Result was set by committee; scoring disabled';
  END IF;

  IF v_match.winner_team_id IS NOT NULL OR v_match.is_halved THEN
    RAISE EXCEPTION 'Match already has a recorded result';
  END IF;

  SELECT id INTO v_scorecard_id FROM public.match_scorecards WHERE match_id = p_match_id;
  IF v_scorecard_id IS NOT NULL THEN
    RETURN v_scorecard_id; -- idempotent
  END IF;

  v_format_key := CASE
    WHEN lower(v_match.match_type) LIKE '%better ball%' OR lower(v_match.match_type) LIKE '%betterball%'
      THEN 'four_ball_net_best_ball'
    WHEN lower(v_match.match_type) LIKE '%head to head%' OR lower(v_match.match_type) LIKE '%h2h%'
      OR lower(v_match.match_type) LIKE '%singles%'
      THEN 'singles_match_play'
    ELSE 'unknown'
  END;

  INSERT INTO public.match_scorecards (match_id, event_id, course_id, format_key, handicap_allowance, started_by_player_id)
  VALUES (p_match_id, v_match.event_id, v_match.course_id, v_format_key, v_allowance, v_player_id)
  RETURNING id INTO v_scorecard_id;

  PERFORM public.snapshot_match_player_handicaps(p_match_id, v_allowance);

  RETURN v_scorecard_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_match_scorecard(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: set_match_scorecard_format -- committee/admin only (Task P6.3). Re-snapshots
-- match_players.strokes_received because changing the allowance makes the snapshot
-- taken at start_match_scorecard time stale.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_match_scorecard_format(
  p_match_id uuid,
  p_format_key text,
  p_handicap_allowance numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_committee_or_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_handicap_allowance IS NULL OR p_handicap_allowance < 0 THEN
    RAISE EXCEPTION 'Invalid allowance';
  END IF;

  UPDATE public.match_scorecards
  SET format_key = p_format_key, handicap_allowance = p_handicap_allowance, updated_at = now()
  WHERE match_id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scorecard not found for this match';
  END IF;

  PERFORM public.snapshot_match_player_handicaps(p_match_id, p_handicap_allowance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_match_scorecard_format(uuid, text, numeric) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: resolve_match_scorecard_dispute -- committee/admin only (Task P6.1's
-- disputed-cards queue). Clears the flag; does not touch the result.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_match_scorecard_dispute(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_committee_or_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.match_scorecards
  SET disputed_at = NULL, disputed_by_player_id = NULL, updated_at = now()
  WHERE match_id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scorecard not found for this match';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_match_scorecard_dispute(uuid) TO authenticated;
