-- Owner 2026-10-27 «Fix it»: our own private copy of EVERY family file imported from the old CRM (an
-- inbound row with no Meta media id whose body is only a public link to the CRM's chat-media bucket),
-- not only of those an admin opens. The API's CrmMediaCopyJob copies a small batch per tick while the
-- crm_media_copy_all setting is on (seeded by the config seeder as JSON null = its default false).
--
-- 1. messages_crm_link_uncopied_idx: only the rows still waiting for a copy (a copied row gets a
--    media_path and leaves it), so a tick with nothing to do reads an empty index, never the table.
-- 2. crm_media_copy_failures: a row the job could not copy (attempts, capped by the API) or skipped
--    (not a file we may fetch). Never read by families or staff UIs; admins may read it.
-- 3. crm_media_copy_batch / crm_media_copy_mark / crm_media_copy_counts: the job's three statements.
--
-- Idempotent, expand-only: no existing row is read for writing; messages bodies are never updated and
-- nothing is deleted. Service role only for the functions.

set local lock_timeout = '5s';

create index if not exists messages_crm_link_uncopied_idx on public.messages (created_at, id)
  where direction = 'inbound' and media_id is null and media_path is null and media_mime is not null
    and body like 'https://%/storage/v1/object/public/chat-media/%';

create table if not exists public.crm_media_copy_failures (
  message_id uuid primary key references public.messages (id) on delete cascade,
  attempts int not null default 1 check (attempts > 0),
  skipped boolean not null default false,
  last_error text check (char_length(last_error) <= 200),
  updated_at timestamptz not null default now()
);
alter table public.crm_media_copy_failures enable row level security;
drop policy if exists crm_media_copy_failures_admin_read on public.crm_media_copy_failures;
create policy crm_media_copy_failures_admin_read on public.crm_media_copy_failures for select to authenticated
  using ((select public.is_admin()));
revoke insert, update, delete on public.crm_media_copy_failures from anon, authenticated;

-- The next rows to copy, oldest first: inbound on a crm number, the body starting with this host's
-- chat-media link (the API checks the whole body is exactly one allowed link), neither skipped nor at
-- p_max_attempts. The repeated LIKE is the index predicate, so the planner can use the partial index.
create or replace function public.crm_media_copy_batch(p_host text, p_limit int, p_max_attempts int)
  returns table (id uuid)
  language sql stable security invoker set search_path = '' as $$
  select m.id
    from public.messages m
   where m.direction = 'inbound' and m.media_id is null and m.media_path is null and m.media_mime is not null
     and m.body like 'https://%/storage/v1/object/public/chat-media/%'
     and starts_with(m.body, 'https://' || lower(p_host) || '/storage/v1/object/public/chat-media/')
     and exists (select 1 from public.wa_numbers n where n.id = m.number_id and n.provider = 'crm')
     and not exists (
       select 1 from public.crm_media_copy_failures f
        where f.message_id = m.id and (f.skipped or f.attempts >= p_max_attempts))
   order by m.created_at, m.id
   limit least(greatest(p_limit, 1), 100);
$$;

-- One more failed attempt for a row (or a skip: never selected again); the attempts after the mark.
create or replace function public.crm_media_copy_mark(p_message uuid, p_error text, p_skip boolean)
  returns int
  language sql volatile security invoker set search_path = '' as $$
  insert into public.crm_media_copy_failures as f (message_id, attempts, skipped, last_error)
    values (p_message, 1, p_skip, left(p_error, 200))
    on conflict (message_id) do update
      set attempts = f.attempts + 1, skipped = f.skipped or excluded.skipped,
          last_error = excluded.last_error, updated_at = now()
  returning attempts;
$$;

-- The run's totals for its one audit row: imported CRM files we hold a copy of (lazily opened ones
-- too), and those left without a copy after the retry cap (failed) or skipped. Read once per run.
create or replace function public.crm_media_copy_counts(p_host text)
  returns jsonb
  language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'copied', (select count(*) from public.messages m
                where m.direction = 'inbound' and m.media_path is not null and m.media_id is null
                  and starts_with(m.body, 'https://' || lower(p_host) || '/storage/v1/object/public/chat-media/')),
    'failed', (select count(*) from public.crm_media_copy_failures f join public.messages m on m.id = f.message_id
                where not f.skipped and m.media_path is null),
    'skipped', (select count(*) from public.crm_media_copy_failures f join public.messages m on m.id = f.message_id
                 where f.skipped and m.media_path is null));
$$;

revoke all on function public.crm_media_copy_batch(text, int, int) from public, anon, authenticated;
revoke all on function public.crm_media_copy_mark(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.crm_media_copy_counts(text) from public, anon, authenticated;
grant execute on function public.crm_media_copy_batch(text, int, int) to service_role;
grant execute on function public.crm_media_copy_mark(uuid, text, boolean) to service_role;
grant execute on function public.crm_media_copy_counts(text) to service_role;

-- MANUAL ROLLBACK (only after the code rollback):
--   drop function public.crm_media_copy_counts(text);
--   drop function public.crm_media_copy_mark(uuid, text, boolean);
--   drop function public.crm_media_copy_batch(text, int, int);
--   drop table public.crm_media_copy_failures;
--   drop index public.messages_crm_link_uncopied_idx;
