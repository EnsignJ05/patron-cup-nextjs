-- Recreates the 'avatars' storage bucket and its policies, matching production exactly
-- (captured via direct query against storage.buckets / pg_policies on 2026-09-28).
-- storage.objects is a table shared across all buckets; these policies are scoped to
-- bucket_id = 'avatars' specifically, same as production.

insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, false, 512000, null);

create policy "Public can view avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "Users can delete their own avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);
