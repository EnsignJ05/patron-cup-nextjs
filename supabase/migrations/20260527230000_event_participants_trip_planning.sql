-- Trip planning fields on event_participants (run in Supabase SQL editor if not using CLI migrations)
alter table public.event_participants
  add column if not exists deposit_paid boolean not null default false,
  add column if not exists room_type text,
  add column if not exists full_payment_paid boolean not null default false;

create unique index if not exists event_participants_event_id_player_id_idx
  on public.event_participants (event_id, player_id);
