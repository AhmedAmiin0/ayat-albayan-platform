import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// A child's login chats like any student's: read as text, no database in unit tests.
const strip = (sql: string) => sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const sql = strip(readFileSync(join(MIGRATIONS_DIR, '20261116000100_child_chat.sql'), 'utf8'));
/** The SQL between a function's two `$$` (its body). */
const body = (fn: string): string => {
  const start = sql.indexOf('$$', sql.indexOf(`function public.${fn}(`)) + 2;
  return sql.slice(start, sql.indexOf('$$', start));
};

describe('migration 20261116000100: a child login chats', () => {
  it('can_read_channel: any own student login on an open channel, contact_is_self no longer asked', () => {
    const fn = body('can_read_channel');
    expect(fn).toContain('s.profile_id = (select auth.uid())');
    expect(fn).toContain('public.channel_is_open(c.student_id)');
    expect(fn).not.toContain('contact_is_self');
  });

  it('presence_can_watch: the teacher sees any student login of a channel it reads', () => {
    const fn = body('presence_can_watch');
    expect(fn).toContain('or s.profile_id = p_target');
    expect(fn).toContain('public.can_read_channel(c.id)');
    expect(fn).not.toContain('contact_is_self');
  });

  it('keeps the grants: never anon', () => {
    for (const fn of ['can_read_channel', 'presence_can_watch']) {
      expect(sql).toContain(`revoke execute on function public.${fn}(uuid) from public, anon;`);
    }
  });
});
