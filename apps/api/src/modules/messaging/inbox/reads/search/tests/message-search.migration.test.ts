import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 20261106000400 (docs/37) read as text. The fold's parity with searchFold and the RPC's
// behaviour are proven in e2e/tests/messaging/message-search.sql.spec.ts (a real database).
const FILE = '20261106000400_message_search.sql';
const SQL = readFileSync(join(MIGRATIONS_DIR, FILE), 'utf8').replace(/--.*$/gm, '');
const SIG = 'public.search_messages(text, text[], text[], text[], timestamptz, uuid, int)';

describe('migration 20261106000400: message search', () => {
  it('sorts after 20261105001000 and starts with the lock timeout', () => {
    const all = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    expect(all.indexOf(FILE)).toBeGreaterThan(all.indexOf('20261105001000_payment_amount_set.sql'));
    expect(SQL.trim().startsWith("set local lock_timeout = '5s';")).toBe(true);
  });

  it('re-runs safely: if not exists / or replace everywhere', () => {
    expect(SQL).toContain('create extension if not exists pg_trgm with schema extensions;');
    expect(SQL).toContain('add column if not exists search_text text');
    expect(SQL).toContain('create index if not exists messages_search_trgm_idx');
    expect(SQL.match(/create or replace function/g)).toHaveLength(2);
    expect(SQL).not.toMatch(/create (function|index|extension) (?!if not exists)public/);
  });

  it('a stored fold with coalesce (never concat_ws: only STABLE) and a trigram GIN index', () => {
    expect(SQL).toMatch(/generated always as \(public\.search_fold\(coalesce\(body, ''\)/);
    expect(SQL).not.toContain('concat_ws');
    expect(SQL).toContain('using gin (search_text extensions.gin_trgm_ops)');
    expect(SQL).toMatch(/search_fold\(t text\)[\s\S]*?immutable strict parallel safe/);
  });

  it('JS whitespace only (review correction 3): no [[:space:]] class', () => {
    expect(SQL).not.toContain('[[:space:]]');
    for (const cp of [160, 5760, 8192, 8202, 8232, 8233, 8239, 8287, 12288, 65279]) {
      expect(SQL).toContain(`chr(${cp})`);
    }
  });

  it('security invoker, execute revoked from everyone and granted to service_role only', () => {
    expect(SQL).toMatch(/search_messages\([\s\S]*?security invoker/);
    expect(SQL).not.toContain('security definer');
    expect(SQL).toContain(`revoke all on function ${SIG}\n  from public, anon, authenticated;`);
    expect(SQL).toContain(`grant execute on function ${SIG}\n  to service_role;`);
    expect(SQL.match(/grant /g)).toHaveLength(1);
    expect(SQL).not.toMatch(/row level security|create policy/);
  });
});
