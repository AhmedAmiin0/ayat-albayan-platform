import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { SalesCourseRepo } from './sales-course.repo';

/** No rule without a package (not an imported student), twice. */
const notImported = () => ({ schedule_rule_students: [{ data: [] }, { data: [] }] });
const SUB = { id: 'sub1', package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-10' };

describe('SalesCourseQueries', () => {
  it('student: the wizard’s fields; a missing code reads as empty; 404 when unknown', async () => {
    const row = { id: 's1', code: null, name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran', teacher_gender_pref: null, teacher_id: null };
    const t = fakeDb({ students: [{ data: row }, { data: null }] });
    const q = new SalesCourseRepo(t.db);
    expect(await q.student('s1')).toEqual({ ...row, code: '' });
    await expect(q.student('x')).rejects.toThrow();
  });

  it('subscription: the newest unpaid or active one of the student', async () => {
    const subs = [{ data: [{ ...SUB, rules: [] }] }, { data: [] }];
    const t = fakeDb({ subscriptions: subs, ...notImported() });
    const q = new SalesCourseRepo(t.db);
    expect(await q.subscription('s1')).toEqual(SUB);
    expect(t.argsOf('subscriptions', 'in')).toEqual(['status', ['unpaid', 'active']]);
    expect(t.argsOf('subscriptions', 'order')).toEqual(['created_at', { ascending: false }]);
    expect(await q.subscription('s2')).toBeNull();
  });

  it('subscription: the newest one WITHOUT a course (two active packages, the older one unbooked)', async () => {
    const older = { ...SUB, id: 'sub0', rules: [] };
    const t = fakeDb({ subscriptions: [{ data: [{ ...SUB, rules: [{ id: 'r1' }] }, older] }], ...notImported() });
    expect(await new SalesCourseRepo(t.db).subscription('s1')).toEqual({ ...SUB, id: 'sub0' });
  });

  it('subscription: a student with an imported course books the newest only (old packages were taught)', async () => {
    const older = { ...SUB, id: 'sub0', rules: [] };
    const t = fakeDb({
      subscriptions: [{ data: [{ ...SUB, rules: [{ id: 'r1' }] }, older] }],
      schedule_rule_students: [{ data: [{ rule: { id: 'legacy' } }] }],
    });
    expect(await new SalesCourseRepo(t.db).subscription('s1')).toEqual(SUB);
  });

  it('subscription: every package booked → the newest (course_exists, the view shows its course)', async () => {
    const booked = [{ ...SUB, rules: [{ id: 'r1' }] }, { ...SUB, id: 'sub0', rules: [{ id: 'r0' }] }];
    const t = fakeDb({ subscriptions: [{ data: booked }], ...notImported() });
    expect(await new SalesCourseRepo(t.db).subscription('s1')).toEqual(SUB);
  });

  it('subscription: a duration outside 30/45/60/90 is a broken row (throws)', async () => {
    const subs = [{ data: [{ ...SUB, duration: 50, rules: [] }] }];
    const t = fakeDb({ subscriptions: subs, ...notImported() });
    await expect(new SalesCourseRepo(t.db).subscription('s1')).rejects.toThrow('duration 50');
  });

  it('rules: the student’s active rules, flattened', async () => {
    const rule = { starts_on: '2026-09-01', ends_on: null, package: '8', status: 'active' };
    const t = fakeDb({ schedule_rule_students: [{ data: [{ rule }] }, { error: { message: 'down' } }] });
    const q = new SalesCourseRepo(t.db);
    expect(await q.rules('s1')).toEqual([{ starts_on: '2026-09-01', ends_on: null, package: '8' }]);
    expect(t.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['student_id', 's1'],
      ['rule.status', 'active'],
    ]);
    await expect(q.rules('s1')).rejects.toThrow();
  });
});
