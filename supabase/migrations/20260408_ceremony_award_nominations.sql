-- Ceremony award nominations (Davey Jones' Locker, Matt Leinart Award).
-- Depends on public.current_player_id() from 20260404_match_results_pending.sql

CREATE TABLE IF NOT EXISTS public.ceremony_award_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  nominator_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  nominated_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  award_key text NOT NULL CHECK (award_key IN ('davey_jones_locker', 'matt_leinart')),
  reason text NOT NULL CHECK (length(trim(reason)) > 0 AND length(reason) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ceremony_award_nom_no_self CHECK (nominator_player_id <> nominated_player_id),
  CONSTRAINT ceremony_award_nom_unique UNIQUE (event_id, nominator_player_id, nominated_player_id, award_key)
);

CREATE INDEX IF NOT EXISTS idx_ceremony_award_nominations_event_id
  ON public.ceremony_award_nominations(event_id);

ALTER TABLE public.ceremony_award_nominations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ceremony_award_nominations_insert_participant" ON public.ceremony_award_nominations;
CREATE POLICY "ceremony_award_nominations_insert_participant" ON public.ceremony_award_nominations
  FOR INSERT WITH CHECK (
    nominator_player_id = public.current_player_id()
    AND public.current_player_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.team_rosters tr
      JOIN public.teams t ON t.id = tr.team_id
      WHERE t.event_id = ceremony_award_nominations.event_id
        AND tr.player_id = ceremony_award_nominations.nominator_player_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.team_rosters tr
      JOIN public.teams t ON t.id = tr.team_id
      WHERE t.event_id = ceremony_award_nominations.event_id
        AND tr.player_id = ceremony_award_nominations.nominated_player_id
    )
  );

DROP POLICY IF EXISTS "ceremony_award_nominations_select_committee" ON public.ceremony_award_nominations;
CREATE POLICY "ceremony_award_nominations_select_committee" ON public.ceremony_award_nominations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.auth_user_id = auth.uid()
        AND p.role IN ('committee', 'admin')
    )
  );
