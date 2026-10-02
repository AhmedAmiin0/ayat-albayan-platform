import { describe, expect, it } from 'vitest';
import { WORK_ITEMS } from './dashboard.types';
import { pendingList, taskList, unpaidList, type PendingIn, type TaskIn } from './work.mapper';

const SUHAILA = { id: 's1', code: 'AB-0183', name: 'سهيلة' };
const ABRAR = { id: 't1', display_name_ar: 'أبرار' };
const pending = (startsAt: string, s: PendingIn['student'] = SUHAILA): PendingIn => ({
  lesson_id: `l-${startsAt}`,
  student: s,
  lesson: { starts_at: startsAt, status: 'completed', teacher: ABRAR },
});
const task = (over: Partial<TaskIn> = {}): TaskIn => ({
  id: 'task1',
  kind: 'renewal_due',
  subject_type: 'subscription',
  subject_id: 'sub1',
  title: null,
  due_at: null,
  done_at: null,
  created_at: '2026-10-01T10:00:00Z',
  ...over,
});

describe('pendingList (R-RPT-01 pending reports)', () => {
  it('oldest lesson first, then student name; total counts every row', () => {
    const l = pendingList([
      pending('2026-10-02T10:00:00Z'),
      pending('2026-09-30T10:00:00Z', { id: 's2', code: null, name: 'مريم' }),
      pending('2026-09-30T10:00:00Z', { id: 's3', code: 'AB-0190', name: 'أحمد' }),
    ]);
    expect(l.total).toBe(3);
    expect(l.items.map((r) => r.student.name)).toEqual(['أحمد', 'مريم', 'سهيلة']);
    expect(l.items[1]).toMatchObject({ student: { code: '' }, teacher: ABRAR, status: 'completed' });
  });

  it('keeps at most WORK_ITEMS items and drops rows without a student or teacher', () => {
    const rows = Array.from({ length: WORK_ITEMS + 5 }, (_, i) => pending(`2026-09-${String(i + 1).padStart(2, '0')}T10:00:00Z`));
    expect(pendingList(rows)).toMatchObject({ total: WORK_ITEMS + 5 });
    expect(pendingList(rows).items).toHaveLength(WORK_ITEMS);
    expect(pendingList([{ ...pending('2026-10-01T00:00:00Z'), student: null }]).total).toBe(0);
  });
});

describe('unpaidList', () => {
  const row = { id: 'sub1', package: '4' as const, lessons_total: 4, price: 145, currency: 'SAR', starts_on: '2026-09-28', student: SUHAILA };
  it('money still owed: paid and owed from its payments', () => {
    const l = unpaidList([{ ...row, payments: [{ amount: 100 }] }]);
    expect(l).toEqual({
      total: 1,
      items: [{ ...row, student: SUHAILA, paid: 100, owed: 45, reason: 'owes' }],
    });
  });

  it('paid in full and used up → renewal_due, nothing owed (never chase a guardian who paid)', () => {
    const [item] = unpaidList([{ ...row, payments: [{ amount: 100 }, { amount: 45 }] }]).items;
    expect(item).toMatchObject({ paid: 145, owed: 0, reason: 'renewal_due' });
  });
});

describe('taskList', () => {
  it('a package task carries the student and its use; other subjects get nulls', () => {
    const l = taskList(
      [task(), task({ id: 'task2', subject_type: 'lesson', subject_id: 'x' })],
      [{ id: 'sub1', student: SUHAILA, balance: { lessons_total: 4, lessons_used: 2 } }],
    );
    expect(l.items[0]).toMatchObject({ id: 'task1', student: SUHAILA, balance: { used: 2, total: 4 } });
    expect(l.items[1]).toMatchObject({ id: 'task2', student: null, balance: null });
  });

  it('a package without a balance row has no balance', () => {
    const l = taskList([task()], [{ id: 'sub1', student: SUHAILA, balance: null }]);
    expect(l.items[0]?.balance).toBeNull();
  });
});
