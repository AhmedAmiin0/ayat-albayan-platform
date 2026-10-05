import type { SettingDef } from './types.js';

/** «الجدول والحلقات» (R-SCH-02, R-SCH-07, R-SCH-10) and «الحلقات عبر الإنترنت» (classroom). */
export const SCHEDULE_SETTINGS = {
  booking_horizon_weeks: {
    section: 'schedule', type: 'int', default: 5, min: 1, max: 12,
    labelKey: 'settings.bookingHorizonWeeks', hintKey: 'settings.hints.bookingHorizonWeeks',
  },
  /** null = OFF (docs/05 q2): a late cancellation never consumes a lesson. */
  late_cancel_hours: {
    section: 'schedule', type: 'int', default: null, min: 1, max: 168, nullable: true, onValue: 24,
    labelKey: 'settings.lateCancelHours',
    toggleLabelKey: 'settings.lateCancel', toggleHintKey: 'settings.lateCancelHint',
  },
  /** A charged miss may be made up within this many days (makeupEligible; web/mobile show the button). */
  makeup_window_days: {
    section: 'schedule', type: 'int', default: 60, min: 1, max: 365, public: true,
    labelKey: 'settings.makeupWindowDays', hintKey: 'settings.hints.makeupWindowDays',
  },
} as const satisfies Record<string, SettingDef>;

export const CLASSROOM_SETTINGS = {
  /** The room opens this many minutes before the lesson starts … */
  join_opens_before_min: {
    section: 'classroom', type: 'int', default: 15, min: 0, max: 180, public: true,
    labelKey: 'settings.joinOpensBeforeMin', hintKey: 'settings.hints.joinOpensBeforeMin',
  },
  /** … and closes this many minutes after it ends (guest links expire then too). */
  join_closes_after_min: {
    section: 'classroom', type: 'int', default: 120, min: 0, max: 720, public: true,
    labelKey: 'settings.joinClosesAfterMin', hintKey: 'settings.hints.joinClosesAfterMin',
  },
  /** «اجتماع داخلي» created without a title (the column default stays 'اجتماع'). */
  default_meeting_title: {
    section: 'classroom', type: 'string', default: 'اجتماع', minLength: 1, maxLength: 60,
    labelKey: 'settings.defaultMeetingTitle', hintKey: 'settings.hints.defaultMeetingTitle',
  },
} as const satisfies Record<string, SettingDef>;
