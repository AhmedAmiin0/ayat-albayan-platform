import type { TemplateKey } from '@ab/shared';
import { REMINDER_KEYS } from '@/modules/messaging/reminders';

/** Job-queued keys; every other key is sent because someone acted (checked by a test). */
export const AUTOMATIC_KEYS: readonly TemplateKey[] = [
  ...REMINDER_KEYS,
  'follow_up_slots',
  'renewal_due',
  'lesson_rating',
];
const AUTOMATIC: ReadonlySet<string> = new Set(AUTOMATIC_KEYS);

/** The hold of an automatic row while the switch is OFF (failed, no push). */
export const AUTO_OFF = { code: 'auto_off', text: 'automatic messages are off in settings' } as const;

interface AutoRow {
  template_key: string | null;
  created_by: string | null;
  dedup_key?: string | null;
}

/**
 * teacher_lesson_v3 carries the same-day reminder (automatic) and the new-student alert (a
 * booking): the reminder's dedup key names it, so only that one is held while the switch is OFF.
 */
const isV3Reminder = (row: AutoRow): boolean =>
  row.template_key === 'teacher_lesson_v3' &&
  (row.dedup_key ?? '').startsWith('teacher_lesson_reminder:');

/**
 * A job-made row of an automatic kind, held (failed 'auto_off') while
 * settings.auto_messages_enabled is OFF. created_by tells them apart: the jobs leave it null; an
 * admin's inbox send of the same template carries the admin (ThreadSendService) and goes. Booking
 * confirmations and report_ready are never automatic here.
 */
export function isAutomatic(row: AutoRow): boolean {
  return row.created_by === null && (AUTOMATIC.has(row.template_key ?? '') || isV3Reminder(row));
}

/** Automatic messages OFF and a job-made row of an automatic kind: held, never sent. */
export const autoHeld = (job: { autoOn: boolean; row: AutoRow }): boolean =>
  !job.autoOn && isAutomatic(job.row);
