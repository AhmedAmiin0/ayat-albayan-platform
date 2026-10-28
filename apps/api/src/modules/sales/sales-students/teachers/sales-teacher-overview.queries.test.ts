import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { SalesTeacherOverviewQueries } from './sales-teacher-overview.queries';

const SECRET = /meeting|link|subscription|price|rate|amount|payout|balance|\*/;

describe('SalesTeacherOverviewQueries (whitelisted selects)', () => {
  it('rules: the teacher\'s active rules with the students\' names and codes; no link or money column', async () => {
    const f = fakeDb({ schedule_rules: [{ data: [] }] });
    await new SalesTeacherOverviewQueries(f.db).rules('tc1');
    expect(f.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['teacher_id', 'tc1'], ['status', 'active']]);
    const select = String(f.argsOf('schedule_rules', 'select')?.[0]);
    expect(select).toContain('students:schedule_rule_students(student:students(name, code))');
    expect(select).not.toMatch(SECRET);
  });

  it('lessons: the teacher\'s lessons in [from, to), newest first; no link or money column', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    const from = new Date('2026-09-28T10:00:00Z');
    const to = new Date('2026-10-28T10:00:00Z');
    await new SalesTeacherOverviewQueries(f.db).lessons('tc1', { from, to });
    expect(f.argsOf('lessons', 'eq')).toEqual(['teacher_id', 'tc1']);
    expect(f.argsOf('lessons', 'gte')).toEqual(['starts_at', from.toISOString()]);
    expect(f.argsOf('lessons', 'lt')).toEqual(['starts_at', to.toISOString()]);
    expect(f.argsOf('lessons', 'order')).toEqual(['starts_at', { ascending: false }]);
    expect(String(f.argsOf('lessons', 'select')?.[0])).not.toMatch(SECRET);
  });

  it('exists: true for a teacher row, false without one; a database error becomes an error', async () => {
    expect(await new SalesTeacherOverviewQueries(fakeDb({ teachers: [{ data: { id: 'tc1' } }] }).db).exists('tc1')).toBe(true);
    expect(await new SalesTeacherOverviewQueries(fakeDb({ teachers: [{ data: null }] }).db).exists('tc1')).toBe(false);
    const broken = fakeDb({ lessons: [{ error: { message: 'boom' } }] });
    await expect(new SalesTeacherOverviewQueries(broken.db).lessons('tc1', { from: new Date(0), to: new Date(1) })).rejects.toThrow(/boom/);
  });
});
