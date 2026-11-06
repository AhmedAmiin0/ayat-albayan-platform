import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 20261106001200 (messages.updated_at, docs/43 §5) read as text: large-table safe, the
// backfill silent (no broadcast, no summary recompute), the trigger after it, the keyset index.
const FILE = '20261106001200_messages_sync_cursor.sql';
const SQL = readFileSync(join(MIGRATIONS_DIR, FILE), 'utf8').replace(/--.*$/gm, '');
const at = (s: string) => SQL.indexOf(s);

describe(`migration ${FILE}`, () => {
  it('sorts after every migration of develop at the time (through 20261106000700)', () => {
    const all = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(all.indexOf(FILE)).toBeGreaterThan(all.indexOf('20261106000700_evolution_driver.sql'));
  });

  it('a lock timeout first; the column in one statement with a fast default', () => {
    expect(SQL.trimStart().startsWith("set local lock_timeout = '5s';")).toBe(true);
    expect(SQL).toMatch(
      /add column if not exists updated_at timestamptz not null default now\(\);/,
    );
    expect(SQL).not.toMatch(/concurrently/i);
  });

  it('backfill = the latest own timestamp, else created_at; only rows that differ', () => {
    expect(SQL).toMatch(
      /coalesce\(\s*greatest\(sent_at, delivered_at, read_at, edited_at, deleted_at, our_reaction_at, hidden_at\),\s*created_at\)/,
    );
    expect(SQL).toMatch(/where updated_at is distinct from/);
  });

  it('the realtime and summary triggers are off only around the backfill', () => {
    const update = at('update public.messages');
    for (const name of ['messages_inbox_live_update', 'thread_summaries_update']) {
      expect(at(`disable trigger ${name}`)).toBeGreaterThan(-1);
      expect(at(`disable trigger ${name}`)).toBeLessThan(update);
      expect(at(`enable trigger ${name}`)).toBeGreaterThan(update);
    }
  });

  it('the BEFORE UPDATE trigger goes live after the backfill (it keeps its values); re-runnable', () => {
    expect(SQL).toContain('drop trigger if exists messages_set_updated_at on public.messages');
    const create = at('create trigger messages_set_updated_at before update on public.messages');
    expect(create).toBeGreaterThan(at('update public.messages'));
    expect(SQL).toContain('for each row execute function public.set_updated_at()');
  });

  it('the keyset index (updated_at, id); RLS untouched', () => {
    expect(SQL).toContain(
      'create index if not exists messages_updated_at_id_idx on public.messages (updated_at, id)',
    );
    expect(SQL).not.toMatch(/policy|row level security|create table/i);
  });
});
