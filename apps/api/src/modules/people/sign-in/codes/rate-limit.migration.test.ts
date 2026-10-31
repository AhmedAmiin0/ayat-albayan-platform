import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261028000935 read as text: no database in unit tests (the SQL behaviour, max+1 calls and the
// grants, is in e2e/tests/rate-limit-take.sql.spec.ts).
const sql = readFileSync(
  migrationPath('20261028000935_rate_limit_hits.sql'),
  'utf8',
);
const fn = /create or replace function public\.rate_limit_take[\s\S]*?\$\$;/.exec(sql)?.[0] ?? '';

describe('migration 935: rate_limit_take and its tables', () => {
  it('the function is security definer with an empty search_path, every name schema-qualified', () => {
    expect(fn).toContain("security definer set search_path = ''");
    expect(fn).not.toMatch(/\b(from|into|delete from)\s+rate_limit_hits/);
  });

  it('only the service role may execute it', () => {
    expect(sql).toContain('revoke all on function public.rate_limit_take(text[], int[], int) from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.rate_limit_take(text[], int[], int) to service_role;');
  });

  it('RLS on both tables, no grant to anon or authenticated', () => {
    for (const t of ['rate_limit_hits', 'wa_template_line_syncs']) {
      expect(sql).toContain(`alter table public.${t} enable row level security;`);
      expect(sql).toContain(`revoke all on table public.${t} from anon, authenticated;`);
      expect(sql).not.toMatch(new RegExp(`create policy[^;]*on public\\.${t}`));
    }
  });

  it('the expired-row cleanup skips locked rows, so unrelated callers never wait on each other', () => {
    expect(fn).toMatch(/at < v_now - interval '1 day' limit 100 for update skip locked/);
  });
});
