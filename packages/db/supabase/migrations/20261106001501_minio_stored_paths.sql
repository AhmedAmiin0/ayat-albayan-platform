-- MinIO stored paths (owner 2026-11-06, docs/45). Once an admin switches STORAGE_DRIVER to minio,
-- every new file is written to MinIO and its row keeps the path with a «minio:» marker in front
-- («minio:<subscription_id>/<uuid>.jpg»); a path without the marker is an old Supabase object and
-- is read there. The three checks below parsed the bare path: each now reads it without the marker,
-- so both kinds pass and nothing else changes (the same folder rules, the same lengths).
--   * saved_replies.attachment_path: 'saved/%' or 'minio:saved/%'.
--   * payment_attachments.path: the same regex behind an optional «minio:»; the folder trigger
--     compares the package folder of the path without its marker.
--   * teachers.avatar_path: the own-folder check on the path without its marker.
-- Expand-only: every existing row already passes (no marker), validated after a not-valid add.

set local lock_timeout = '5s';

alter table public.saved_replies drop constraint if exists saved_replies_attachment_path_check;
alter table public.saved_replies add constraint saved_replies_attachment_path_check
  check (attachment_path is null or attachment_path like 'saved/%' or attachment_path like 'minio:saved/%')
  not valid;
alter table public.saved_replies validate constraint saved_replies_attachment_path_check;

alter table public.payment_attachments drop constraint if exists payment_attachments_path_check;
alter table public.payment_attachments add constraint payment_attachments_path_check
  check (path ~ '^(minio:)?[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$') not valid;
alter table public.payment_attachments validate constraint payment_attachments_path_check;

create or replace function public.payment_attachment_in_folder() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if split_part(regexp_replace(new.path, '^minio:', ''), '/', 1)
     <> (select p.subscription_id::text from public.payments p where p.id = new.payment_id) then
    raise exception 'payment attachment % is not in its package folder', new.path using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.payment_attachment_in_folder() from public, anon, authenticated;

alter table public.teachers drop constraint if exists teachers_avatar_path_own;
alter table public.teachers add constraint teachers_avatar_path_own
  check (avatar_path is null
         or (char_length(avatar_path) between 1 and 206
             and split_part(regexp_replace(avatar_path, '^minio:', ''), '/', 1) = 'teachers'
             and split_part(regexp_replace(avatar_path, '^minio:', ''), '/', 2) = id::text
             and split_part(regexp_replace(avatar_path, '^minio:', ''), '/', 3) like 'avatar-%'))
  not valid;
alter table public.teachers validate constraint teachers_avatar_path_own;
