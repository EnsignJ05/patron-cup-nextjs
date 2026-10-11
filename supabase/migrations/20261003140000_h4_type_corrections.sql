-- Task H4 (TEST_ENVIRONMENT_PLAN.md Part IV, section 22 / findings 20.6.1, 20.6.2, 20.6.4):
-- three schema/type-declaration mismatches between the database and
-- src/types/database.ts. TypeScript already declares the post-fix shape for all three
-- (ghin_number: string | null, country: string) -- this migration brings the database
-- in line with code already written for it, not the other way around, so no code
-- change ships alongside this file.

-- 20.6.1: ghin_number is bigint in the database but only ever used as an opaque
-- identifier (admin/handicaps sorts it with .localeCompare(), never arithmetic).
-- bigint invites precision/serialization surprises over PostgREST for no benefit.
ALTER TABLE public.players
  ALTER COLUMN ghin_number TYPE text USING ghin_number::text;

-- 20.6.2: country has DEFAULT 'USA' (every practical insert already satisfies
-- NOT NULL) but the column itself allows NULL, while the TS type says non-nullable.
-- Reconcile any existing NULL before adding the constraint.
UPDATE public.players SET country = 'USA' WHERE country IS NULL;
ALTER TABLE public.players ALTER COLUMN country SET NOT NULL;

-- 20.6.4: match_pending_status is an orphaned enum type (not used as any column's
-- type -- match_results_pending.status is plain text with a CHECK constraint that
-- already covers all 5 real values, including 'cancelled', which this enum is
-- missing). The CHECK does the job; drop the stale, incomplete, unused enum rather
-- than convert the column to it.
DROP TYPE public.match_pending_status;
