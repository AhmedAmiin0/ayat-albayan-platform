import type { AcademySettings } from '@ab/shared';

/** The seeded defaults (migrations 073, 123, 142). Tests only. */
export const SETTINGS: AcademySettings = {
  late_cancel_hours: null,
  booking_horizon_weeks: 5,
  renewal_alert_remaining: 2,
  flag_future_lessons_when_unpaid: true,
  report_teacher_edit_hours: 24,
  reporting_currency: 'SAR',
  payout_count_late: false,
  payout_count_no_show: false,
  follow_up_hours: [24, 72],
  reminder_minutes_before: 60,
  reminder_24h_enabled: false,
  messaging_enabled: false,
  crm_cutover_done: false,
};
