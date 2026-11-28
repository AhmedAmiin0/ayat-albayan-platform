import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// docs/50 §2 in RLS too: the family reads the chat only while family_chat_enabled is on.
const strip = (s: string) =>
  s
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
const read = (f: string) => strip(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));
const sql = read('20261117090400_channel_family_gate.sql');
const before = read('20261117090200_channel_seat.sql');
const body = (text: string) => {
  const start = text.indexOf('$$', text.indexOf('function public.can_read_channel(')) + 2;
  return text.slice(start, text.indexOf('$$', start));
};
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('migration 20261117090400: can_read_channel follows the family chat switch', () => {
  it('the guardian and student branches need the switch on (jsonb true; no row = off)', () => {
    const fn = flat(body(sql));
    const gate = flat(`coalesce((select s.value = 'true'::jsonb from public.settings s
      where s.key = 'family_chat_enabled'), false)`);
    expect(fn).toContain(`or (${gate} and ((public.auth_role() = 'guardian'`);
    expect(fn).toContain("or (public.auth_role() = 'student' and exists (");
  });

  it('the staff branches are those of 20261117090200 (the seat), unchanged', () => {
    const fn = flat(body(sql));
    const old = flat(body(before));
    const staff = old.slice(0, old.indexOf("or (public.auth_role() = 'guardian'"));
    expect(fn.startsWith(staff)).toBe(true);
    expect(fn).toContain("public.auth_role() = 'sales' and c.assistant_id = (select auth.uid())");
    expect(fn).not.toContain('my_sales_student_ids');
  });

  it('keeps the grants: never anon', () => {
    expect(sql).toContain(
      'revoke execute on function public.can_read_channel(uuid) from public, anon;',
    );
    expect(sql).toContain(
      'grant execute on function public.can_read_channel(uuid) to authenticated, service_role;',
    );
  });
});
