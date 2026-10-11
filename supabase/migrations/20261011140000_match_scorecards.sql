-- Phase 3 of LIVE_SCORING_PLAN.md: persistence for hole-by-hole live scoring.
-- A provisional layer underneath the existing official matches.winner_team_id /
-- is_halved columns (section 1.1) -- this migration does not touch those.
-- Safe to run repeatedly (IF NOT EXISTS / OR REPLACE throughout).

CREATE TABLE IF NOT EXISTS public.match_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  format_key text NOT NULL,
  handicap_allowance numeric NOT NULL DEFAULT 1.0,
  holes_count int NOT NULL DEFAULT 18,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'final', 'abandoned')),
  started_by_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  disputed_at timestamptz,
  disputed_by_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_scorecards_event_id ON public.match_scorecards(event_id);

DROP TRIGGER IF EXISTS match_scorecards_set_updated_at ON public.match_scorecards;
CREATE TRIGGER match_scorecards_set_updated_at
  BEFORE UPDATE ON public.match_scorecards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- One row per player per hole. No derived state (holes_up, result_label, thru) is
-- stored here -- src/lib/scoring recomputes it from these rows every time, so there's
-- nothing to keep in sync.
CREATE TABLE IF NOT EXISTS public.match_hole_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  hole_number int NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  gross_strokes int CHECK (gross_strokes IS NULL OR gross_strokes BETWEEN 1 AND 20),
  is_conceded boolean NOT NULL DEFAULT false,
  entered_by_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, hole_number, player_id),
  CONSTRAINT match_hole_scores_recorded_something CHECK (gross_strokes IS NOT NULL OR is_conceded)
);

CREATE INDEX IF NOT EXISTS idx_match_hole_scores_match_hole ON public.match_hole_scores(match_id, hole_number);

DROP TRIGGER IF EXISTS match_hole_scores_set_updated_at ON public.match_hole_scores;
CREATE TRIGGER match_hole_scores_set_updated_at
  BEFORE UPDATE ON public.match_hole_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Snapshot columns on match_players (decision 2.4): handicap_used already exists
-- (section 1.5) and was always written null -- Task P3.3's start_match_scorecard
-- claims it for the course-handicap snapshot. strokes_received is new: the
-- post-allowance match strokes, so a later roster edit can't retroactively change a
-- round already in progress.
ALTER TABLE public.match_players
  ADD COLUMN IF NOT EXISTS strokes_received int;

-- ---------------------------------------------------------------------------
-- RLS: authenticated-only, no anon (decision in Task P3.2). Written with an explicit
-- TO authenticated clause -- the PII incident this app already lived through was
-- caused by a policy with no TO clause and USING(true), which silently applied to
-- anon. REVOKE is defense in depth on top of that; RLS is the real gate.
-- ---------------------------------------------------------------------------
ALTER TABLE public.match_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_hole_scores ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.match_scorecards FROM anon;
REVOKE ALL ON TABLE public.match_hole_scores FROM anon;

DROP POLICY IF EXISTS match_scorecards_select_authenticated ON public.match_scorecards;
CREATE POLICY match_scorecards_select_authenticated ON public.match_scorecards
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS match_scorecards_no_direct_insert ON public.match_scorecards;
CREATE POLICY match_scorecards_no_direct_insert ON public.match_scorecards
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS match_scorecards_no_direct_update ON public.match_scorecards;
CREATE POLICY match_scorecards_no_direct_update ON public.match_scorecards
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS match_scorecards_no_direct_delete ON public.match_scorecards;
CREATE POLICY match_scorecards_no_direct_delete ON public.match_scorecards
  FOR DELETE USING (false);

DROP POLICY IF EXISTS match_hole_scores_select_authenticated ON public.match_hole_scores;
CREATE POLICY match_hole_scores_select_authenticated ON public.match_hole_scores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS match_hole_scores_no_direct_insert ON public.match_hole_scores;
CREATE POLICY match_hole_scores_no_direct_insert ON public.match_hole_scores
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS match_hole_scores_no_direct_update ON public.match_hole_scores;
CREATE POLICY match_hole_scores_no_direct_update ON public.match_hole_scores
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS match_hole_scores_no_direct_delete ON public.match_hole_scores;
CREATE POLICY match_hole_scores_no_direct_delete ON public.match_hole_scores
  FOR DELETE USING (false);

-- ---------------------------------------------------------------------------
-- RPC: start_match_scorecard -- idempotent create + handicap snapshot (decision 2.4).
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
  v_course public.courses%ROWTYPE;
  v_scorecard_id uuid;
  v_format_key text;
  v_allowance numeric := 1.0; -- seeded at 1.0 for every format (decision 2.1); Phase 6
                               -- admin UI is where the committee changes a format's default.
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

  IF v_match.course_id IS NOT NULL THEN
    SELECT * INTO v_course FROM public.courses WHERE id = v_match.course_id;
  END IF;

  INSERT INTO public.match_scorecards (match_id, event_id, course_id, format_key, handicap_allowance, started_by_player_id)
  VALUES (p_match_id, v_match.event_id, v_match.course_id, v_format_key, v_allowance, v_player_id)
  RETURNING id INTO v_scorecard_id;

  -- Snapshot (decision 2.4): team_rosters.handicap_at_event is authoritative. Course
  -- handicap formula mirrors src/lib/courseHandicap.ts's calculateCourseHandicap
  -- exactly (round(HI * slope/113 + (rating - par))); strokes_received applies the
  -- allowance to each course handicap *then* subtracts the match's lowest
  -- (decision 2.2, order A).
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
      CASE WHEN course_handicap IS NULL THEN NULL ELSE round(course_handicap * v_allowance) END AS playing_handicap
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

  RETURN v_scorecard_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_match_scorecard(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: upsert_match_hole_score -- any participant may enter any player's score
-- (decision 2.3: phones get handed around mid-round; attribution via
-- entered_by_player_id is what makes a wrong entry traceable).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_match_hole_score(
  p_match_id uuid,
  p_hole_number int,
  p_player_id uuid,
  p_gross_strokes int,
  p_is_conceded boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_locked boolean;
  v_scorecard_status text;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_gross_strokes IS NULL AND NOT COALESCE(p_is_conceded, false) THEN
    RAISE EXCEPTION 'Provide a score or mark the ball picked up';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.match_players mp WHERE mp.match_id = p_match_id AND mp.player_id = v_player_id)
    OR public.is_committee_or_admin()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_players mp WHERE mp.match_id = p_match_id AND mp.player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'Target player is not in this match';
  END IF;

  SELECT result_set_by_official INTO v_locked FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_locked THEN
    RAISE EXCEPTION 'Result was set by committee; scoring disabled';
  END IF;

  SELECT status INTO v_scorecard_status FROM public.match_scorecards WHERE match_id = p_match_id;
  IF v_scorecard_status IS NULL THEN
    RAISE EXCEPTION 'Scorecard has not been started for this match';
  END IF;
  IF v_scorecard_status = 'final' THEN
    RAISE EXCEPTION 'Scorecard is final; ask committee to reopen it first';
  END IF;

  INSERT INTO public.match_hole_scores (match_id, hole_number, player_id, gross_strokes, is_conceded, entered_by_player_id)
  VALUES (p_match_id, p_hole_number, p_player_id, p_gross_strokes, COALESCE(p_is_conceded, false), v_player_id)
  ON CONFLICT (match_id, hole_number, player_id) DO UPDATE SET
    gross_strokes = EXCLUDED.gross_strokes,
    is_conceded = EXCLUDED.is_conceded,
    entered_by_player_id = EXCLUDED.entered_by_player_id,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_match_hole_score(uuid, int, uuid, int, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: upsert_match_hole_scores_batch -- one round trip for the offline-queue flush
-- (Task P7.1). p_entries: jsonb array of {hole_number, player_id, gross_strokes,
-- is_conceded}.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_match_hole_scores_batch(p_match_id uuid, p_entries jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_locked boolean;
  v_scorecard_status text;
  v_entry jsonb;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.match_players mp WHERE mp.match_id = p_match_id AND mp.player_id = v_player_id)
    OR public.is_committee_or_admin()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  SELECT result_set_by_official INTO v_locked FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_locked THEN
    RAISE EXCEPTION 'Result was set by committee; scoring disabled';
  END IF;

  SELECT status INTO v_scorecard_status FROM public.match_scorecards WHERE match_id = p_match_id;
  IF v_scorecard_status IS NULL THEN
    RAISE EXCEPTION 'Scorecard has not been started for this match';
  END IF;
  IF v_scorecard_status = 'final' THEN
    RAISE EXCEPTION 'Scorecard is final; ask committee to reopen it first';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = p_match_id AND mp.player_id = (v_entry->>'player_id')::uuid
    ) THEN
      RAISE EXCEPTION 'Target player % is not in this match', v_entry->>'player_id';
    END IF;

    IF (v_entry->>'gross_strokes') IS NULL AND NOT COALESCE((v_entry->>'is_conceded')::boolean, false) THEN
      RAISE EXCEPTION 'Entry for hole % is missing a score or pickup flag', v_entry->>'hole_number';
    END IF;

    INSERT INTO public.match_hole_scores (match_id, hole_number, player_id, gross_strokes, is_conceded, entered_by_player_id)
    VALUES (
      p_match_id,
      (v_entry->>'hole_number')::int,
      (v_entry->>'player_id')::uuid,
      (v_entry->>'gross_strokes')::int,
      COALESCE((v_entry->>'is_conceded')::boolean, false),
      v_player_id
    )
    ON CONFLICT (match_id, hole_number, player_id) DO UPDATE SET
      gross_strokes = EXCLUDED.gross_strokes,
      is_conceded = EXCLUDED.is_conceded,
      entered_by_player_id = EXCLUDED.entered_by_player_id,
      updated_at = now();
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_match_hole_scores_batch(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: clear_match_hole_score -- correcting a mis-tap.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clear_match_hole_score(p_match_id uuid, p_hole_number int, p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_locked boolean;
  v_scorecard_status text;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.match_players mp WHERE mp.match_id = p_match_id AND mp.player_id = v_player_id)
    OR public.is_committee_or_admin()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  SELECT result_set_by_official INTO v_locked FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_locked THEN
    RAISE EXCEPTION 'Result was set by committee; scoring disabled';
  END IF;

  SELECT status INTO v_scorecard_status FROM public.match_scorecards WHERE match_id = p_match_id;
  IF v_scorecard_status = 'final' THEN
    RAISE EXCEPTION 'Scorecard is final; ask committee to reopen it first';
  END IF;

  DELETE FROM public.match_hole_scores
  WHERE match_id = p_match_id AND hole_number = p_hole_number AND player_id = p_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_match_hole_score(uuid, int, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: set_match_scorecard_status -- committee/admin only. Participants never move
-- status directly: starting is start_match_scorecard, finalizing is the server-side
-- route (Task P3.5). This RPC exists for 'abandoned' and reopening a 'final' card.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_match_scorecard_status(p_match_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_committee_or_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_status NOT IN ('in_progress', 'final', 'abandoned') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.match_scorecards
  SET
    status = p_status,
    finalized_at = CASE WHEN p_status = 'final' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE match_id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scorecard not found for this match';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_match_scorecard_status(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (Task P3.4). RLS still gates what each subscriber receives -- an anon
-- subscriber gets nothing, matching the SELECT policies above.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'match_scorecards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_scorecards;
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- supabase_realtime publication doesn't exist in this environment; skip.
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'match_hole_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_hole_scores;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
