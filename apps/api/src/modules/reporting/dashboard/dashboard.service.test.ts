import { describe, expect, it, vi } from 'vitest';
import type { DashboardQueries } from './dashboard.queries';
import { DashboardService } from './dashboard.service';
import type { FinanceService } from './finance/finance.service';
import type { WorkQueries } from './work/work.queries';

const NOW = new Date('2026-10-02T09:00:00.000Z');
const SUHAILA = { id: 's1', code: 'AB-0183', name: 'سهيلة' };
const LEADS = [
  { id: 'l1', status: 'converted', source: 'facebook_ad' },
  { id: 'l2', status: 'new', source: 'facebook_ad' },
];

function service() {
  const counts = {
    leads: vi.fn().mockResolvedValue(LEADS),
    lessons: vi.fn().mockResolvedValue([{ id: 'x', status: 'completed', teacher_id: 't1' }]),
    activeStudents: vi.fn().mockResolvedValue(9),
    needsConfirmation: vi.fn().mockResolvedValue(3),
    unpaidSubscriptions: vi.fn().mockResolvedValue(2),
    openTasks: vi.fn().mockResolvedValue(1),
    teachers: vi.fn().mockResolvedValue([{ id: 't1', display_name_ar: 'أبرار', max_students: 10 }]),
    loadStudents: vi.fn().mockResolvedValue([{ id: 's1', teacher_id: 't1' }]),
  };
  const pending = [
    { lesson_id: 'L', student: SUHAILA, lesson: { starts_at: '2026-10-01T16:00:00Z', status: 'completed', teacher: { id: 't1', display_name_ar: 'أبرار' } } },
  ];
  const work = {
    pendingReports: vi.fn().mockResolvedValue(pending),
    unpaid: vi.fn().mockResolvedValue([]),
    openTasks: vi.fn().mockResolvedValue([
      { id: 'k', kind: 'renewal_due', subject_type: 'subscription', subject_id: 'sub1', title: null, due_at: null, done_at: null, created_at: 'x' },
      { id: 'k2', kind: 'renewal_due', subject_type: 'subscription', subject_id: 'sub1', title: null, due_at: null, done_at: null, created_at: 'y' },
    ]),
    taskSubjects: vi.fn().mockResolvedValue([{ id: 'sub1', student: SUHAILA, balance: { lessons_total: 4, lessons_used: 2 } }]),
  };
  const money = { finance: vi.fn().mockResolvedValue({ currency: 'SAR', revenue: 145 }) };
  const svc = new DashboardService(
    counts as unknown as DashboardQueries,
    work as unknown as WorkQueries,
    money as unknown as FinanceService,
  );
  return { svc, counts, work, money };
}

describe('DashboardService.summary (R-RPT-01)', () => {
  it('every count comes from a status; finance gets the range and its leads', async () => {
    const { svc, counts, money } = service();
    const range = { from: '2026-09-01', to: '2026-10-02' };
    const s = await svc.summary(range, NOW);
    expect(s.funnel).toMatchObject({ new: 1, converted: 1, lost: 0 });
    expect(s).toMatchObject({ active_students: 9, needs_confirmation: 3, pending_reports: 1, unpaid_subscriptions: 2, open_tasks: 1 });
    expect(s.lessons_by_status).toMatchObject({ completed: 1, scheduled: 0 });
    expect(s.teacher_load).toEqual([{ teacher_id: 't1', display_name_ar: 'أبرار', lessons: 1, students: 1, max_students: 10 }]);
    expect(s.finance).toEqual({ currency: 'SAR', revenue: 145 });
    expect(money.finance).toHaveBeenCalledWith({ range, leads: LEADS });
    expect(counts.needsConfirmation).toHaveBeenCalledWith(NOW);
    expect(counts.leads.mock.calls[0]?.[0].from.toISOString()).toBe('2026-08-31T21:00:00.000Z');
  });
});

describe('DashboardService.queue', () => {
  it('reads balances once per package and returns the three lists', async () => {
    const { svc, work } = service();
    const q = await svc.queue(NOW);
    expect(work.taskSubjects).toHaveBeenCalledWith(['sub1']);
    expect(q.pending_reports.total).toBe(1);
    expect(q.tasks.items[0]).toMatchObject({ student: SUHAILA, balance: { used: 2, total: 4 } });
    expect(q.unpaid).toEqual({ total: 0, items: [] });
  });
});
