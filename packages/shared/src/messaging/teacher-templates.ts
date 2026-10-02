import type { TemplateKey } from './templates.js';

/**
 * Templates a teacher may send from their inbox (teacher mode, R-MSG-05): the guardian lesson
 * reminders. Booking, renewal, follow-up and report_ready stay admin or system only.
 */
export const TEACHER_TEMPLATE_KEYS = [
  'lesson_reminder',
  'lesson_reminder_meet',
  'lesson_reminder_plain',
  'lesson_reminder_24h',
] as const satisfies readonly TemplateKey[];

const ALLOWED: ReadonlySet<string> = new Set(TEACHER_TEMPLATE_KEYS);

export function isTeacherTemplate(key: string): boolean {
  return ALLOWED.has(key);
}
