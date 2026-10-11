-- Phase 1 of LIVE_SCORING_PLAN.md: per-hole course data (par, yardage, stroke index).
-- Nothing downstream (stroke allocation, hole-by-hole scoring) works without this.
-- Safe to run repeatedly (IF NOT EXISTS / OR REPLACE throughout).

CREATE TABLE IF NOT EXISTS public.course_holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  hole_number int NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par int NOT NULL CHECK (par BETWEEN 3 AND 6),
  yardage int NULL CHECK (yardage IS NULL OR yardage > 0),
  handicap_index int NULL CHECK (handicap_index IS NULL OR handicap_index BETWEEN 1 AND 18),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, hole_number)
);

-- Catches the most common data-entry error: a duplicated stroke index. Partial so
-- multiple NULLs (not-yet-entered) are allowed during entry.
CREATE UNIQUE INDEX IF NOT EXISTS course_holes_course_id_handicap_index_key
  ON public.course_holes (course_id, handicap_index)
  WHERE handicap_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_holes_course_id ON public.course_holes(course_id);

CREATE OR REPLACE FUNCTION public.set_course_holes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_holes_set_updated_at ON public.course_holes;
CREATE TRIGGER course_holes_set_updated_at
  BEFORE UPDATE ON public.course_holes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_course_holes_updated_at();

ALTER TABLE public.course_holes ENABLE ROW LEVEL SECURITY;

-- Published course information, no PII -- same anon/authenticated SELECT shape as
-- public.courses. Writes restricted to committee/admin via the existing helper.
DROP POLICY IF EXISTS course_holes_select_all ON public.course_holes;
CREATE POLICY course_holes_select_all ON public.course_holes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS course_holes_insert_committee ON public.course_holes;
CREATE POLICY course_holes_insert_committee ON public.course_holes
  FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());

DROP POLICY IF EXISTS course_holes_update_committee ON public.course_holes;
CREATE POLICY course_holes_update_committee ON public.course_holes
  FOR UPDATE TO authenticated USING (public.is_committee_or_admin());

DROP POLICY IF EXISTS course_holes_delete_committee ON public.course_holes;
CREATE POLICY course_holes_delete_committee ON public.course_holes
  FOR DELETE TO authenticated USING (public.is_committee_or_admin());

GRANT SELECT ON TABLE public.course_holes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.course_holes TO authenticated;
GRANT ALL ON TABLE public.course_holes TO service_role;
