import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// One assistant per chat seat, the one who brought the student first: read as text, no database
// in unit tests.
const strip = (sql: string) =>
  sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
const sql = strip(readFileSync(join(MIGRATIONS_DIR, '20261117090200_channel_seat.sql'), 'utf8'));
/** The SQL between a function's two `$$` (its body). */
const body = (fn: string): string => {
  const start = sql.indexOf('$$', sql.indexOf(`function public.${fn}(`)) + 2;
  return sql.slice(start, sql.indexOf('$$', start));
};

describe('migration 20261117090200: one assistant seat per student chat', () => {
  it('adds the seat: a profile, freed when the profile goes, indexed while held', () => {
    expect(sql).toContain(
      'add column if not exists assistant_id uuid references public.profiles (id)',
    );
    expect(sql).toContain('on delete set null');
    expect(sql).toContain('on public.student_channels (assistant_id)');
    expect(sql).toContain('where assistant_id is not null');
  });

  it('backfills the bringer, a salesperson, into free seats only', () => {
    const fill = sql.slice(sql.indexOf('update public.student_channels c'));
    expect(fill).toContain('set assistant_id = s.brought_by');
    expect(fill).toContain("p.role = 'sales'");
    expect(fill).toContain('c.assistant_id is null');
  });

  it('a new student starts with its bringer in the seat when she is a salesperson', () => {
    const fn = body('open_student_channel');
    expect(fn).toContain('(student_id, assistant_id)');
    expect(fn).toContain("p.id = new.brought_by and p.role = 'sales'");
    expect(fn).toContain('on conflict (student_id) do nothing');
  });

  it('can_read_channel: an assistant reads the chat she holds, sales ownership no more', () => {
    const fn = body('can_read_channel');
    expect(fn).toContain("public.auth_role() = 'sales' and c.assistant_id = (select auth.uid())");
    expect(fn).not.toContain('my_sales_student_ids');
    expect(fn).toContain('public.channel_is_open(c.student_id)');
    expect(fn).toContain('s.profile_id = (select auth.uid())');
  });

  it('keeps the grants: never anon or a client running the trigger function', () => {
    expect(sql).toContain(
      'revoke execute on function public.can_read_channel(uuid) from public, anon;',
    );
    expect(sql).toContain(
      'revoke execute on function public.open_student_channel() from public, anon, authenticated;',
    );
  });
});
