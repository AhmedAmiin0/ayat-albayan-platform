import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { SalesRosterRepo } from './sales-roster.repo';

const IDS = ['s1', 's2'];
const W = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-27T10:00:00Z') };
const rows = (n: number) => Array.from({ length: n }, () => ({ student_id: 's1' }));

describe('SalesRosterRepo (whitelisted, one read per kind for the page)', () => {
  it('rules: the page\'s active rules, never a link or subscription', async () => {
    const f = fakeDb({ schedule_rule_students: [{ data: [] }] });
    await new SalesRosterRepo(f.db).rules(IDS);
    const select = String(f.argsOf('schedule_rule_students', 'select')?.[0]);
    expect(select).toContain('rule:schedule_rules!inner(id, byday, start_time_local, tz');
    expect(select).not.toMatch(/meeting|subscription|created_by/);
    expect(f.argsOf('schedule_rule_students', 'in')).toEqual(['student_id', IDS]);
    expect(f.argsOf('schedule_rule_students', 'eq')).toEqual(['rule.status', 'active']);
  });

  it('packages: the active ones, the start date only (never a price)', async () => {
    const f = fakeDb({ subscriptions: [{ data: [] }] });
    await new SalesRosterRepo(f.db).packages(IDS);
    expect(f.argsOf('subscriptions', 'select')).toEqual(['student_id, starts_on']);
    expect(f.argsOf('subscriptions', 'eq')).toEqual(['status', 'active']);
  });

  it('lessons: [from, to) for the page, read in pages of 1000 until a short one', async () => {
    const f = fakeDb({ lesson_students: [{ data: rows(1000) }, { data: rows(3) }] });
    const out = await new SalesRosterRepo(f.db).lessons(IDS, W);
    expect(out).toHaveLength(1003);
    expect(f.trips).toEqual(['lesson_students', 'lesson_students']);
    expect(String(f.argsOf('lesson_students', 'select')?.[0])).toBe(
      'student_id, attendance, lesson:lessons!inner(starts_at, status)',
    );
    expect(f.argsOf('lesson_students', 'gte')).toEqual(['lesson.starts_at', W.from.toISOString()]);
    expect(f.argsOf('lesson_students', 'lt')).toEqual(['lesson.starts_at', W.to.toISOString()]);
    const ranges = f.calls.filter((c) => c.method === 'range').map((c) => c.args);
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it('no student: no read at all', async () => {
    const f = fakeDb({});
    const repo = new SalesRosterRepo(f.db);
    const out = [await repo.rules([]), await repo.packages([]), await repo.lessons([], W)];
    expect(out).toEqual([[], [], []]);
    expect(f.trips).toEqual([]);
  });

  it('a database error becomes an error', async () => {
    const f = fakeDb({ subscriptions: [{ error: { message: 'boom' } }] });
    await expect(new SalesRosterRepo(f.db).packages(IDS)).rejects.toThrow(/boom/);
  });
});
