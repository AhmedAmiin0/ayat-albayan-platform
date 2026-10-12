-- «حسابي»: every user edits their own name, phone, email, password and photo (owner, 2026-10-06;
-- R-ACC-01..05). Idempotent.
--
-- Profile writes go through the API only (service role + a column whitelist: full_name,
-- phone_e164, avatar_path). On purpose there is NO self-write policy on public.profiles: a signed-in
-- user can never change their own role, role_id or disabled_* fields through the client.

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop constraint if exists profiles_avatar_path_len;
alter table public.profiles add constraint profiles_avatar_path_len
  check (avatar_path is null or char_length(avatar_path) between 1 and 200);

-- Private bucket: avatars/<user_id>/avatar-<timestamp>.<ext>. The API hands out signed upload and
-- download URLs; the policies below are defence in depth for direct access (rule 9).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- A user's own folder is the first path segment; text comparison, so a malformed name never throws.
drop policy if exists storage_avatars_own_read on storage.objects;
create policy storage_avatars_own_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars'
         and (split_part(name, '/', 1) = (select auth.uid())::text or public.is_admin()));

drop policy if exists storage_avatars_own_insert on storage.objects;
create policy storage_avatars_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists storage_avatars_own_update on storage.objects;
create policy storage_avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists storage_avatars_own_delete on storage.objects;
create policy storage_avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
