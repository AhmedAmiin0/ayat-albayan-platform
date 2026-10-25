-- «الردود السريعة» review (PR #167): saved_replies becomes API-only for writes, like roles and
-- role_permissions. The direct-write policies of migration 670 checked less than the API: a reader
-- could insert a personal row pointing at a shared reply's attachment_path, then DELETE it through
-- the API, whose service role removed the shared file from Storage. Reads stay (RLS unchanged).
-- One Storage object belongs to one reply: two rows sharing a path broke the survivor when either
-- was deleted (a retried create after a lost response did that). Re-runnable.

set local lock_timeout = '5s';

drop policy if exists saved_replies_insert on public.saved_replies;
drop policy if exists saved_replies_update on public.saved_replies;
drop policy if exists saved_replies_delete on public.saved_replies;
revoke insert, update, delete on public.saved_replies from authenticated;

create unique index if not exists saved_replies_attachment_path_key
  on public.saved_replies (attachment_path) where attachment_path is not null;

-- MANUAL ROLLBACK (only after the code rollback):
--   drop index public.saved_replies_attachment_path_key;
--   grant insert, update, delete on public.saved_replies to authenticated; and re-run the three
--   write policies of migration 20261025000670.
