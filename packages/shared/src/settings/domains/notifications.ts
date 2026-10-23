import type { SettingDef } from '../defs.js';

const tpl = 'templates.settings';

/** The WhatsApp reminders and the teacher's WhatsApp switches (R-NOT-03): what is sent, and when. */
export const NOTIFICATION_SETTINGS = {
  reminder_minutes_before: {
    module: 'notifications', group: 'notifications', reachesFamilies: true,
    type: 'int', default: 60, min: 5, max: 720,
    labelKey: `${tpl}.reminderMinutesBefore`, hintKey: 'settings.hints.reminderMinutesBefore',
  },
  reminder_24h_enabled: { module: 'notifications', group: 'notifications', reachesFamilies: true, type: 'bool', default: false, labelKey: `${tpl}.reminder24hEnabled`, hintKey: `${tpl}.reminder24hHint` },
  /** R-NOT-03 (migration 382): WhatsApp teacher_new_student on a booking (once Meta approved it); the bell alert is always on. */
  teacher_whatsapp_new_student: {
    module: 'notifications', group: 'notifications',
    type: 'bool', default: true,
    labelKey: `${tpl}.teacherWhatsappNewStudent`, hintKey: `${tpl}.teacherWhatsappNewStudentHint`,
  },
  /** R-NOT-03: the teacher's same-day teacher_lesson_reminder* (guardians' reminders are unchanged). */
  teacher_whatsapp_lesson_reminder: {
    module: 'notifications', group: 'notifications',
    type: 'bool', default: true,
    labelKey: `${tpl}.teacherWhatsappLessonReminder`, hintKey: `${tpl}.teacherWhatsappLessonReminderHint`,
  },
  /** Reminders job: how far ahead it reads lessons (≥ 25 h so the day-before send is never missed across DST). */
  reminder_lookahead_hours: {
    module: 'notifications', group: 'messaging',
    type: 'int', default: 25, min: 25, max: 72,
    labelKey: 'settings.reminderLookaheadHours', hintKey: 'settings.hints.reminderLookaheadHours',
  },
} as const satisfies Record<string, SettingDef>;
