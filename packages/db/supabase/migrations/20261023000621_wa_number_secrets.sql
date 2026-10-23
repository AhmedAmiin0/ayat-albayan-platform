-- Credentials per WhatsApp number (docs/23 §2a, §3 phase 3): Supabase Vault names
-- 'wa_number:<id>:access_token' and 'wa_number:<id>:app_secret', same shape as integration_secret_*.
-- Every function checks that the number exists (id-validated), so adding a number needs no migration.
-- Service role only. No function returns or logs a value except wa_number_secret_read (the API's
-- in-memory config). wa_number_secret_copy copies one legacy integration secret Vault→Vault inside the
-- database (the import button), so the value never reaches the API. wa_number_make_default and
-- wa_number_delete are the atomic writes of the numbers admin. Nothing is copied here. Idempotent.

set local lock_timeout = '5s';

create or replace function public.wa_number_secret_name_ok(p_name text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_name = any (array['access_token', 'app_secret']);
$$;

-- Raises unless the number exists and the name is known; returns the Vault name.
create or replace function public.wa_number_secret_vault_name(p_id uuid, p_name text) returns text
  language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.wa_number_secret_name_ok(p_name) then
    raise exception 'unknown number secret name' using errcode = '22023';
  end if;
  if p_id is null or not exists (select 1 from public.wa_numbers n where n.id = p_id) then
    raise exception 'unknown number' using errcode = '22023';
  end if;
  return 'wa_number:' || p_id::text || ':' || p_name;
end;
$$;

-- Create or replace one secret. Never returns or logs the value.
create or replace function public.wa_number_secret_set(p_id uuid, p_name text, p_value text) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.wa_number_secret_vault_name(p_id, p_name);
  existing uuid;
begin
  if p_value is null or btrim(p_value) = '' or octet_length(p_value) > 4096 then
    raise exception 'invalid number secret value' using errcode = '22023';
  end if;
  -- A concurrent wa_number_delete waits for this write (and then removes the entry), or wins and this
  -- one fails: never an orphaned credential. Two sets of the same name queue instead of colliding.
  perform 1 from public.wa_numbers n where n.id = p_id for share;
  if not found then
    raise exception 'unknown number' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_name));
  select id into existing from vault.secrets where name = v_name;
  if existing is null then
    perform vault.create_secret(p_value, v_name, 'WhatsApp number credential (admin, «الأرقام»)');
  else
    perform vault.update_secret(existing, p_value);
  end if;
end;
$$;

-- Remove one secret. True when there was one.
create or replace function public.wa_number_secret_clear(p_id uuid, p_name text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.wa_number_secret_vault_name(p_id, p_name);
  n int;
begin
  delete from vault.secrets where name = v_name;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Which secrets are set and when, for every existing number: NO values (the cards' chips).
create or replace function public.wa_number_secret_status() returns table (number_id uuid, name text, updated_at timestamptz)
  language sql stable security definer set search_path = '' as $$
  select n.id, split_part(s.name, ':', 3), s.updated_at
  from vault.secrets s
  join public.wa_numbers n on s.name = 'wa_number:' || n.id::text || ':' || split_part(s.name, ':', 3)
  where s.name like 'wa_number:%' and public.wa_number_secret_name_ok(split_part(s.name, ':', 3));
$$;

-- One number's decrypted values, for the API's in-memory line config only (service role).
create or replace function public.wa_number_secret_read(p_id uuid) returns table (name text, value text)
  language sql stable security definer set search_path = '' as $$
  select split_part(s.name, ':', 3), s.decrypted_secret
  from vault.decrypted_secrets s
  where p_id is not null
    and exists (select 1 from public.wa_numbers n where n.id = p_id)
    and s.name in ('wa_number:' || p_id::text || ':access_token', 'wa_number:' || p_id::text || ':app_secret');
$$;

-- The import: copy the legacy integration secret p_key into the number's p_name, Vault→Vault. Only the
-- WhatsApp line keys that belong to that name are accepted. False = the legacy secret is not in Vault
-- (nothing written). The value never leaves the database.
create or replace function public.wa_number_secret_copy(p_id uuid, p_name text, p_key text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  v_value text;
begin
  perform public.wa_number_secret_vault_name(p_id, p_name);
  if not ((p_name = 'access_token' and p_key in ('WA_ACCESS_TOKEN', 'WA_CHAT_ACCESS_TOKEN'))
       or (p_name = 'app_secret' and p_key in ('WA_APP_SECRET', 'WA_CHAT_APP_SECRET'))) then
    raise exception 'integration key does not match the number secret' using errcode = '22023';
  end if;
  select s.decrypted_secret into v_value from vault.decrypted_secrets s where s.name = 'integration:' || p_key;
  if v_value is null or btrim(v_value) = '' then
    return false;
  end if;
  perform public.wa_number_secret_set(p_id, p_name, v_value);
  return true;
end;
$$;

-- Make one ENABLED number its role's default; the role's other defaults are unset in the same statement.
create or replace function public.wa_number_make_default(p_id uuid, p_actor uuid) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  v_purpose public.wa_line;
begin
  select purpose into v_purpose from public.wa_numbers where id = p_id and enabled;
  if v_purpose is null then
    return false;
  end if;
  update public.wa_numbers set is_default = false, updated_by = p_actor
    where purpose = v_purpose and is_default and id <> p_id;
  update public.wa_numbers set is_default = true, updated_by = p_actor where id = p_id;
  return true;
end;
$$;

-- Delete a DISABLED number and its two Vault entries together. False = missing or still enabled.
create or replace function public.wa_number_delete(p_id uuid) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  delete from public.wa_numbers where id = p_id and not enabled;
  get diagnostics n = row_count;
  if n = 0 then
    return false;
  end if;
  delete from vault.secrets where name in ('wa_number:' || p_id::text || ':access_token', 'wa_number:' || p_id::text || ':app_secret');
  return true;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'wa_number_secret_name_ok(text)', 'wa_number_secret_vault_name(uuid, text)',
    'wa_number_secret_set(uuid, text, text)', 'wa_number_secret_clear(uuid, text)',
    'wa_number_secret_status()', 'wa_number_secret_read(uuid)', 'wa_number_secret_copy(uuid, text, text)',
    'wa_number_make_default(uuid, uuid)', 'wa_number_delete(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- MANUAL ROLLBACK (only after the code rollback):
--   delete from vault.secrets where name like 'wa_number:%';
--   drop function public.wa_number_delete(uuid), public.wa_number_make_default(uuid, uuid),
--     public.wa_number_secret_copy(uuid, text, text), public.wa_number_secret_read(uuid),
--     public.wa_number_secret_status(), public.wa_number_secret_clear(uuid, text),
--     public.wa_number_secret_set(uuid, text, text), public.wa_number_secret_vault_name(uuid, text),
--     public.wa_number_secret_name_ok(text);
