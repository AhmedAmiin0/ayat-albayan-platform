import type { ReminderLesson } from './reminders.plan';

// Invented sample data for the reminder tests: no real student, teacher or guardian.

/** Sun 4 Oct 2026 17:00 Riyadh = 15:00 London (BST) = 14:00Z. */
export const STARTS_AT = '2026-10-04T14:00:00Z';

export const RIYADH_GUARDIAN = { id: 'g-riyadh', phone_e164: '+966500000101', tz: 'Asia/Riyadh' };
export const LONDON_GUARDIAN = { id: 'g-london', phone_e164: '+447700900102', tz: 'Europe/London' };

export function sampleLesson(over: Partial<ReminderLesson> = {}): ReminderLesson {
  return {
    id: 'lesson-1',
    starts_at: STARTS_AT,
    status: 'scheduled',
    meeting_link: 'https://meet.jit.si/ab-room-7',
    teacher: { id: 't-1', display_name_ar: 'هدى', phone_e164: '+966500000201', tz: 'Asia/Riyadh' },
    students: [
      { name: 'سهيلة', guardian: RIYADH_GUARDIAN },
      { name: 'مريم', guardian: RIYADH_GUARDIAN },
      { name: 'ياسين', guardian: LONDON_GUARDIAN },
    ],
    ...over,
  };
}

/** `at` as a Date (tests read better with ISO strings). */
export const at = (iso: string) => new Date(iso);
