-- 26-P1 «Expand» (docs/26 §2a, §4, §6): the settings store gains metadata columns, a value version, a
-- transactional revision row and two service-role RPCs (config_seed, config_set). EXPAND ONLY and INERT:
-- nothing reads the new columns or calls the RPCs yet (the seeder ships in 26-P2). This migration
-- inserts NO settings row and changes NO stored value; existing rows only get a version number from the
-- column default. No sending switch (messaging_enabled, auto_messages_enabled, …) is read or written.
-- RLS on settings is unchanged. New checks are NOT VALID; a later migration validates them once the
-- pre-check query is empty on staging. Idempotent: safe to run twice.

set local lock_timeout = '5s';

-- Versions come from a sequence, so a delete and re-insert never reuses a number (docs/26 §9 #19).
-- Deliberately NOT "owned by" settings.version: e2e resetDb truncates with RESTART IDENTITY, which
-- would restart an owned sequence and reintroduce the ABA problem.
create sequence if not exists public.settings_version_seq;
revoke all on sequence public.settings_version_seq from public, anon, authenticated;
grant usage, select on sequence public.settings_version_seq to service_role;

-- module / scope / value_type / default_value / is_public are display mirrors of the code registry,
-- rewritten by config_seed. Ownership is decided in code (API), never by these columns (§2a, §9 #6).
alter table public.settings add column if not exists module text;
alter table public.settings add column if not exists scope text;
alter table public.settings add column if not exists value_type text;
alter table public.settings add column if not exists default_value jsonb;
alter table public.settings add column if not exists is_public boolean not null default false;
alter table public.settings add column if not exists description_seed text;
alter table public.settings add column if not exists description text;
alter table public.settings add column if not exists description_edited boolean not null default false;
alter table public.settings add column if not exists version bigint not null
  default nextval('public.settings_version_seq');
alter table public.settings add column if not exists retired_at timestamptz;

-- Lenient kind check: jsonb_typeof only; bounds stay in zod (§2d). Unknown types pass, so a registry
-- that learns a new type never trips the database. JSON null is handled by the check itself.
create or replace function public.settings_kind_ok(value_type text, value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case value_type
    when 'int' then jsonb_typeof(value) = 'number'
    when 'bool' then jsonb_typeof(value) = 'boolean'
    when 'string' then jsonb_typeof(value) = 'string'
    when 'e164' then jsonb_typeof(value) = 'string'
    when 'tz' then jsonb_typeof(value) = 'string'
    when 'currency' then jsonb_typeof(value) = 'string'
    when 'enum' then jsonb_typeof(value) = 'string'
    when 'int_list' then jsonb_typeof(value) = 'array'
    when 'json' then jsonb_typeof(value) = 'object'
    else true
  end;
$$;

-- Constraints are named and added only when missing, so a re-run never drops a validated check back to
-- NOT VALID. scope/description apply to brand-new (all-null) columns, so they are added valid.
-- Size: octet_length(value::text) like custom_config (CUSTOM_VALUE_MAX_BYTES), not pg_column_size,
-- which measures the compressed on-disk form and so depends on TOAST, not on what the admin typed.
do $$
declare c record;
begin
  for c in select * from (values
    ('settings_scope_ok', 'check (scope in (''config'', ''module'', ''custom''))'),
    ('settings_description_len', 'check (char_length(description) <= 500)'),
    ('settings_key_format',
      'check (key ~ ''^[a-z][a-z0-9_]{1,63}$'' or key ~ ''^custom\.[a-z][a-z0-9_.-]{1,63}$'') not valid'),
    ('settings_value_size', 'check (octet_length(value::text) <= 8192) not valid'),
    ('settings_kind',
      'check (value_type is null or value = ''null''::jsonb or public.settings_kind_ok(value_type, value)) not valid')
  ) as t(name, def) loop
    if not exists (select 1 from pg_constraint
                   where conrelid = 'public.settings'::regclass and conname = c.name) then
      execute format('alter table public.settings add constraint %I %s', c.name, c.def);
    end if;
  end loop;
end $$;

-- One BEFORE UPDATE trigger replaces settings_updated_at (set_updated_at bumped on every update):
-- version moves only when value changes (a description edit never fails a value save), and
-- updated_at/updated_by move only when value or description changes, so a seeder boot or a same-value
-- PATCH no longer looks like «changed by …» (§9 #11). Inserts keep the column defaults.
create or replace function public.settings_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.value is distinct from old.value then
    new.version := nextval('public.settings_version_seq');
  else
    new.version := old.version;
  end if;
  if new.value is distinct from old.value or new.description is distinct from old.description then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
    new.updated_by := old.updated_by;
  end if;
  return new;
end;
$$;

drop trigger if exists settings_updated_at on public.settings;
drop trigger if exists settings_before_update on public.settings;
create trigger settings_before_update before update on public.settings
  for each row execute function public.settings_before_update();

-- Freshness (§2c): one row, bumped inside the writer's transaction, so a reader never sees a new rev
-- before the rows commit (a bare sequence would, §9 #4). registry_version is config_seed's guard
-- against an older build rewriting metadata.
create table if not exists public.settings_revision (
  id boolean primary key default true check (id),
  rev bigint not null default 0,
  registry_version int not null default 0
);
alter table public.settings_revision add column if not exists registry_version int not null default 0;
insert into public.settings_revision (id) values (true) on conflict do nothing;

-- RLS like settings: admins read; anon nothing; only the service role (bypasses RLS) writes.
alter table public.settings_revision enable row level security;
drop policy if exists settings_revision_admin_read on public.settings_revision;
create policy settings_revision_admin_read on public.settings_revision for select to authenticated
  using (public.is_admin());
revoke all on public.settings_revision from anon;
revoke insert, update, delete, truncate, references, trigger on public.settings_revision from authenticated;

-- Upsert, not update: e2e resetDb truncates every public table, settings_revision included.
-- Security definer so any writer of settings (service role, e2e superuser) can bump it.
create or replace function public.settings_bump_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.settings_revision as r (id, rev) values (true, 1)
  on conflict (id) do update set rev = r.rev + 1;
  return null;
end;
$$;

-- Bumps only when the statement touched rows (transition table not empty): statement triggers also fire
-- for zero rows, and config_seed's "update only on difference" upserts must not bump on every boot.
create or replace function public.settings_bump_revision_if_rows() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from changed) then
    insert into public.settings_revision as r (id, rev) values (true, 1)
    on conflict (id) do update set rev = r.rev + 1;
  end if;
  return null;
end;
$$;

drop trigger if exists settings_revision_ins on public.settings;
drop trigger if exists settings_revision_upd on public.settings;
drop trigger if exists settings_revision_del on public.settings;
drop trigger if exists settings_revision_trunc on public.settings;
create trigger settings_revision_ins after insert on public.settings referencing new table as changed
  for each statement execute function public.settings_bump_revision_if_rows();
create trigger settings_revision_upd after update on public.settings referencing new table as changed
  for each statement execute function public.settings_bump_revision_if_rows();
create trigger settings_revision_del after delete on public.settings referencing old table as changed
  for each statement execute function public.settings_bump_revision_if_rows();
create trigger settings_revision_trunc after truncate on public.settings
  for each statement execute function public.settings_bump_revision();

-- config_seed (docs/26 §2b): registry metadata in, never a value. Called by nothing in this PR.
-- entries: [{key, module, scope, value_type, default_value, is_public, description_seed, retired}].
-- A missing key gets a row holding JSON null (= unset = default for every reader, §2a "Null semantics").
-- On conflict only metadata columns are updated, and only where they differ: value, description and
-- description_edited are never in the update list. One savepoint per key (BEGIN … EXCEPTION), so one
-- bad entry (key format, kind check after a type change) is reported in `failed` and never blocks boot.
create or replace function public.config_seed(entries jsonb, registry_version int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  stored int;
  n int;
  applied int := 0;
  failed jsonb := '[]'::jsonb;
begin
  -- Two API instances booting at once: the second skips instead of waiting (xact lock: freed at commit).
  if not pg_try_advisory_xact_lock(hashtextextended('ab:config_seed', 0)) then
    return jsonb_build_object('skipped', 'locked');
  end if;
  if jsonb_typeof(entries) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'entries must be a JSON array';
  end if;
  insert into public.settings_revision (id) values (true) on conflict do nothing;
  select r.registry_version into stored from public.settings_revision r where r.id;
  -- An older build (or a rollback) must not rewrite the newer build's metadata (§9 #3).
  if stored > config_seed.registry_version then
    return jsonb_build_object('skipped', 'older_build', 'stored', stored);
  end if;
  for e in select value from jsonb_array_elements(entries) loop
    begin
      insert into public.settings as s
        (key, value, module, scope, value_type, default_value, is_public, description_seed, retired_at)
      values (e ->> 'key', 'null'::jsonb, e ->> 'module', e ->> 'scope', e ->> 'value_type', e -> 'default_value',
        coalesce((e ->> 'is_public')::boolean, false), e ->> 'description_seed',
        case when coalesce((e ->> 'retired')::boolean, false) then now() end)
      on conflict (key) do update set
        module = excluded.module, scope = excluded.scope, value_type = excluded.value_type,
        default_value = excluded.default_value, is_public = excluded.is_public,
        description_seed = excluded.description_seed,
        -- retired keeps the first retirement time; un-retiring clears it.
        retired_at = case when excluded.retired_at is null then null else coalesce(s.retired_at, excluded.retired_at) end
      where (s.module, s.scope, s.value_type, s.default_value, s.is_public, s.description_seed, s.retired_at is not null)
        is distinct from (excluded.module, excluded.scope, excluded.value_type, excluded.default_value,
          excluded.is_public, excluded.description_seed, excluded.retired_at is not null);
      get diagnostics n = row_count;
      applied := applied + n;
    exception when others then
      failed := failed || jsonb_build_array(e ->> 'key');
    end;
  end loop;
  update public.settings_revision r
    set registry_version = greatest(r.registry_version, config_seed.registry_version) where r.id;
  return jsonb_build_object('applied', applied, 'failed', failed);
end;
$$;

-- config_set (docs/26 §2a, §2f): one save = one transaction; any failure raises and rolls back the call.
-- changes: [{key, value, expected_version}]. Optimistic per key: an absent row accepts version 0 and is
-- inserted; JSON null is stored as 'null'::jsonb (unset = default), never deleted. Conflict = SQLSTATE
-- P0409, detail = the key, hint = the current version (0 if absent). Ownership, confirmation text and
-- zod validation are decided by the API (OWNED_SETTING_KEYS); this RPC deliberately special-cases no key.
create or replace function public.config_set(changes jsonb, actor uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb;
  k text;
  cur bigint;
  expected bigint;
  v bigint;
  result jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(changes) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'changes must be a JSON array';
  end if;
  for c in select value from jsonb_array_elements(changes) loop
    k := c ->> 'key';
    if k is null or not (c ? 'value') or jsonb_typeof(c -> 'expected_version') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'invalid change', detail = coalesce(k, '');
    end if;
    expected := (c ->> 'expected_version')::bigint;
    select s.version into cur from public.settings s where s.key = k for update;
    if not found then
      if expected <> 0 then
        raise exception using errcode = 'P0409', message = 'conflict', detail = k, hint = '0';
      end if;
      -- on conflict do nothing: a concurrent insert of the same key is a conflict, not a 23505.
      insert into public.settings (key, value, updated_by) values (k, c -> 'value', actor)
        on conflict (key) do nothing returning version into v;
      if v is null then
        raise exception using errcode = 'P0409', message = 'conflict', detail = k, hint = '0';
      end if;
    else
      if cur <> expected then
        raise exception using errcode = 'P0409', message = 'conflict', detail = k, hint = cur::text;
      end if;
      update public.settings s set value = c -> 'value', updated_by = actor where s.key = k
        returning s.version into v;
    end if;
    result := result || jsonb_build_object(k, v);
  end loop;
  return result;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'config_seed(jsonb, int)', 'config_set(jsonb, uuid)', 'settings_before_update()',
    'settings_bump_revision()', 'settings_bump_revision_if_rows()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- MANUAL ROLLBACK (only after the code rollback; no value is lost, the columns are unused):
--   drop function public.config_set(jsonb, uuid); drop function public.config_seed(jsonb, int);
--   drop trigger settings_revision_ins, settings_revision_upd, settings_revision_del, settings_revision_trunc
--     on public.settings (one statement each); drop function public.settings_bump_revision_if_rows();
--   drop function public.settings_bump_revision(); drop table public.settings_revision;
--   drop trigger settings_before_update on public.settings; drop function public.settings_before_update();
--   create trigger settings_updated_at before update on public.settings
--     for each row execute function public.set_updated_at();
--   alter table public.settings drop constraint settings_kind, drop constraint settings_value_size,
--     drop constraint settings_key_format, drop constraint settings_description_len, drop constraint settings_scope_ok;
--   drop function public.settings_kind_ok(text, jsonb);
--   alter table public.settings drop column retired_at, drop column version, … (each new column);
--   drop sequence public.settings_version_seq;
