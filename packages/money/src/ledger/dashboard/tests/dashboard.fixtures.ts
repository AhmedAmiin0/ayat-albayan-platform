const ID = 'd1111111-1111-4111-8111-111111111111';
const STUDENT = { id: ID, code: 'AB-0001', name: 'سارة' };

const FUNNEL = {
  new: 2,
  contacted: 1,
  interested_no_slot: 0,
  trial_booked: 1,
  trial_done: 0,
  converted: 1,
  no_reply: 0,
  lost: 0,
};

const LESSONS = {
  scheduled: 3,
  confirmed: 1,
  completed: 9,
  late: 0,
  excused: 1,
  no_show: 0,
  cancelled_by_teacher: 0,
  cancelled_by_admin: 0,
  rescheduled: 1,
};

const SOURCE = {
  source: 'referral',
  leads: 2,
  converted: 1,
  revenue: 300,
  teacher_cost: 120,
  gross_margin: 180,
};

export const SUMMARY = {
  range: { from: '2026-11-01', to: '2026-11-30' },
  funnel: FUNNEL,
  active_students: 12,
  lessons_by_status: LESSONS,
  needs_confirmation: 1,
  pending_reports: 2,
  unpaid_subscriptions: 1,
  open_tasks: 3,
  teacher_load: [
    { teacher_id: ID, display_name_ar: 'أ. أحمد', lessons: 5, students: 4, max_students: null },
  ],
  finance: {
    currency: 'SAR',
    revenue: 300,
    teacher_cost: 120,
    expenses: 20,
    gross_margin: 160,
    by_source: [SOURCE, { ...SOURCE, source: 'unknown' }],
    fx_date: '2026-11-27',
    fx_missing: ['EGP'],
    by_month: [
      { month: '2026-11', revenue: 300, teacher_cost: 120, expenses: 20, gross_margin: 160 },
    ],
    expenses_by_category: { rent: 20 },
    fx_rates: { SAR: 1, USD: 0.27 },
    unrated_lessons: 0,
  },
};

const PENDING = {
  lesson_id: ID,
  starts_at: '2026-11-27T03:00:00+00:00',
  status: 'completed',
  teacher: { id: ID, display_name_ar: 'أ. أحمد' },
  student: STUDENT,
};

const UNPAID = {
  id: ID,
  student: STUDENT,
  package: '8',
  lessons_total: 8,
  price: 400,
  paid: 100,
  owed: 300,
  reason: 'owes',
  currency: 'SAR',
  starts_on: '2026-11-01',
};

const TASK = {
  id: ID,
  kind: 'subscription_unpaid',
  subject_type: 'subscription',
  subject_id: ID,
  student: STUDENT,
  title: null,
  due_at: null,
  done_at: null,
  created_at: '2026-11-20T08:00:00+00:00',
  balance: { used: 3, total: 8 },
};

export const WORK = {
  pending_reports: { total: 1, items: [PENDING] },
  unpaid: { total: 1, items: [UNPAID] },
  tasks: { total: 1, items: [TASK, { ...TASK, student: null, balance: null }] },
};
