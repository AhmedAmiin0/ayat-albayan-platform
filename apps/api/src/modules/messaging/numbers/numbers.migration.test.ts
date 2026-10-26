import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migrations 20261023000620–621 (docs/23 §3 phase 3) read as text: no database in unit tests. Expand only:
// they create, never insert a number or copy a secret, and never touch a sending switch.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const read = (f: string) => readFileSync(join(dir, f), 'utf8');
const table = read('20261023000620_wa_numbers.sql');
const vault = read('20261023000621_wa_number_secrets.sql');
const code = (sql: string) => sql.replace(/--.*$/gm, '');

describe('migration 20261023000620: wa_numbers', () => {
  it('any number of rows: one row per phone id, at most one live default per role, no one-per-role unique', () => {
    expect(table).toContain('create unique index if not exists wa_numbers_phone_number_id_key on public.wa_numbers (phone_number_id)');
    expect(table).toMatch(/wa_numbers_default_per_purpose on public\.wa_numbers \(purpose\)\s+where is_default and enabled/);
    expect(code(table)).not.toMatch(/unique[^;]*\(purpose\)\s*where enabled\s*;/);
    expect(table).toContain('is_default boolean not null default false');
  });

  it('RLS: admin read only; anon and authenticated cannot write', () => {
    expect(table).toContain('alter table public.wa_numbers enable row level security');
    expect(table).toContain('using (public.is_admin())');
    expect(table).toContain('revoke all on public.wa_numbers from anon');
    expect(table).toContain('revoke insert, update, delete, truncate, references, trigger on public.wa_numbers from authenticated');
  });

  it('messages.number_id is nullable and set null on delete; wa_line_health keeps the checked phone id', () => {
    expect(table).toContain('add column if not exists number_id uuid references public.wa_numbers (id) on delete set null');
    expect(table).toContain('alter table public.wa_line_health add column if not exists phone_number_id text');
  });

  it('seeds comms_source legacy without overwriting; grants numbers.manage to the admin only', () => {
    expect(table).toContain(`('comms_source', '"legacy"'::jsonb)\non conflict (key) do nothing`);
    expect(table).toMatch(/'numbers\.manage' from public\.roles r where r\.is_system and r\.key in \('admin'\)/);
  });

  it('expand only: no number row, no secret copy, no sending switch, no old migration', () => {
    for (const sql of [code(table), code(vault)]) {
      expect(sql).not.toMatch(/insert into public\.wa_numbers/);
      expect(sql).not.toMatch(/messaging_enabled|auto_messages_enabled|crm_cutover_done|WA_ALLOWED_RECIPIENTS/);
      expect(sql).not.toMatch(/drop table|drop column|alter type/);
    }
    expect(code(vault)).not.toMatch(/perform public\.wa_number_secret_copy/);
  });
});

describe('migration 20261023000621: per-number Vault secrets', () => {
  const fns = ['wa_number_secret_set(uuid, text, text)', 'wa_number_secret_clear(uuid, text)', 'wa_number_secret_status()', 'wa_number_secret_read(uuid)', 'wa_number_secret_copy(uuid, text, text)', 'wa_number_make_default(uuid, uuid)', 'wa_number_delete(uuid)'];

  it('every function is service-role only', () => {
    expect(vault).toContain("execute format('revoke execute on function public.%s from public, anon, authenticated', f)");
    expect(vault).toContain("execute format('grant execute on function public.%s to service_role', f)");
    for (const f of fns) expect(vault).toContain(`'${f}'`);
  });

  it('names are wa_number:<id>:access_token / :app_secret and the id must exist', () => {
    expect(vault).toContain("select p_name = any (array['access_token', 'app_secret'])");
    expect(vault).toContain("return 'wa_number:' || p_id::text || ':' || p_name");
    expect(vault).toContain("raise exception 'unknown number' using errcode = '22023'");
  });

  it('only read returns a decrypted value; the copy maps only the WhatsApp line keys of that name', () => {
    expect(vault.match(/returns table \(name text, value text\)/g)).toHaveLength(1);
    expect(vault).toContain("(p_name = 'access_token' and p_key in ('WA_ACCESS_TOKEN', 'WA_CHAT_ACCESS_TOKEN'))");
    expect(vault).toContain("(p_name = 'app_secret' and p_key in ('WA_APP_SECRET', 'WA_CHAT_APP_SECRET'))");
    expect(code(vault)).not.toMatch(/raise (notice|log|info|warning)/);
  });

  it('a number is deleted only when disabled, with its Vault entries', () => {
    expect(vault).toContain('delete from public.wa_numbers where id = p_id and not enabled');
  });

  it('a secret write locks its number (no orphan beside a concurrent delete) and queues per name', () => {
    const set = vault.slice(vault.indexOf('function public.wa_number_secret_set'), vault.indexOf('function public.wa_number_secret_clear'));
    expect(set).toContain('perform 1 from public.wa_numbers n where n.id = p_id for share');
    expect(set.indexOf('pg_advisory_xact_lock(hashtext(v_name))')).toBeLessThan(set.indexOf('select id into existing'));
  });
});
