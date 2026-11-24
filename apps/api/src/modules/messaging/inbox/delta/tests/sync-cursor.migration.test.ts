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

  it('backfill once: only while the stamp trigger is absent (a re-run never moves rows back)', () => {
    expect(SQL).toMatch(
      /if not exists \(\s*select 1 from pg_trigger[\s\S]*tgname = 'messages_set_updated_at'/,
    );
    const backfill =
      /coalesce\(\s*greatest\(sent_at, delivered_at, read_at, edited_at, deleted_at, our_reaction_at, hidden_at\),\s*created_at\)/;
    expect(SQL).toMatch(backfill);
    expect(at('if not exists')).toBeLessThan(at('update public.messages'));
  });

  it('the realtime and summary triggers are off only around the backfill', () => {
    const update = at('update public.messages');
    for (const name of ['messages_inbox_live_update', 'thread_summaries_update']) {
      expect(at(`disable trigger ${name}`)).toBeGreaterThan(-1);
      expect(at(`disable trigger ${name}`)).toBeLessThan(update);
      expect(at(`enable trigger ${name}`)).toBeGreaterThan(update);
    }
  });

  it('a monotonic BEFORE UPDATE stamp (clock time, never at or before the old one), after the backfill', () => {
    expect(SQL).toContain(
      "new.updated_at := greatest(pg_catalog.clock_timestamp(), old.updated_at + interval '1 microsecond')",
    );
    const create = at(
      'create or replace trigger messages_set_updated_at before update on public.messages',
    );
    expect(create).toBeGreaterThan(at('update public.messages'));
    expect(SQL).toContain('for each row execute function public.messages_touch_updated_at()');
  });

  it('the keyset indexes on both tables', () => {
    expect(SQL).toContain(
      'create index if not exists messages_updated_at_id_idx on public.messages (updated_at, id)',
    );
    expect(SQL).toMatch(
      /message_tombstones_deleted_at_id_idx\s+on public\.message_tombstones \(deleted_at, id\)/,
    );
  });

  it('tombstones: every DELETE recorded by a statement trigger; service role only (RLS, no policy)', () => {
    expect(SQL).toContain('create table if not exists public.message_tombstones');
    expect(SQL).toMatch(
      /create or replace trigger messages_tombstones after delete on public\.messages\s+referencing old table as old_rows for each statement/,
    );
    expect(SQL).toContain('on conflict (id) do update');
    expect(SQL).toContain('alter table public.message_tombstones enable row level security');
    expect(SQL).toContain('revoke all on public.message_tombstones from anon, authenticated');
    expect(SQL).not.toMatch(/create policy/);
    expect(SQL.match(/security definer set search_path = ''/g)).toHaveLength(1);
  });
});
