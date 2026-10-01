-- Part II Task S6, part 2 of 2. Drop the 7 columns now relocated to public.player_private
-- (20261001110000). Ordering requirement, same lesson as Task S4: application code must stop
-- reading/writing these columns on `players` BEFORE this runs, or every admin player-edit
-- request breaks immediately. Do not apply this to an environment until the corresponding
-- code (src/app/admin/players/page.tsx, src/types/database.ts) is confirmed deployed there.

alter table public.players
  drop column if exists address_line1,
  drop column if exists address_line2,
  drop column if exists zip_code,
  drop column if exists shirt_size,
  drop column if exists dietary_restrictions,
  drop column if exists emergency_contact_name,
  drop column if exists emergency_contact_phone;
