-- «تعديل» in a WhatsApp chat = a correction (owner 2026-11-07). WhatsApp's API cannot edit or revoke
-- a sent message, so staff send a NEW reply «تصحيح: …» to it; this links the two.
--   * messages.corrects_id: the message this one corrects (same chat, an outbound staff text). Set by
--     the API only (POST /threads/:phone/text with correctsId); the original row is never changed.
--   * FK ON DELETE SET NULL (a deleted original leaves the correction standing), added NOT VALID then
--     validated (every row is null: a short check, no long lock), and a partial index for the FK side
--     and the «صُحِّحت» lookup (only rows that carry one).
-- Expand-only and re-runnable; no new table, so messages keeps its RLS (admins read, only the API
-- writes).
-- ROLLBACK (manual, after the code rollback):
--   alter table public.messages drop column if exists corrects_id;
set local lock_timeout = '5s';

alter table public.messages add column if not exists corrects_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_corrects_id_fkey') then
    alter table public.messages add constraint messages_corrects_id_fkey
      foreign key (corrects_id) references public.messages (id) on delete set null not valid;
  end if;
end $$;

alter table public.messages validate constraint messages_corrects_id_fkey;

create index if not exists messages_corrects_idx on public.messages (corrects_id)
  where corrects_id is not null;

comment on column public.messages.corrects_id is
  'تصحيح: the message this outbound text corrects (a WhatsApp reply to it); set by the API only';
