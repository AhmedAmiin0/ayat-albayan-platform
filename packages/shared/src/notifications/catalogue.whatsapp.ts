import type { NotificationEntry } from './catalogue.types.js';

// WhatsApp rows a job or an event sends without a person (docs/23a §B2 W1–W7, W9–W11, W13, W14).

const ROW = { channels: ['whatsapp'], manual: false, essential: false, locked: false, defaults: { enabled: true } } as const;
const AUTO = { ...ROW, automatic: true } as const;

export const WHATSAPP_ENTRIES = [
  {
    // W1–W3: booking, reschedule and time edit; only the gate governs it today.
    ...ROW,
    key: 'booking_confirmation',
    audience: 'guardian',
    templates: ['booking_confirmation', 'booking_confirmation_meet', 'booking_confirmation_plain'],
    automatic: false,
    essential: true,
  },
  {
    ...AUTO,
    key: 'lesson_reminder',
    audience: 'guardian',
    templates: ['lesson_reminder', 'lesson_reminder_meet', 'lesson_reminder_plain'],
    timing: 'reminder_minutes_before',
  },
  {
    ...AUTO,
    key: 'lesson_reminder_24h',
    audience: 'guardian',
    templates: ['lesson_reminder_24h'],
    rowSwitch: { key: 'reminder_24h_enabled', isOn: (s) => s.reminder_24h_enabled },
    defaults: { enabled: false },
  },
  {
    ...AUTO,
    key: 'teacher_lesson_reminder',
    audience: 'teacher',
    templates: ['teacher_lesson_reminder', 'teacher_lesson_reminder_meet'],
    rowSwitch: { key: 'teacher_whatsapp_lesson_reminder', isOn: (s) => s.teacher_whatsapp_lesson_reminder },
    timing: 'reminder_minutes_before',
  },
  {
    // W7: only for lessons held in the academy classroom (meeting_link_auto or the teacher's own mode).
    ...AUTO,
    key: 'lesson_join_link',
    audience: 'guardian',
    templates: ['lesson_join_link'],
    timing: 'reminder_minutes_before',
  },
  {
    ...ROW,
    key: 'teacher_new_student',
    audience: 'teacher',
    templates: ['teacher_new_student'],
    automatic: false,
    rowSwitch: { key: 'teacher_whatsapp_new_student', isOn: (s) => s.teacher_whatsapp_new_student },
  },
  { ...ROW, key: 'report_ready', audience: 'guardian', templates: ['report_ready'], automatic: false, essential: true },
  { ...AUTO, key: 'renewal_due', audience: 'guardian', templates: ['renewal_due'], timing: 'renewal_alert_remaining' },
  { ...AUTO, key: 'follow_up_slots', audience: 'lead', templates: ['follow_up_slots'], timing: 'follow_up_hours' },
  {
    ...AUTO,
    key: 'lesson_rating',
    audience: 'guardian',
    templates: ['lesson_rating'],
    rowSwitch: { key: 'feedback_mode', isOn: (s) => s.feedback_mode === 'buttons' },
  },
] as const satisfies readonly NotificationEntry[];
