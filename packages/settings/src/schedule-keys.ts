import type { SettingKey } from './registry.js';

/** «الجدول والحلقات»: the schedule keys, in order, for both layout.ts and value-groups.ts. */
export const SCHEDULE_KEYS = [
  'booking_horizon_weeks',
  'late_cancel_hours',
  'makeup_window_days',
  'teachers_always_available',
  'lesson_confirmation_required',
  'lesson_outcome_grace_minutes',
] as const satisfies readonly SettingKey[];
