import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 20261106000500 (docs/19) read as text: one nullable column and a partial index.
const FILE = '20261106000500_app_send_pending.sql';
const SQL = readFileSync(join(MIGRATIONS_DIR, FILE), 'utf8').replace(/--.*$/gm, '');

describe('migration 20261106000500: app send pending window', () => {
  it('sorts after 20261106000400 and starts with the lock timeout', () => {
    const all = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    expect(all.indexOf(FILE)).toBe(all.indexOf('20261106000400_message_search.sql') + 1);
    expect(SQL.trim().startsWith("set local lock_timeout = '5s';")).toBe(true);
  });

  it('re-runs safely: a nullable timestamptz and an index, both if not exists', () => {
    expect(SQL).toContain(
      'alter table public.messages add column if not exists app_send_until timestamptz;',
    );
    expect(SQL).toContain('create index if not exists messages_app_send_idx');
    expect(SQL).toContain('where app_send_until is not null');
    expect(SQL).not.toMatch(/not null default|set not null/);
  });

  it('RLS unchanged: no policy, grant or table', () => {
    expect(SQL).not.toMatch(/row level security|create policy|grant |create table/);
  });
});
