import type { SettingDef } from '../../defs.js';

/** «الجدول والحلقات» (R-SCH-02, R-SCH-07, R-SCH-10). */
export const SCHEDULING_SETTINGS = {
  booking_horizon_weeks: {
    module: 'scheduling', group: 'schedule',
    type: 'int', default: 5, min: 1, max: 12,
    labelKey: 'settings.bookingHorizonWeeks', hintKey: 'settings.hints.bookingHorizonWeeks',
  },
  /** null = OFF (docs/05 q2): a late cancellation never consumes a lesson. */
  late_cancel_hours: {
    module: 'scheduling', group: 'schedule', reachesFamilies: true,
    type: 'int', default: null, min: 1, max: 168, nullable: true, onValue: 24,
    labelKey: 'settings.lateCancelHours',
    toggleLabelKey: 'settings.lateCancel', toggleHintKey: 'settings.lateCancelHint',
  },
  /** A charged miss may be made up within this many days (makeupEligible; web/mobile show the button). */
  makeup_window_days: {
    module: 'scheduling', group: 'schedule', reachesFamilies: true,
    type: 'int', default: 60, min: 1, max: 365, public: true,
    labelKey: 'settings.makeupWindowDays', hintKey: 'settings.hints.makeupWindowDays',
  },
  /**
   * Owner 2026-10-12 (migration 320): booking treats every teacher as free 00:00–24:00 every day
   * (AvailabilityQueries.bookableSlots). Lessons and time off still block; the saved grids stay.
   */
  teachers_always_available: {
    module: 'scheduling', group: 'schedule', confirm: 'simple',
    type: 'bool', default: true,
    labelKey: 'settings.teachersAlwaysAvailable', hintKey: 'settings.hints.teachersAlwaysAvailable',
  },
  /**
   * Owner 2026-11-03: ON (default) = «يحتاج تأكيد»; after its end + the grace a confirmed lesson
   * is completed, a reminded one with no «نعم» no_show (AutoHeldJob). OFF = held after the grace
   * (owner 2026-11-02).
   */
  lesson_confirmation_required: {
    module: 'scheduling', group: 'schedule',
    type: 'bool', default: true, public: true,
    labelKey: 'settings.lessonConfirmationRequired', hintKey: 'settings.hints.lessonConfirmationRequired',
  },
  /** Minutes after a lesson's end before AutoHeldJob settles it (owner 2026-11-03, default 30). */
  lesson_outcome_grace_minutes: {
    module: 'scheduling', group: 'schedule',
    type: 'int', default: 30, min: 0, max: 720,
    labelKey: 'settings.lessonOutcomeGraceMinutes', hintKey: 'settings.hints.lessonOutcomeGraceMinutes',
  },
} as const satisfies Record<string, SettingDef>;
