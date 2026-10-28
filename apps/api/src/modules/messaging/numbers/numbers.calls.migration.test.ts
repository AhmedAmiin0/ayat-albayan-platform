import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migrations 940 (wa_line gains `calls`) and 941 (the calls number's reply-window filter, the template
// check, wa_call_permissions), read as text: expand only, idempotent, RLS on, no data written.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const read = (f: string) => readFileSync(join(dir, f), 'utf8').replace(/--.*$/gm, '');
const ENUM = read('20261028000940_wa_line_calls.sql');
const NUMBER = read('20261028000941_calls_number.sql');

describe('migrations 940 / 941: the dedicated calls number (docs/28 §10)', () => {
  it('sort after develop\'s newest at the time (930) and in order', () => {
    const all = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    expect(all.indexOf('20261028000940_wa_line_calls.sql')).toBeGreaterThan(all.indexOf('20261028000930_message_reactions.sql'));
    expect(all.indexOf('20261028000941_calls_number.sql')).toBeGreaterThan(all.indexOf('20261028000940_wa_line_calls.sql'));
  });

  it('940 only adds the enum value (alone: a new value is unusable in its own transaction)', () => {
    expect(ENUM.trim()).toBe("alter type public.wa_line add value if not exists 'calls';");
  });

  it('941 writes no row: no insert, update or delete outside a function body', () => {
    const statements = NUMBER.replace(/\$\$[\s\S]*?\$\$/g, 'BODY');
    expect(statements).not.toMatch(/\b(insert into|update public\.|delete from)\b/i);
    expect(statements).not.toMatch(/\bdrop (table|column|view)\b/i);
  });

  it('a calls inbound never opens the notifications window (view and summary refresh)', () => {
    const filter = /filter \(where (m\.)?line is distinct from 'chat' and (m\.)?line is distinct from 'calls'\)/g;
    expect(NUMBER.match(filter)).toHaveLength(2);
    expect(NUMBER).toContain('create or replace view public.v_threads');
    expect(NUMBER).toContain('create or replace function public.thread_summary_refresh(p_phone text)');
  });

  it('wa_call_permissions: API only (RLS on, no policy, no client grant); templates never on the calls line', () => {
    expect(NUMBER).toContain('create table if not exists public.wa_call_permissions');
    expect(NUMBER).toContain('alter table public.wa_call_permissions enable row level security');
    expect(NUMBER).toContain('revoke all on public.wa_call_permissions from anon, authenticated');
    expect(NUMBER).not.toMatch(/create policy[^;]*wa_call_permissions/);
    expect(NUMBER).toMatch(/check \(line <> 'calls'\) not valid/);
  });
});
