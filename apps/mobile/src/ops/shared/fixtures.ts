import { catalogueViews, SETTING_DEFAULTS, type AcademySettings, type ActivityView, type NotificationsOverview, type ReportView } from '@ab/shared';
import type { DashboardWork, Summary } from '../dashboard/dashboard-types';

export const summary: Summary = {
  active_students: 41,
  needs_confirmation: 3,
  pending_reports: 2,
  unpaid_subscriptions: 0,
  open_tasks: 1,
};

const sara = { id: 's1', code: 'AB-0182', name: 'سارة أحمد' };

export const work: DashboardWork = {
  pending_reports: {
    total: 22,
    items: [
      {
        lesson_id: 'l1',
        starts_at: '2026-10-01T13:00:00Z',
        status: 'completed',
        teacher: { id: 't1', display_name_ar: 'أبرار' },
        student: sara,
      },
    ],
  },
  unpaid: {
    total: 1,
    items: [
      {
        id: 'u1',
        student: { id: 's2', code: 'AB-0190', name: 'يوسف' },
        package: null,
        lessons_total: 6,
        owed: 1200.4,
        reason: 'owes',
        currency: 'SAR',
      },
    ],
  },
  tasks: {
    total: 1,
    items: [
      {
        id: 'k1',
        kind: 'renewal_due',
        subject_type: 'subscription',
        subject_id: 'u1',
        student: sara,
        title: null,
        due_at: null,
        done_at: null,
        created_at: '2026-10-01T00:00:00Z',
        balance: { used: 2, total: 4 },
      },
    ],
  },
};

/** The registry's defaults (so a new setting never leaves this stale) plus the values the tests read. */
export const settings: AcademySettings = {
  ...SETTING_DEFAULTS,
  late_cancel_hours: null,
  booking_horizon_weeks: 5,
  renewal_alert_remaining: 2,
  follow_up_hours: [24, 72],
  messaging_enabled: true,
};

/** GET /admin/notifications under `settings` (automatic off), one kept number. */
export const catalogue: NotificationsOverview = {
  entries: catalogueViews({ settings, gateReason: null, templates: new Map([['report_ready', { status: 'approved', line: 'notifications' }]]) }),
  lines: [{ line: 'notifications', display_phone_e164: '+966551234567', verified_name: null, checked_at: '2026-10-22T08:00:00Z' }],
};

export const activityRow = (over: Partial<ActivityView> = {}): ActivityView => ({
  id: 'a1',
  at: '2026-10-04T13:30:00Z',
  actor_id: 'u1',
  actor_name: 'منى',
  actor_role: 'admin',
  action: 'expenses.create',
  method: 'POST',
  route: '/expenses',
  entity: 'expenses',
  entity_id: null,
  status: 201,
  duration_ms: 12,
  meta: {},
  ...over,
});

export const report = (over: Partial<ReportView> = {}): ReportView => ({
  id: 'r1',
  lesson_id: 'l1',
  student_id: 's1',
  teacher_id: 't1',
  attendance: 'on_time',
  program: 'quran',
  recited: 'سورة الملك',
  new_memorization: null,
  revision: 'سورة الملك',
  theory: null,
  grades: {
    recitation: 'excellent',
    memorization: null,
    revision: 'good',
    tajweed: null,
    engagement: null,
    commitment: null,
  },
  grade_overall: 'excellent',
  notes: 'أداء ممتاز',
  homework: null,
  next_plan: null,
  status: 'submitted',
  version: 2,
  submitted_at: '2026-10-01T14:00:00Z',
  edited_at: null,
  pdf_status: 'ready',
  pdf_error: null,
  sent_at: null,
  attachments: [],
  can_edit: false,
  edit_until: null,
  form_version: 1,
  content: null,
  ...over,
});
