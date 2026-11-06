-- «بحث في كل الرسائل» (owner 2026-11-06, docs/37-message-search.md): WhatsApp-style search over
-- every chat the caller may read. The fold is stored (never computed per query: 843 ms over all rows
-- versus 32 ms on the stored text, measured on prod 2026-11-06) and indexed with pg_trgm.
--   1. pg_trgm in schema extensions (as pgcrypto and uuid-ossp).
--   2. public.search_fold(text): the SQL twin of searchFold (@ab/shared: normalizeArabic +
--      asciiDigits). It must stay identical to it: e2e/tests/messaging/message-search.sql.spec.ts
--      compares both over a fixture table. Whitespace is exactly JS's \s set (review correction 3:
--      the ICU [[:space:]] also folds U+001C and U+0085, which JS keeps).
--   3. messages.search_text: the stored fold of body + document name (a generated column; coalesce
--      and ||, not concat_ws, which is only STABLE). Adding it rewrites messages once (about 1 s at
--      7.5 MB under ACCESS EXCLUSIVE; lock_timeout keeps the sender from waiting behind it).
--   4. A trigram GIN index on it.
--   5. public.search_messages(...): one newest-first keyset page of hits (limit + 1 rows) with the
--      chat's name. Security INVOKER; execute for service_role only: the API resolves the caller's
--      scope (phones, hidden own numbers, sales' link templates) in MessageSearchService (rule 9).
-- RLS is untouched: no new table; messages keeps its policies. Re-runs safely.
-- ROLLBACK (manual, after the code rollback):
--   drop function if exists public.search_messages(text, text[], text[], text[], timestamptz, uuid, int);
--   drop index if exists public.messages_search_trgm_idx;
--   alter table public.messages drop column if exists search_text;
--   drop function if exists public.search_fold(text);
--   (pg_trgm stays: harmless.)
set local lock_timeout = '5s';

create extension if not exists pg_trgm with schema extensions;

-- Tashkeel (U+0610–061A, U+064B–065F, U+0670, U+06D6–06ED) and tatweel (U+0640) go; أإآٱ→ا, ؤ→و,
-- ئ→ي, ة→ه, ى→ي; Arabic-Indic and Persian digits → 0–9; lower case; every run of JS whitespace
-- (\t \n \v \f \r, space, U+00A0, U+1680, U+2000–200A, U+2028, U+2029, U+202F, U+205F, U+3000,
-- U+FEFF) → one space; trimmed. Built with chr() so no invisible character sits in this file.
create or replace function public.search_fold(t text) returns text
  language sql immutable strict parallel safe set search_path = '' as $$
  select pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.lower(
        pg_catalog.translate(
          pg_catalog.regexp_replace(
            t,
            '[' || pg_catalog.chr(1552) || '-' || pg_catalog.chr(1562)
              || pg_catalog.chr(1611) || '-' || pg_catalog.chr(1631)
              || pg_catalog.chr(1648)
              || pg_catalog.chr(1750) || '-' || pg_catalog.chr(1773)
              || pg_catalog.chr(1600) || ']',
            '', 'g'),
          'أإآٱؤئةى٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
          'ااااويهي01234567890123456789')),
      '[' || pg_catalog.chr(9) || '-' || pg_catalog.chr(13) || ' '
        || pg_catalog.chr(160) || pg_catalog.chr(5760)
        || pg_catalog.chr(8192) || '-' || pg_catalog.chr(8202)
        || pg_catalog.chr(8232) || pg_catalog.chr(8233) || pg_catalog.chr(8239)
        || pg_catalog.chr(8287) || pg_catalog.chr(12288) || pg_catalog.chr(65279) || ']+',
      ' ', 'g'),
    ' ')
$$;

alter table public.messages add column if not exists search_text text
  generated always as (public.search_fold(coalesce(body, '') || ' ' || coalesce(media_name, ''))) stored;

-- Not concurrently: the migration runs in a transaction; 20.6k rows build in under a second.
create index if not exists messages_search_trgm_idx
  on public.messages using gin (search_text extensions.gin_trgm_ops);

-- Hits newest first (created_at, id), after the cursor (p_before_at, p_before_id), at most 101 rows.
-- The typed words are escaped here (\, %, _ match literally), never built into a pattern by the API.
-- Only searchable rows: not deleted for everyone, not hidden from the platform, not a
-- reaction / edit / revoke marker (as in-chat search, ChatSearchRepo).
create or replace function public.search_messages(
  p_q text, p_phones text[], p_hide text[], p_skip_templates text[],
  p_before_at timestamptz, p_before_id uuid, p_limit int
) returns table (
  id uuid, phone_e164 text, created_at timestamptz, body text, media_name text,
  template_key text, direction public.message_direction, media_mime text, display_name text
) language sql stable security invoker set search_path = '' as $$
  with q as (
    select public.search_fold(p_q) as folded
  ), hits as (
    select m.id, m.phone_e164::text as phone_e164, m.created_at, m.body, m.media_name,
      m.template_key, m.direction, m.media_mime
    from public.messages m, q
    where q.folded <> ''
      and m.search_text like '%' || pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
        q.folded, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      and m.deleted_at is null
      and m.hidden_at is null
      and coalesce(m.interactive_payload ->> 'type', '') not in ('reaction', 'edit', 'revoke')
      and (p_phones is null or m.phone_e164 = any (p_phones))
      and not (m.phone_e164 = any (coalesce(p_hide, '{}')))
      and (m.template_key is null or not (m.template_key = any (coalesce(p_skip_templates, '{}'))))
      and (p_before_at is null or (m.created_at, m.id) < (p_before_at, p_before_id))
    order by m.created_at desc, m.id desc
    limit least(greatest(p_limit, 1), 101)
  )
  -- display_name: the same rule as v_threads.display_name (coalesce(g.name, l.name,
  -- t.display_name_ar), migration 20261030000984); keep both identical. Only for the limited rows.
  select h.id, h.phone_e164, h.created_at, h.body, h.media_name, h.template_key, h.direction,
    h.media_mime,
    coalesce(
      (select g.name from public.guardian_phones gp join public.guardians g on g.id = gp.guardian_id
        where gp.phone_e164 = h.phone_e164 limit 1),
      (select l.name from public.leads l where l.phone_e164 = h.phone_e164 limit 1),
      (select t.display_name_ar from public.teachers t where t.phone_e164 = h.phone_e164 limit 1)
    )::text
  from hits h
  order by h.created_at desc, h.id desc
$$;

revoke all on function public.search_messages(text, text[], text[], text[], timestamptz, uuid, int)
  from public, anon, authenticated;
grant execute on function public.search_messages(text, text[], text[], text[], timestamptz, uuid, int)
  to service_role;
