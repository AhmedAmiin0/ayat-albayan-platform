import type { DashboardData, DashboardWork } from './types';

// Test fixtures (not a test): one summary and one queue as the API returns them.

export const SUMMARY: DashboardData = {
  range: { from: '2026-05-01', to: '2026-10-02' },
  funnel: { new: 3, contacted: 1, interested_no_slot: 1, trial_booked: 1, trial_done: 1, converted: 1, no_reply: 1, lost: 1 },
  active_students: 6,
  lessons_by_status: {
    scheduled: 1,
    confirmed: 0,
    completed: 2,
    late: 0,
    excused: 0,
    no_show: 1,
    cancelled_by_teacher: 0,
    cancelled_by_admin: 0,
    rescheduled: 0,
  },
  needs_confirmation: 3,
  pending_reports: 0,
  unpaid_subscriptions: 2,
  open_tasks: 1,
  teacher_load: [{ teacher_id: 't1', display_name_ar: 'فاطمة الزهراء', lessons: 2, students: 4, max_students: 12 }],
  finance: {
    currency: 'SAR',
    revenue: 335.45,
    teacher_cost: 12.88,
    expenses: 1477.27,
    gross_margin: -1154.7,
    by_source: [
      { source: 'facebook_ad', leads: 4, converted: 1, revenue: 290, teacher_cost: 4.55, gross_margin: 285.45 },
      { source: 'unknown', leads: 0, converted: 0, revenue: 0, teacher_cost: 3, gross_margin: -3 },
    ],
    fx_date: '2026-10-02T04:39:59Z',
    fx_missing: [],
    by_month: [
      { month: '2026-09', revenue: 145, teacher_cost: 0, expenses: 1439.39, gross_margin: -1294.39 },
      { month: '2026-10', revenue: 45.45, teacher_cost: 12.88, expenses: 37.88, gross_margin: -5.3 },
    ],
    expenses_by_category: { ads: 1287.88, content: 151.52, tools: 37.88, operations: 0, other: 0 },
    fx_rates: { SAR: 1, EGP: 13.2 },
    unrated_lessons: 0,
  },
};

export const SUHAILA = { id: 's1', code: 'AB-0185', name: 'سهيلة محمد' };

export const WORK: DashboardWork = {
  pending_reports: {
    total: 23,
    items: [
      {
        lesson_id: 'l1',
        starts_at: '2026-10-01T08:40:00Z',
        status: 'completed',
        teacher: { id: 't1', display_name_ar: 'فاطمة الزهراء' },
        student: SUHAILA,
      },
    ],
  },
  unpaid: {
    total: 1,
    items: [{ id: 'sub2', student: { id: 's2', code: 'AB-0187', name: 'يوسف أحمد' }, package: '4', lessons_total: 4, price: 145, paid: 45, owed: 100, reason: 'owes', currency: 'SAR', starts_on: '2026-09-22' }],
  },
  tasks: {
    total: 1,
    items: [
      {
        id: 'k1',
        kind: 'renewal_due',
        subject_type: 'subscription',
        subject_id: 'sub1',
        student: SUHAILA,
        title: null,
        due_at: null,
        done_at: null,
        created_at: '2026-10-02T04:40:00Z',
        balance: { used: 2, total: 4 },
      },
    ],
  },
};
