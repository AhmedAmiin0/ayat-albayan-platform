import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 20261024000633 (docs/23 §3 phase 5, docs/23c) read as text: expand only, inert under legacy.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const FILE = '20261024000633_numbers_routing.sql';
const sql = readFileSync(join(dir, FILE), 'utf8');
const code = sql.replace(/--.*$/gm, '');

describe('migration 20261024000633: routing per number', () => {
  it('sorts after every other migration', () => {
    const all = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    expect(all.indexOf(FILE)).toBeGreaterThan(all.indexOf('20261024000632_notification_rules.sql'));
  });

  it('adds nullable / defaulted columns only', () => {
    expect(code).toContain('add column if not exists number_id uuid references public.wa_numbers (id) on delete set null');
    expect(code).toMatch(/add column if not exists fallback_rank smallint not null default 100\s+check \(fallback_rank between 0 and 999\)/);
  });

  it('approvals per (template, number): RLS admin read, no write for authenticated', () => {
    expect(code).toContain('primary key (template_key, number_id)');
    expect(code).toContain('alter table public.message_template_numbers enable row level security');
    expect(code).toContain('using (public.is_admin())');
    expect(code).toContain('revoke insert, update, delete, truncate, references, trigger on public.message_template_numbers from authenticated');
  });

  it('v_thread_numbers: inbound per (phone, number, line), service role only; v_threads untouched', () => {
    expect(code).toMatch(/where direction = 'inbound'\s+group by phone_e164, number_id, coalesce\(line, 'notifications'::public\.wa_line\)/);
    expect(code).toContain('revoke all on public.v_thread_numbers from anon, authenticated');
    expect(code).not.toMatch(/view public\.v_threads\b/);
  });

  it('inserts nothing, never reads or writes settings, never touches a sending switch', () => {
    expect(code).not.toMatch(/insert into/i);
    expect(code).not.toMatch(/\bupdate public\./i);
    expect(code).not.toMatch(/public\.settings|messaging_enabled|auto_messages_enabled|comms_source|crm_cutover_done/);
  });
});
