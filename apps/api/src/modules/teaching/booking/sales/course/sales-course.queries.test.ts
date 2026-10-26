import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../../people/guardians/fake-db';
import { SalesCourseQueries } from './sales-course.queries';

const SUB = { id: 'sub1', package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-10' };

describe('SalesCourseQueries', () => {
  it('student: the wizard’s fields; a missing code reads as empty; 404 when unknown', async () => {
    const row = { id: 's1', code: null, name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran', teacher_gender_pref: null, teacher_id: null };
    const t = fakeDb({ students: [{ data: row }, { data: null }] });
    const q = new SalesCourseQueries(t.db);
    expect(await q.student('s1')).toEqual({ ...row, code: '' });
    await expect(q.student('x')).rejects.toThrow();
  });

  it('subscription: the newest unpaid or active one of the student', async () => {
    const t = fakeDb({ subscriptions: [{ data: SUB }, { data: null }] });
    const q = new SalesCourseQueries(t.db);
    expect(await q.subscription('s1')).toEqual(SUB);
    expect(t.argsOf('subscriptions', 'in')).toEqual(['status', ['unpaid', 'active']]);
    expect(t.argsOf('subscriptions', 'order')).toEqual(['created_at', { ascending: false }]);
    expect(await q.subscription('s2')).toBeNull();
  });

  it('subscription: a duration outside 30/45/60/90 is a broken row (throws)', async () => {
    const t = fakeDb({ subscriptions: [{ data: { ...SUB, duration: 50 } }] });
    await expect(new SalesCourseQueries(t.db).subscription('s1')).rejects.toThrow('duration 50');
  });

  it('rules: the student’s active rules, flattened', async () => {
    const rule = { starts_on: '2026-09-01', ends_on: null, package: '8', status: 'active' };
    const t = fakeDb({ schedule_rule_students: [{ data: [{ rule }] }, { error: { message: 'down' } }] });
    const q = new SalesCourseQueries(t.db);
    expect(await q.rules('s1')).toEqual([{ starts_on: '2026-09-01', ends_on: null, package: '8' }]);
    expect(t.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['student_id', 's1'],
      ['rule.status', 'active'],
    ]);
    await expect(q.rules('s1')).rejects.toThrow();
  });
});
