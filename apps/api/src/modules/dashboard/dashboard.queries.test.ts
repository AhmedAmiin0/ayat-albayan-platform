import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { DashboardQueries } from './dashboard.queries';
import { FinanceQueries } from './finance.queries';
import { WorkQueries } from './work.queries';

const W = { from: new Date('2026-09-30T21:00:00.000Z'), to: new Date('2026-10-07T21:00:00.000Z') };
const NOW = new Date('2026-10-02T09:00:00.000Z');

describe('DashboardQueries (counts from statuses)', () => {
  it('needs confirmation = scheduled in [now, now + 48 h)', async () => {
    const { db, calls } = fakeDb({ lessons: [{ count: 3 }] });
    expect(await new DashboardQueries(db).needsConfirmation(NOW)).toBe(3);
    expect(calls).toContainEqual({ table: 'lessons', method: 'eq', args: ['status', 'scheduled'] });
    expect(calls).toContainEqual({ table: 'lessons', method: 'lt', args: ['starts_at', '2026-10-04T09:00:00.000Z'] });
  });

  it('unpaid packages, open tasks and active students are status counts; a DB error throws', async () => {
    const { db, calls } = fakeDb({ subscriptions: [{ count: 2 }], admin_tasks: [{ count: null }], students: [{ error: { message: 'boom' } }] });
    const q = new DashboardQueries(db);
    expect(await q.unpaidSubscriptions()).toBe(2);
    expect(await q.openTasks()).toBe(0);
    expect(calls).toContainEqual({ table: 'admin_tasks', method: 'is', args: ['done_at', null] });
    await expect(q.activeStudents()).rejects.toThrow(/boom/);
  });

  it('«مشترك» counts status active only (pending_renewal is not مشترك)', async () => {
    const { db, calls } = fakeDb({ students: [{ count: 4 }] });
    expect(await new DashboardQueries(db).activeStudents()).toBe(4);
    expect(calls).toContainEqual({ table: 'students', method: 'eq', args: ['status', 'active'] });
  });

  it('leads are the ones created in the window; load students are current (trial/active/pending_renewal) with a teacher', async () => {
    const { db, calls } = fakeDb({ leads: [{ data: [] }], students: [{ data: [] }] });
    const q = new DashboardQueries(db);
    await q.leads(W);
    await q.loadStudents();
    expect(calls).toContainEqual({ table: 'leads', method: 'gte', args: ['created_at', W.from.toISOString()] });
    expect(calls).toContainEqual({ table: 'students', method: 'in', args: ['status', ['trial', 'active', 'pending_renewal']] });
    expect(calls).toContainEqual({ table: 'students', method: 'not', args: ['teacher_id', 'is', null] });
  });
});

describe('FinanceQueries', () => {
  it('payable lessons (the one pay rule) in the window; expenses by month bounds', async () => {
    const { db, calls } = fakeDb({ v_teacher_payable_lessons: [{ data: [] }], expenses: [{ data: [] }] });
    const q = new FinanceQueries(db);
    await q.payableLessons(W);
    await q.expenses('2026-09', '2026-10');
    expect(calls).toContainEqual({ table: 'v_teacher_payable_lessons', method: 'gte', args: ['starts_at', W.from.toISOString()] });
    expect(calls).toContainEqual({ table: 'expenses', method: 'gte', args: ['month', '2026-09-01'] });
    expect(calls).toContainEqual({ table: 'expenses', method: 'lte', args: ['month', '2026-10-01'] });
  });
});

describe('WorkQueries', () => {
  it('pending reports: started, reportable, and no SUBMITTED report (anti-join)', async () => {
    const { db, calls } = fakeDb({ lesson_students: [{ data: [] }] });
    await new WorkQueries(db).pendingReports(NOW);
    expect(calls).toContainEqual({ table: 'lesson_students', method: 'lte', args: ['lesson.starts_at', NOW.toISOString()] });
    expect(calls).toContainEqual({ table: 'lesson_students', method: 'eq', args: ['lesson_reports.status', 'submitted'] });
    expect(calls).toContainEqual({ table: 'lesson_students', method: 'is', args: ['lesson_reports', null] });
    const statuses = calls.find((c) => c.method === 'in')?.args[1];
    expect(statuses).toEqual(['scheduled', 'confirmed', 'completed', 'late', 'excused', 'no_show']);
  });

  it('task subjects join the balance view; no ids → no query', async () => {
    const { db } = fakeDb({
      subscriptions: [{ data: [{ id: 'sub1', student: { id: 's1', code: 'AB-0183', name: 'سهيلة' } }] }],
      v_subscription_balance: [{ data: [{ subscription_id: 'sub1', lessons_total: 4, lessons_used: 3 }] }],
    });
    const q = new WorkQueries(db);
    expect(await q.taskSubjects([])).toEqual([]);
    expect(await q.taskSubjects(['sub1'])).toEqual([
      { id: 'sub1', student: { id: 's1', code: 'AB-0183', name: 'سهيلة' }, balance: { subscription_id: 'sub1', lessons_total: 4, lessons_used: 3 } },
    ]);
  });
});
