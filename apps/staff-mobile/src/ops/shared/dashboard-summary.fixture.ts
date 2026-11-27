import { LEAD_STATUSES, LESSON_STATUSES } from '@ab/catalog';
import { dashboardResponseSchema } from '@ab/money';

const zeros = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, 0]));

/** The whole GET /dashboard/summary answer: the client parses it before the KPI strip reads it. */
export const summary = dashboardResponseSchema.parse({
  range: { from: '2026-10-03', to: '2026-10-09' },
  funnel: zeros(LEAD_STATUSES),
  lessons_by_status: zeros(LESSON_STATUSES),
  active_students: 41,
  needs_confirmation: 3,
  pending_reports: 2,
  unpaid_subscriptions: 0,
  open_tasks: 1,
  teacher_load: [],
  finance: {
    currency: 'SAR',
    revenue: 0,
    teacher_cost: 0,
    expenses: 0,
    gross_margin: 0,
    by_source: [],
    fx_date: null,
    fx_missing: [],
    by_month: [],
    expenses_by_category: {},
    fx_rates: { SAR: 1 },
    unrated_lessons: 0,
  },
});
