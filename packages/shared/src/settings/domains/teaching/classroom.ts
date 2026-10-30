import type { SettingDef } from '../../defs.js';

/** «الحلقات عبر الإنترنت» (classroom): the join window, internal meetings and the per-lesson link. */
export const CLASSROOM_SETTINGS = {
  /** The room opens this many minutes before the lesson starts … */
  join_opens_before_min: {
    module: 'classroom', group: 'classroom', reachesFamilies: true,
    type: 'int', default: 15, min: 0, max: 180, public: true,
    labelKey: 'settings.joinOpensBeforeMin', hintKey: 'settings.hints.joinOpensBeforeMin',
  },
  /** … and closes this many minutes after it ends (guest links expire then too). */
  join_closes_after_min: {
    module: 'classroom', group: 'classroom', reachesFamilies: true,
    type: 'int', default: 120, min: 0, max: 720, public: true,
    labelKey: 'settings.joinClosesAfterMin', hintKey: 'settings.hints.joinClosesAfterMin',
  },
  /** «اجتماع داخلي» created without a title (the column default stays 'اجتماع'); a guest's join page shows it. */
  default_meeting_title: {
    module: 'classroom', group: 'classroom', reachesFamilies: true,
    type: 'string', default: 'اجتماع', minLength: 1, maxLength: 60,
    labelKey: 'settings.defaultMeetingTitle', hintKey: 'settings.hints.defaultMeetingTitle',
  },
  /**
   * Owner 2026-10-30 «close meetings longer than 2 hours»: MeetingMaxDurationJob closes a
   * meeting or lesson room open longer than this. 0 = the job is off. No message to anyone.
   */
  meeting_max_minutes: {
    module: 'classroom', group: 'classroom',
    type: 'int', default: 120, min: 0, max: 1440,
    labelKey: 'settings.meetingMaxMinutes', hintKey: 'settings.hints.meetingMaxMinutes',
  },
  /**
   * ON: messages carry our classroom link per lesson (family: lesson_join_link, teacher:
   * /classroom/<id>), chosen when the message is queued; lessons.meeting_link is never changed.
   * OFF (migration 330 seeds it): the teacher's fixed link, as before. Public: the apps hide the fixed link.
   */
  meeting_link_auto: {
    module: 'classroom', group: 'classroom', confirm: 'simple', reachesFamilies: true,
    type: 'bool', default: false, public: true,
    labelKey: 'settings.meetingLinkAuto', hintKey: 'settings.hints.meetingLinkAuto',
  },
} as const satisfies Record<string, SettingDef>;
