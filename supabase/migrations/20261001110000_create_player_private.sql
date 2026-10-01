-- Part II Task S6: relocate never-public columns out of public.players.
--
-- address_line1/2, zip_code, shirt_size, dietary_restrictions, emergency_contact_name/phone
-- are more sensitive than the email/phone the "member directory" posture (section 11.7)
-- already accepts exposing to any authenticated member -- Task S4 already blocked anon from
-- all of them (table-wide grant), but any of the 54 members can currently read any other
-- member's home address or emergency contact via public.players' authenticated-directory
-- policy. This migration is purely additive -- it does not touch the old columns on
-- `players`, so existing code keeps working unmodified. The follow-up migration
-- (20261001120000) drops the old columns, and must not run until the application code no
-- longer reads/writes them.
--
-- Confirmed empty on both test and production before writing this (2026-10-01) -- moving an
-- empty column is nearly free; doing this after real data exists would be a real migration.

create table public.player_private (
  player_id uuid primary key references public.players(id) on delete cascade,
  address_line1 character varying,
  address_line2 character varying,
  zip_code character varying,
  shirt_size character varying,
  dietary_restrictions text,
  emergency_contact_name character varying,
  emergency_contact_phone character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.player_private enable row level security;

-- Tighter than players' directory model: own row, or committee/admin. No anon grant at all
-- (RLS with no anon policy denies by default).
-- New tables inherit a blanket anon/authenticated table-level grant from this project's
-- default privileges (same pattern found on every pre-existing table, incl. players before
-- Task S4). RLS alone already blocks anon (no anon-targeting policy below), but revoke the
-- grant too, as defense-in-depth consistent with how players/profiles were hardened.
revoke all on public.player_private from anon;

create policy "player_private_select_own_or_committee" on public.player_private
  for select to authenticated using (
    player_id = public.current_player_id() or public.is_committee_or_admin()
  );

create policy "player_private_insert_own_or_committee" on public.player_private
  for insert to authenticated with check (
    player_id = public.current_player_id() or public.is_committee_or_admin()
  );

create policy "player_private_update_own_or_committee" on public.player_private
  for update to authenticated using (
    player_id = public.current_player_id() or public.is_committee_or_admin()
  );

create trigger update_player_private_updated_at
  before update on public.player_private
  for each row execute function public.update_updated_at();

-- Defensive backfill in case this is ever replayed somewhere the columns are not actually
-- empty -- a no-op today given the confirmed-empty check above.
insert into public.player_private
  (player_id, address_line1, address_line2, zip_code, shirt_size, dietary_restrictions, emergency_contact_name, emergency_contact_phone)
select id, address_line1, address_line2, zip_code, shirt_size, dietary_restrictions, emergency_contact_name, emergency_contact_phone
from public.players
where address_line1 is not null or address_line2 is not null or zip_code is not null
   or shirt_size is not null or dietary_restrictions is not null
   or emergency_contact_name is not null or emergency_contact_phone is not null
on conflict (player_id) do nothing;
