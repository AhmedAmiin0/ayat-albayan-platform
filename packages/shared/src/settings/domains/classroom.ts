import type { SettingDef } from '../defs.js';

/** «الحلقات عبر الإنترنت» (classroom): the join window, internal meetings and the per-lesson link. */
export const CLASSROOM_SETTINGS = {
  /** The room opens this many minutes before the lesson starts … */
  join_opens_before_min: {
    type: 'int', default: 15, min: 0, max: 180, public: true,
    labelKey: 'settings.joinOpensBeforeMin', hintKey: 'settings.hints.joinOpensBeforeMin',
  },
  /** … and closes this many minutes after it ends (guest links expire then too). */
  join_closes_after_min: {
    type: 'int', default: 120, min: 0, max: 720, public: true,
    labelKey: 'settings.joinClosesAfterMin', hintKey: 'settings.hints.joinClosesAfterMin',
  },
  /** «اجتماع داخلي» created without a title (the column default stays 'اجتماع'). */
  default_meeting_title: {
    type: 'string', default: 'اجتماع', minLength: 1, maxLength: 60,
    labelKey: 'settings.defaultMeetingTitle', hintKey: 'settings.hints.defaultMeetingTitle',
  },
  /**
   * ON: messages carry our classroom link per lesson (family: lesson_join_link, teacher:
   * /classroom/<id>), chosen when the message is queued; lessons.meeting_link is never changed.
   * OFF (migration 330 seeds it): the teacher's fixed link, as before. Public: the apps hide the fixed link.
   */
  meeting_link_auto: {
    type: 'bool', default: false, public: true,
    labelKey: 'settings.meetingLinkAuto', hintKey: 'settings.hints.meetingLinkAuto',
  },
} as const satisfies Record<string, SettingDef>;
