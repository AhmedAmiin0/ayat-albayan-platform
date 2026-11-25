import type { NotificationEntry } from './catalogue.types';

// A lesson moved or cancelled, a course paused or resumed: the family (guardian) and the lesson's
// teacher, by WhatsApp on the notifications line and in the bell / app. Sent because a person
// acted, so never automatic (that switch is for the scheduled reminders); the send gate
// (messaging_enabled) and the template's approval hold it.

const SCHEDULE = {
  audience: 'guardian',
  alsoTo: ['teacher'],
  channels: ['whatsapp', 'push', 'bell'],
  automatic: false,
  manual: false,
  essential: false,
  locked: false,
  defaults: { enabled: true },
} as const;

/** One row: its own template and bell / push kind, all named after the row. */
const row = <K extends string>(key: K) =>
  ({ ...SCHEDULE, key, templates: [key], pushKind: key }) as const;

export const SCHEDULE_ENTRIES = [
  row('lesson_rescheduled'),
  row('lesson_cancelled'),
  row('course_paused'),
  row('course_resumed'),
] as const satisfies readonly NotificationEntry[];
