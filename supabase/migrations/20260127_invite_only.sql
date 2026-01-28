-- Invite-only auth additions for profiles.

alter table public.profiles
  add column if not exists must_change_password boolean not null default true;

-- Ensure RLS is enabled for profiles.
alter table public.profiles enable row level security;

-- Allow users to read their own profile row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Allow users to update their own must_change_password flag only.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Limit column updates to must_change_password for authenticated users.
revoke update on public.profiles from authenticated;
grant update (must_change_password) on public.profiles to authenticated;
