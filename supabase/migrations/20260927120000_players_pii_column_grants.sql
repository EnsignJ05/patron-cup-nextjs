-- Restrict anonymous access to public.players to non-PII columns.
--
-- Context: "players_select_all" (20260201_players_auth_link.sql) was created with no TO
-- clause and USING (true), so it applied to PUBLIC including anon. RLS is row-level only,
-- so combined with Supabase's default table-wide grants, anon could read every column --
-- email, phone, ghin_number, emergency contacts -- via one PostgREST request.
--
-- Column-level GRANT is the control here, not RLS. Same technique already used on
-- public.profiles in 20260127_invite_only.sql.
--
-- Requires the app to request explicit columns first: anon SELECT * now raises 42501.
-- Prerequisite tasks S2 (src/lib/playerColumns.ts + call sites) and S3 (/players/** behind
-- auth) must ship before this migration, per TEST_ENVIRONMENT_PLAN.md Part II ordering.

-- 1. Row policies, split by role.
drop policy if exists "players_select_all" on public.players;

drop policy if exists "players_select_anon" on public.players;
create policy "players_select_anon" on public.players
  for select to anon using (true);

drop policy if exists "players_select_authenticated" on public.players;
create policy "players_select_authenticated" on public.players
  for select to authenticated using (true);

-- 2. Column privileges: the actual fix.
revoke select on public.players from anon;
grant select (
  id,
  first_name,
  last_name,
  current_handicap,
  ghin_club,
  city,
  state,
  profile_image_url,
  status
) on public.players to anon;

-- 3. anon has no business writing here; RLS already blocks it, this is defence in depth.
revoke insert, update, delete on public.players from anon;

-- 4. Members keep full read access (see section 11.7). Explicit so a future
--    "revoke all from authenticated" cannot silently break the app.
grant select on public.players to authenticated;
