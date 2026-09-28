-- GHIN metadata on players (editable by player on dashboard)

alter table public.players
  add column if not exists ghin_number text;

alter table public.players
  add column if not exists ghin_club text;
